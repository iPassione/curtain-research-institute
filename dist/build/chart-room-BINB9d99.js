import{A as e,C as t,E as n,F as r,L as i,M as a,P as o,R as s,T as c,c as l,f as u,g as d,i as f,j as p,k as m,l as h,n as g,p as _,r as v,t as ee,u as y,v as te,w as b,y as x}from"./OutputPass-CyoMI3E_.js";import{t as ne}from"./veil-shaders-C7VUJSB4.js";var S=`
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
}`,re=`
${ne}
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
}`,ie=`
uniform vec3 uColor, uLight;
varying vec3 vNormalW;
void main(){
  float lit = max(dot(normalize(vNormalW), uLight), 0.0);
  gl_FragColor = vec4(uColor * (0.45 + 0.6 * lit), 1.0);
}`,C=`
varying vec3 vNormalW;
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,ae=`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,oe=`
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
}`,w=`
varying float vT;
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,T=`
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
}`,se={uniforms:{tDiffuse:{value:null},uTexel:{value:[1/1024,1/1024]},uAmount:{value:1},uFocusY:{value:.5}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
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
}`},E=40,D=E*.49,ce=1.15,O=e=>new u(e),k=Math.PI/180,le=2600;function A(l,ne,A,j,ue){let M=ne,N=new p,P=new t(32,1,1,600),F=new d;N.add(F);let I=new s(-.55,.75,-.4).normalize(),de=new s,fe=A.map(([e,t])=>new i(e/100,1-t/100)),L={uMap:{value:null},uHeight:{value:null},uTexel:{value:new i(1/512,1/512)},uAmp:{value:ce},uSize:{value:E},uTime:{value:0},uFocus:{value:0},uHover:{value:0},uCenters:{value:fe},uSel:{value:0},uHot:{value:-1},uLight:{value:de},uInk:{value:O(`#5c4628`)},uShadowTint:{value:O(`#b9c3c8`)},uSunCol:{value:new u(1,1,1)},uAmbient:{value:.7},uSunStr:{value:.42},uNight:{value:0}},pe=new b(E,E,M===`full`?320:160,M===`full`?320:160);pe.rotateX(-Math.PI/2);let me=new x(pe,new a({uniforms:L,vertexShader:S,fragmentShader:re}));me.visible=!1,F.add(me);let he=O(`#8d7246`),ge={uColor:{value:he.clone()},uLight:{value:I}},_e=new x(new _(D,D,.9,160,1,!0),new a({uniforms:ge,vertexShader:C,fragmentShader:ie}));_e.position.y=-.45,F.add(_e);let ve=O(`#e4d3b1`),ye=O(`#b59a6a`),be=O(`#2b3138`),xe=O(`#14181d`),R={uInner:{value:ve.clone()},uOuter:{value:ye.clone()},uDisc:{value:D},uFar:{value:70},uShadowOffset:{value:new i(1.4,1)}},Se=new x(new b(600,600),new a({uniforms:R,vertexShader:ae,fragmentShader:oe}));Se.rotation.x=-Math.PI/2,Se.position.y=-.9,N.add(Se);let z=A.map(([e,t])=>new s((e/100-.5)*E,ce*.85,(t/100-.5)*E)),Ce=z.slice(1).map((e,t)=>{let i=z[0],o=i.clone().lerp(e,.5);o.y+=5.5;let s=new n(i.clone(),o,e.clone()),c=new a({uniforms:{uColor:{value:O(`#d4b36e`)},uTime:L.uTime,uGlow:{value:0},uPhase:{value:t*.27},uReveal:{value:0},uHead:{value:-1}},vertexShader:w,fragmentShader:T,transparent:!0,depthWrite:!1,blending:2}),l=new x(new r(s,64,.075,6,!1),c);return l.renderOrder=2,F.add(l),{mesh:l,material:c,target:t+1}}),we=``,B=null,V=null,H=new a({uniforms:{uColor:{value:O(`#f1e2b4`)},uTime:L.uTime,uGlow:{value:1},uPhase:{value:0},uReveal:{value:0},uHead:{value:0}},vertexShader:w,fragmentShader:T,transparent:!0,depthWrite:!1,blending:2}),U=new y;U.setAttribute(`position`,new h(new Float32Array(3),3));let Te=new a({uniforms:{uColor:{value:O(`#fff2c2`)},uSize:{value:34},uAlpha:{value:0}},vertexShader:`uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; gl_Position = projectionMatrix * mv; }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * (smoothstep(0.5, 0.0, d) * 0.9 + smoothstep(0.12, 0.0, d) * 2.0) * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2}),Ee=new c(U,Te);Ee.frustumCulled=!1,Ee.renderOrder=4,F.add(Ee);let De=new a({uniforms:{uColor:{value:O(`#f1e2b4`)},uAlpha:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:2}),W=new x(new m(.85,1,64),De);W.rotation.x=-Math.PI/2,W.renderOrder=4,F.add(W);let G=new s,Oe=()=>{let e=j.route?.()??null,t=e?`${e.from}-${e.to}-${e.start}`:``;if(t!==we&&(we=t,V&&(F.remove(V),V.geometry.dispose(),V=null),B=null,e&&e.from!==e.to)){let t=z[e.from],i=z[e.to],a=t.clone().lerp(i,.5);a.y+=4+t.distanceTo(i)*.28,B=new n(t.clone(),a,i.clone()),V=new x(new r(B,80,.09,6,!1),H),V.renderOrder=3,F.add(V)}if(!e||!B){Te.uniforms.uAlpha.value=0,De.uniforms.uAlpha.value=0,H.uniforms.uReveal.value=0;return}let i=(performance.now()-e.start)/le,a=Math.min(1,Math.max(0,i/.72)),o=a<.5?2*a*a:1-(-2*a+2)**2/2;B.getPoint(o,G),H.uniforms.uHead.value=a<1?o:1.2,U.attributes.position.array.set([G.x,G.y,G.z]),U.attributes.position.needsUpdate=!0,Te.uniforms.uAlpha.value=a<1?Math.min(1,i*6):Math.max(0,1-(i-.72)*5),H.uniforms.uReveal.value=Math.min(1,i*4)*(i>1.6?Math.max(.35,1-(i-1.6)):1);let s=(i-.72)/.28;W.position.copy(z[j.route().to]).setY(ce*.9),W.scale.setScalar(.3+Math.max(0,s)*4.5),De.uniforms.uAlpha.value=s>0&&s<1?(1-s)*1.2:0},ke=!1,Ae=0,je=new o,Me=()=>{++Ae===2&&(me.visible=!0)};je.load(`assets/nautical-chart-1254.webp`,t=>{if(ke)return t.dispose();t.colorSpace=e,t.anisotropy=Math.min(8,l.capabilities.getMaxAnisotropy()),L.uMap.value=t,Me()}),je.load(`assets/data/nautical-height.png`,e=>{if(ke)return e.dispose();e.magFilter=te,L.uHeight.value=e,Me()});let K=new v(l);K.addPass(new g(N,P));let q=new f(se);K.addPass(q),K.addPass(new ee);let Ne=()=>{q.enabled=M===`full`};Ne();let J=1,Y=1,Pe=!0,Fe=0,Ie=new s,Le=new s,Re=new s,X=60,Z=52,Q=0,ze=0,$=A.map(()=>({x:0,y:0,visible:!1})),Be=new s,Ve=e=>{let t=P.fov*k,n=2*Math.atan(Math.tan(t/2)*P.aspect);return e*(P.aspect<1.4?1.32:1.12)/Math.tan(Math.min(t,n)/2)};return{places:z,resize(e,t,n){J=e,Y=t,K.setPixelRatio(n),K.setSize(e,t),q.uniforms.uTexel.value=[1/(e*n),1/(t*n)]},frame(e,t){l.setClearColor(new u(1843494).lerp(new u(13217928),Math.min(1,Math.max(0,(Math.sin(((j.hour?.()??15)-6)/12*Math.PI)+.12)/.4))),1);let n=Pe?1:1-Math.exp(-e*3.2);Pe=!1,L.uTime.value=t;let r=j.angle()*k;F.rotation.y=-r;let i=j.hour?.()??15,a=Math.atan2(-.4,-.55)+(i-15)/24*Math.PI*2,o=Math.sin((i-6)/12*Math.PI),c=Math.min(1,Math.max(0,(o+.12)/.4)),d=(c>.02?Math.max(.12,o):.5)*1,f=c>.02?a:a+Math.PI;I.set(Math.cos(f)*Math.cos(d),Math.sin(Math.max(.12,d)),Math.sin(f)*Math.cos(d)).normalize(),de.copy(I).applyAxisAngle(new s(0,1,0),r);let p=Math.max(0,1-Math.abs(o)/.35)*c;L.uSunCol.value.setRGB(1,1-.18*p,1-.35*p).lerp(new u(.55,.66,.95),1-c),L.uAmbient.value=.16+.54*c,L.uSunStr.value=.2+.22*c+.15*p,L.uNight.value=1-c,R.uInner.value.copy(be).lerp(ve,c),R.uOuter.value.copy(xe).lerp(ye,c),ge.uColor.value.copy(he).multiplyScalar(.35+.65*c),R.uShadowOffset.value.set(-I.x*2.2,-I.z*2.2),Oe();let m=j.selected(),h=j.hot();L.uSel.value=m.index,L.uHot.value=h,Q+=(+!!m.focused-Q)*n,ze+=(+(h>=0)-ze)*(Pe?1:1-Math.exp(-e*8)),L.uFocus.value=Q,L.uHover.value=ze,Fe+=(1-Fe)*(1-Math.exp(-e*1.2));for(let t of Ce){let n=m.index===t.target||h===t.target||m.index===0&&m.focused?1:h===0?.6:0;t.material.uniforms.uGlow.value+=(n-t.material.uniforms.uGlow.value)*(1-Math.exp(-e*6)),t.material.uniforms.uReveal.value=Fe}P.aspect=J/Y,P.fov=P.aspect<1?44:32,Le.set(0,0,0),m.focused&&Le.copy(z[m.index]).setY(0).applyAxisAngle(new s(0,1,0),-r),Ie.lerp(Le,n);let g=Ve(D)*(1-.45*Q)/(j.zoom?.()??1);X+=(g-X)*n;let _=Math.min(80,Math.max(30,52+10*Q+j.pitch()));Z+=(_-Z)*n,Re.set(0,Math.sin(Z*k)*X,Math.cos(Z*k)*X).add(Ie),P.position.copy(Re),P.lookAt(Ie),P.updateProjectionMatrix(),q.uniforms.uFocusY.value=.5,K.render(e),F.updateMatrixWorld();for(let e=0;e<z.length;e++)Be.copy(z[e]).applyMatrix4(F.matrixWorld).project(P),$[e].x=(Be.x*.5+.5)*J,$[e].y=(-Be.y*.5+.5)*Y,$[e].visible=Be.z<1&&$[e].x>-20&&$[e].x<J+20&&$[e].y>-20&&$[e].y<Y+20;ue($)},setTier(e){return M=e,M!==`static`&&(Ne(),!0)},dispose(){ke=!0,K.dispose(),L.uMap.value?.dispose(),L.uHeight.value?.dispose(),N.traverse(e=>{let t=e;t.geometry?.dispose(),t.material?.dispose?.()})}}}var j=[`camorria`,`eisenrod`,`tsvergno`,`esperanza`,`enchanteves`];function ue(e,t){let{stage:n,frame:r,buttons:i}=t,a=l();if(a.tier===`static`)return;n.dataset.gl=`loading`;let o=document.createElement(`div`);o.className=`chart-gl`,o.setAttribute(`aria-hidden`,`true`),r.prepend(o);let s=document.createElement(`div`);s.className=`chart-overlay`,r.append(s);let c=i.map(e=>(e.getAttribute(`aria-label`)||``).split(`：`)[1]||``),u=document.createElement(`div`);u.className=`chart-extra`,u.hidden=!0,u.innerHTML=`<div class="chart-extra-row"><label class="chart-hour-label" for="chart-hour">昼夜 <output for="chart-hour">15:00</output></label><input id="chart-hour" type="range" min="0" max="24" step="0.25" value="15" aria-label="一天中的时刻"><button type="button" class="chart-day" aria-pressed="false">日升日落</button><span class="chart-zoom" role="group" aria-label="缩放"><button type="button" data-zoom="out" aria-label="缩小">－</button><button type="button" data-zoom="in" aria-label="放大">＋</button></span></div>
<fieldset class="chart-route"><legend>界门往来</legend><label>从 <select id="route-from">${c.map((e,t)=>`<option value="${t}" ${t===1?`selected`:``}>${e}</option>`).join(``)}</select></label><span aria-hidden="true">→</span><label>到 <select id="route-to">${c.map((e,t)=>`<option value="${t}" ${t===4?`selected`:``}>${e}</option>`).join(``)}</select></label><button type="button" class="route-go">走一趟界门</button><a class="route-travel" hidden>去旅行案头整理行装 ↗</a><p class="route-status" role="status" aria-live="polite"></p></fieldset>`;let d=n.closest(`.nautical-left`)?.querySelector(`.chart-tools`);d?.append(u);let f=15,p=!1,m=1,h=null,g=0,_=0,v=u.querySelector(`#chart-hour`),ee=u.querySelector(`output`),y=u.querySelector(`.chart-day`),te=e=>`${String(Math.floor(e)%24).padStart(2,`0`)}:${String(Math.round(e%1*60)%60).padStart(2,`0`)}`,b=e=>{f=(e%24+24)%24,v.value=String(f),ee.value=te(f)},x=e=>{let t=_?Math.min(.1,(e-_)/1e3):0;_=e,b(f+t*1.6),g=p?requestAnimationFrame(x):0},ne=e=>{p=e&&!matchMedia(`(prefers-reduced-motion: reduce)`).matches,y.setAttribute(`aria-pressed`,String(p)),y.textContent=p?`停在此刻`:`日升日落`,cancelAnimationFrame(g),_=0,p&&(g=requestAnimationFrame(x))};v.addEventListener(`input`,()=>{ne(!1),b(Number(v.value))},{signal:e.signal}),y.addEventListener(`click`,()=>ne(!p),{signal:e.signal});let S=e=>{m=Math.min(2.4,Math.max(.75,e))};u.querySelectorAll(`[data-zoom]`).forEach(t=>t.addEventListener(`click`,()=>S(m*(t.dataset.zoom===`in`?1.25:.8)),{signal:e.signal})),r.addEventListener(`dblclick`,e=>{n.dataset.gl===`on`&&!e.target.closest(`button`)&&S(m>=2.3?1:m*1.4)},{signal:e.signal}),r.addEventListener(`wheel`,e=>{n.dataset.gl===`on`&&(e.ctrlKey||e.metaKey)&&(e.preventDefault(),S(m*Math.exp(-e.deltaY*.0015)))},{passive:!1,signal:e.signal}),d?.querySelector(`.chart-reset`)?.addEventListener(`click`,()=>S(1),{signal:e.signal});let re=u.querySelector(`#route-from`),ie=u.querySelector(`#route-to`),C=u.querySelector(`.route-travel`),ae=u.querySelector(`.route-status`);u.querySelector(`.route-go`).addEventListener(`click`,()=>{let e=Number(re.value),t=Number(ie.value);e===t?(ae.textContent=`出发与目的是同一块大陆，换一个目的地试试。`,C.hidden=!0):(h={from:e,to:t,start:performance.now()},ae.textContent=`经界门从${c[e]}前往${c[t]}（示意）。`,C.href=`?page=travel&from=${j[e]}&to=${j[t]}&mode=gate`,C.hidden=!0,window.setTimeout(()=>{h&&h.from===e&&h.to===t&&(C.hidden=!1)},le*.75))},{signal:e.signal});let oe={hour:()=>f,zoom:()=>m,route:()=>h},w=i[0]?.parentElement??null,T=i[i.length-1]?.nextSibling??null;for(;T&&i.includes(T);)T=T.nextSibling;let se=i.map(e=>({left:e.style.left,top:e.style.top})),E=!1,D=()=>{E||(E=!0,i.forEach((e,t)=>{w&&w.insertBefore(e,T&&T.parentNode===w?T:null),e.style.left=se[t].left,e.style.top=se[t].top,e.classList.remove(`is-offscreen`)}),o.remove(),s.remove(),u.remove(),cancelAnimationFrame(g),n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.setAttribute(`hidden`,``))};try{let c=A(a.renderer,a.tier,t.positions,{...t,...oe,angle:t.angle,selected:t.selected,hot:t.hot,pitch:t.pitch},e=>{if(n.dataset.gl!==`on`)return;let t=r.clientWidth,a=r.clientHeight;e.forEach((e,n)=>{let r=i[n];r.style.left=Math.min(t-28,Math.max(28,e.x)).toFixed(1)+`px`,r.style.top=Math.min(a-28,Math.max(28,e.y)).toFixed(1)+`px`,r.classList.toggle(`is-offscreen`,!e.visible)})});a.mount(o,c,()=>{i.forEach(e=>s.append(e)),n.dataset.gl=`on`,u.hidden=!1,n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.removeAttribute(`hidden`)});let l=new MutationObserver(()=>{n.dataset.gl===`off`&&(l.disconnect(),D())});l.observe(n,{attributes:!0,attributeFilter:[`data-gl`]}),e.onCleanup(()=>{l.disconnect(),a.unmount(),D()})}catch(e){console.warn(`立体航海图未能启动，保留原转盘。`,e),n.dataset.gl=`off`,D()}}export{ue as mountChartRoom};