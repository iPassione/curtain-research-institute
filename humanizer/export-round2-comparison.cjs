const fs=require('fs');
const before=JSON.parse(fs.readFileSync('humanizer/round2/current-before.json','utf8'));
const lines=['# R3 文章修订对照','', '本轮重点：标题、导语、防御性写作及正文重复。旧稿保存在 current-before.json；此页便于逐篇查看入口文字。',''];
for(const old of before){
 const now=JSON.parse(fs.readFileSync('humanizer/revised/'+old.id+'.json','utf8'));
 lines.push('## '+now.title,'','文章 ID：`'+old.id+'`','','原题：'+old.title,'','原导语：'+old.lead,'','新副题：'+now.subtitle,'','新导语：'+now.lead,'');
}
fs.writeFileSync('humanizer/round2/标题与导语对照.md',lines.join('\n'));
console.log('Exported '+before.length+' comparisons.');
