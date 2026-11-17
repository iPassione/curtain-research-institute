export interface Section { id: string; number?: string; title: string; en: string; description: string; articleIds?: string[] }
export interface ArticleMeta { id: string; section: string; eyebrow: string; title: string; subtitle: string; lead: string; minutes: number }
export interface Chapter { heading: string; paragraphs: string[] }
export interface Article extends Omit<ArticleMeta, 'minutes'> { source?: string[]; chapters: Chapter[] }
export interface Region { name: string; direction: string; description: string; focus: string; [k: string]: unknown }
export interface TimelineEvent { year: string; title: string; description: string }
export interface Manifest {
  institute: Record<string, string>;
  sections: Section[];
  timeline: TimelineEvent[];
  regions: Region[];
  aliases: Record<string, string>;
  articles: ArticleMeta[];
}
/** 术语批注：forms 按长度降序，卡片文字取自 article 的类别与提要。 */
export interface GlossaryTerm { term: string; forms: string[]; article: string; title: string; eyebrow: string; lead: string }
/** 全站检索文档。url 为站内地址；type 决定结果分组标签。 */
export interface SearchDoc { type: 'section' | 'article' | 'chapter' | 'room'; url: string; title: string; meta: string; text: string; section?: string }
