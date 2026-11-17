// 旧 institute.js 中各页面共用的片段，逐字迁移。
import { esc } from '../lib/html';
import type { ArticleMeta, Manifest } from '../data/types';

export const belongs = (data: Manifest, a: { id: string; section: string }, c: string | null | undefined) =>
  a.section === c || !!data.sections.find(s => s.id === c)?.articleIds?.includes(a.id);

export const href = (a: { id: string }, from?: string | null) => `?article=${encodeURIComponent(a.id)}${from ? '&from=' + encodeURIComponent(from) : ''}`;

export const card = (a: ArticleMeta, from?: string | null) => `<a class="article-link" href="${href(a, from)}"><div class="entry-top"><small>${esc(a.eyebrow)}</small><span>${a.minutes} 分钟</span></div><h2 data-vt="${esc(a.id)}">${esc(a.title)}</h2><p>${esc(a.lead)}</p><span class="entry-read">阅读馆藏 <b aria-hidden="true">↗</b></span></a>`;

export const dome = (cls: string, inner = true) => `<svg class="${cls}" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true"><path class="dome-arc dome-arc-outer" d="M-240 900C-100 -260 1540 -260 1680 900" pathLength="1000" vector-effect="non-scaling-stroke"/>${inner ? '<path class="dome-arc dome-arc-glow" d="M-80 900C40 -110 1400 -110 1520 900" pathLength="1000" vector-effect="non-scaling-stroke"/>' : ''}<path class="dome-arc" d="M-80 900C40 -110 1400 -110 1520 900" pathLength="1000" vector-effect="non-scaling-stroke"/><path class="dome-shimmer" d="M-80 900C40 -110 1400 -110 1520 900" pathLength="1000" vector-effect="non-scaling-stroke"/></svg>`;

export const covers: Record<string, string> = { history: 'cover-history-oil.webp', geography: 'nautical-chart.png', magic: 'cover-magic-oil.webp', people: 'cover-people.webp', worlds: 'cover-worlds-oil.webp', daily: 'cover-daily-oil.webp' };
export const featuredIds: Record<string, string> = { history: 'history-discrete-full', geography: 'continents', magic: 'wizard-ranks-study', people: 'knights-community', library: 'history-nineteen-full', worlds: 'worlds-structure', daily: 'daily-table' };
