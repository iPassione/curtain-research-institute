import{B as e,E as t,I as n,L as r,M as i,O as a,P as o,R as s,T as c,U as l,V as u,W as d,_ as f,g as ee,h as te,j as ne,k as p,m as re,t as m,w as ie,x as h}from"./veil-shaders-Cp5PPSn8.js";var ae=`
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
}`,oe=`
${m}
uniform sampler2D uMap, uHeight;
uniform vec2 uTexel;
uniform float uAmp, uSize, uTime, uFocus, uHover;
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
  float shade = 0.7 + 0.42 * lit;
  col *= shade;
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
}`,se=`
uniform vec3 uColor, uLight;
varying vec3 vNormalW;
void main(){
  float lit = max(dot(normalize(vNormalW), uLight), 0.0);
  gl_FragColor = vec4(uColor * (0.45 + 0.6 * lit), 1.0);
}`,ce=`
varying vec3 vNormalW;
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,le=`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,ue=`
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
}`,de=`
varying float vT;
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fe=`
uniform vec3 uColor;
uniform float uTime, uGlow, uPhase, uReveal;
varying float vT;
void main(){
  float pulse = pow(fract(vT - uTime * 0.22 + uPhase), 10.0);
  float ends = smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT);
  float a = (0.28 + 0.5 * uGlow + pulse * (0.6 + uGlow)) * ends * uReveal;
  gl_FragColor = vec4(uColor * a, 1.0);
}`,pe={uniforms:{tDiffuse:{value:null},uTexel:{value:[1/1024,1/1024]},uAmount:{value:1},uFocusY:{value:.5}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
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
}`},g=40,_=g*.49,v=1.15,y=e=>new ie(e),b=Math.PI/180;function x(m,ie,h,x,S){let C=ie,w=new r,T=new ne(32,1,1,600),E=new t;w.add(E);let D=new d(-.55,.75,-.4).normalize(),O=new d,me=h.map(([e,t])=>new l(e/100,1-t/100)),k={uMap:{value:null},uHeight:{value:null},uTexel:{value:new l(1/512,1/512)},uAmp:{value:v},uSize:{value:g},uTime:{value:0},uFocus:{value:0},uHover:{value:0},uCenters:{value:me},uSel:{value:0},uHot:{value:-1},uLight:{value:O},uInk:{value:y(`#5c4628`)},uShadowTint:{value:y(`#b9c3c8`)}},A=new i(g,g,C===`full`?320:160,C===`full`?320:160);A.rotateX(-Math.PI/2);let j=new p(A,new s({uniforms:k,vertexShader:ae,fragmentShader:oe}));j.visible=!1,E.add(j);let he={uColor:{value:y(`#8d7246`)},uLight:{value:D}},M=new p(new c(_,_,.9,160,1,!0),new s({uniforms:he,vertexShader:ce,fragmentShader:se}));M.position.y=-.45,E.add(M);let ge={uInner:{value:y(`#e4d3b1`)},uOuter:{value:y(`#b59a6a`)},uDisc:{value:_},uFar:{value:70},uShadowOffset:{value:new l(1.4,1)}},N=new p(new i(600,600),new s({uniforms:ge,vertexShader:le,fragmentShader:ue}));N.rotation.x=-Math.PI/2,N.position.y=-.9,w.add(N);let P=h.map(([e,t])=>new d((e/100-.5)*g,v*.85,(t/100-.5)*g)),_e=P.slice(1).map((e,t)=>{let n=P[0],r=n.clone().lerp(e,.5);r.y+=5.5;let i=new o(n.clone(),r,e.clone()),a=new s({uniforms:{uColor:{value:y(`#d4b36e`)},uTime:k.uTime,uGlow:{value:0},uPhase:{value:t*.27},uReveal:{value:0}},vertexShader:de,fragmentShader:fe,transparent:!0,depthWrite:!1,blending:2}),c=new p(new u(i,64,.075,6,!1),a);return c.renderOrder=2,E.add(c),{mesh:c,material:a,target:t+1}}),F=!1,ve=0,I=new e,L=()=>{++ve===2&&(j.visible=!0)};I.load(`assets/nautical-chart-1254.webp`,e=>{if(F)return e.dispose();e.colorSpace=n,e.anisotropy=Math.min(8,m.capabilities.getMaxAnisotropy()),k.uMap.value=e,L()}),I.load(`assets/data/nautical-height.png`,e=>{if(F)return e.dispose();e.magFilter=a,k.uHeight.value=e,L()});let R=new ee(m);R.addPass(new te(w,T));let z=new f(pe);R.addPass(z),R.addPass(new re);let B=()=>{z.enabled=C===`full`};B();let V=1,H=1,U=!0,W=0,G=new d,K=new d,q=new d,J=60,Y=52,X=0,Z=0,Q=h.map(()=>({x:0,y:0,visible:!1})),$=new d,ye=e=>{let t=T.fov*b,n=2*Math.atan(Math.tan(t/2)*T.aspect);return e*(T.aspect<1.4?1.32:1.12)/Math.tan(Math.min(t,n)/2)};return{places:P,resize(e,t,n){V=e,H=t,R.setPixelRatio(n),R.setSize(e,t),z.uniforms.uTexel.value=[1/(e*n),1/(t*n)]},frame(e,t){m.setClearColor(13217928,1);let n=U?1:1-Math.exp(-e*3.2);U=!1,k.uTime.value=t;let r=x.angle()*b;E.rotation.y=-r,O.copy(D).applyAxisAngle(new d(0,1,0),r);let i=x.selected(),a=x.hot();k.uSel.value=i.index,k.uHot.value=a,X+=(+!!i.focused-X)*n,Z+=(+(a>=0)-Z)*(U?1:1-Math.exp(-e*8)),k.uFocus.value=X,k.uHover.value=Z,W+=(1-W)*(1-Math.exp(-e*1.2));for(let t of _e){let n=i.index===t.target||a===t.target||i.index===0&&i.focused?1:a===0?.6:0;t.material.uniforms.uGlow.value+=(n-t.material.uniforms.uGlow.value)*(1-Math.exp(-e*6)),t.material.uniforms.uReveal.value=W}T.aspect=V/H,T.fov=T.aspect<1?44:32,K.set(0,0,0),i.focused&&K.copy(P[i.index]).setY(0).applyAxisAngle(new d(0,1,0),-r),G.lerp(K,n);let o=ye(_)*(1-.45*X);J+=(o-J)*n;let s=Math.min(80,Math.max(30,52+10*X+x.pitch()));Y+=(s-Y)*n,q.set(0,Math.sin(Y*b)*J,Math.cos(Y*b)*J).add(G),T.position.copy(q),T.lookAt(G),T.updateProjectionMatrix(),z.uniforms.uFocusY.value=.5,R.render(e),E.updateMatrixWorld();for(let e=0;e<P.length;e++)$.copy(P[e]).applyMatrix4(E.matrixWorld).project(T),Q[e].x=($.x*.5+.5)*V,Q[e].y=(-$.y*.5+.5)*H,Q[e].visible=$.z<1&&Q[e].x>-20&&Q[e].x<V+20&&Q[e].y>-20&&Q[e].y<H+20;S(Q)},setTier(e){return C=e,C!==`static`&&(B(),!0)},dispose(){F=!0,R.dispose(),k.uMap.value?.dispose(),k.uHeight.value?.dispose(),w.traverse(e=>{let t=e;t.geometry?.dispose(),t.material?.dispose?.()})}}}function S(e,t){let{stage:n,frame:r,buttons:i}=t,a=h();if(a.tier===`static`)return;n.dataset.gl=`loading`;let o=document.createElement(`div`);o.className=`chart-gl`,o.setAttribute(`aria-hidden`,`true`),r.prepend(o);let s=document.createElement(`div`);s.className=`chart-overlay`,r.append(s);let c=i[0]?.parentElement??null,l=i[i.length-1]?.nextSibling??null;for(;l&&i.includes(l);)l=l.nextSibling;let u=i.map(e=>({left:e.style.left,top:e.style.top})),d=!1,f=()=>{d||(d=!0,i.forEach((e,t)=>{c&&c.insertBefore(e,l&&l.parentNode===c?l:null),e.style.left=u[t].left,e.style.top=u[t].top,e.classList.remove(`is-offscreen`)}),o.remove(),s.remove(),n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.setAttribute(`hidden`,``))};try{let c=x(a.renderer,a.tier,t.positions,t,e=>{if(n.dataset.gl!==`on`)return;let t=r.clientWidth,a=r.clientHeight;e.forEach((e,n)=>{let r=i[n];r.style.left=Math.min(t-28,Math.max(28,e.x)).toFixed(1)+`px`,r.style.top=Math.min(a-28,Math.max(28,e.y)).toFixed(1)+`px`,r.classList.toggle(`is-offscreen`,!e.visible)})});a.mount(o,c,()=>{i.forEach(e=>s.append(e)),n.dataset.gl=`on`,n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.removeAttribute(`hidden`)});let l=new MutationObserver(()=>{n.dataset.gl===`off`&&(l.disconnect(),f())});l.observe(n,{attributes:!0,attributeFilter:[`data-gl`]}),e.onCleanup(()=>{l.disconnect(),a.unmount(),f()})}catch(e){console.warn(`立体航海图未能启动，保留原转盘。`,e),n.dataset.gl=`off`,f()}}export{S as mountChartRoom};