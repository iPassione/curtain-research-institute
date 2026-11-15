// 与旧脚本相同的转义函数。
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
