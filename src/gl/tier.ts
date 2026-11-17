// 性能分档。full：完整效果；lite：半分辨率、无折射、无泛光、粒子减量；static：不启动 WebGL，使用原有的图像与 SVG 版本。
// 调试：地址加 ?gl=full|lite|static 强制档位（此时不自动降档），?debug=gl 显示帧率与档位。
export type Tier = 'full' | 'lite' | 'static';
const KEY = 'curtain-gl-tier';
const ORDER: Tier[] = ['full', 'lite', 'static'];

export function forcedTier(): Tier | null {
  const t = new URLSearchParams(location.search).get('gl');
  return t && (ORDER as string[]).includes(t) ? (t as Tier) : null;
}

let webgl2: boolean | null = null;
export function hasWebGL2() {
  if (webgl2 === null) {
    try { webgl2 = !!document.createElement('canvas').getContext('webgl2'); } catch { webgl2 = false; }
  }
  return webgl2;
}

/** 这次访问能否启用三维场景（决定首页结构，整个会话内保持不变）。 */
export function glCapable() {
  const forced = forcedTier();
  if (forced) return forced !== 'static' && hasWebGL2();
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return false;
  return hasWebGL2();
}

/** 起始档位：会话里降过档就沿用降后的档位，避免来回切换。 */
export function initialTier(): Tier {
  const forced = forcedTier();
  if (forced) return forced;
  try { const saved = sessionStorage.getItem(KEY) as Tier | null; if (saved && ORDER.includes(saved)) return saved; } catch { /* 忽略 */ }
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const cores = navigator.hardwareConcurrency || 4;
  return coarse || small || cores <= 4 ? 'lite' : 'full';
}

export function lowerTier(t: Tier): Tier {
  const next = ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(t) + 1)];
  try { sessionStorage.setItem(KEY, next); } catch { /* 忽略 */ }
  return next;
}

export const pixelRatio = (t: Tier) => Math.min(devicePixelRatio || 1, t === 'full' ? (matchMedia('(pointer: coarse)').matches ? 1.5 : 2) : 1);
