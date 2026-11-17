// 首页场景「穿过帷幕」。进度 0–1 对应四幕：
//   一 外海   0.00–0.20  夜海、星空、远处一点船灯，海上空无一物
//   二 显形   0.20–0.45  薄膜从边缘的菲涅尔反光开始浮现
//   三 穿幕   0.45–0.70  镜头推向薄膜（滑动变焦：穹顶大小不变、背景被拉长），贴着薄膜穿过，视角随即撑开
//   四 穹顶之下 0.70–1.00 镜头升起俯瞰：内壁织纹成为天幕，海面上铺开五大陆航海图，大陆名浮在各自方位
// 设定依据：帷幕是透明、柔软、自带支撑的穹顶；没有魔力的凡人看不见其内部；内部面积略大于从外部估算的规模。
// 因此从外面看时，薄膜只折射外面的海与天，内部的航海图只在镜头进入穹顶后才显现；穿过时视角撑开，表现「内部更大」。
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, FrontSide, HalfFloatType, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, Raycaster, Scene, ShaderMaterial, SphereGeometry, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, Vector4, WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';
import {
  chartFragment, chartVertex, finishShader, lampFragment, membraneFragment, membraneVertex, seaFragment, seaVertex, skyFragment, skyVertex, starFragment, starVertex,
} from './veil-shaders';

const R = 60; // 穹顶半径（场景单位）
const lin = (hex: string) => new Color(hex); // Color 默认把 sRGB 十六进制转为线性值
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface VeilScene extends GLScene { setProgress(p: number, immediate?: boolean): void }
/** 第四幕在航海图上标注的地名：u、v 为图上的百分比位置（与地理馆航海图一致）。 */
export interface ChartPlace { el: HTMLElement; u: number; v: number }

const CHART = 52; // 航海图边长（场景单位），铺在穹顶中央
const CHART_Y = 1.7; // 略高于浪尖

export function createVeilScene(renderer: WebGLRenderer, startTier: Tier, places: ChartPlace[] = []): VeilScene {
  let tier = startTier;
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.5, 4000);

  const shared = {
    uZenith: { value: lin('#01070a') },
    uHorizon: { value: lin('#123430') },
    uMoon: { value: lin('#f4eedc') },
    uGold: { value: lin('#d4b36e') },
    uMoonDir: { value: new Vector3(0.6, 0.3, -1).normalize() }, // 在穹顶剪影之外，避免被薄膜折射出重影
    uReveal: { value: 0 },
    uInside: { value: 0 },
    uTime: { value: 0 },
  };

  // 天空（跟随相机的大球，深度写在最远处）
  const sky = new Mesh(new SphereGeometry(1800, 48, 24), new ShaderMaterial({
    uniforms: shared, vertexShader: skyVertex, fragmentShader: skyFragment, side: 1, depthWrite: false,
  }));
  sky.renderOrder = -2;
  scene.add(sky);

  // 星空
  const makeStars = (count: number) => {
    const rand = mulberry32(1077);
    const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), tint = new Float32Array(count * 3);
    const warm = lin('#f6e6c0'), cool = lin('#cfe3e0');
    for (let i = 0; i < count; i++) {
      const u = rand(), v = rand();
      const theta = 2 * Math.PI * u, y = 0.02 + 0.98 * Math.pow(v, 0.8), r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(theta) * r * 1500, y * 1500, Math.sin(theta) * r * 1500], i * 3);
      const b = Math.pow(rand(), 3);
      size[i] = 1.2 + b * 3.4;
      phase[i] = rand();
      const c = warm.clone().lerp(cool, rand()).multiplyScalar(0.35 + b * 1.4);
      tint.set([c.r, c.g, c.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    g.setAttribute('aPhase', new BufferAttribute(phase, 1));
    g.setAttribute('aTint', new BufferAttribute(tint, 3));
    return g;
  };
  const starMaterial = new ShaderMaterial({
    uniforms: { uTime: shared.uTime, uDpr: { value: 1 } }, vertexShader: starVertex, fragmentShader: starFragment,
    blending: AdditiveBlending, depthWrite: false, transparent: true,
  });
  const stars = new Points(makeStars(tier === 'full' ? 2600 : 1300), starMaterial);
  stars.renderOrder = -1;
  scene.add(stars);

  // 海面
  const seaSegments = tier === 'full' ? 220 : 110;
  const seaGeometry = new PlaneGeometry(1800, 1800, seaSegments, seaSegments);
  seaGeometry.rotateX(-Math.PI / 2);
  const sea = new Mesh(seaGeometry, new ShaderMaterial({
    uniforms: {
      ...shared,
      uDeep: { value: lin('#03100e') },
      uGlint: { value: lin('#fff2cf') },
      uWaves: { value: [new Vector4(1, 0.35, 0.16, 38), new Vector4(0.6, 1, 0.12, 22), new Vector4(-0.4, 1, 0.1, 13), new Vector4(1, -0.7, 0.08, 7)] },
    },
    vertexShader: seaVertex, fragmentShader: seaFragment,
  }));
  scene.add(sea);

  // 船灯（帷幕之外，远处右侧）
  const lampGeometry = new BufferGeometry();
  lampGeometry.setAttribute('position', new BufferAttribute(new Float32Array([130, 1.6, -230]), 3));
  const lampMaterial = new ShaderMaterial({
    uniforms: { uColor: { value: lin('#ffcf8a') }, uTime: shared.uTime, uDpr: { value: 1 } },
    vertexShader: /* glsl */ `uniform float uTime, uDpr; void main(){ vec3 p = position; p.y += sin(uTime * 0.9) * 0.25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 14.0 * uDpr; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: lampFragment, blending: AdditiveBlending, depthWrite: false, transparent: true,
  });
  const lamp = new Points(lampGeometry, lampMaterial);
  scene.add(lamp);

  // 帷幕薄膜
  const ripples = Array.from({ length: 8 }, () => new Vector4(0, 0, 0, -1));
  const membraneUniforms = {
    uTime: shared.uTime, uReveal: shared.uReveal, uInside: shared.uInside,
    uNear: { value: 0 },
    uBreath: { value: 1.6 },
    uRipples: { value: ripples },
    uScene: { value: null as unknown },
    uResolution: { value: new Vector2(1, 1) },
    uRefract: { value: 0 },
    uGold: shared.uGold,
    uTeal: { value: lin('#5d9f94') },
    uVeil: { value: lin('#f1e2b4') },
  };
  // 两层：远侧（BackSide）先画，近侧（FrontSide，带折射）后画。镜头在穹顶外时两层的前后关系固定。
  const membraneGeometry = new SphereGeometry(R, tier === 'full' ? 160 : 96, tier === 'full' ? 80 : 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const membraneMaterial = (near: boolean) => new ShaderMaterial({
    uniforms: membraneUniforms, vertexShader: membraneVertex, fragmentShader: membraneFragment,
    defines: near ? { NEAR_SIDE: '' } : {}, transparent: true, depthWrite: false, side: near ? FrontSide : BackSide,
  });
  const membraneFar = new Mesh(membraneGeometry, membraneMaterial(false));
  const membrane = new Mesh(membraneGeometry, membraneMaterial(true));
  membraneFar.renderOrder = 2;
  membrane.renderOrder = 3;
  scene.add(membraneFar, membrane);

  // 五大陆航海图（复用地理馆的航海图）。贴图载入前不显示。
  const chartUniforms = { uMap: { value: null as Texture | null }, uInside: shared.uInside, uReady: { value: 0 }, uGold: shared.uGold, uNight: { value: lin('#03100e') } };
  const chartGeometry = new PlaneGeometry(CHART, CHART);
  chartGeometry.rotateX(-Math.PI / 2);
  const chart = new Mesh(chartGeometry, new ShaderMaterial({ uniforms: chartUniforms, vertexShader: chartVertex, fragmentShader: chartFragment, transparent: true, depthWrite: false }));
  chart.position.y = CHART_Y;
  chart.renderOrder = 1;
  scene.add(chart);
  let disposed = false;
  new TextureLoader().load('assets/nautical-chart-1254.webp', tex => {
    if (disposed) { tex.dispose(); return; }
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    chartUniforms.uMap.value = tex;
    chartUniforms.uReady.value = 1;
  });
  const placeWorld = places.map(pl => new Vector3((pl.u / 100 - 0.5) * CHART, CHART_Y, (pl.v / 100 - 0.5) * CHART));
  const projected = new Vector3();

  // 渲染管线：完整档先把「不含薄膜的场景」画进半分辨率离屏目标供折射采样，再整体渲染并加泛光。
  let sceneTarget: WebGLRenderTarget | null = null;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.42, 0.55, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(finishShader);
  composer.addPass(finish);

  const applyTier = () => {
    const full = tier === 'full';
    bloom.enabled = full;
    if (full && !sceneTarget) sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true });
    if (!full && sceneTarget) { sceneTarget.dispose(); sceneTarget = null; }
    membraneUniforms.uScene.value = sceneTarget?.texture ?? null;
    finish.uniforms.uGrain.value = full ? 0.035 : 0.02;
  };
  applyTier();

  // 指针涟漪：只在薄膜已显形时响应；节流到每 140ms 至多一个。
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let rippleIndex = 0, lastRipple = 0, lastPoint: Vector3 | null = null;
  const canvas = renderer.domElement;
  const onPointer = (e: PointerEvent) => {
    if (shared.uReveal.value < 0.35 || e.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    pointer.set(ndc.x, ndc.y);
    const now = shared.uTime.value;
    if (now - lastRipple < 0.14) return;
    raycaster.setFromCamera(ndc, camera);
    // 穹顶外打在外壁上，穹顶内打在内壁上。
    const hit = raycaster.intersectObject(shared.uInside.value > 0.5 ? membraneFar : membrane, false)[0];
    if (!hit) return;
    const local = membrane.worldToLocal(hit.point.clone());
    if (lastPoint && lastPoint.distanceTo(local) < 6) return;
    lastPoint = local;
    lastRipple = now;
    ripples[rippleIndex].set(local.x, local.y, local.z, now);
    rippleIndex = (rippleIndex + 1) % ripples.length;
  };
  const pointer = new Vector2();
  addEventListener('pointermove', onPointer, { passive: true });

  // 相机路径
  let width = 1, height = 1, target = 0, shown = 0, first = true;
  const camPos = new Vector3(), look = new Vector3(), lookIn = new Vector3(), lookDown = new Vector3();
  const deg = Math.PI / 180;
  let placesAlpha = 0;
  const place = (p: number, time: number) => {
    const aspect = width / height;
    const portrait = aspect < 1;
    const back = aspect < 1.25 ? Math.min(1.35, 1.25 / aspect) : 1; // 竖屏时后退，让穹顶放得下
    const fov0 = portrait ? 70 : 46;
    const a1 = easeInOut(smooth(0, 0.2, p)), a2 = easeInOut(smooth(0.2, 0.45, p));
    const a3 = easeInOut(smooth(0.45, 0.7, p)), a4 = easeInOut(smooth(0.7, 0.93, p));
    const z2 = (158 - 8 * a1 - 16 * a2) * back; // 第二幕结束时的距离
    const y2 = 3.4 + 1.2 * a2;
    // 三幕分三段：快速推近到薄膜前（.45–.56）→ 贴着薄膜慢慢穿过（.56–.65）→ 进入穹顶内 z=24（.65–.70）。
    // 穿膜那段占约 9% 的滚动距离，让织纹放大、涟漪荡开的过程看得清楚。
    const k1 = easeInOut(smooth(0.45, 0.56, p)), k2 = smooth(0.56, 0.65, p), k3 = easeInOut(smooth(0.65, 0.7, p));
    const z3 = z2 + (70 - z2) * k1 + (52 - 70) * k2 + (24 - 52) * k3;
    const y3 = y2 + (7.5 - y2) * k1;
    const top = portrait ? new Vector3(0, 53, 16) : new Vector3(0, 51, 22);
    const sway = Math.sin(time * 0.21) * 0.35 * (1 - a4);
    camPos.set(
      sway + pointer.x * (tier === 'full' ? 1.2 : 0) * (1 - a3),
      y3 + (top.y - y3) * a4 + Math.sin(time * 0.33) * 0.12 + pointer.y * 0.4 * (1 - a3),
      z3 + (top.z - z3) * a4,
    );
    // 视线：二幕看向穹顶上部 → 三幕平视穹顶深处 → 四幕俯视航海图中心
    look.set(0, 15 + 3 * a2, 0);
    lookIn.set(0, 8, -80);
    lookDown.set(0, 0, portrait ? 0 : -4);
    look.lerp(lookIn, k1).lerp(lookDown, a4);

    // 滑动变焦：穿过薄膜之前保持穹顶在画面中的大小（视角随距离收窄、背景被拉长）；
    // 穿过之后视角迅速撑开，表现内部比外面看上去更大；俯瞰时略收。
    const dist = camPos.length();
    const startDist = Math.hypot(z2, y2);
    const dolly = 2 * Math.atan(Math.tan((fov0 * deg) / 2) * Math.min(1, dist / startDist)) / deg;
    const crossT = smooth(R + 3, R - 9, dist) * a3; // 0：尚在薄膜外；1：已在内部
    const wide = portrait ? 82 : 70;
    let fov = dolly + (wide - dolly) * easeInOut(crossT);
    fov += ((portrait ? 64 : 54) - fov) * a4;
    camera.fov = fov;
    camera.aspect = aspect;
    camera.position.copy(camPos);
    camera.lookAt(look);
    camera.updateProjectionMatrix();

    shared.uReveal.value = smooth(0.22, 0.42, p);
    shared.uInside.value = smooth(R + 1, R - 6, dist);
    // 贴近薄膜时折射加剧，穿过的一瞬全屏荡开
    const near = Math.exp(-Math.pow((dist - R) / 7, 2));
    membraneUniforms.uNear.value = Math.exp(-Math.pow((dist - R) / 16, 2)) * a3;
    membraneUniforms.uRefract.value = tier === 'full' ? shared.uReveal.value * (1 + 5 * near) * (1 - shared.uInside.value) : 0;
    finish.uniforms.uCross.value = near * smooth(0.45, 0.55, p) * (1 - smooth(0.72, 0.8, p));
    placesAlpha = smooth(0.8, 0.88, p) * (1 - smooth(0.95, 0.99, p));
  };

  const updatePlaces = () => {
    if (!places.length) return;
    for (let i = 0; i < places.length; i++) {
      const el = places[i].el;
      // 不在第四幕时清掉内联样式（CSS 默认透明），页面结构不随渲染时机变化。
      if (placesAlpha < 0.01) { if (el.hasAttribute('style')) el.removeAttribute('style'); continue; }
      projected.copy(placeWorld[i]).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width, y = (-projected.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = String(placesAlpha.toFixed(3));
    }
  };

  return {
    setProgress(p, immediate) { target = clamp01(p); if (immediate) shown = target; },
    resize(w, h, dpr) {
      width = w; height = h;
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      bloom.resolution.set(w * dpr * 0.5, h * dpr * 0.5);
      starMaterial.uniforms.uDpr.value = dpr;
      lampMaterial.uniforms.uDpr.value = dpr;
      membraneUniforms.uResolution.value.set(w * dpr, h * dpr);
      sceneTarget?.setSize(Math.max(1, Math.round(w * dpr * 0.5)), Math.max(1, Math.round(h * dpr * 0.5)));
    },
    frame(dt, time) {
      shown = first ? target : shown + (target - shown) * (1 - Math.exp(-dt * 7));
      first = false;
      shared.uTime.value = time;
      finish.uniforms.uTime.value = time;
      place(shown, time);
      sky.position.copy(camera.position);
      const revealed = shared.uReveal.value > 0.001;
      if (sceneTarget && revealed && shared.uInside.value < 1) {
        // 折射只取帷幕外的世界：薄膜与内部的航海图都不进入离屏目标。
        membrane.visible = membraneFar.visible = chart.visible = false;
        renderer.setRenderTarget(sceneTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      }
      membrane.visible = membraneFar.visible = revealed;
      chart.visible = shared.uInside.value > 0.001;
      composer.render(dt);
      updatePlaces();
    },
    setTier(next) { tier = next; if (tier === 'static') return false; applyTier(); return true; },
    dispose() {
      disposed = true;
      removeEventListener('pointermove', onPointer);
      chartUniforms.uMap.value?.dispose();
      composer.dispose();
      sceneTarget?.dispose();
      scene.traverse(o => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as ShaderMaterial | ShaderMaterial[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose());
      });
    },
  };
}
