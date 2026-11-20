// 首页场景「穿过帷幕」。进度 0–1 对应四幕：
//   一 外海   0.00–0.20  夜海、星空、远处一点船灯，海上空无一物
//   二 显形   0.20–0.45  薄膜从边缘的菲涅尔反光开始浮现
//   三 穿幕   0.45–0.70  镜头推向薄膜（滑动变焦：穹顶大小不变、背景被拉长），贴着薄膜穿过，视角随即撑开
//   四 穹顶之下 0.70–1.00 镜头升起俯瞰：内壁织纹成为天幕，海面上铺开五大陆航海图，大陆名浮在各自方位
// 设定依据：帷幕是透明、柔软、自带支撑的穹顶；没有魔力的凡人看不见其内部；内部面积略大于从外部估算的规模。
// 因此从外面看时，薄膜只折射外面的海与天，内部的航海图只在镜头进入穹顶后才显现；穿过时视角撑开，表现「内部更大」。
import {
  AdditiveBlending, BackSide, NearestFilter, BufferAttribute, BufferGeometry, Color, FrontSide, HalfFloatType, Mesh, PerspectiveCamera,
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
  cloudFragment, cloudVertex, finishShader, lampFragment, landFragment, landVertex, townFragment, townVertex, membraneFragment, membraneVertex, seaFragment, seaVertex, skyFragment, skyVertex, starFragment, starVertex,
} from './veil-shaders';
import { TOWNS, VILLAGES } from './terrain-towns';

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

const INNER = 1.3; // 进入后穹顶扩大到外面看到的 1.3 倍：「内部面积略大于从外部估算的规模」
const LAND = 2 * R * INNER * 0.9; // 陆地图边长：大陆铺满穹顶之内（与 derive-terrain.py 的格子边长对应）
const LAND_AMP = 2.4; // 陆地最高处：约为陆地宽度的 2%。起伏太大会像玩具模型，压低了才读得出「大陆」
const LAND_Y = -0.2; // 陆地基准略低于海面，海岸自然没入浪里
const LAND_Z = -4; // 陆地图略往北挪，镜头压低时前景的大陆不至于贴到镜头下
const CURVE = 1 / (2 * 1100); // 星球的弧度：离镜头 100 个单位处地面下沉约 4.5

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
  const curve = { value: 0 }; // 穹顶内才弯

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
      uShallow: { value: lin('#2f6f66') }, uTerrain: { value: null as Texture | null }, uLandSize: { value: LAND }, uLandZ: { value: LAND_Z }, uLandOn: { value: 0 }, uRegions: { value: null as unknown }, uLift: { value: null as unknown }, uCurve: curve,
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

  // 穹顶之下的五大陆：按航海图派生的地形、林地、积雪与色调程序化地画出写实的地表（见 veil-shaders.ts）；两张数据图都载入后才显示。
  const lifts = [0, 0, 0, 0, 0], liftVel = [0, 0, 0, 0, 0];
  const anyHot = { value: 0 };
  const octaves = { OCTAVES: tier === 'full' ? 5 : 3 };
  const landUniforms = {
    uTint: { value: null as Texture | null }, uHeight: { value: null as Texture | null }, uTexel: { value: new Vector2(1 / 2048, 1 / 2048) },
    uTime: shared.uTime, uAnyHot: anyHot, uBaseY: { value: LAND_Y }, uCover: { value: null as Texture | null }, uCurve: curve,
    uAmp: { value: LAND_AMP }, uSize: { value: LAND }, uInside: shared.uInside, uReady: { value: 0 }, uShadow: { value: 0 },
    // 主光从东北侧斜照：镜头从南往北看时山体一侧亮、一侧落影，起伏最清楚；与天上月亮同在右侧
    uLight: { value: new Vector3(0.8, 0.4, -0.42).normalize() },
    uMoon: shared.uMoon, uGold: shared.uGold, uHorizon: shared.uHorizon,
    uRegions: { value: null as Texture | null },
    uLift: { value: lifts },
  };
  (sea.material as ShaderMaterial).uniforms.uRegions = landUniforms.uRegions;
  (sea.material as ShaderMaterial).uniforms.uLift.value = lifts;
  const landGeometry = new PlaneGeometry(LAND, LAND, tier === 'full' ? 512 : 256, tier === 'full' ? 512 : 256);
  landGeometry.rotateX(-Math.PI / 2);
  const chart = new Mesh(landGeometry, new ShaderMaterial({ uniforms: landUniforms, vertexShader: landVertex, fragmentShader: landFragment, transparent: true, defines: octaves }));
  chart.position.set(0, LAND_Y, LAND_Z);
  chart.renderOrder = 1;
  scene.add(chart);

  // 城镇灯火：每座城镇一簇小光点（按城镇大小 3–12 个），位置在航海图红屋顶聚集处
  const townRand = mulberry32(1254);
  const townPos: number[] = [], townSize: number[] = [], townPhase: number[] = [];
  const townBright: number[] = [];
  for (const [u, v, sz] of TOWNS) {
    const n = 3 + Math.round(sz * 9);
    for (let i = 0; i < n; i++) {
      const a = townRand() * Math.PI * 2, r = Math.sqrt(townRand()) * (0.002 + sz * 0.0055);
      townPos.push(u / 100 + Math.cos(a) * r, 0, 1 - v / 100 + Math.sin(a) * r);
      townSize.push((i === 0 ? 2.2 : 1) * (0.9 + townRand() * 0.8) * (0.8 + sz * 0.6));
      townPhase.push(townRand());
      townBright.push(1);
    }
  }
  // 村落：零星的一两点小灯，比城镇暗
  for (const [u, v, sz] of VILLAGES) {
    const n = townRand() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      townPos.push(u / 100 + (townRand() - 0.5) * 0.002 * i, 0, 1 - v / 100 + (townRand() - 0.5) * 0.002 * i);
      townSize.push((0.55 + townRand() * 0.35) * (0.8 + sz));
      townPhase.push(townRand());
      townBright.push(0.45 + sz * 0.5);
    }
  }
  const townGeometry = new BufferGeometry();
  townGeometry.setAttribute('position', new BufferAttribute(new Float32Array(townPos), 3));
  townGeometry.setAttribute('aSize', new BufferAttribute(new Float32Array(townSize), 1));
  townGeometry.setAttribute('aPhase', new BufferAttribute(new Float32Array(townPhase), 1));
  townGeometry.setAttribute('aBright', new BufferAttribute(new Float32Array(townBright), 1));
  const townUniforms = {
    uHeight: landUniforms.uHeight, uCover: landUniforms.uCover, uCurve: curve, uAmp: landUniforms.uAmp, uSize: landUniforms.uSize, uRegions: landUniforms.uRegions, uLift: landUniforms.uLift,
    uTime: shared.uTime, uDpr: { value: 1 }, uBaseY: { value: LAND_Y }, uBaseZ: { value: LAND_Z }, uOn: { value: 0 },
  };
  const towns = new Points(townGeometry, new ShaderMaterial({
    uniforms: townUniforms, vertexShader: townVertex, fragmentShader: townFragment, defines: octaves,
    blending: AdditiveBlending, depthWrite: false, transparent: true,
  }));
  towns.frustumCulled = false; // 位置在着色器里算，包围盒不准
  towns.renderOrder = 1.5;
  scene.add(towns);

  // 低云：两层高度不同、飘速不同，镜头移动时有前后层次（精简档只留一层）
  const cloudLayers = [{ y: 4.5, drift: 0, density: 0.3 }, { y: 8, drift: 3.7, density: 0.2 }].map(({ y, drift, density }) => {
    const g = new PlaneGeometry(LAND * 1.1, LAND * 1.1, 48, 48); // 要细分，才能跟着地面一起随弧度下沉
    g.rotateX(-Math.PI / 2);
    const mesh = new Mesh(g, new ShaderMaterial({
      uniforms: { uTime: shared.uTime, uCurve: curve, uOn: { value: 0 }, uDrift: { value: drift }, uDensity: { value: density }, uCenter: { value: new Vector2(0, LAND_Z) }, uRadius: { value: LAND * 0.55 } },
      vertexShader: cloudVertex, fragmentShader: cloudFragment, transparent: true, depthWrite: false, side: 2,
    }));
    mesh.position.set(0, LAND_Y + y, LAND_Z);
    mesh.renderOrder = 1.8;
    scene.add(mesh);
    return mesh;
  });
  let disposed = false, loaded = 0;
  const loader = new TextureLoader();
  const done = () => { if (++loaded === 4) { landUniforms.uReady.value = 1; warm = 2; } };
  loader.load('assets/data/nautical-cover.webp', tex => {
    if (disposed) { tex.dispose(); return; }
    landUniforms.uCover.value = tex; done();
  });
  const regionIds = new Uint8Array(256 * 256).fill(255); // 拾取用：每处属于哪块大陆
  loader.load('assets/data/nautical-regions.png', tex => {
    if (disposed) { tex.dispose(); return; }
    tex.magFilter = tex.minFilter = NearestFilter;
    tex.generateMipmaps = false;
    landUniforms.uRegions.value = tex;
    try {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (g) {
        g.imageSmoothingEnabled = false;
        g.drawImage(tex.image as CanvasImageSource, 0, 0, 256, 256);
        const px = g.getImageData(0, 0, 256, 256).data;
        for (let i = 0; i < 256 * 256; i++) regionIds[i] = Math.round(px[i * 4] / 60);
      }
    } catch { /* 读不到像素时退回按最近中心判断 */ }
    done();
  });
  loader.load('assets/data/nautical-tint.png', tex => {
    if (disposed) { tex.dispose(); return; }
    tex.colorSpace = SRGBColorSpace;
    landUniforms.uTint.value = tex; done();
  });
  const heights = new Float32Array(128 * 128); // 拾取用的低分辨率高度（载入后填上）
  const placeWorld = places.map(pl => new Vector3((pl.u / 100 - 0.5) * LAND, LAND_Y + LAND_AMP * 0.5, (pl.v / 100 - 0.5) * LAND + LAND_Z));
  loader.load('assets/data/nautical-terrain.webp', tex => {
    if (disposed) { tex.dispose(); return; }
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    landUniforms.uHeight.value = tex;
    (sea.material as ShaderMaterial).uniforms.uTerrain.value = tex;
    // 地名立在各自大陆的地面上方一点（读高度图在该处附近的最高值）
    try {
      const img = tex.image as CanvasImageSource & { width: number; height: number };
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d', { willReadFrequently: true });
      if (g) {
        g.drawImage(img, 0, 0, 128, 128);
        const px = g.getImageData(0, 0, 128, 128).data;
        for (let i = 0; i < 128 * 128; i++) heights[i] = (px[i * 4] + px[i * 4 + 1] / 256) / 255;
        places.forEach((pl, i) => {
          let top = 0;
          const cx = Math.round(pl.u / 100 * 127), cy = Math.round(pl.v / 100 * 127);
          for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) top = Math.max(top, heights[Math.min(127, Math.max(0, y)) * 128 + Math.min(127, Math.max(0, x))]);
          placeWorld[i].y = LAND_Y + top * LAND_AMP + 1.0;
        });
      }
    } catch { /* 读不到像素时保留默认高度 */ }
    done();
  });
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
    landUniforms.uShadow.value = full ? 1 : 0;
  };
  applyTier();
  // 预热：数据图载入后，穹顶之下的物体先「隐形地」画两帧（陆地透明、灯火与云不出光），
  // 让着色器按实际的渲染管线编译、纹理上传到显卡；否则进入穹顶的那一刻会卡住半秒以上。
  let warm = 0, warmMembrane = 2; // 薄膜同理：第一幕就隐形地画两帧，显形时不再卡顿

  // 指针涟漪：只在薄膜已显形时响应；节流到每 140ms 至多一个。
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let rippleIndex = 0, lastRipple = 0, lastPoint: Vector3 | null = null;
  const canvas = renderer.domElement;
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    pointer.set(Math.max(-1, Math.min(1, ndc.x)), Math.max(-1, Math.min(1, ndc.y))); // 视线跟随：全程都记录
    if (shared.uReveal.value < 0.35) return; // 涟漪只在薄膜显形后出现
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
  const pointerS = new Vector2(); // 平滑后的指针
  const deg = Math.PI / 180;
  let placesAlpha = 0;
  const focus = new Vector3(); let focusAmt = 0; // 选中大陆时镜头偏向的位置与程度
  const place = (p: number, time: number) => {
    const aspect = width / height;
    const portrait = aspect < 1;
    const back = aspect < 1.25 ? Math.min(1.35, 1.25 / aspect) : 1; // 竖屏时后退，让穹顶放得下
    const fov0 = portrait ? 70 : 46;
    const a1 = easeInOut(smooth(0, 0.2, p)), a2 = easeInOut(smooth(0.2, 0.45, p)), a4 = easeInOut(smooth(0.7, 0.93, p));
    // 一幕：一开始滚动，镜头就明显向前推、缓缓降到贴近海面；二幕继续推近，整座穹顶落进画面。
    const z2 = (190 - 36 * a1 - 20 * a2) * back;
    const y2 = 11 - 7.6 * a1 + 1.2 * a2;
    // 三幕：推近到薄膜前（.45–.56）→ 贴着薄膜慢慢穿过（.56–.65，约 9% 滚动）→ 进入穹顶（.65–.72）
    const k1 = easeInOut(smooth(0.45, 0.56, p)), k2 = smooth(0.56, 0.65, p), k3 = easeInOut(smooth(0.65, 0.72, p));
    const z3 = z2 + (70 - z2) * k1 + (50 - 70) * k2 + (26 - 50) * k3;
    const y3 = y2 + (7.5 - y2) * k1 + 7 * k3; // 进入后抬高一些，从陆地上方掠过
    // 四幕：升到扩大后的穹顶内高处，斜着俯瞰（约 45°）：山体立起来，远处的海与帷幕内壁留在画面上方。
    // 升到位以后随滚动继续缓缓推近、压低一点，起伏在移动中更容易读出来。离球心始终不超过扩大后的半径。
    const a5 = smooth(0.84, 0.97, p);
    // 镜头压低（约 25°）斜看：前景的大陆铺出画面，远处的大陆沉进夜雾与地平线，尺度感来自这段纵深
    const top = (portrait ? new Vector3(0, 46, 44) : new Vector3(0, 34, 60)).lerp(portrait ? new Vector3(0, 42, 40) : new Vector3(0, 30, 55), a5);
    const sway = Math.sin(time * 0.21) * 0.35 * (1 - a4);
    camPos.set(sway, y3 + (top.y - y3) * a4 + Math.sin(time * 0.33) * 0.12 * (1 - a4), z3 + (top.z - z3) * a4);
    look.set(0, 15 + 3 * a2, 0);
    lookIn.set(0, 8, -90);
    lookDown.set(0, 0, LAND_Z + (portrait ? 1 - 2 * a5 : -12 - 2 * a5));
    lookDown.lerp(focus, 0.14 * focusAmt); // 指着某块大陆时，视线缓缓偏向它
    look.lerp(lookIn, k1).lerp(lookDown, a4);

    // 视角：推近时只轻微收窄；穿过之后在一段滚动距离里慢慢撑开（不再一下闪进去）；俯瞰时略收
    const wide = portrait ? 82 : 66;
    let fov = fov0 - 6 * k1;
    fov += (wide - fov) * easeInOut(smooth(0.6, 0.72, p));
    fov += ((portrait ? 86 : 52) - fov) * a4;
    fov -= 3 * focusAmt * a4;
    camera.fov = fov;
    camera.aspect = aspect;
    camera.position.copy(camPos);
    camera.lookAt(look);
    // 视线跟随指针：轻微偏转，俯瞰时减半
    const follow = 1 - 0.5 * a4;
    camera.rotateY(-pointerS.x * 0.05 * follow);
    camera.rotateX(pointerS.y * 0.03 * follow);
    camera.updateProjectionMatrix();

    const dist = camPos.length();
    shared.uReveal.value = smooth(0.22, 0.42, p);
    // 进入之后，穹顶悄悄扩大到 1.3 倍；是否在内部按扩大后的半径判断
    const grow = 1 + (INNER - 1) * easeInOut(smooth(0.62, 0.76, p));
    shared.uInside.value = smooth(R * grow + 1, R * grow - 6, dist);
    membrane.scale.setScalar(grow);
    membraneFar.scale.setScalar(grow);
    const near = Math.exp(-Math.pow((dist - R) / 7, 2)) * (1 - smooth(0.62, 0.66, p));
    membraneUniforms.uNear.value = Math.exp(-Math.pow((dist - R) / 16, 2)) * smooth(0.45, 0.5, p) * (1 - smooth(0.66, 0.72, p));
    membraneUniforms.uRefract.value = tier === 'full' ? shared.uReveal.value * (1 + 5 * near) * (1 - shared.uInside.value) : 0;
    finish.uniforms.uCross.value = near * smooth(0.45, 0.55, p) * 0.8;
    placesAlpha = smooth(0.8, 0.88, p) * (1 - smooth(0.95, 0.99, p));
  };

  // 拾取：沿视线从地形最高处往下步进，碰到地面时按离哪个中心最近判断是哪块大陆；落在海上则为 -1。
  const ray = new Raycaster(), hitP = new Vector3();
  const heightAt = (x: number, z: number) => {
    const u = x / LAND + 0.5, v = (z - LAND_Z) / LAND + 0.5; // v 自北向南，与高度图的行一致
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    return heights[Math.min(127, Math.floor(v * 128)) * 128 + Math.min(127, Math.floor(u * 128))];
  };
  const pick = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !places.length) return -1;
    ray.setFromCamera(new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
    const { origin, direction } = ray.ray;
    if (direction.y >= -0.01) return -1;
    const t0 = (LAND_Y + LAND_AMP - origin.y) / direction.y, t1 = (LAND_Y - 12 - origin.y) / direction.y; // 远处地面随弧度下沉，往下多找一段
    for (let i = 0; i <= 96; i++) {
      hitP.copy(origin).addScaledVector(direction, t0 + (t1 - t0) * (i / 96));
      const h = heightAt(hitP.x, hitP.z);
      const cdx = hitP.x - origin.x, cdz = hitP.z - origin.z;
      if (hitP.y <= LAND_Y + h * LAND_AMP - (cdx * cdx + cdz * cdz) * curve.value) {
        if (h < 0.03) return -1;
        const u = hitP.x / LAND + 0.5, v = (hitP.z - LAND_Z) / LAND + 0.5;
        const id = regionIds[Math.min(255, Math.floor(v * 256)) * 256 + Math.min(255, Math.floor(u * 256))];
        if (id < places.length) return id;
        let best = -1, bd = Infinity;
        places.forEach((pl, k) => { const d = Math.hypot(u - pl.u / 100, v - pl.v / 100); if (d < bd) { bd = d; best = k; } });
        return best;
      }
    }
    return -1;
  };
  const stageEl = places[0]?.el.closest<HTMLElement>('.journey-stage') ?? null;
  let landHot = -1, labelHot = -1, live = false;
  const hot = () => (labelHot >= 0 ? labelHot : landHot);
  // 记下鼠标位置，每帧重新拾取：滚动时镜头在动、鼠标不动，选中的大陆也要跟着变
  let mouse: { x: number; y: number; free: boolean } | null = null;
  const onHover = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') { mouse = null; return; }
    mouse = { x: e.clientX, y: e.clientY, free: !(e.target as Element).closest?.('a, button, input') };
  };
  const onLeave = () => { mouse = null; };
  // 点在大陆上：等同点它的地名（站内路由接管跳转）。触屏轻点也走这里。
  const onClick = (e: MouseEvent) => {
    if (!live || e.defaultPrevented || e.button !== 0 || (e.target as Element).closest?.('a, button, input')) return;
    if (stageEl && !stageEl.contains(e.target as Node) && e.target !== document.body && e.target !== document.documentElement) return;
    const k = pick(e.clientX, e.clientY);
    if (k >= 0) { e.preventDefault(); places[k].el.click(); }
  };
  addEventListener('pointermove', onHover, { passive: true });
  addEventListener('click', onClick);
  document.addEventListener('pointerleave', onLeave);
  const labelOff = new AbortController();
  places.forEach((pl, k) => {
    pl.el.addEventListener('pointerenter', () => { labelHot = k; }, { signal: labelOff.signal });
    pl.el.addEventListener('pointerleave', () => { if (labelHot === k) labelHot = -1; }, { signal: labelOff.signal });
  });
  const updateHot = (dt: number) => {
    const wasLive = live;
    live = placesAlpha > 0.5;
    if (!live) { landHot = labelHot = -1; }
    else landHot = mouse?.free ? pick(mouse.x, mouse.y) : -1;
    const h = hot();
    // 弹簧：抬起时略微冲过头再落定，像被托起来；放下时干脆一些
    const step = Math.min(dt, 0.05);
    let most = 0;
    for (let k = 0; k < lifts.length; k++) {
      const goal = k === h ? 1 : 0;
      liftVel[k] += ((goal - lifts[k]) * (goal ? 70 : 90) - liftVel[k] * (goal ? 9 : 16)) * step;
      lifts[k] = Math.max(0, lifts[k] + liftVel[k] * step);
      most = Math.max(most, Math.min(1, lifts[k]));
    }
    anyHot.value = most;
    // 镜头只在指着地面时偏向那块大陆；指着地名时不动，否则地名会从鼠标下面滑走
    const lean = labelHot < 0 && landHot >= 0 ? landHot : -1;
    if (lean >= 0) focus.lerp(placeWorld[lean], focusAmt < 0.02 ? 1 : 1 - Math.exp(-dt * 4));
    focusAmt += ((lean >= 0 ? 1 : 0) - focusAmt) * (1 - Math.exp(-dt * 2.2));
    places.forEach((pl, k) => { pl.el.classList.toggle('is-live', live); pl.el.classList.toggle('is-hot', k === h); });
    stageEl?.classList.toggle('is-picking', live && landHot >= 0);
    if (wasLive && !live) stageEl?.classList.remove('is-picking');
  };

  const updatePlaces = () => {
    if (!places.length) return;
    for (let i = 0; i < places.length; i++) {
      const el = places[i].el;
      // 不在第四幕时清掉内联样式（CSS 默认透明），页面结构不随渲染时机变化。
      if (placesAlpha < 0.01) { if (el.hasAttribute('style')) el.removeAttribute('style'); continue; }
      projected.copy(placeWorld[i]);
      projected.y += lifts[i] * 1.6 * 0.8; // 地名跟着大陆一起抬起
      { const dx = projected.x - camera.position.x, dz = projected.z - camera.position.z; projected.y -= (dx * dx + dz * dz) * curve.value; } // 与地面同样随弧度下沉
      projected.project(camera);
      // 地名不出屏：窄屏上东西两侧的大陆只露出一部分，地名收在屏内 16px 处
      const half = el.offsetWidth / 2 + 16;
      const x = Math.min(width - half, Math.max(half, (projected.x * 0.5 + 0.5) * width)), y = (-projected.y * 0.5 + 0.5) * height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      // 靠近页头与页脚时淡出，不压住那两行文字
      const edge = smooth(height - 70, height - 120, y) * smooth(120, 170, y);
      el.style.opacity = String((placesAlpha * edge).toFixed(3));
      el.style.visibility = edge < 0.05 ? 'hidden' : '';
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
      townUniforms.uDpr.value = dpr;
      lampMaterial.uniforms.uDpr.value = dpr;
      membraneUniforms.uResolution.value.set(w * dpr, h * dpr);
      sceneTarget?.setSize(Math.max(1, Math.round(w * dpr * 0.5)), Math.max(1, Math.round(h * dpr * 0.5)));
    },
    frame(dt, time) {
      renderer.setClearColor(0x07110f, 1); // 渲染器与其他场景共用，每帧设回自己的底色
      // 镜头跟随滚动更柔和：滚轮一格一格的跳动被抹平成滑行
      shown = first ? target : shown + (target - shown) * (1 - Math.exp(-dt * 3.4));
      pointerS.lerp(pointer, 1 - Math.exp(-dt * 2.5));
      first = false;
      shared.uTime.value = time;
      finish.uniforms.uTime.value = time;
      place(shown, time);
      sky.position.copy(camera.position);
      const revealed = shared.uReveal.value > 0.001;
      if (sceneTarget && revealed && shared.uInside.value < 1) {
        // 折射只取帷幕外的世界：薄膜与内部的航海图都不进入离屏目标。
        membrane.visible = membraneFar.visible = chart.visible = towns.visible = false;
        for (const c of cloudLayers) c.visible = false;
        renderer.setRenderTarget(sceneTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      }
      membrane.visible = membraneFar.visible = revealed || warmMembrane > 0;
      lamp.visible = shared.uInside.value < 0.5; // 船灯在帷幕之外，进入穹顶后不再挂在地平线上
      if (warmMembrane > 0) warmMembrane--;
      chart.visible = shared.uInside.value > 0.001 || warm > 0;
      const landOn = shared.uInside.value * landUniforms.uReady.value;
      curve.value = CURVE * shared.uInside.value;
      (sea.material as ShaderMaterial).uniforms.uLandOn.value = landOn;
      townUniforms.uOn.value = landOn;
      towns.visible = chart.visible;
      for (const c of cloudLayers) { (c.material as ShaderMaterial).uniforms.uOn.value = landOn; c.visible = chart.visible && (c === cloudLayers[0] || tier === 'full'); }
      if (warm > 0) warm--;
      composer.render(dt);
      updatePlaces();
      updateHot(dt);
    },
    setTier(next) { tier = next; if (tier === 'static') return false; applyTier(); return true; },
    dispose() {
      disposed = true;
      removeEventListener('pointermove', onPointer);
      removeEventListener('pointermove', onHover);
      removeEventListener('click', onClick);
      document.removeEventListener('pointerleave', onLeave);
      labelOff.abort();
      places.forEach(pl => pl.el.classList.remove('is-live', 'is-hot'));
      stageEl?.classList.remove('is-picking');
      landUniforms.uTint.value?.dispose();
      landUniforms.uHeight.value?.dispose();
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
