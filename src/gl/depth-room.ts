// 开放展室的深度视差挂载（阶段 6）：城市切片的街景、造物陈列室的藏品插画。
// 画布铺在原图之上（原图仍在下面，作为占位与退路），贴图全部载入后才挂到全站共用的舞台上，避免先黑一下。
// 指针在画面上移动时，近处比远处挪得多；手指设备没有悬停，只保留极慢的漂移。
// 画布未就绪、降为静态档或出错时，舞台会把 data-gl 设为 off，原图与 DOM 版过渡照常可用。
import { TextureLoader, type Texture } from 'three';
import { getStage } from './stage';
import { createDepthImageScene, type DepthImageScene } from './scenes/depth-image';

export interface DepthMount {
  frame: HTMLElement;        // 接收指针的区域，也是 data-gl 状态所在
  layers: string[];
  depth: string;
  lights?: string;
  strength: number;
  className: string;
  onScene?: (scene: DepthImageScene) => void; // 场景建好后调用一次（同步初始状态）
}

export function mountDepthParallax(m: DepthMount) {
  const stage = getStage();
  if (stage.tier === 'static') return { scene: null as DepthImageScene | null, release: () => {} };
  let released = false, scene: DepthImageScene | null = null;
  const ctl = new AbortController();
  m.frame.dataset.gl = 'loading';
  const host = document.createElement('div');
  host.className = m.className;
  host.setAttribute('aria-hidden', 'true');
  m.frame.append(host);
  const api = { scene: null as DepthImageScene | null, release };

  const loader = new TextureLoader();
  const load = (url: string) => new Promise<Texture>((ok, bad) => loader.load(url, ok, undefined, bad));
  Promise.all([Promise.all(m.layers.map(load)), load(m.depth), m.lights ? load(m.lights) : Promise.resolve(undefined)])
    .then(([layers, depth, lights]) => {
      if (released) { [...layers, depth, lights].forEach(t => t?.dispose()); return; }
      scene = createDepthImageScene(stage.renderer, stage.tier, { layers, depth, lights, strength: m.strength });
      api.scene = scene;
      m.onScene?.(scene);
      stage.mount(host, scene, () => { m.frame.dataset.gl = 'on'; });
    })
    .catch(() => { if (!released) { m.frame.dataset.gl = 'off'; host.remove(); } });

  // 指针：相对画面中心的位置，离开时回正
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse) {
    m.frame.addEventListener('pointermove', e => {
      const r = m.frame.getBoundingClientRect();
      scene?.set({ offset: [((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2] });
    }, { signal: ctl.signal });
    m.frame.addEventListener('pointerleave', () => scene?.set({ offset: [0, 0] }), { signal: ctl.signal });
  }

  function release() {
    if (released) return;
    released = true;
    ctl.abort();
    if (scene) stage.unmount();
    host.remove();
    delete m.frame.dataset.gl;
  }
  return api;
}
