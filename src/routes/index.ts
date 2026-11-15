// 路由总表：按旧站脚本的执行顺序重放一次页面构建——
// institute.js（页面主体）→ visual-atlas.js → nautical-map.js → collections.js → fieldrooms.js。
// 先在 prepare 阶段取齐数据与模块，再同步渲染，避免中间状态闪现。
import { loadArticle, loadManifest, loadRoom } from '../data/store';
import type { Prepare } from '../router';
import { belongs } from './shared';

const ROOMS = ['exhibits', 'travel', 'street'] as const;
const ATLAS = ['geography', 'magic', 'people'];
const COLLECTIONS = ['worlds', 'daily'];
const defaultTitle = document.title;

export const prepare: Prepare = async url => {
  const params = url.searchParams, page = params.get('page'), id = params.get('article');
  const data = await loadManifest();
  const section = data.sections.find(s => s.id === page);
  const meta = data.articles.find(a => a.id === (data.aliases?.[id as string] || id));
  const from = params.get('from');
  const collection = meta && from && belongs(data, meta, from) ? from : meta?.section;
  const isHome = !meta && !section && !(page || id);
  const fieldroomsActive = !params.has('article');
  const room = fieldroomsActive ? ROOMS.find(r => r === page) : undefined;

  const [article, home, articleRoute, collectionRoute, notFound, atlas, nautical, collections, fieldrooms, roomData] = await Promise.all([
    meta ? loadArticle(meta.id) : null,
    isHome ? import('./home') : null,
    meta ? import('./article') : null,
    !meta && section ? import('./collection') : null,
    !meta && !section && (page || id) ? import('./not-found') : null,
    !meta && section && ATLAS.includes(page!) ? import('../features/atlas') : null,
    !meta && page === 'geography' && section ? import('../features/nautical') : null,
    !meta && section && COLLECTIONS.includes(page!) ? import('../features/collections') : null,
    fieldroomsActive && (!page || page === 'library' || room) ? import('../features/fieldrooms') : null,
    room ? loadRoom(room) : null,
  ]);

  return ctx => {
    document.title = defaultTitle;
    document.body.dataset.surface = meta ? 'article' : section ? 'collection' : 'home';
    document.body.dataset.collection = page || collection || '';
    if (meta && article && articleRoute) articleRoute.renderArticle(ctx, data, article, collection);
    else if (section && collectionRoute) collectionRoute.renderCollection(ctx, data, section, page!);
    else if ((page || id) && notFound) notFound.renderNotFound(ctx);
    else if (home) home.renderHome(ctx, data);
    document.querySelectorAll<HTMLAnchorElement>('#nav a').forEach(a => {
      a.removeAttribute('aria-current');
      if (new URL(a.href).searchParams.get('page') === (page || collection)) a.setAttribute('aria-current', 'page');
    });
    if (atlas) atlas.mountAtlas(ctx, data, page!);
    if (nautical) nautical.mountNautical(ctx, data);
    if (collections) collections.mountCollections(ctx, data, page!);
    if (fieldrooms) fieldrooms.mountFieldrooms(ctx, data, roomData);
    if (home) home.animateHome(ctx);
  };
};
