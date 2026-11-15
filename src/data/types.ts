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
