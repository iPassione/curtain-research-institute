// 魔法研究室「施法台」场景：GPU 上模拟的粒子（完整档 256² ≈ 6.5 万，精简档 128² ≈ 1.6 万），
// 正交镜头俯看一张深绿台面。阶段权重由外部的施法状态机给出，这里每帧平滑过渡。
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, FloatType, HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry,
  Points, Scene, ShaderMaterial, Vector2,
} from 'three';
import { GPUComputationRenderer, type Variable } from 'three/addons/misc/GPUComputationRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { fxShader, particleFragment, particleVertex, positionShader, tableFragment, tableVertex, velocityShader } from './casting-shaders';

/** 台面坐标：宽 8、高 5.2（与原演示图 800×520 一致，1 单位 = 100 像素）。 */
const W = 8, H = 5.2, RADIUS = 3.15; // RADIUS：台面边缘弧线（台面着色器仍保留，目前不显示）
const lin = (hex: string) => new Color(hex);

export type Element = 0 | 1 | 2; // 火焰、冰霜、防御
export interface CastingWeights {
  gather: number; shape: number; stable: number;
  element: Element; phase: number;
}
/** 各效果从开始到粒子重新铺开、淡入完毕的总时长（秒）。 */
export const FX_DURATION: Record<Element | 3, number> = { 0: 3.1, 1: 3.3, 2: 2.9, 3: 1.7 };
export interface CastingScene extends GLScene {
  weights: CastingWeights;
  toTable(clientX: number, clientY: number, rect: DOMRect): Vector2;
  /** 导出：element 的专属效果，dir 为瞄准方向（台面坐标）。 */
  release(element: Element, dir: Vector2): void;
  /** 反噬：结构溃散。 */
  collapse(): void;
}

/** 能否在这块显卡上做浮点纹理计算；不能时返回 null，调用方保留原 SVG 演示。 */
export function floatType(renderer: WebGLRenderer) {
  if (renderer.capabilities.maxVertexTextures === 0) return null;
  if (renderer.extensions.has('EXT_color_buffer_float')) return FloatType;
  if (renderer.extensions.has('EXT_color_buffer_half_float')) return HalfFloatType;
  return null;
}

export function createCastingScene(renderer: WebGLRenderer, startTier: Tier, type: typeof FloatType | typeof HalfFloatType): CastingScene {
  let tier = startTier;
  const size = tier === 'full' ? 256 : 128;
  const scene = new Scene();
  const camera = new OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -10, 10);

  // GPU 模拟
  const gpu = new GPUComputationRenderer(size, size, renderer);
  gpu.setDataType(type);
  const pos0 = gpu.createTexture(), vel0 = gpu.createTexture();
  const pd = pos0.image.data as Float32Array;
  let seed = 1077;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < size * size; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
    pd[i * 4] = Math.cos(a) * r * 3.2;
    pd[i * 4 + 1] = 0.15 + Math.sin(a) * r * 2.0;
    pd[i * 4 + 2] = (rand() - 0.5) * 0.6;
    pd[i * 4 + 3] = 0;
  }
  const velVar: Variable = gpu.addVariable('textureVelocity', velocityShader, vel0);
  const posVar: Variable = gpu.addVariable('texturePosition', positionShader, pos0);
  gpu.setVariableDependencies(velVar, [velVar, posVar]);
  gpu.setVariableDependencies(posVar, [velVar, posVar]);
  const vu = velVar.material.uniforms, pu = posVar.material.uniforms;
  Object.assign(vu, {
    uTime: { value: 0 }, uDt: { value: 0 }, uGather: { value: 0 }, uShape: { value: 0 }, uStable: { value: 0 }, uElement: { value: 0 },
    uFx: { value: -1 }, uFxT: { value: 0 }, uBurst: { value: 0 }, uWardGrow: { value: 0 }, uImpact: { value: new Vector2() },
  });
  Object.assign(pu, { uDt: vu.uDt });
  const error = gpu.init();
  if (error) throw new Error(error);

  // 台面
  const tableUniforms = {
    uDeep: { value: lin('#0d2526') }, uField: { value: lin('#3d5f55') }, uLine: { value: lin('#c6bd8d') },
    uNode: { value: lin('#25413b') }, uNodeOn: { value: lin('#e3d5a1') },
    uPhase: { value: 0 }, uArc: { value: 0 }, uRadius: { value: RADIUS }, uPx: { value: 0.01 },
  };
  const table = new Mesh(new PlaneGeometry(W * 3, H * 3), new ShaderMaterial({ uniforms: tableUniforms, vertexShader: tableVertex, fragmentShader: tableFragment }));
  table.position.z = -2;
  scene.add(table);

  // 粒子
  const refs = new Float32Array(size * size * 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = y * size + x; refs[i * 2] = (x + 0.5) / size; refs[i * 2 + 1] = (y + 0.5) / size; }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(size * size * 3), 3));
  geometry.setAttribute('aRef', new BufferAttribute(refs, 2));
  const particleUniforms = {
    uPositions: { value: null as unknown }, uVelocities: { value: null as unknown },
    uSize: { value: tier === 'full' ? 2.2 : 3.0 }, uDpr: { value: 1 }, uDensity: { value: tier === 'full' ? 0.3 : 0.55 },
    uShape: vu.uShape, uElement: vu.uElement, uGather: vu.uGather, uStable: vu.uStable,
    uColGather: { value: lin('#fff2c2') }, uColFire: { value: lin('#ff9a3c') }, uColFireHot: { value: lin('#ffe9b0') },
    uColFrost: { value: lin('#cfe9ff') }, uColWard: { value: lin('#e3c87a') }, uColEmber: { value: lin('#8a2a10') },
    uFade: { value: 1 }, uFx: vu.uFx, uFxT: vu.uFxT, uWardGrow: vu.uWardGrow, uBand: { value: -2 },
  };
  const points = new Points(geometry, new ShaderMaterial({
    uniforms: particleUniforms, vertexShader: particleVertex, fragmentShader: particleFragment,
    blending: AdditiveBlending, depthWrite: false, depthTest: false, transparent: true,
  }));
  points.frustumCulled = false;
  scene.add(points);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.55, 0.45, 0.72);
  composer.addPass(bloom);
  const fx = new ShaderPass(fxShader);
  composer.addPass(fx);
  composer.addPass(new OutputPass());
  const applyTier = () => { bloom.enabled = tier === 'full'; };
  applyTier();

  const weights: CastingWeights = { gather: 0, shape: 0, stable: 0, element: 0, phase: 0 };
  const shown = { gather: 0, shape: 0, stable: 0, phase: 0 };
  // 效果时间线：kind = -1 表示没有效果在进行
  const effect = { kind: -1 as Element | 3 | -1, t: 0, impact: new Vector2(), burstAt: 0, burstDone: false, respawned: false };
  const respawn = () => {
    // 粒子就地熄灭后重新铺开：把初始分布写回两张位置纹理，速度清零；所有权重立刻归零（不倒放）
    for (const rt of posVar.renderTargets) gpu.renderTexture(pos0, rt);
    for (const rt of velVar.renderTargets) gpu.renderTexture(vel0, rt);
    shown.gather = shown.shape = shown.stable = 0;
  };
  const start = (kind: Element | 3, dir?: Vector2) => {
    effect.kind = kind; effect.t = 0; effect.burstDone = false; effect.respawned = false;
    effect.burstAt = kind === 0 ? 0.32 : 0.0;
    if (dir) effect.impact.set(0, 0.15).addScaledVector(dir, 2.3);
    particleUniforms.uFade.value = 1;
  };
  const toUv = (p: Vector2) => [(p.x - camera.left) / (camera.right - camera.left), (p.y - camera.bottom) / (camera.top - camera.bottom)];
  let width = 1, height = 1, first = true, viewW = W, viewH = H;

  return {
    weights,
    toTable(clientX, clientY, rect) {
      return new Vector2(((clientX - rect.left) / rect.width - 0.5) * viewW, -((clientY - rect.top) / rect.height - 0.5) * viewH);
    },
    resize(w, h, dpr) {
      width = w; height = h;
      // 台面完整放进画面：按宽高中较紧的一边适配
      const aspect = w / h;
      viewW = Math.max(W, H * aspect); viewH = viewW / aspect;
      if (viewH < H) { viewH = H; viewW = H * aspect; }
      camera.left = -viewW / 2; camera.right = viewW / 2; camera.top = viewH / 2; camera.bottom = -viewH / 2;
      camera.updateProjectionMatrix();
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      bloom.resolution.set(w * dpr * 0.5, h * dpr * 0.5);
      fx.uniforms.uAspect.value = aspect;
      particleUniforms.uDpr.value = dpr;
      tableUniforms.uPx.value = viewH / (h * dpr) * 1.2;
    },
    frame(dt, time) {
      renderer.setClearColor(0x0d2526, 1);
      // 各阶段权重平滑过渡：导出与反噬来得快，其余稍慢
      const ease = (k: keyof typeof shown, rate: number) => { shown[k] = first ? weights[k] : shown[k] + (weights[k] - shown[k]) * (1 - Math.exp(-dt * rate)); };
      if (effect.kind < 0) { ease('gather', 3); ease('shape', 2.4); ease('stable', 3); }
      ease('phase', 5);
      first = false;
      vu.uTime.value = time;
      vu.uDt.value = Math.min(dt, 1 / 30);
      vu.uGather.value = shown.gather; vu.uShape.value = shown.shape; vu.uStable.value = shown.stable;
      vu.uElement.value = weights.element;
      tableUniforms.uPhase.value = shown.phase;
      tableUniforms.uArc.value = 0;

      // 效果时间线
      let flash = 0, shock = -1, shockAmp = 0, frost = 0, frostOut = 0, shake = 0, band = -2, grow = 0;
      vu.uBurst.value = 0;
      if (effect.kind >= 0) {
        effect.t += Math.min(dt, 0.1);
        const t = effect.t, k = effect.kind, end = FX_DURATION[k];
        if (!effect.burstDone && t >= effect.burstAt) { vu.uBurst.value = 1; effect.burstDone = true; }
        const fadeOutAt = end - 1.2, respawnAt = end - 0.8;
        if (k === 0) {
          const a = t - 0.32;
          if (a >= 0) { flash = Math.exp(-a * 7) * 1.4; shock = a * 1.1; shockAmp = Math.exp(-a * 2.6); shake = Math.exp(-a * 9) * 0.09; }
        } else if (k === 1) {
          frost = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.1) / 1.1)), 2);
          frostOut = Math.max(0, (t - 1.7) / 0.8);
          flash = Math.exp(-t * 6) * 0.25;
        } else if (k === 2) {
          grow = 1 - Math.pow(1 - Math.min(1, t / 0.9), 3);
          band = -1.3 + Math.max(0, t - 0.35) * 2.6;
        }
        vu.uWardGrow.value = grow;
        particleUniforms.uBand.value = band;
        if (t < respawnAt) particleUniforms.uFade.value = 1 - Math.max(0, (t - fadeOutAt) / (respawnAt - fadeOutAt));
        else {
          if (!effect.respawned) { respawn(); effect.respawned = true; vu.uFx.value = -1; }
          particleUniforms.uFade.value = Math.min(1, (t - respawnAt) / 0.8);
        }
        if (!effect.respawned) { vu.uFx.value = k; vu.uFxT.value = t; (vu.uImpact.value as Vector2).copy(effect.impact); }
        if (t >= end) { effect.kind = -1; particleUniforms.uFade.value = 1; }
      }
      const iuv = toUv(effect.impact);
      fx.uniforms.uImpact.value = iuv;
      fx.uniforms.uFlash.value = flash; fx.uniforms.uShock.value = shock; fx.uniforms.uShockAmp.value = shockAmp;
      fx.uniforms.uFrost.value = frost; fx.uniforms.uFrostOut.value = frostOut; fx.uniforms.uTime.value = time;
      // 爆燃时台面轻微震动
      camera.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
      gpu.compute();
      particleUniforms.uPositions.value = gpu.getCurrentRenderTarget(posVar).texture;
      particleUniforms.uVelocities.value = gpu.getCurrentRenderTarget(velVar).texture;
      composer.render(dt);
      void width; void height;
    },
    release(element, dir) { start(element, dir); },
    collapse() { start(3); },
    setTier(next) { tier = next; if (tier === 'static') return false; applyTier(); return true; },
    dispose() {
      gpu.dispose();
      composer.dispose();
      geometry.dispose();
      (points.material as ShaderMaterial).dispose();
      table.geometry.dispose();
      (table.material as ShaderMaterial).dispose();
    },
  };
}
