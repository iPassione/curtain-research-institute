// 图像输出：scripts/build-images.mjs 生成「名称-宽度.avif / .webp」。
// <picture> 在全局样式里设为 display: contents，不改变原 <img> 的布局。
import images from '../../public/assets/images.json';

type Info = { width: number; height: number; sizes: number[] };
const table = images as Record<string, Info>;

/** 资源名去掉 assets/ 前缀与扩展名，例如 'assets/research-desk.png' → 'research-desk'。 */
const key = (src: string) => src.replace(/^assets\//, '').replace(/\.(png|webp|jpg)$/, '');
const info = (src: string) => {
  const i = table[key(src)];
  if (!i) throw new Error('Unknown image: ' + src);
  return i;
};
const set = (src: string, format: string) => info(src).sizes.map(w => `assets/${key(src)}-${w}.${format} ${w}w`).join(', ');

/** 原尺寸 WebP 地址，作为 <img src> 的回退。 */
export const fallback = (src: string) => `assets/${key(src)}-${info(src).width}.webp`;

/** 替换原 <img src="assets/x.png" …>：attrs 为原标签上除 src 外的属性字符串。 */
export function picture(src: string, attrs: string, sizes = '100vw') {
  return `<picture><source type="image/avif" srcset="${set(src, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set(src, 'webp')}" sizes="${sizes}"><img src="${fallback(src)}" ${attrs}></picture>`;
}

/** 不能包 <picture> 的位置（样式用了子选择器 >img）：只用 WebP 的 srcset。 */
export function webpImg(src: string, attrs: string, sizes = '100vw') {
  return `<img src="${fallback(src)}" srcset="${set(src, 'webp')}" sizes="${sizes}" ${attrs}>`;
}

/** 在已渲染的 <picture> 中换图（街景时段切换、展品视图切换使用）。 */
export function swapPicture(img: HTMLImageElement, src: string) {
  const pic = img.parentElement as HTMLElement | null;
  if (src.endsWith('.svg')) {
    pic?.querySelectorAll('source').forEach(s => s.remove());
    img.removeAttribute('srcset');
    img.src = src;
    return;
  }
  if (pic?.tagName === 'PICTURE') {
    const sizes = pic.querySelector('source')?.getAttribute('sizes') || img.getAttribute('sizes') || '100vw';
    pic.querySelectorAll('source').forEach(s => s.remove());
    pic.insertAdjacentHTML('afterbegin', `<source type="image/avif" srcset="${set(src, 'avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set(src, 'webp')}" sizes="${sizes}">`);
  }
  img.src = fallback(src);
}
