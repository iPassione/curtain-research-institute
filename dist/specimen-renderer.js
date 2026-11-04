/* Painted collection portraits generated with image-gen. */
(() => {
  const names={wand:'现代短杖',staff:'古式长杖',stone:'封咒蕴法石',spent:'用过的蕴法石',lamp:'日用造物灯',gate:'界门结构样本'};
  window.CurtainSpecimens={mount(host,kind){
    const name=names[kind],painting=`assets/painted-specimens/${kind}.png`,plate=`assets/plates/${kind}.svg`;
    host.classList.remove('model-ready');host.dataset.display='painting';
    host.innerHTML=`<div class="painted-object"><button type="button" class="object-enlarge" aria-label="放大查看${name}"><img class="painted-portrait" src="${painting}" alt="${name}藏品插画" width="1122" height="1402" fetchpriority="high"></button></div><div class="object-tools" role="group" aria-label="展品视图"><button type="button" data-display="painting" aria-pressed="true">藏品插画</button><button type="button" data-display="plate" aria-pressed="false">结构图版</button><button type="button" class="object-zoom">放大查看 ↗</button></div><dialog class="object-lightbox" aria-label="${name}放大图"><button type="button" class="object-close" aria-label="关闭放大图">关闭 ×</button><img src="${painting}" alt="${name}放大图"></dialog>`;
    const image=host.querySelector('.painted-portrait'),enlarge=host.querySelector('.object-enlarge'),dialog=host.querySelector('dialog'),large=dialog.querySelector('img');let view='painting';
    host.querySelectorAll('[data-display]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.display;host.dataset.display=view;const src=view==='plate'?plate:painting;image.src=large.src=src;image.alt=name+(view==='plate'?'结构图版':'藏品插画');host.querySelectorAll('[data-display]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
    const open=()=>{if(!dialog.open)dialog.showModal();};enlarge.addEventListener('click',open);host.querySelector('.object-zoom').addEventListener('click',open);host.querySelector('.object-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close();});
    return ()=>{if(dialog.open)dialog.close();};
  }};
})();
