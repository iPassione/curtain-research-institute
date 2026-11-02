(() => {
  const data = window.CURTAIN_CONTENT;
  const main = document.querySelector('#main');
  const params = new URLSearchParams(location.search);
  const page = params.get('page');
  const id = params.get('article');
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const section = data.sections.find(x => x.id === page);
  const article = data.articles.find(x => x.id === (data.aliases?.[id] || id));
  const inCollection = (a, collection) => a.section === collection || !!data.sections.find(s => s.id === collection)?.articleIds?.includes(a.id);
  const requestedCollection = params.get('from');
  const articleCollection = article && requestedCollection && inCollection(article, requestedCollection) ? requestedCollection : article?.section;
  const linkCollection = section?.articleIds ? page : (article && data.sections.find(s => s.id === articleCollection)?.articleIds ? articleCollection : null);
  const articleLink = a => `<a class="article-link" href="?article=${encodeURIComponent(a.id)}${linkCollection ? '&from='+encodeURIComponent(linkCollection) : ''}"><small>${escape(a.eyebrow)}</small><h2>${escape(a.title)} ↗</h2><p>${escape(a.lead)}</p></a>`;
  const readingMinutes = a => Math.max(1, Math.ceil((a.paragraphs || []).join('').length / 450));
  if (id && article) {
    document.title = `${article.title} | 帷幕研究所`;
    const chapters = article.chapters?.length ? article.chapters : [{heading:'正文', paragraphs:article.paragraphs}];
    const related = data.articles.filter(a => inCollection(a, articleCollection) && a.id !== article.id).slice(0,3);
    main.innerHTML = `<div class="page-hero page-hero--article"><p class="kicker">THE CURTAIN INSTITUTE / PUBLIC ARCHIVE</p><h1>${escape(article.title)}</h1><p>${escape(article.subtitle)}</p><div class="hero-index">研究所 · 公共阅览</div></div><div class="page-content"><div class="reading-layout"><aside class="reading-aside"><a class="back" href="?page=${encodeURIComponent(articleCollection)}">← 返回研究室</a><div class="aside-label">本篇目录</div><nav aria-label="文章目录">${chapters.map((c,i)=>`<a href="#chapter-${i+1}">${escape(c.heading)}</a>`).join('')}</nav><div class="aside-label">所属馆藏</div><p>${escape(article.eyebrow)}</p></aside><article class="article"><p class="article-meta">${escape(article.eyebrow)}</p><p class="lead">${escape(article.lead)}</p><hr>${chapters.map((c,i)=>`<section id="chapter-${i+1}" class="article-chapter"><h2 class="article-section-heading">${escape(c.heading)}</h2>${c.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</section>`).join('')}<hr><div class="sources"><strong>延伸阅读</strong><p>${article.source.map(escape).join(' · ')}</p></div>${related.length?`<div class="related"><h2>继续阅读</h2>${related.map(articleLink).join('')}</div>`:''}<a class="back" href="?page=${encodeURIComponent(articleCollection)}">← 返回研究室</a></article></div></div>`;
  } else if (section) {
    document.title = `${section.title} | 帷幕研究所`;
    const timeline = page === 'history' ? `<h2>历史的脉络</h2><div class="timeline">${data.timeline.map(t => `<div class="event"><time>${escape(t.year)}</time><h3>${escape(t.title)}</h3><p>${escape(t.description)}</p></div>`).join('')}</div>` : '';
    const regions = page === 'geography' ? `<h2>五大陆概览</h2><p>选择一块大陆，了解它的方位与地方传统。</p><div class="regions">${data.regions.map((r,i) => `<button class="region" data-region="${i}" aria-pressed="${i===0}"><small>${escape(r.direction)}</small>${escape(r.name)}</button>`).join('')}</div><div class="region-detail" aria-live="polite"></div>` : '';
    const entries = page === 'library' ? data.articles : section.articleIds ? section.articleIds.map(id => data.articles.find(a => a.id === id)).filter(Boolean) : data.articles.filter(a => inCollection(a, page));
    main.innerHTML = `<div class="page-hero page-hero--section" data-section="${escape(page)}"><p class="kicker">THE CURTAIN INSTITUTE / ${escape(section.en)}</p><h1>${escape(section.title)}</h1><p>${escape(section.description)}</p><div class="hero-index">${escape(section.number)} <span> / 研究所馆藏</span></div></div><div class="page-content"><div class="page-inner"><a href="./" class="back">← 研究所首页</a>${timeline}${regions}<div class="catalog-heading"><div><p class="catalog-label">RESEARCH COLLECTION</p><h2>馆藏文章</h2></div><span>${entries.length} 篇文章</span></div>${page === 'library' ? '<label class="search-label" for="catalog-search">检索馆藏</label><input id="catalog-search" class="catalog-search" type="search" placeholder="搜索标题、主题或内容" autocomplete="off"><label class="search-label" for="catalog-filter">按研究室浏览</label><select id="catalog-filter" class="catalog-search"><option value="">全部研究室</option>'+data.sections.map(s=>`<option value="${escape(s.id)}">${escape(s.title)}</option>`).join('')+'</select><p class="search-empty" hidden>没有找到相关馆藏，请试试其他关键词。</p>' : ''}<div class="articles">${entries.map(articleLink).join('')}</div></div></div>`;
    if (page === 'library') {
      const input = main.querySelector('#catalog-search');
      const cards = [...main.querySelectorAll('.article-link')];
      const filter = main.querySelector('#catalog-filter');
      const updateSearch = () => {
        const q = input.value.trim().toLocaleLowerCase();
        let count = 0;
        cards.forEach((card, i) => { const a=entries[i]; const found = (!filter.value || inCollection(a, filter.value)) && [a.title,a.subtitle,a.lead,a.eyebrow,...(a.paragraphs||[]),...(a.chapters||[]).flatMap(c=>[c.heading,...c.paragraphs])].join(' ').toLocaleLowerCase().includes(q); card.hidden = !found; if(found) count++; });
        main.querySelector('.search-empty').hidden = count > 0;
      }; input.addEventListener('input', updateSearch); filter.addEventListener('change', updateSearch);
    }
    if (page === 'geography') {
      const detail = main.querySelector('.region-detail');
      const renderRegion = i => { const r = data.regions[i]; detail.innerHTML = `<h3>${escape(r.name)}</h3><p>${escape(r.description)}</p><small>地方魔法传统：${escape(r.focus)}</small>`; main.querySelectorAll('.region').forEach((b,j) => b.setAttribute('aria-pressed', String(j === i))); };
      main.querySelectorAll('.region').forEach(b => b.addEventListener('click', () => renderRegion(Number(b.dataset.region)))); renderRegion(0);
    }
  } else if (page || id) {
    main.innerHTML = `<div class="page-hero"><h1>未找到这份馆藏</h1><p>请返回研究所首页，继续浏览其他资料。</p><a class="action" href="./">返回首页 ↗</a></div>`;
  } else {
    main.innerHTML = `<section class="hero"><div class="hero-image"></div><div class="hero-copy"><div class="kicker">THE CURTAIN INSTITUTE</div><h1><span>在帷幕之下，</span><span>阅读一个世界。</span></h1><p>五片大陆，漫长的历史，与仍在延续的文明。<br>欢迎来到帷幕研究所。</p><a class="action" href="#explore">探索研究所 <span>↘</span></a></div><div class="hero-side">A WORLD BENEATH THE VEIL</div></section><section class="intro"><div><div class="kicker">A SHARED WORLD</div><h2>一座帷幕，<br>无数条走向这里的路。</h2><div class="line"></div></div><div><div class="big-number">1077</div><p>那一年，一道穹顶笼罩了五大陆与四片海域。但这片土地的故事，远比帷幕更古老。</p><p>从迁徙与相遇，到魔法的传承与文明的变迁，我们在此整理过去，也重新认识生活于其中的世界。</p><a class="action" href="?article=origin">阅读帷幕的起源 <span>↗</span></a></div></section><section class="departments" id="explore"><div class="departments-inner"><div class="kicker">EXPLORE THE INSTITUTE</div><h2 class="section-title">从这里，走进帷幕。</h2><p class="section-lead">循着历史、土地与人的足迹，在不同的研究室中找到自己的入口。</p><div class="dept-list">${data.sections.map(s => `<a class="dept" href="?page=${encodeURIComponent(s.id)}"><span class="num">${escape(s.number)}</span><h3>${escape(s.title)}</h3><p>${escape(s.description)}</p><span class="arrow">↗</span></a>`).join('')}</div></div></section><section class="feature"><div class="feature-inner"><div class="feature-visual" aria-hidden="true"><div class="orbit"><span>V</span></div></div><div><div class="kicker">GEOGRAPHY & CIVILISATION</div><h2 class="section-title">五大陆，<br>各自生长的文明。</h2><p>土地与海洋塑造生活，魔法与贸易连接彼此。认识这片世界，从它的地方差异开始。</p><a class="action" href="?page=geography">前往地理与文明馆 <span>↗</span></a></div></div></section>`;
  }
  // A curated first encounter gives each collection a clear starting point.
  if (section) {
    const recommendations = {history:'history-discrete-full', geography:'continents', magic:'wizard-ranks-study', people:'knights-community', library:'history-nineteen-full', worlds:'worlds-structure', daily:'food-and-work'};
    const featured = data.articles.find(a => a.id === recommendations[page]);
    if (featured) {
      const title = {history:'从一次离散，读懂文明的来路。',geography:'先认识土地，再认识生活于此的人。',magic:'从一名巫师的成长开始。',people:'历史由人相遇，也由人改变。',library:'本次选读：一段秩序的形成。', worlds:'从脚下的土地，读到现实的边界。', daily:'魔法进入生活，劳动仍在继续。'}[page];
      const block = document.createElement('section'); block.className='curator-feature';
      block.innerHTML=`<div class="curator-intro"><span class="curator-label">研究所选读</span><h2>${escape(title)}</h2><p>沿着一篇文章进入，再循关联馆藏深入。</p></div><a class="curator-article" href="?article=${encodeURIComponent(featured.id)}${section.articleIds ? '&from='+encodeURIComponent(page) : ''}"><small>${escape(featured.eyebrow)}</small><h3>${escape(featured.title)}</h3><p>${escape(featured.lead)}</p><span class="feature-meta">约 ${readingMinutes(featured)} 分钟阅读 <b>阅读文章 ↗</b></span></a>`;
      main.querySelector('.page-inner .back').after(block);
    }
  }
  document.querySelectorAll('#nav a').forEach(a => {if (new URL(a.href).searchParams.get('page') === (page || articleCollection)) a.setAttribute('aria-current','page');});
  if (article) {
    const tocLinks = [...main.querySelectorAll('.reading-aside nav a')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {if(entry.isIntersecting){tocLinks.forEach(a=>a.toggleAttribute('data-current',a.hash === '#'+entry.target.id));}});
    }, {rootMargin:'-10% 0px -65% 0px'});
    main.querySelectorAll('.article-chapter').forEach(c=>observer.observe(c));
    const aside = main.querySelector('.reading-aside');
    const meta = document.createElement('p');meta.className='reading-duration';meta.textContent=`约 ${readingMinutes(article)} 分钟阅读`;aside.prepend(meta);
  }
  const toggle = document.querySelector('.menu-toggle');
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); document.querySelector('#nav').classList.toggle('open', open); });
  if (window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.registerPlugin(ScrollTrigger);
    if (!page && !id) {
      gsap.from('.hero-copy > *', { y: 24, opacity: 0, duration: 1.1, stagger: .15, ease: 'power3.out' });
      gsap.to('.hero-image', { scale: 1.12, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      gsap.to('.orbit', { rotation: 90, scrollTrigger: { trigger: '.feature', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    } else {
      gsap.fromTo('.page-hero h1', {y: 16}, {y: 0, duration: 0.9, ease:'power3.out'});
    }
  }
})();
