import{E as e,F as t,I as n,N as r,O as i,T as a,a as o,b as s,d as c,j as l,k as u,m as d,n as f,p,r as m,s as h,t as g,v as _,x as v,y as ee}from"./stage-kHJ78NE5.js";import{i as y,n as te,r as ne,t as re}from"./OutputPass-CW7knqVy.js";import{t as b}from"./veil-shaders-XWZsmuXu.js";var x=`
uniform sampler2D uHeight;
uniform float uAmp;
varying vec2 vUv;
varying vec3 vWorld;
void main(){
  vUv = uv;
  float edge = 1.0 - smoothstep(0.44, 0.47, length(uv - 0.5));
  vec3 p = position;
  p.y += texture2D(uHeight, uv).r * uAmp * edge;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,ie=`
${b}
uniform sampler2D uMap, uHeight;
uniform vec2 uTexel;
uniform float uAmp, uSize, uTime, uFocus, uHover, uAmbient, uSunStr, uNight;
uniform vec3 uSunCol;
uniform vec2 uCenters[5];
uniform int uSel, uHot;
uniform vec3 uLight, uInk, uShadowTint;
varying vec2 vUv;
varying vec3 vWorld;
int nearest(vec2 uv){
  int k = 0; float best = 1e9;
  for (int i = 0; i < 5; i++) { float d = distance(uv, uCenters[i]); if (d < best) { best = d; k = i; } }
  return k;
}
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  if (r > 0.985) discard;
  float h = texture2D(uHeight, vUv).r;
  float hx = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
  float hz = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r - texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;
  float k = uAmp / (2.0 * uSize);
  vec3 N = normalize(vec3(-hx * k / uTexel.x, 1.0, hz * k / uTexel.y));
  vec3 col = texture2D(uMap, vUv).rgb;

  // 侧光照出浮雕；背光面略偏冷，像纸面上的阴影。
  float lit = max(dot(N, uLight), 0.0);
  float shade = uAmbient + uSunStr * lit * (1.0 - 0.45 * uNight);
  col *= shade * uSunCol;
  // 夜里：整体偏冷偏暗，背光面更深
  col = mix(col, col * vec3(0.55, 0.68, 0.95), uNight * 0.5);
  col = mix(col, col * uShadowTint, (1.0 - lit) * 0.25);

  // 纸纹
  col *= 0.97 + 0.06 * vnoise(vec3(vUv * 420.0, 0.0));

  // 海面上缓慢流动的墨线：沿弯曲的流向、断续的短笔触，只在海上出现。
  float sea = 1.0 - smoothstep(0.03, 0.14, h);
  vec2 p = vUv * 16.0;
  vec2 warp = vec2(vnoise(vec3(p * 0.35, uTime * 0.03)), vnoise(vec3(p * 0.35 + 9.0, uTime * 0.03)));
  float phase = (p.x * 0.8 + p.y * 0.55 + warp.x * 2.6) * 1.6 - uTime * 0.35;
  float lines = smoothstep(0.93, 0.99, abs(sin(phase * 3.14159)));
  float dash = smoothstep(0.45, 0.6, vnoise(vec3(p * 1.4 + warp * 3.0, uTime * 0.08)));
  col = mix(col, uInk, lines * dash * sea * 0.22 * (1.0 - smoothstep(0.86, 0.95, r)));

  // 云影掠过
  float cloud = smoothstep(0.55, 0.85, vnoise(vec3(vWorld.xz * 0.07 + vec2(uTime * 0.012, uTime * 0.007), 3.0)) * 0.65 + vnoise(vec3(vWorld.xz * 0.16, uTime * 0.02)) * 0.35);
  col *= 1.0 - cloud * 0.13;

  // 选中大陆：其余陆地压暗，选中的略提亮；悬停的大陆轻微提亮。
  int idx = nearest(vUv);
  float land = smoothstep(0.06, 0.2, h);
  if (idx != uSel) col *= 1.0 - uFocus * (0.55 * land + 0.22 * (1.0 - land));
  else col *= 1.0 + uFocus * 0.1 * land;
  if (idx == uHot && uHot != uSel) col *= 1.0 + uHover * 0.12 * land;

  gl_FragColor = vec4(col, 1.0);
}`,ae=`
uniform vec3 uColor, uLight;
varying vec3 vNormalW;
void main(){
  float lit = max(dot(normalize(vNormalW), uLight), 0.0);
  gl_FragColor = vec4(uColor * (0.45 + 0.6 * lit), 1.0);
}`,S=`
varying vec3 vNormalW;
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,oe=`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,se=`
uniform vec3 uInner, uOuter;
uniform float uDisc, uFar;
uniform vec2 uShadowOffset;
varying vec3 vWorld;
void main(){
  float d = length(vWorld.xz);
  vec3 col = mix(uInner, uOuter, smoothstep(0.0, uFar, d));
  float s = length(vWorld.xz - uShadowOffset);
  col *= 1.0 - 0.28 * (1.0 - smoothstep(uDisc - 1.5, uDisc + 5.0, s));
  gl_FragColor = vec4(col, 1.0);
}`,C=`
varying float vT;
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,w=`
uniform vec3 uColor;
uniform float uTime, uGlow, uPhase, uReveal, uHead;
varying float vT;
void main(){
  float pulse = pow(fract(vT - uTime * 0.22 + uPhase), 10.0);
  float ends = smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT);
  float a = (0.28 + 0.5 * uGlow + pulse * (0.6 + uGlow)) * ends * uReveal;
  // 界门往来：光点所在处最亮，身后拖一段渐隐的尾迹，尚未走到的部分保持暗淡
  if (uHead >= 0.0) {
    float behind = vT <= uHead ? exp(-(uHead - vT) * 3.5) : 0.0;
    float head = exp(-pow((vT - uHead) * 26.0, 2.0));
    a = (0.12 + 1.4 * behind + 3.0 * head) * ends * uReveal;
  }
  gl_FragColor = vec4(uColor * a, 1.0);
}`,ce={uniforms:{tDiffuse:{value:null},uTexel:{value:[1/1024,1/1024]},uAmount:{value:1},uFocusY:{value:.5}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uAmount, uFocusY;
varying vec2 vUv;
void main(){
  // 固定 25 次采样、不提前返回：避免在分支里取导数（D3D 后端会警告结果未定义）。
  float b = smoothstep(0.2, 0.55, abs(vUv.y - uFocusY)) * uAmount;
  vec4 acc = vec4(0.0);
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) acc += texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * uTexel * b * 2.2);
  gl_FragColor = acc / 25.0;
}`},T=40,E=T*.49,le=1.15,D=e=>new o(e),O=Math.PI/180,ue=2600;function k(g,b,k,A,de){let j=b,M=new i,N=new _(32,1,1,600),P=new c;M.add(P);let F=new n(-.55,.75,-.4).normalize(),fe=new n,pe=k.map(([e,n])=>new t(e/100,1-n/100)),I={uMap:{value:null},uHeight:{value:null},uTexel:{value:new t(1/512,1/512)},uAmp:{value:le},uSize:{value:T},uTime:{value:0},uFocus:{value:0},uHover:{value:0},uCenters:{value:pe},uSel:{value:0},uHot:{value:-1},uLight:{value:fe},uInk:{value:D(`#5c4628`)},uShadowTint:{value:D(`#b9c3c8`)},uSunCol:{value:new o(1,1,1)},uAmbient:{value:.7},uSunStr:{value:.42},uNight:{value:0}},me=new ee(T,T,j===`full`?320:160,j===`full`?320:160);me.rotateX(-Math.PI/2);let he=new d(me,new u({uniforms:I,vertexShader:x,fragmentShader:ie}));he.visible=!1,P.add(he);let ge=D(`#8d7246`),_e={uColor:{value:ge.clone()},uLight:{value:F}},ve=new d(new h(E,E,.9,160,1,!0),new u({uniforms:_e,vertexShader:S,fragmentShader:ae}));ve.position.y=-.45,P.add(ve);let ye=D(`#e4d3b1`),be=D(`#b59a6a`),xe=D(`#2b3138`),Se=D(`#14181d`),L={uInner:{value:ye.clone()},uOuter:{value:be.clone()},uDisc:{value:E},uFar:{value:70},uShadowOffset:{value:new t(1.4,1)}},Ce=new d(new ee(600,600),new u({uniforms:L,vertexShader:oe,fragmentShader:se}));Ce.rotation.x=-Math.PI/2,Ce.position.y=-.9,M.add(Ce);let R=k.map(([e,t])=>new n((e/100-.5)*T,le*.85,(t/100-.5)*T)),we=R.slice(1).map((e,t)=>{let n=R[0],i=n.clone().lerp(e,.5);i.y+=5.5;let a=new v(n.clone(),i,e.clone()),o=new u({uniforms:{uColor:{value:D(`#d4b36e`)},uTime:I.uTime,uGlow:{value:0},uPhase:{value:t*.27},uReveal:{value:0},uHead:{value:-1}},vertexShader:C,fragmentShader:w,transparent:!0,depthWrite:!1,blending:2}),s=new d(new r(a,64,.075,6,!1),o);return s.renderOrder=2,P.add(s),{mesh:s,material:o,target:t+1}}),Te=``,z=null,B=null,V=new u({uniforms:{uColor:{value:D(`#f1e2b4`)},uTime:I.uTime,uGlow:{value:1},uPhase:{value:0},uReveal:{value:0},uHead:{value:0}},vertexShader:C,fragmentShader:w,transparent:!0,depthWrite:!1,blending:2}),H=new m;H.setAttribute(`position`,new f(new Float32Array(3),3));let Ee=new u({uniforms:{uColor:{value:D(`#fff2c2`)},uSize:{value:34},uAlpha:{value:0}},vertexShader:`uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; gl_Position = projectionMatrix * mv; }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * (smoothstep(0.5, 0.0, d) * 0.9 + smoothstep(0.12, 0.0, d) * 2.0) * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2}),De=new s(H,Ee);De.frustumCulled=!1,De.renderOrder=4,P.add(De);let Oe=new u({uniforms:{uColor:{value:D(`#f1e2b4`)},uAlpha:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:2}),U=new d(new a(.85,1,64),Oe);U.rotation.x=-Math.PI/2,U.renderOrder=4,P.add(U);let W=new n,ke=()=>{let e=A.route?.()??null,t=e?`${e.from}-${e.to}-${e.start}`:``;if(t!==Te&&(Te=t,B&&(P.remove(B),B.geometry.dispose(),B=null),z=null,e&&e.from!==e.to)){let t=R[e.from],n=R[e.to],i=t.clone().lerp(n,.5);i.y+=4+t.distanceTo(n)*.28,z=new v(t.clone(),i,n.clone()),B=new d(new r(z,80,.09,6,!1),V),B.renderOrder=3,P.add(B)}if(!e||!z){Ee.uniforms.uAlpha.value=0,Oe.uniforms.uAlpha.value=0,V.uniforms.uReveal.value=0;return}let n=(performance.now()-e.start)/ue,i=Math.min(1,Math.max(0,n/.72)),a=i<.5?2*i*i:1-(-2*i+2)**2/2;z.getPoint(a,W),V.uniforms.uHead.value=i<1?a:1.2,H.attributes.position.array.set([W.x,W.y,W.z]),H.attributes.position.needsUpdate=!0,Ee.uniforms.uAlpha.value=i<1?Math.min(1,n*6):Math.max(0,1-(n-.72)*5),V.uniforms.uReveal.value=Math.min(1,n*4)*(n>1.6?Math.max(.35,1-(n-1.6)):1);let o=(n-.72)/.28;U.position.copy(R[A.route().to]).setY(le*.9),U.scale.setScalar(.3+Math.max(0,o)*4.5),Oe.uniforms.uAlpha.value=o>0&&o<1?(1-o)*1.2:0},Ae=!1,je=0,Me=new l,Ne=()=>{++je===2&&(he.visible=!0)};Me.load(`assets/nautical-chart-1254.webp`,t=>{if(Ae)return t.dispose();t.colorSpace=e,t.anisotropy=Math.min(8,g.capabilities.getMaxAnisotropy()),I.uMap.value=t,Ne()}),Me.load(`assets/data/nautical-height.png`,e=>{if(Ae)return e.dispose();e.magFilter=p,I.uHeight.value=e,Ne()});let G=new ne(g);G.addPass(new te(M,N));let K=new y(ce);G.addPass(K),G.addPass(new re);let Pe=()=>{K.enabled=j===`full`};Pe();let q=1,J=1,Fe=!0,Ie=0,Le=new n,Re=new n,ze=new n,Y=60,X=52,Z=0,Be=0,Q=k.map(()=>({x:0,y:0,visible:!1})),$=new n,Ve=e=>{let t=N.fov*O,n=2*Math.atan(Math.tan(t/2)*N.aspect);return e*(N.aspect<1.4?1.32:1.12)/Math.tan(Math.min(t,n)/2)};return{places:R,resize(e,t,n){q=e,J=t,G.setPixelRatio(n),G.setSize(e,t),K.uniforms.uTexel.value=[1/(e*n),1/(t*n)]},frame(e,t){g.setClearColor(new o(1843494).lerp(new o(13217928),Math.min(1,Math.max(0,(Math.sin(((A.hour?.()??15)-6)/12*Math.PI)+.12)/.4))),1);let r=Fe?1:1-Math.exp(-e*3.2);Fe=!1,I.uTime.value=t;let i=A.angle()*O;P.rotation.y=-i;let a=A.hour?.()??15,s=Math.atan2(-.4,-.55)+(a-15)/24*Math.PI*2,c=Math.sin((a-6)/12*Math.PI),l=Math.min(1,Math.max(0,(c+.12)/.4)),u=(l>.02?Math.max(.12,c):.5)*1,d=l>.02?s:s+Math.PI;F.set(Math.cos(d)*Math.cos(u),Math.sin(Math.max(.12,u)),Math.sin(d)*Math.cos(u)).normalize(),fe.copy(F).applyAxisAngle(new n(0,1,0),i);let f=Math.max(0,1-Math.abs(c)/.35)*l;I.uSunCol.value.setRGB(1,1-.18*f,1-.35*f).lerp(new o(.55,.66,.95),1-l),I.uAmbient.value=.16+.54*l,I.uSunStr.value=.2+.22*l+.15*f,I.uNight.value=1-l,L.uInner.value.copy(xe).lerp(ye,l),L.uOuter.value.copy(Se).lerp(be,l),_e.uColor.value.copy(ge).multiplyScalar(.35+.65*l),L.uShadowOffset.value.set(-F.x*2.2,-F.z*2.2),ke();let p=A.selected(),m=A.hot();I.uSel.value=p.index,I.uHot.value=m,Z+=(+!!p.focused-Z)*r,Be+=(+(m>=0)-Be)*(Fe?1:1-Math.exp(-e*8)),I.uFocus.value=Z,I.uHover.value=Be,Ie+=(1-Ie)*(1-Math.exp(-e*1.2));for(let t of we){let n=p.index===t.target||m===t.target||p.index===0&&p.focused?1:m===0?.6:0;t.material.uniforms.uGlow.value+=(n-t.material.uniforms.uGlow.value)*(1-Math.exp(-e*6)),t.material.uniforms.uReveal.value=Ie}N.aspect=q/J,N.fov=N.aspect<1?44:32,Re.set(0,0,0),p.focused&&Re.copy(R[p.index]).setY(0).applyAxisAngle(new n(0,1,0),-i),Le.lerp(Re,r);let h=Ve(E)*(1-.45*Z)/(A.zoom?.()??1);Y+=(h-Y)*r;let _=Math.min(80,Math.max(30,52+10*Z+A.pitch()));X+=(_-X)*r,ze.set(0,Math.sin(X*O)*Y,Math.cos(X*O)*Y).add(Le),N.position.copy(ze),N.lookAt(Le),N.updateProjectionMatrix(),K.uniforms.uFocusY.value=.5,G.render(e),P.updateMatrixWorld();for(let e=0;e<R.length;e++)$.copy(R[e]).applyMatrix4(P.matrixWorld).project(N),Q[e].x=($.x*.5+.5)*q,Q[e].y=(-$.y*.5+.5)*J,Q[e].visible=$.z<1&&Q[e].x>-20&&Q[e].x<q+20&&Q[e].y>-20&&Q[e].y<J+20;de(Q)},setTier(e){return j=e,j!==`static`&&(Pe(),!0)},dispose(){Ae=!0,G.dispose(),I.uMap.value?.dispose(),I.uHeight.value?.dispose(),M.traverse(e=>{let t=e;t.geometry?.dispose(),t.material?.dispose?.()})}}}var A=[`camorria`,`eisenrod`,`tsvergno`,`esperanza`,`enchanteves`];function de(e,t){let{stage:n,frame:r,buttons:i}=t,a=g();if(a.tier===`static`)return;n.dataset.gl=`loading`;let o=document.createElement(`div`);o.className=`chart-gl`,o.setAttribute(`aria-hidden`,`true`),r.prepend(o);let s=document.createElement(`div`);s.className=`chart-overlay`,r.append(s);let c=i.map(e=>(e.getAttribute(`aria-label`)||``).split(`：`)[1]||``),l=document.createElement(`div`);l.className=`chart-extra`,l.hidden=!0,l.innerHTML=`<div class="chart-extra-row"><label class="chart-hour-label" for="chart-hour">昼夜 <output for="chart-hour">15:00</output></label><input id="chart-hour" type="range" min="0" max="24" step="0.25" value="15" aria-label="一天中的时刻"><button type="button" class="chart-day" aria-pressed="false">日升日落</button><span class="chart-zoom" role="group" aria-label="缩放"><button type="button" data-zoom="out" aria-label="缩小">－</button><button type="button" data-zoom="in" aria-label="放大">＋</button></span></div>
<fieldset class="chart-route"><legend>界门往来</legend><label>从 <select id="route-from">${c.map((e,t)=>`<option value="${t}" ${t===1?`selected`:``}>${e}</option>`).join(``)}</select></label><span aria-hidden="true">→</span><label>到 <select id="route-to">${c.map((e,t)=>`<option value="${t}" ${t===4?`selected`:``}>${e}</option>`).join(``)}</select></label><button type="button" class="route-go">走一趟界门</button><a class="route-travel" hidden>去旅行案头整理行装 ↗</a><p class="route-status" role="status" aria-live="polite"></p></fieldset>`;let u=n.closest(`.nautical-left`)?.querySelector(`.chart-tools`);u?.append(l);let d=15,f=!1,p=1,m=null,h=0,_=0,v=l.querySelector(`#chart-hour`),ee=l.querySelector(`output`),y=l.querySelector(`.chart-day`),te=e=>`${String(Math.floor(e)%24).padStart(2,`0`)}:${String(Math.round(e%1*60)%60).padStart(2,`0`)}`,ne=e=>{d=(e%24+24)%24,v.value=String(d),ee.value=te(d)},re=e=>{let t=_?Math.min(.1,(e-_)/1e3):0;_=e,ne(d+t*1.6),h=f?requestAnimationFrame(re):0},b=e=>{f=e&&!matchMedia(`(prefers-reduced-motion: reduce)`).matches,y.setAttribute(`aria-pressed`,String(f)),y.textContent=f?`停在此刻`:`日升日落`,cancelAnimationFrame(h),_=0,f&&(h=requestAnimationFrame(re))};v.addEventListener(`input`,()=>{b(!1),ne(Number(v.value))},{signal:e.signal}),y.addEventListener(`click`,()=>b(!f),{signal:e.signal});let x=e=>{p=Math.min(2.4,Math.max(.75,e))};l.querySelectorAll(`[data-zoom]`).forEach(t=>t.addEventListener(`click`,()=>x(p*(t.dataset.zoom===`in`?1.25:.8)),{signal:e.signal})),r.addEventListener(`dblclick`,e=>{n.dataset.gl===`on`&&!e.target.closest(`button`)&&x(p>=2.3?1:p*1.4)},{signal:e.signal}),r.addEventListener(`wheel`,e=>{n.dataset.gl===`on`&&(e.ctrlKey||e.metaKey)&&(e.preventDefault(),x(p*Math.exp(-e.deltaY*.0015)))},{passive:!1,signal:e.signal}),u?.querySelector(`.chart-reset`)?.addEventListener(`click`,()=>x(1),{signal:e.signal});let ie=l.querySelector(`#route-from`),ae=l.querySelector(`#route-to`),S=l.querySelector(`.route-travel`),oe=l.querySelector(`.route-status`);l.querySelector(`.route-go`).addEventListener(`click`,()=>{let e=Number(ie.value),t=Number(ae.value);e===t?(oe.textContent=`出发与目的是同一块大陆，换一个目的地试试。`,S.hidden=!0):(m={from:e,to:t,start:performance.now()},oe.textContent=`经界门从${c[e]}前往${c[t]}（示意）。`,S.href=`?page=travel&from=${A[e]}&to=${A[t]}&mode=gate`,S.hidden=!0,window.setTimeout(()=>{m&&m.from===e&&m.to===t&&(S.hidden=!1)},ue*.75))},{signal:e.signal});let se={hour:()=>d,zoom:()=>p,route:()=>m},C=i[0]?.parentElement??null,w=i[i.length-1]?.nextSibling??null;for(;w&&i.includes(w);)w=w.nextSibling;let ce=i.map(e=>({left:e.style.left,top:e.style.top})),T=!1,E=()=>{T||(T=!0,i.forEach((e,t)=>{C&&C.insertBefore(e,w&&w.parentNode===C?w:null),e.style.left=ce[t].left,e.style.top=ce[t].top,e.classList.remove(`is-offscreen`)}),o.remove(),s.remove(),l.remove(),cancelAnimationFrame(h),n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.setAttribute(`hidden`,``))};try{let c=k(a.renderer,a.tier,t.positions,{...t,...se,angle:t.angle,selected:t.selected,hot:t.hot,pitch:t.pitch},e=>{if(n.dataset.gl!==`on`)return;let t=r.clientWidth,a=r.clientHeight;e.forEach((e,n)=>{let r=i[n];r.style.left=Math.min(t-28,Math.max(28,e.x)).toFixed(1)+`px`,r.style.top=Math.min(a-28,Math.max(28,e.y)).toFixed(1)+`px`,r.classList.toggle(`is-offscreen`,!e.visible)})});a.mount(o,c,()=>{i.forEach(e=>s.append(e)),n.dataset.gl=`on`,l.hidden=!1,n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.removeAttribute(`hidden`)});let u=new MutationObserver(()=>{n.dataset.gl===`off`&&(u.disconnect(),E())});u.observe(n,{attributes:!0,attributeFilter:[`data-gl`]}),e.onCleanup(()=>{u.disconnect(),a.unmount(),E()})}catch(e){console.warn(`立体航海图未能启动，保留原转盘。`,e),n.dataset.gl=`off`,E()}}export{de as mountChartRoom};