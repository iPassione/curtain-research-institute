(() => {
  const panel = document.querySelector('.atlas-geography');
  if (!panel) return;
  const stage = panel.querySelector('.geo-stage');
  const regions = window.CURTAIN_CONTENT.regions;
  const positions = [[50,50],[29,29],[71,29],[29,71],[71,71]];
  // Keep the atlas's existing selection and article renderer as the single source of truth.
  const originalButtons = [...stage.querySelectorAll('[data-place]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  stage.classList.add('nautical-stage');
  stage.innerHTML = `<div class="nautical-frame"><div class="nautical-wheel"><div class="nautical-rotor"><img class="nautical-chart" src="assets/nautical-chart.png" alt="羊皮卷风格五大陆航海示意图，中央与四周各一块大陆" width="1254" height="1254" draggable="false">${regions.map((r,i)=>`<button class="chart-place" data-chart-place="${i}" style="left:${positions[i][0]}%;top:${positions[i][1]}%" aria-label="${r.direction}：${r.name}" aria-controls="continent-detail" aria-pressed="${i===0}"><span class="chart-upright"><span class="chart-marker"></span><span class="chart-label" aria-hidden="true"><small>${r.direction}</small><strong>${r.name}</strong></span></span></button>`).join('')}</div></div><span class="chart-north" aria-hidden="true">N</span><p class="chart-hint" id="chart-instructions">拖动旋转 · 悬停识别 · 点选后在下方阅读</p></div>`;
  const frame = stage.querySelector('.nautical-frame');
  frame.tabIndex = 0; frame.setAttribute('role','group'); frame.setAttribute('aria-label','可旋转的五大陆航海图');frame.setAttribute('aria-describedby','chart-instructions');
  const tools = document.createElement('div');tools.className='chart-tools';
  tools.innerHTML='<div class="chart-buttons"><button type="button" data-turn="-15" aria-label="逆时针旋转15度">↶</button><button type="button" class="chart-reset">复位朝北</button><button type="button" data-turn="15" aria-label="顺时针旋转15度">↷</button><button type="button" class="chart-auto" aria-pressed="false">缓慢转动</button></div><label class="chart-angle-label" for="chart-angle">转向 <output for="chart-angle" aria-live="off">0°</output></label><input id="chart-angle" type="range" min="-180" max="180" step="1" value="0" aria-label="旋转海图角度"><p>风格化航海图，海岸线与比例为艺术示意。</p>';
  stage.after(tools);
  // The selected continent's details follow the map and its controls.
  const left = document.createElement('div');left.className='nautical-left';stage.before(left);left.append(stage,tools);
  panel.querySelector('.atlas-eyebrow').textContent='地理观测 · 航海图室';
  panel.querySelector('.atlas-heading > p').textContent='转动海图，在五大陆之间寻找下一段旅途。';
  const rotor = stage.querySelector('.nautical-rotor');
  rotor.append(stage.querySelector('.chart-north'));
  const labels = [...stage.querySelectorAll('.chart-upright')];
  const details = panel.querySelector('.atlas-note');details.id='continent-detail';details.setAttribute('role','region');details.setAttribute('aria-label','当前大陆介绍');
  const slider = tools.querySelector('input');
  const output = tools.querySelector('output');
  const autoButton = tools.querySelector('.chart-auto');
  let angle=0, automatic=!reduced.matches, visible=false, raf=0, previous=0, drag=null;
  const normalise = n => ((n+180)%360+360)%360-180;
  function paint(){const n=normalise(angle);rotor.style.transform=`rotate(${n}deg)`;labels.forEach(l=>l.style.transform=`rotate(${-n}deg)`);slider.value=String(Math.round(n));output.value=`${Math.round(n)}°`;frame.dataset.angle=String(n);}
  function cancel(){if(raf)cancelAnimationFrame(raf);raf=0;previous=0;}
  function tick(time){raf=0;if(!automatic||!visible||document.hidden||reduced.matches)return;const dt=previous?Math.min((time-previous)/1000,.05):0;previous=time;angle+=dt*2;paint();raf=requestAnimationFrame(tick);}
  function sync(){autoButton.disabled=reduced.matches;autoButton.setAttribute('aria-pressed',String(automatic));autoButton.textContent=reduced.matches?'静态模式':automatic?'暂停转动':'缓慢转动';cancel();if(automatic&&visible&&!document.hidden&&!reduced.matches)raf=requestAnimationFrame(tick);}
  function stop(){automatic=false;sync();}
  tools.querySelectorAll('[data-turn]').forEach(b=>b.addEventListener('click',()=>{stop();angle+=Number(b.dataset.turn);paint();}));
  tools.querySelector('.chart-reset').addEventListener('click',()=>{stop();angle=0;paint();});
  autoButton.addEventListener('click',()=>{automatic=!automatic;sync();});
  slider.addEventListener('input',()=>{stop();angle=Number(slider.value);paint();});
  slider.addEventListener('focus',stop);
  stage.querySelectorAll('[data-chart-place]').forEach((button,i)=>button.addEventListener('click',()=>{stop();stage.querySelectorAll('[data-chart-place]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));originalButtons[i].click();}));
  stage.querySelectorAll('[data-chart-place]').forEach(button=>button.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover)').matches)stop();}));
  frame.addEventListener('keydown',e=>{if(e.target!==frame)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stop();angle+=e.key==='ArrowLeft'?-5:5;paint();}if(e.key==='Home'){e.preventDefault();stop();angle=0;paint();}});
  frame.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button!==0)return;stop();drag={id:e.pointerId,x:e.clientX,angle};frame.setPointerCapture(e.pointerId);frame.classList.add('is-dragging');});
  frame.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;angle=drag.angle+(e.clientX-drag.x)/frame.clientWidth*220;paint();});
  function release(e){if(drag&&e.pointerId===drag.id){drag=null;frame.classList.remove('is-dragging');if(frame.hasPointerCapture(e.pointerId))frame.releasePointerCapture(e.pointerId);}}
  frame.addEventListener('pointerup',release);frame.addEventListener('pointercancel',release);frame.addEventListener('lostpointercapture',()=>{drag=null;frame.classList.remove('is-dragging');});
  stage.addEventListener('focusin',()=>stop());
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.1}).observe(stage);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)automatic=false;sync();});
  paint();sync();
})();
