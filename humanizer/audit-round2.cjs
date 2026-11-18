const fs=require('fs'),vm=require('vm');
const before=JSON.parse(fs.readFileSync('humanizer/round2/current-before.json','utf8'));
const context={window:{}};vm.createContext(context);
for(const file of ['catalogue.js','collection-content.js','collection-longform.js','humanized-articles.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context);
const after=context.window.CURTAIN_CONTENT.articles;
const body=a=>a.chapters.flatMap(c=>c.paragraphs).join('');
const issues=[];
const records=before.map(old=>{
 const now=after.find(a=>a.id===old.id);if(!now)throw Error('Missing '+old.id);
 for(const key of Object.keys(old).filter(k=>!['title','subtitle','lead','chapters','paragraphs'].includes(k)))if(JSON.stringify(old[key])!==JSON.stringify(now[key]))issues.push({id:old.id,metadata:key});
 const paras=now.chapters.flatMap(c=>c.paragraphs);
 for(const p of paras)if(/[；，、：]$/.test(p))issues.push({id:old.id,unfinished:p});
 return {id:old.id,beforeTitle:old.title,title:now.title,titleChanged:old.title!==now.title,leadChanged:old.lead!==now.lead,beforeCharacters:body(old).length,characters:body(now).length,ratio:+(body(now).length/body(old).length).toFixed(3),changedParagraphs:paras.filter(p=>!old.chapters.some(c=>c.paragraphs.includes(p))).length,defensiveCandidates:paras.filter(p=>/不是.{0,50}(而是|只是)|并非.{0,50}而是/.test(p))};
});
if(after.length!==before.length)issues.push({articleCount:after.length});
const result={articles:after.length,titlesChanged:records.filter(r=>r.titleChanged).length,leadsChanged:records.filter(r=>r.leadChanged).length,beforeCharacters:records.reduce((s,r)=>s+r.beforeCharacters,0),characters:records.reduce((s,r)=>s+r.characters,0),issues,records};
fs.writeFileSync('humanizer/round2/integrity-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,records:undefined},null,2));
if(issues.length)process.exitCode=1;
