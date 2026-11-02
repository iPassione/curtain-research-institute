const fs = require('fs');
const baseline = JSON.parse(fs.readFileSync('humanizer/baseline-articles.json','utf8'));
const records = [];
const report = [];
const body = a => a.chapters.flatMap(c=>c.paragraphs).join('');
for (const original of baseline) {
  const filename = `humanizer/revised/${original.id}.json`;
  if (!fs.existsSync(filename)) throw new Error(`Missing revision: ${original.id}`);
  const revised = JSON.parse(fs.readFileSync(filename,'utf8'));
  if (revised.id !== original.id) throw new Error(`Wrong article id: ${filename}`);
  const allowed = new Set(['id','subtitle','lead','chapters']);
  if (Object.keys(revised).some(k=>!allowed.has(k))) throw new Error(`Unexpected metadata change: ${original.id}`);
  for (const key of ['subtitle','lead']) if(typeof revised[key] !== 'string' || !revised[key].trim()) throw new Error(`Missing ${key}: ${original.id}`);
  if (!Array.isArray(revised.chapters) || !revised.chapters.length) throw new Error(`Missing chapters: ${original.id}`);
  for(const chapter of revised.chapters) {
    if(typeof chapter.heading !== 'string' || !chapter.heading.trim() || !Array.isArray(chapter.paragraphs) || !chapter.paragraphs.length || chapter.paragraphs.some(p=>typeof p !== 'string' || !p.trim())) throw new Error(`Invalid chapter: ${original.id}`);
  }
  if(body(revised)===body(original) && revised.lead===original.lead && revised.subtitle===original.subtitle) throw new Error(`Unedited article: ${original.id}`);
  const originalLength=body(original).length, revisedLength=body(revised).length;
  report.push({id:original.id,title:original.title,originalLength,revisedLength,ratio:Number((revisedLength/originalLength).toFixed(3)),originalParagraphs:original.chapters.flatMap(c=>c.paragraphs).length,revisedParagraphs:revised.chapters.flatMap(c=>c.paragraphs).length});
  records.push({...revised,paragraphs:revised.chapters.flatMap(c=>c.paragraphs)});
}
const ids = new Set(baseline.map(a=>a.id));
const extras=fs.readdirSync('humanizer/revised').filter(f=>f.endsWith('.json')&&!ids.has(f.slice(0,-5)));
if(extras.length) throw new Error(`Unassigned articles: ${extras.join(', ')}`);
const output = `// Humanizer revisions. Original catalogue and article metadata remain intact.\n(() => {\n  const revisions = ${JSON.stringify(records,null,2)};\n  const data = window.CURTAIN_CONTENT;\n  for (const revision of revisions) {\n    const article = data.articles.find(a => a.id === revision.id);\n    if (!article) throw new Error('Unknown article: '+revision.id);\n    Object.assign(article, {subtitle:revision.subtitle,lead:revision.lead,chapters:revision.chapters,paragraphs:revision.paragraphs});\n  }\n})();\n`;
fs.writeFileSync('dist/humanized-articles.js',output);
fs.writeFileSync('humanizer/revision-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:records.length,originalCharacters:report.reduce((n,a)=>n+a.originalLength,0),revisedCharacters:report.reduce((n,a)=>n+a.revisedLength,0),shortenedOver10Percent:report.filter(a=>a.ratio<0.9)},null,2));
