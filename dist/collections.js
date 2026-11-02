(() => {
  const page = new URLSearchParams(location.search).get('page');
  if (!['worlds','daily'].includes(page)) return;
  const root = document.querySelector('.page-inner');
  if (!root) return;
  const data = window.CURTAIN_CONTENT;
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = (id,label) => `<a class="collection-read" href="?article=${encodeURIComponent(id)}&from=${page}">${escape(label)} <span aria-hidden="true">↗</span></a>`;
  const panel = document.createElement('section');
  panel.className = 'collection-explorer';
  if (page === 'worlds') {
    const worlds = [
      {id:'stars',name:'星之世界',position:'上层',short:'秩序 · 星辰',title:'星辰是规则的结构',text:'由自然神性与宇宙投影构成，星辰沿严密的轨迹运行。真实、审判、秩序与天穹等权柄来自这一世界。',boundary:'半神或借助强大造物的驻境占星者，才能触及星辰规则；更深的观察也伴随更大的代价。',authority:'真实、太阳、月亮、黑夜、审判、秩序、天穹、极光',article:'worlds-stars'},
      {id:'matter',name:'物质世界',position:'中层 · 三界并立',short:'土地 · 当下',title:'万事在当下留下结果',text:'五大陆与帷幕所在的世界。物理法则与魔法规则共同约束着身体、土地和器物，一切力量须通过对当下的干预产生效果。',boundary:'未来尚未抵达；一旦事情成为过去，便无法改写。',authority:'物质、风暴、烈焰、心灵、光之、斩、大地',article:'worlds-structure',chapter:'chapter-3'},
      {id:'spirit',name:'灵之世界',position:'中层 · 三界并立',short:'梦境 · 记录',title:'意识与记忆沉积的地方',text:'意识、灵魂、心灵与梦境在此交织。各界的信息可以留存其中，成为占卜者查阅的记录，也是跨世界沟通的中间层。',boundary:'记录可能受到守密者封锁；接触信息会消耗回路，启示仍须判断。',authority:'灵魂、幻梦、智慧、故事',article:'worlds-boundaries',chapter:'chapter-1'},
      {id:'mirror',name:'镜中世界',position:'中层 · 三界并立',short:'扭曲 · 替换',title:'反射面后的无序之境',text:'扭曲、混沌与无序构成现实的反面。镜中生灵窥视着物质世界，寻找替换对应原主的机会。',boundary:'反射界面天然亲近镜中世界。深入占卜前需留下锚点，警惕伪装的启示与归途。',authority:'支配、无序、欲望、错误、悖论',article:'worlds-mirror'},
      {id:'dead',name:'亡者世界',position:'下层',short:'死亡 · 归宿',title:'灵魂通常归往的地方',text:'死亡的法则在此统治。肉体终结之后，大多数灵魂受到亡者世界牵引，成为亡灵。',boundary:'与逝者沟通须借道灵界，并获得对方同意。强行囚禁、操控逝者灵魂属于亵渎。',authority:'死亡、轮回、亡者、生命',article:'worlds-dead'},
      {id:'time',name:'时间长河',position:'贯穿诸界',short:'先与后 · 永恒与刹那',title:'为所有世界赋予先后',text:'时间长河不承载空间，它以持续流淌的维度贯穿诸界。永恒与刹那是它的原生权柄。',boundary:'在未来到来之前的试错，仍须发生于结果进入现实之前。已经成为过去的事无法回溯。',authority:'永恒、刹那',article:'worlds-time'}
    ];
    const node = id => {const w=worlds.find(x=>x.id===id);return `<button type="button" class="world-node" data-world="${id}" aria-pressed="false" aria-controls="world-observation"><strong>${w.name}</strong><small>${w.short}</small></button>`;};
    panel.innerHTML = `<div class="collection-heading"><div><p class="collection-kicker">OBSERVATORY / 六大世界</p><h2>现实有不止一层。</h2></div><p>选择一处界域，观察它的法则与边界。</p></div><div class="observatory-layout"><div class="world-diagram" role="group" aria-label="六大世界结构示意"><div class="world-tier"><span class="tier-label">上层</span>${node('stars')}</div><div class="world-tier"><span class="tier-label">中层 · 三界并立</span><div class="world-middle">${node('matter')}${node('spirit')}${node('mirror')}</div></div><div class="world-tier"><span class="tier-label">下层</span>${node('dead')}</div><div class="world-time"><span class="tier-label">贯穿全部世界的维度</span>${node('time')}</div><p class="world-caption">诸界关系示意，不表示可测量的空间距离。天上神国另列于六大世界之上。</p></div><div id="world-observation" class="observation-note" aria-live="polite"></div></div><div class="collection-footnote"><span>世界铁律</span><p>过去已注定。未来只是预设。只有此刻才是唯一的真实。</p></div>`;
    const render = id => {
      const w=worlds.find(x=>x.id===id);
      panel.querySelectorAll('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));
      panel.querySelector('#world-observation').innerHTML=`<p class="collection-kicker">${escape(w.position)}</p><h3>${escape(w.title)}</h3><p>${escape(w.text)}</p><dl><dt>代表权柄</dt><dd>${escape(w.authority)}</dd><dt>接触边界</dt><dd>${escape(w.boundary)}</dd></dl>${link(w.article,'阅读关联馆藏').replace('&from=worlds"',`&from=worlds${w.chapter?'#'+w.chapter:''}"`)}`;
    };
    panel.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.world)));
    render('matter');
  } else {
    const topics = [
      {id:'money',name:'货币与交易',heading:'一枚索比恩，可以买什么？',text:'索比恩用于日常消费，加令承担大额交易。一个生鸡蛋约需一索比恩；这套通用货币由魔法联合部发行，以其权威和力量维系信用。',links:['daily-market','daily-table']},
      {id:'work',name:'粮食与工坊',heading:'有魔法，仍然需要劳动。',text:'机器由魔力驱动，手工劳动依然普遍。低级催熟魔法难以提供足量、可口且有营养的粮食，高级催熟的成本又十分高昂。蕴法石让工坊获得可持续调用的咒语储备。',links:['daily-table','daily-apprentice']},
      {id:'travel',name:'界门与远行',heading:'同一片大陆，不同的距离。',text:'界门连接首都、大城市与战略要地，使用费用使许多普通人终身未离开出生的大陆。贵族、官员、高阶巫师与商人，则更容易越过这道门槛。',links:['daily-journey','daily-messages']},
      {id:'tools',name:'造物与使用',heading:'工具也有自己的节奏。',text:'造物保存已塑形的魔力，能够重复使用并缓慢自然恢复。无魔力者也可能使用，但契合度影响能效；等待恢复的间隔会进入日常工作的安排。',links:['daily-tools','daily-apprentice']},
      {id:'messages',name:'通信与来信',heading:'远处的人，怎样把消息送来？',text:'拥有守护灵或能够直接沟通灵界生物的巫师，可以借灵界即时联络。信息抵达之后，人和物的移动仍要面对道路、界门与费用。',links:['daily-messages','daily-journey']}
    ];
    panel.innerHTML=`<div class="collection-heading"><div><p class="collection-kicker">EVERYDAY LIFE / 生活札记</p><h2>从一件小事，读懂这个世界。</h2></div><p>选择一个日常问题，循着生活走进设定。</p></div><div class="daily-topics" role="group" aria-label="选择生活专题">${topics.map(t=>`<button type="button" data-topic="${t.id}" aria-pressed="false" aria-controls="daily-topic-detail">${t.name}</button>`).join('')}</div><div id="daily-topic-detail" class="daily-topic-detail" aria-live="polite"></div><div class="currency-desk"><div><p class="collection-kicker">CURRENCY DESK / 加令计数</p><h3>换算一笔钱</h3><p>100 索比恩 = 1 铜加令<br>12 铜加令 = 1 银加令<br>12 银加令 = 1 金加令</p></div><div class="currency-fields"><label for="currency-amount">数量</label><div class="currency-inputs"><input id="currency-amount" type="number" min="0" max="1000000000" step="1" value="1" inputmode="numeric"><label class="currency-unit-label" for="currency-unit">单位</label><select id="currency-unit"><option value="1">索比恩</option><option value="100">铜加令</option><option value="1200">银加令</option><option value="14400" selected>金加令</option></select></div><output id="currency-result" for="currency-amount currency-unit" aria-live="polite"></output><p class="currency-context">仅计算通用货币内部单位。索比恩与人民币之间没有公开、固定的兑换体系。</p></div></div>`;
    const render = id => {
      const t=topics.find(x=>x.id===id);
      panel.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===id)));
      panel.querySelector('#daily-topic-detail').innerHTML=`<h3>${escape(t.heading)}</h3><p>${escape(t.text)}</p><div class="daily-reading">${t.links.map(id=>{const a=data.articles.find(a=>a.id===id);return link(id,a.title);}).join('')}</div>`;
    };
    panel.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.topic)));
    render('money');
    const amount=panel.querySelector('#currency-amount'),unit=panel.querySelector('#currency-unit'),result=panel.querySelector('#currency-result');
    const calculate=()=>{
      if(amount.value===''||!amount.validity.valid||!Number.isSafeInteger(amount.valueAsNumber)){result.textContent='请输入 0 至 1,000,000,000 之间的整数数量。';return;}
      let total=amount.valueAsNumber*Number(unit.value);
      const sobien=total;
      const gold=Math.floor(total/14400);total%=14400;
      const silver=Math.floor(total/1200);total%=1200;
      const copper=Math.floor(total/100);total%=100;
      result.innerHTML=`<strong>${sobien.toLocaleString('zh-CN')} 索比恩</strong><span>${gold.toLocaleString('zh-CN')} 金加令 · ${silver} 银加令 · ${copper} 铜加令 · ${total} 索比恩</span>`;
    };
    amount.addEventListener('input',calculate);unit.addEventListener('change',calculate);calculate();
  }
  const curator=root.querySelector('.curator-feature');
  if(curator)curator.before(panel);else root.querySelector('.back').after(panel);
})();
