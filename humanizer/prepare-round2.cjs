const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process');
const base=path.resolve(__dirname,'..'),out=path.join(__dirname,'round2');fs.mkdirSync(out,{recursive:true});
const context={window:{}};vm.createContext(context);
for(const name of ['catalogue.js','collection-content.js','collection-longform.js','humanized-articles.js'])vm.runInContext(fs.readFileSync(path.join(base,'dist',name),'utf8'),context);
const data=context.window.CURTAIN_CONTENT;
const current=data.articles.map(a=>({...a,...JSON.parse(fs.readFileSync(path.join(__dirname,'revised',a.id+'.json'),'utf8')),title:a.title}));
fs.writeFileSync(path.join(out,'current-before.json'),JSON.stringify(current,null,2)+'\n');
const groups={a:current.filter(a=>['history','geography','library'].includes(a.section)),b:current.filter(a=>['magic','worlds'].includes(a.section)),c:current.filter(a=>['people','daily'].includes(a.section))};
for(const [key,arr] of Object.entries(groups)){fs.writeFileSync(path.join(out,'batch-'+key+'.json'),JSON.stringify(arr,null,2)+'\n');console.log(key,arr.length,arr.reduce((n,a)=>n+a.chapters.flatMap(c=>c.paragraphs).join('').length,0));}
fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify({branch:'edit/r3-editorial-humanizer-terra-20261109',commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8'}).trim(),articleCount:current.length},null,2)+'\n');
