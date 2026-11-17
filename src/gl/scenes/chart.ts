// 地理馆「立体航海图」：航海图贴在细分平面上，按离线派生的高度图隆起成低幅度的浮雕。
// 旋转角度、选中的大陆、悬停的大陆都来自原航海图室的状态（见 features/nautical.ts），这里只负责画。
// 界门弧线：魔法联合部总部在中央大陆的普诺伊瓦，各大陆分部经界门与总部往来，
// 所以只画中央大陆与其余四块大陆之间的四条弧线，表示「存在往来」，不表示航线、距离或费用。
import {
  Color, CylinderGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, QuadraticBezierCurve3, Scene,
  ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, TubeGeometry, Vector2, Vector3, LinearFilter,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';
import { arcFragment, arcVertex, groundFragment, groundVertex, reliefFragment, reliefVertex, rimFragment, rimVertex, tiltShader } from './chart-shaders';

const S = 40; // 航海图边长
const DISC = S * 0.49; // 圆盘半径（含外圈花边）
const AMP = 1.15; // 浮雕最高处（约为边长的 3%）
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
}
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
    uMap: { value: null as Texture | null }, uHeight: { value: null as Texture | null },
    uTexel: { value: new Vector2(1 / 512, 1 / 512) }, uAmp: { value: AMP }, uSize: { value: S },
    uTime: { value: 0 }, uFocus: { value: 0 }, uHover: { value: 0 },
    uCenters: { value: centers }, uSel: { value: 0 }, uHot: { value: -1 },
    uLight: { value: lightLocal }, uInk: { value: lin('#5c4628') }, uShadowTint: { value: lin('#b9c3c8') },
  };
  const reliefGeometry = new PlaneGeometry(S, S, tier === 'full' ? 320 : 160, tier === 'full' ? 320 : 160);
  reliefGeometry.rotateX(-Math.PI / 2);
  const relief = new Mesh(reliefGeometry, new ShaderMaterial({ uniforms: reliefUniforms, vertexShader: reliefVertex, fragmentShader: reliefFragment }));
  relief.visible = false;
  group.add(relief);

  // 圆盘侧缘
  const rimUniforms = { uColor: { value: lin('#8d7246') }, uLight: { value: lightWorld } };
  const rim = new Mesh(new CylinderGeometry(DISC, DISC, 0.9, 160, 1, true), new ShaderMaterial({ uniforms: rimUniforms, vertexShader: rimVertex, fragmentShader: rimFragment }));
  rim.position.y = -0.45;
  group.add(rim);

  // 桌面
  const groundUniforms = { uInner: { value: lin('#e4d3b1') }, uOuter: { value: lin('#b59a6a') }, uDisc: { value: DISC }, uFar: { value: 70 }, uShadowOffset: { value: new Vector2(1.4, 1.0) } };
  const ground = new Mesh(new PlaneGeometry(600, 600), new ShaderMaterial({ uniforms: groundUniforms, vertexShader: groundVertex, fragmentShader: groundFragment }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9;
  scene.add(ground);

  // 大陆锚点（物体空间），高度取浮雕的大致高处
  const local = positions.map(([u, v]) => new Vector3((u / 100 - 0.5) * S, AMP * 0.85, (v / 100 - 0.5) * S));

  // 界门弧线：中央大陆 → 其余四块
  const arcs = local.slice(1).map((to, i) => {
    const from = local[0];
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 5.5;
    const curve = new QuadraticBezierCurve3(from.clone(), mid, to.clone());
    const material = new ShaderMaterial({
      uniforms: { uColor: { value: lin('#d4b36e') }, uTime: reliefUniforms.uTime, uGlow: { value: 0 }, uPhase: { value: i * 0.27 }, uReveal: { value: 0 } },
      vertexShader: arcVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, blending: 2, // AdditiveBlending
    });
    const mesh = new Mesh(new TubeGeometry(curve, 64, 0.075, 6, false), material);
    mesh.renderOrder = 2;
    group.add(mesh);
    return { mesh, material, target: i + 1 };
  });

  // 贴图
  let disposed = false, ready = 0;
  const loader = new TextureLoader();
  const loaded = () => { if (++ready === 2) relief.visible = true; };
  loader.load('assets/nautical-chart-1254.webp', t => {
    if (disposed) return t.dispose();
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    reliefUniforms.uMap.value = t; loaded();
  });
  loader.load('assets/data/nautical-height.png', t => {
    if (disposed) return t.dispose();
    t.magFilter = LinearFilter;
    reliefUniforms.uHeight.value = t; loaded();
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
    },
    frame(dt, time) {
      renderer.setClearColor(0xc9b088, 1);
      const k = first ? 1 : 1 - Math.exp(-dt * 3.2);
      first = false;
      reliefUniforms.uTime.value = time;
      const angle = state.angle() * deg;
      group.rotation.y = -angle; // 顺时针为正：从上往下看顺时针转
      lightLocal.copy(lightWorld).applyAxisAngle(new Vector3(0, 1, 0), angle);

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
      const wantDist = fitDistance(DISC) * (1 - 0.45 * focusAmt);
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
      scene.traverse(o => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as ShaderMaterial | undefined;
        mat?.dispose?.();
      });
    },
  };
}

