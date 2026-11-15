// 取数：目录清单常驻，单篇与展室数据按需获取并缓存。
import type { Article, Manifest } from './types';

const cache = new Map<string, Promise<any>>();
function json<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(path).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${path}`);
      return r.json();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path)!;
}

export const loadManifest = () => json<Manifest>('data/manifest.json');
export const loadArticle = (id: string) => json<Article>(`data/articles/${encodeURIComponent(id)}.json`);
export const loadLibraryText = () => json<Record<string, string>>('data/library-text.json');
export const loadRoom = (room: 'exhibits' | 'travel' | 'street') => json<any>(`data/${room}.json`);
