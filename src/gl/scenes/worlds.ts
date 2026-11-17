// 诸界观测「层积的六界」场景：一块全屏四边形，所有画面都在片元着色器里（见 worlds-shaders.ts）。
// 外部只给出下潜深度（单位：屏）与中层三界的聚焦栏；时间只随真实时间走，所以时间长河永远向下流。
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';
import { worldsFragment, worldsVertex } from './worlds-shaders';

export interface WorldsScene extends GLScene {
  /** depth：柱上的深度（屏）；focus：中层三界聚焦的栏（0 物质、1 灵、2 镜，可为小数）。immediate 为 true 时不做平滑。 */
  set(depth: number, focus: number, immediate?: boolean): void;
}

export function createWorldsScene(renderer: WebGLRenderer, startTier: Tier): WorldsScene {
  let tier = startTier;
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = { uTime: { value: 0 }, uDepth: { value: 0 }, uAspect: { value: 1 }, uFocus: { value: 0 }, uRiverX: { value: 0.8 }, uFade: { value: 1 } };
  const quad = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: worldsVertex, fragmentShader: worldsFragment, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  scene.add(quad);
  let want = { depth: 0, focus: 0 }, first = true;

  return {
    set(depth, focus, immediate) { want = { depth, focus }; if (immediate) first = true; },
    resize(w, h) {
      uniforms.uAspect.value = w / h;
      uniforms.uRiverX.value = w / h < 1 ? 0.88 : 0.8; // 竖屏时河靠右，给文字让出位置
    },
    frame(dt, time) {
      const k = first ? 1 : 1 - Math.exp(-dt * 4);
      first = false;
      uniforms.uTime.value = time;
      uniforms.uDepth.value += (want.depth - uniforms.uDepth.value) * k;
      uniforms.uFocus.value += (want.focus - uniforms.uFocus.value) * k;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    setTier(next) { tier = next; return tier !== 'static'; },
    dispose() { quad.geometry.dispose(); (quad.material as ShaderMaterial).dispose(); },
  };
}
