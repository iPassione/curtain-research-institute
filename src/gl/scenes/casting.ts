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
import { particleFragment, particleVertex, positionShader, tableFragment, tableVertex, velocityShader } from './casting-shaders';

/** 台面坐标：宽 8、高 5.2（与原演示图 800×520 一致，1 单位 = 100 像素）。 */
const W = 8, H = 5.2, RADIUS = 3.15;
const lin = (hex: string) => new Color(hex);

export type Element = 0 | 1 | 2; // 火焰、冰霜、防御
export interface CastingWeights {
  gather: number; shape: number; stable: number; release: number; collapse: number;
  element: Element; dir: Vector2; phase: number; arc: number;
}
export interface CastingScene extends GLScene { weights: CastingWeights; toTable(clientX: number, clientY: number, rect: DOMRect): Vector2 }

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
    uTime: { value: 0 }, uDt: { value: 0 }, uGather: { value: 0 }, uShape: { value: 0 }, uStable: { value: 0 },
    uRelease: { value: 0 }, uCollapse: { value: 0 }, uElement: { value: 0 }, uRadius: { value: RADIUS }, uDir: { value: new Vector2(1, 0.3).normalize() },
  });
  Object.assign(pu, { uDt: vu.uDt, uRelease: vu.uRelease, uRadius: vu.uRadius });
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
    uColFrost: { value: lin('#cfe9ff') }, uColWard: { value: lin('#e3c87a') },
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
  composer.addPass(new OutputPass());
  const applyTier = () => { bloom.enabled = tier === 'full'; };
  applyTier();

  const weights: CastingWeights = { gather: 0, shape: 0, stable: 0, release: 0, collapse: 0, element: 0, dir: new Vector2(1, 0.35).normalize(), phase: 0, arc: 0 };
  const shown = { gather: 0, shape: 0, stable: 0, release: 0, collapse: 0, phase: 0, arc: 0 };
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
      particleUniforms.uDpr.value = dpr;
      tableUniforms.uPx.value = viewH / (h * dpr) * 1.2;
    },
    frame(dt, time) {
      renderer.setClearColor(0x0d2526, 1);
      // 各阶段权重平滑过渡：导出与反噬来得快，其余稍慢
      const ease = (k: keyof typeof shown, rate: number) => { shown[k] = first ? (weights[k] as number) : shown[k] + ((weights[k] as number) - shown[k]) * (1 - Math.exp(-dt * rate)); };
      ease('gather', weights.collapse > 0.5 ? 14 : 3); ease('shape', 2.4); ease('stable', 3); ease('release', 9); ease('collapse', 10); ease('phase', 5); ease('arc', 4);
      first = false;
      vu.uTime.value = time;
      vu.uDt.value = Math.min(dt, 1 / 30);
      vu.uGather.value = shown.gather; vu.uShape.value = shown.shape; vu.uStable.value = shown.stable;
      vu.uRelease.value = shown.release; vu.uCollapse.value = shown.collapse;
      vu.uElement.value = weights.element;
      (vu.uDir.value as Vector2).copy(weights.dir);
      tableUniforms.uPhase.value = shown.phase;
      tableUniforms.uArc.value = shown.arc;
      gpu.compute();
      particleUniforms.uPositions.value = gpu.getCurrentRenderTarget(posVar).texture;
      particleUniforms.uVelocities.value = gpu.getCurrentRenderTarget(velVar).texture;
      composer.render(dt);
      void width; void height;
    },
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
