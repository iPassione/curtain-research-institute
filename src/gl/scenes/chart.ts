// 地理馆「立体航海图」：航海图贴在细分平面上，按离线派生的高度图隆起成低幅度的浮雕。
// 旋转角度、选中的大陆、悬停的大陆都来自原航海图室的状态（见 features/nautical.ts），这里只负责画。
// 界门弧线：魔法联合部总部在中央大陆的普诺伊瓦，各大陆分部经界门与总部往来，
// 所以只画中央大陆与其余四块大陆之间的四条弧线，表示「存在往来」，不表示航线、距离或费用。
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, CylinderGeometry, Group, Mesh, Points, RingGeometry, PerspectiveCamera, PlaneGeometry, QuadraticBezierCurve3, Scene,
  ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, TubeGeometry, Vector2, Vector3, LinearFilter,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';
import { arcFragment, arcVertex, groundFragment, groundVertex, reliefFragment, reliefVertex, rimFragment, rimVertex, tiltShader, townFragment, townVertex } from './chart-shaders';
import { TOWNS, VILLAGES } from './terrain-towns';

const S = 40; // 航海图边长
const DISC = S * 0.49; // 圆盘半径（含外圈花边）
const AMP = 1.0; // 浮雕最高处（约为边长的 2.5%，像一张立体沙盘）
const lin = (hex: string) => new Color(hex);
const deg = Math.PI / 180;

export interface ChartState {
  /** 当前旋转角度（度，顺时针为正，与原转盘一致）。 */
  angle(): number;
  /** 选中的大陆序号；focused 为 true 表示用户点选过，镜头飞近。 */
  selected(): { index: number; focused: boolean };
  /** 悬停或键盘聚焦的大陆序号，没有时为 -1。 */
  hot(): number;
  /** 额外俯仰（度），由鼠标纵向拖动给出。 */
  pitch(): number;
  /** 一天中的时刻（0–24）。不提供时为 15 点，与原光照一致。 */
  hour?(): number;
  /** 缩放倍数（1 为总览）。 */
  zoom?(): number;
  /** 界门往来：从 from 到 to 的一趟，start 为开始时刻（performance.now 毫秒）。 */
  route?(): { from: number; to: number; start: number } | null;
}
/** 一趟界门往来的动画时长（毫秒）。 */
export const ROUTE_MS = 2600;
export interface ChartScene extends GLScene { places: Vector3[] }

/** positions：五大陆在图上的百分比位置（与原转盘点位一致）。onProject 每帧给出各大陆在画布上的像素坐标。 */
export function createChartScene(renderer: WebGLRenderer, startTier: Tier, positions: number[][], state: ChartState, onProject: (points: { x: number; y: number; visible: boolean }[]) => void): ChartScene {
  let tier = startTier;
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 1, 600);
  const group = new Group();
  scene.add(group);

  // 光源：西北偏高处的暖光（在物体空间里随圆盘旋转反向换算）
  const lightWorld = new Vector3(-0.55, 0.75, -0.4).normalize();
  const lightLocal = new Vector3();

  // 浮雕
  const centers = positions.map(([u, v]) => new Vector2(u / 100, 1 - v / 100));
  const reliefUniforms = {
    uMap: { value: null as Texture | null }, uHeight: { value: null as Texture | null }, uCover: { value: null as Texture | null },
    uTexel: { value: new Vector2(1 / 2048, 1 / 2048) }, uAmp: { value: AMP }, uSize: { value: S },
    uTime: { value: 0 }, uFocus: { value: 0 }, uHover: { value: 0 },
    uCenters: { value: centers }, uSel: { value: 0 }, uHot: { value: -1 },
    uLight: { value: lightLocal }, uInk: { value: lin('#5c4628') }, uShadowTint: { value: lin('#b9c3c8') },
    uSunCol: { value: new Color(1, 1, 1) }, uAmbient: { value: 0.7 }, uSunStr: { value: 0.42 }, uNight: { value: 0 },
  };
  const reliefGeometry = new PlaneGeometry(S, S, tier === 'full' ? 400 : 200, tier === 'full' ? 400 : 200);
  reliefGeometry.rotateX(-Math.PI / 2);
  const relief = new Mesh(reliefGeometry, new ShaderMaterial({ uniforms: reliefUniforms, vertexShader: reliefVertex, fragmentShader: reliefFragment }));
  relief.visible = false;
  group.add(relief);

  // 圆盘侧缘
  const rimColor = lin('#8d7246');
  const rimUniforms = { uColor: { value: rimColor.clone() }, uLight: { value: lightWorld } };
  const rim = new Mesh(new CylinderGeometry(DISC, DISC, 0.9, 160, 1, true), new ShaderMaterial({ uniforms: rimUniforms, vertexShader: rimVertex, fragmentShader: rimFragment }));
  rim.position.y = -0.45;
  group.add(rim);

  // 桌面
  const groundInner = lin('#e4d3b1'), groundOuter = lin('#b59a6a'), nightInner = lin('#2b3138'), nightOuter = lin('#14181d');
  const groundUniforms = { uInner: { value: groundInner.clone() }, uOuter: { value: groundOuter.clone() }, uDisc: { value: DISC }, uFar: { value: 70 }, uShadowOffset: { value: new Vector2(1.4, 1.0) } };
  const ground = new Mesh(new PlaneGeometry(600, 600), new ShaderMaterial({ uniforms: groundUniforms, vertexShader: groundVertex, fragmentShader: groundFragment }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9;
  scene.add(ground);

  // 城镇灯火：入夜后亮起
  const townPos: number[] = [], townSize: number[] = [], townPhase: number[] = [], townBright: number[] = [];
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [u, v, sz] of TOWNS) for (let i = 0, n = 2 + Math.round(sz * 5); i < n; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (0.002 + sz * 0.005);
    townPos.push(u / 100 + Math.cos(a) * r, 0, 1 - v / 100 + Math.sin(a) * r); townSize.push(1 + sz); townPhase.push(rand()); townBright.push(1);
  }
  for (const [u, v, sz] of VILLAGES) { townPos.push(u / 100, 0, 1 - v / 100); townSize.push(0.6 + sz); townPhase.push(rand()); townBright.push(0.4 + sz * 0.5); }
  const townGeometry = new BufferGeometry();
  townGeometry.setAttribute('position', new BufferAttribute(new Float32Array(townPos), 3));
  townGeometry.setAttribute('aSize', new BufferAttribute(new Float32Array(townSize), 1));
  townGeometry.setAttribute('aPhase', new BufferAttribute(new Float32Array(townPhase), 1));
  townGeometry.setAttribute('aBright', new BufferAttribute(new Float32Array(townBright), 1));
  const townUniforms = { uHeight: reliefUniforms.uHeight, uAmp: reliefUniforms.uAmp, uSize: reliefUniforms.uSize, uDpr: { value: 1 }, uTime: reliefUniforms.uTime, uOn: { value: 0 } };
  const towns = new Points(townGeometry, new ShaderMaterial({ uniforms: townUniforms, vertexShader: townVertex, fragmentShader: townFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  towns.frustumCulled = false;
  towns.renderOrder = 1;
  towns.visible = false;
  group.add(towns);

  // 大陆锚点（物体空间），高度取浮雕的大致高处
  const local = positions.map(([u, v]) => new Vector3((u / 100 - 0.5) * S, AMP * 0.85, (v / 100 - 0.5) * S));

  // 界门弧线：中央大陆 → 其余四块
  const arcs = local.slice(1).map((to, i) => {
    const from = local[0];
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 5.5;
    const curve = new QuadraticBezierCurve3(from.clone(), mid, to.clone());
    const material = new ShaderMaterial({
      uniforms: { uColor: { value: lin('#d4b36e') }, uTime: reliefUniforms.uTime, uGlow: { value: 0 }, uPhase: { value: i * 0.27 }, uReveal: { value: 0 }, uHead: { value: -1 } },
      vertexShader: arcVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, blending: 2, // AdditiveBlending
    });
    const mesh = new Mesh(new TubeGeometry(curve, 64, 0.075, 6, false), material);
    mesh.renderOrder = 2;
    group.add(mesh);
    return { mesh, material, target: i + 1 };
  });

  // 界门往来：所选两块大陆之间的一道弧线，一点光沿弧线走过去，抵达时在目的地荡开一圈
  let routeKey = '', routeCurve: QuadraticBezierCurve3 | null = null, routeMesh: Mesh | null = null;
  const routeMaterial = new ShaderMaterial({
    uniforms: { uColor: { value: lin('#f1e2b4') }, uTime: reliefUniforms.uTime, uGlow: { value: 1 }, uPhase: { value: 0 }, uReveal: { value: 0 }, uHead: { value: 0 } },
    vertexShader: arcVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const travellerGeometry = new BufferGeometry();
  travellerGeometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  const travellerMaterial = new ShaderMaterial({
    uniforms: { uColor: { value: lin('#fff2c2') }, uSize: { value: 34 }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */ `uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uAlpha; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * (smoothstep(0.5, 0.0, d) * 0.9 + smoothstep(0.12, 0.0, d) * 2.0) * uAlpha, 1.0); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
  });
  const traveller = new Points(travellerGeometry, travellerMaterial);
  traveller.frustumCulled = false;
  traveller.renderOrder = 4;
  group.add(traveller);
  const ringMaterial = new ShaderMaterial({
    uniforms: { uColor: { value: lin('#f1e2b4') }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor * uAlpha, 1.0); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, side: 2,
  });
  const ring = new Mesh(new RingGeometry(0.85, 1, 64), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 4;
  group.add(ring);
  const tmp = new Vector3();
  const updateRoute = () => {
    const r = state.route?.() ?? null;
    const key = r ? `${r.from}-${r.to}-${r.start}` : '';
    if (key !== routeKey) {
      routeKey = key;
      if (routeMesh) { group.remove(routeMesh); routeMesh.geometry.dispose(); routeMesh = null; }
      routeCurve = null;
      if (r && r.from !== r.to) {
        const a = local[r.from], b = local[r.to];
        const mid = a.clone().lerp(b, 0.5);
        mid.y += 4 + a.distanceTo(b) * 0.28;
        routeCurve = new QuadraticBezierCurve3(a.clone(), mid, b.clone());
        routeMesh = new Mesh(new TubeGeometry(routeCurve, 80, 0.09, 6, false), routeMaterial);
        routeMesh.renderOrder = 3;
        group.add(routeMesh);
      }
    }
    if (!r || !routeCurve) { travellerMaterial.uniforms.uAlpha.value = 0; ringMaterial.uniforms.uAlpha.value = 0; routeMaterial.uniforms.uReveal.value = 0; return; }
    const t = (performance.now() - r.start) / ROUTE_MS;
    const travel = Math.min(1, Math.max(0, t / 0.72));
    const eased = travel < 0.5 ? 2 * travel * travel : 1 - Math.pow(-2 * travel + 2, 2) / 2;
    routeCurve.getPoint(eased, tmp);
    routeMaterial.uniforms.uHead.value = travel < 1 ? eased : 1.2;
    (travellerGeometry.attributes.position.array as Float32Array).set([tmp.x, tmp.y, tmp.z]);
    travellerGeometry.attributes.position.needsUpdate = true;
    travellerMaterial.uniforms.uAlpha.value = travel < 1 ? Math.min(1, t * 6) : Math.max(0, 1 - (t - 0.72) * 5);
    routeMaterial.uniforms.uReveal.value = Math.min(1, t * 4) * (t > 1.6 ? Math.max(0.35, 1 - (t - 1.6)) : 1);
    const arrive = (t - 0.72) / 0.28;
    ring.position.copy(local[state.route!()!.to]).setY(AMP * 0.9);
    ring.scale.setScalar(0.3 + Math.max(0, arrive) * 4.5);
    ringMaterial.uniforms.uAlpha.value = arrive > 0 && arrive < 1 ? (1 - arrive) * 1.2 : 0;
  };

  // 贴图
  let disposed = false, ready = 0;
  const loader = new TextureLoader();
  const loaded = () => { if (++ready === 3) relief.visible = towns.visible = true; };
  loader.load('assets/nautical-chart-1254.webp', t => {
    if (disposed) return t.dispose();
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    reliefUniforms.uMap.value = t; loaded();
  });
  loader.load('assets/data/nautical-terrain.webp', t => {
    if (disposed) return t.dispose();
    t.magFilter = LinearFilter;
    reliefUniforms.uHeight.value = t; loaded();
  });
  loader.load('assets/data/nautical-cover.webp', t => {
    if (disposed) return t.dispose();
    reliefUniforms.uCover.value = t; loaded();
  });

  // 后期
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const tilt = new ShaderPass(tiltShader);
  composer.addPass(tilt);
  composer.addPass(new OutputPass());
  const applyTier = () => { tilt.enabled = tier === 'full'; };
  applyTier();

  // 镜头：总览时俯视整张图；点选后飞近该大陆并更陡地俯看。
  let width = 1, height = 1, first = true, arcReveal = 0;
  const target = new Vector3(), want = new Vector3(), eye = new Vector3();
  let dist = 60, pitch = 52, focusAmt = 0, hoverAmt = 0;
  const projected = positions.map(() => ({ x: 0, y: 0, visible: false }));
  const world = new Vector3();

  const fitDistance = (radius: number) => {
    const vfov = camera.fov * deg, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    // 倾斜后离镜头近的一侧看起来更宽；窄画面再多留一些边。
    const margin = camera.aspect < 1.4 ? 1.32 : 1.12;
    return (radius * margin) / Math.tan(Math.min(vfov, hfov) / 2);
  };

  return {
    places: local,
    resize(w, h, dpr) {
      width = w; height = h;
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      tilt.uniforms.uTexel.value = [1 / (w * dpr), 1 / (h * dpr)];
      townUniforms.uDpr.value = dpr;
    },
    frame(dt, time) {
      renderer.setClearColor(new Color(0x1c2126).lerp(new Color(0xc9b088), Math.min(1, Math.max(0, (Math.sin((((state.hour?.() ?? 15) - 6) / 12) * Math.PI) + 0.12) / 0.4))), 1);
      const k = first ? 1 : 1 - Math.exp(-dt * 3.2);
      first = false;
      reliefUniforms.uTime.value = time;
      const angle = state.angle() * deg;
      group.rotation.y = -angle; // 顺时针为正：从上往下看顺时针转

      // 昼夜：太阳绕图一周（15 点时与原光照方向一致）；夜里换成偏冷的月光，整体压暗
      const hour = state.hour?.() ?? 15;
      const sunAz = Math.atan2(-0.4, -0.55) + ((hour - 15) / 24) * Math.PI * 2;
      const sunElev = Math.sin(((hour - 6) / 12) * Math.PI); // 6 点日出，18 点日落
      const day = Math.min(1, Math.max(0, (sunElev + 0.12) / 0.4));
      const elev = (day > 0.02 ? Math.max(0.12, sunElev) : 0.5) * 1.0;
      const lightAz = day > 0.02 ? sunAz : sunAz + Math.PI; // 夜里月亮在另一侧
      lightWorld.set(Math.cos(lightAz) * Math.cos(elev), Math.sin(Math.max(0.12, elev)), Math.sin(lightAz) * Math.cos(elev)).normalize();
      lightLocal.copy(lightWorld).applyAxisAngle(new Vector3(0, 1, 0), angle);
      const dusk = Math.max(0, 1 - Math.abs(sunElev) / 0.35) * day; // 晨昏时偏暖
      (reliefUniforms.uSunCol.value as Color).setRGB(1, 1 - 0.18 * dusk, 1 - 0.35 * dusk).lerp(new Color(0.55, 0.66, 0.95), 1 - day);
      reliefUniforms.uAmbient.value = 0.16 + 0.54 * day;
      reliefUniforms.uSunStr.value = 0.2 + 0.22 * day + 0.15 * dusk;
      reliefUniforms.uNight.value = 1 - day;
      townUniforms.uOn.value = Math.max(0, 1 - day * 1.6); // 黄昏开始亮灯
      (groundUniforms.uInner.value as Color).copy(nightInner).lerp(groundInner, day);
      (groundUniforms.uOuter.value as Color).copy(nightOuter).lerp(groundOuter, day);
      (rimUniforms.uColor.value as Color).copy(rimColor).multiplyScalar(0.35 + 0.65 * day);
      groundUniforms.uShadowOffset.value.set(-lightWorld.x * 2.2, -lightWorld.z * 2.2);
      updateRoute();

      const sel = state.selected(), hot = state.hot();
      reliefUniforms.uSel.value = sel.index;
      reliefUniforms.uHot.value = hot;
      focusAmt += ((sel.focused ? 1 : 0) - focusAmt) * k;
      hoverAmt += ((hot >= 0 ? 1 : 0) - hoverAmt) * (first ? 1 : 1 - Math.exp(-dt * 8));
      reliefUniforms.uFocus.value = focusAmt;
      reliefUniforms.uHover.value = hoverAmt;
      arcReveal += (1 - arcReveal) * (1 - Math.exp(-dt * 1.2));
      for (const a of arcs) {
        const on = sel.index === a.target || hot === a.target || sel.index === 0 && sel.focused ? 1 : hot === 0 ? 0.6 : 0;
        a.material.uniforms.uGlow.value += (on - a.material.uniforms.uGlow.value) * (1 - Math.exp(-dt * 6));
        a.material.uniforms.uReveal.value = arcReveal;
      }

      camera.aspect = width / height;
      camera.fov = camera.aspect < 1 ? 44 : 32;
      // 目标点：总览为圆心，聚焦时为选中大陆（随圆盘旋转后的位置）
      want.set(0, 0, 0);
      if (sel.focused) want.copy(local[sel.index]).setY(0).applyAxisAngle(new Vector3(0, 1, 0), -angle);
      target.lerp(want, k);
      const wantDist = fitDistance(DISC) * (1 - 0.45 * focusAmt) / (state.zoom?.() ?? 1);
      dist += (wantDist - dist) * k;
      const wantPitch = Math.min(80, Math.max(30, 52 + 10 * focusAmt + state.pitch()));
      pitch += (wantPitch - pitch) * k;
      eye.set(0, Math.sin(pitch * deg) * dist, Math.cos(pitch * deg) * dist).add(target);
      camera.position.copy(eye);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      tilt.uniforms.uFocusY.value = 0.5;

      composer.render(dt);

      group.updateMatrixWorld();
      for (let i = 0; i < local.length; i++) {
        world.copy(local[i]).applyMatrix4(group.matrixWorld).project(camera);
        projected[i].x = (world.x * 0.5 + 0.5) * width;
        projected[i].y = (-world.y * 0.5 + 0.5) * height;
        projected[i].visible = world.z < 1 && projected[i].x > -20 && projected[i].x < width + 20 && projected[i].y > -20 && projected[i].y < height + 20;
      }
      onProject(projected);
    },
    setTier(next) { tier = next; if (tier === 'static') return false; applyTier(); return true; },
    dispose() {
      disposed = true;
      composer.dispose();
      reliefUniforms.uMap.value?.dispose();
      reliefUniforms.uHeight.value?.dispose();
      reliefUniforms.uCover.value?.dispose();
      scene.traverse(o => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as ShaderMaterial | undefined;
        mat?.dispose?.();
      });
    },
  };
}

