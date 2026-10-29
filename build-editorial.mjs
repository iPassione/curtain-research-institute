import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.createContext(context);
for(const name of ['content.js','expanded-content.js','research-dossiers.js','new-history.js','new-magic.js','new-people.js','new-library.js'])vm.runInContext(fs.readFileSync(`dist/${name}`,'utf8'),context);
const data=context.window.CURTAIN_CONTENT;
const aliases=JSON.parse(fs.readFileSync('editorial-aliases.json','utf8'));
const additions=[];const applied=new Set();
for(const name of ['geography','magic','people','history']){
  const rows=JSON.parse(fs.readFileSync(`editorial-${name}.json`,'utf8'));
  for(const row of rows){
    if(applied.has(row.id))throw Error('Duplicate rewrite: '+row.id);
    const current=data.articles.find(a=>a.id===row.id);if(!current)throw Error('Unknown article: '+row.id);
    const {additions:notes,...changes}=row;Object.assign(current,changes);
    current.paragraphs=current.chapters.flatMap(c=>c.paragraphs);
    current.source=current.source.map(s=>s.replace(/\.md$/,''));
    additions.push({id:row.id,title:current.title,details:notes||[]});applied.add(row.id);
  }
}
data.aliases=aliases;data.articles=data.articles.filter(a=>!aliases[a.id]);
const original=new Set(['history-discrete-full','history-nineteen-full']);
const report=data.articles.map(a=>({id:a.id,title:a.title,rewritten:applied.has(a.id),original:original.has(a.id),characters:(a.paragraphs.join('').match(/[\u4e00-\u9fff]/g)||[]).length,chapters:a.chapters.length,chapterLengths:a.chapters.map(c=>(c.paragraphs.join('').match(/[\u4e00-\u9fff]/g)||[]).length)}));
const failed=report.filter(a=>!a.original&&(!a.rewritten||a.characters<1800));
fs.writeFileSync('editorial-audit.json',JSON.stringify({articles:report,failed},null,2));
if(failed.length)throw Error('Unfinished articles: '+failed.map(a=>`${a.id} (${a.characters})`).join(', '));
fs.writeFileSync('editorial-additions.json',JSON.stringify(additions,null,2));
fs.writeFileSync('dist/catalogue.js','window.CURTAIN_CONTENT = '+JSON.stringify(data,null,2)+';\n');
console.log(JSON.stringify({articles:report.length,rewritten:applied.size,characters:report.reduce((s,a)=>s+a.characters,0),aliases:Object.keys(aliases).length}));
