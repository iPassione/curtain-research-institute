import{A as e,C as t,E as n,I as r,L as i,N as a,P as o,c as s,f as c,g as l,i as u,j as d,k as f,n as p,p as ee,r as te,t as ne,v as re,w as m,y as h}from"./OutputPass-DIvUokWw.js";import{t as g}from"./veil-shaders-BxaWYk3B.js";var ie=`
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
}`,ae=`
${g}
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
}`,oe=`
uniform vec3 uColor, uLight;
varying vec3 vNormalW;
void main(){
  float lit = max(dot(normalize(vNormalW), uLight), 0.0);
  gl_FragColor = vec4(uColor * (0.45 + 0.6 * lit), 1.0);
}`,se=`
varying vec3 vNormalW;
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,ce=`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,le=`
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
}`,ue=`
varying float vT;
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,de=`
uniform vec3 uColor;
uniform float uTime, uGlow, uPhase, uReveal;
varying float vT;
void main(){
  float pulse = pow(fract(vT - uTime * 0.22 + uPhase), 10.0);
  float ends = smoothstep(0.0, 0.06, vT) * smoothstep(1.0, 0.94, vT);
  float a = (0.28 + 0.5 * uGlow + pulse * (0.6 + uGlow)) * ends * uReveal;
  gl_FragColor = vec4(uColor * a, 1.0);
}`,fe={uniforms:{tDiffuse:{value:null},uTexel:{value:[1/1024,1/1024]},uAmount:{value:1},uFocusY:{value:.5}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
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
}`},_=40,v=_*.49,y=1.15,b=e=>new c(e),x=Math.PI/180;function S(s,c,g,S,C){let w=c,T=new e,E=new t(32,1,1,600),D=new l;T.add(D);let O=new i(-.55,.75,-.4).normalize(),k=new i,pe=g.map(([e,t])=>new r(e/100,1-t/100)),A={uMap:{value:null},uHeight:{value:null},uTexel:{value:new r(1/512,1/512)},uAmp:{value:y},uSize:{value:_},uTime:{value:0},uFocus:{value:0},uHover:{value:0},uCenters:{value:pe},uSel:{value:0},uHot:{value:-1},uLight:{value:k},uInk:{value:b(`#5c4628`)},uShadowTint:{value:b(`#b9c3c8`)}},me=new m(_,_,w===`full`?320:160,w===`full`?320:160);me.rotateX(-Math.PI/2);let j=new h(me,new d({uniforms:A,vertexShader:ie,fragmentShader:ae}));j.visible=!1,D.add(j);let he={uColor:{value:b(`#8d7246`)},uLight:{value:O}},M=new h(new ee(v,v,.9,160,1,!0),new d({uniforms:he,vertexShader:se,fragmentShader:oe}));M.position.y=-.45,D.add(M);let ge={uInner:{value:b(`#e4d3b1`)},uOuter:{value:b(`#b59a6a`)},uDisc:{value:v},uFar:{value:70},uShadowOffset:{value:new r(1.4,1)}},N=new h(new m(600,600),new d({uniforms:ge,vertexShader:ce,fragmentShader:le}));N.rotation.x=-Math.PI/2,N.position.y=-.9,T.add(N);let P=g.map(([e,t])=>new i((e/100-.5)*_,y*.85,(t/100-.5)*_)),_e=P.slice(1).map((e,t)=>{let r=P[0],i=r.clone().lerp(e,.5);i.y+=5.5;let a=new n(r.clone(),i,e.clone()),s=new d({uniforms:{uColor:{value:b(`#d4b36e`)},uTime:A.uTime,uGlow:{value:0},uPhase:{value:t*.27},uReveal:{value:0}},vertexShader:ue,fragmentShader:de,transparent:!0,depthWrite:!1,blending:2}),c=new h(new o(a,64,.075,6,!1),s);return c.renderOrder=2,D.add(c),{mesh:c,material:s,target:t+1}}),F=!1,ve=0,I=new a,L=()=>{++ve===2&&(j.visible=!0)};I.load(`assets/nautical-chart-1254.webp`,e=>{if(F)return e.dispose();e.colorSpace=f,e.anisotropy=Math.min(8,s.capabilities.getMaxAnisotropy()),A.uMap.value=e,L()}),I.load(`assets/data/nautical-height.png`,e=>{if(F)return e.dispose();e.magFilter=re,A.uHeight.value=e,L()});let R=new te(s);R.addPass(new p(T,E));let z=new u(fe);R.addPass(z),R.addPass(new ne);let B=()=>{z.enabled=w===`full`};B();let V=1,H=1,U=!0,W=0,G=new i,K=new i,q=new i,J=60,Y=52,X=0,Z=0,Q=g.map(()=>({x:0,y:0,visible:!1})),$=new i,ye=e=>{let t=E.fov*x,n=2*Math.atan(Math.tan(t/2)*E.aspect);return e*(E.aspect<1.4?1.32:1.12)/Math.tan(Math.min(t,n)/2)};return{places:P,resize(e,t,n){V=e,H=t,R.setPixelRatio(n),R.setSize(e,t),z.uniforms.uTexel.value=[1/(e*n),1/(t*n)]},frame(e,t){s.setClearColor(13217928,1);let n=U?1:1-Math.exp(-e*3.2);U=!1,A.uTime.value=t;let r=S.angle()*x;D.rotation.y=-r,k.copy(O).applyAxisAngle(new i(0,1,0),r);let a=S.selected(),o=S.hot();A.uSel.value=a.index,A.uHot.value=o,X+=(+!!a.focused-X)*n,Z+=(+(o>=0)-Z)*(U?1:1-Math.exp(-e*8)),A.uFocus.value=X,A.uHover.value=Z,W+=(1-W)*(1-Math.exp(-e*1.2));for(let t of _e){let n=a.index===t.target||o===t.target||a.index===0&&a.focused?1:o===0?.6:0;t.material.uniforms.uGlow.value+=(n-t.material.uniforms.uGlow.value)*(1-Math.exp(-e*6)),t.material.uniforms.uReveal.value=W}E.aspect=V/H,E.fov=E.aspect<1?44:32,K.set(0,0,0),a.focused&&K.copy(P[a.index]).setY(0).applyAxisAngle(new i(0,1,0),-r),G.lerp(K,n);let c=ye(v)*(1-.45*X);J+=(c-J)*n;let l=Math.min(80,Math.max(30,52+10*X+S.pitch()));Y+=(l-Y)*n,q.set(0,Math.sin(Y*x)*J,Math.cos(Y*x)*J).add(G),E.position.copy(q),E.lookAt(G),E.updateProjectionMatrix(),z.uniforms.uFocusY.value=.5,R.render(e),D.updateMatrixWorld();for(let e=0;e<P.length;e++)$.copy(P[e]).applyMatrix4(D.matrixWorld).project(E),Q[e].x=($.x*.5+.5)*V,Q[e].y=(-$.y*.5+.5)*H,Q[e].visible=$.z<1&&Q[e].x>-20&&Q[e].x<V+20&&Q[e].y>-20&&Q[e].y<H+20;C(Q)},setTier(e){return w=e,w!==`static`&&(B(),!0)},dispose(){F=!0,R.dispose(),A.uMap.value?.dispose(),A.uHeight.value?.dispose(),T.traverse(e=>{let t=e;t.geometry?.dispose(),t.material?.dispose?.()})}}}function C(e,t){let{stage:n,frame:r,buttons:i}=t,a=s();if(a.tier===`static`)return;n.dataset.gl=`loading`;let o=document.createElement(`div`);o.className=`chart-gl`,o.setAttribute(`aria-hidden`,`true`),r.prepend(o);let c=document.createElement(`div`);c.className=`chart-overlay`,r.append(c);let l=i[0]?.parentElement??null,u=i[i.length-1]?.nextSibling??null;for(;u&&i.includes(u);)u=u.nextSibling;let d=i.map(e=>({left:e.style.left,top:e.style.top})),f=!1,p=()=>{f||(f=!0,i.forEach((e,t)=>{l&&l.insertBefore(e,u&&u.parentNode===l?u:null),e.style.left=d[t].left,e.style.top=d[t].top,e.classList.remove(`is-offscreen`)}),o.remove(),c.remove(),n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.setAttribute(`hidden`,``))};try{let s=S(a.renderer,a.tier,t.positions,t,e=>{if(n.dataset.gl!==`on`)return;let t=r.clientWidth,a=r.clientHeight;e.forEach((e,n)=>{let r=i[n];r.style.left=Math.min(t-28,Math.max(28,e.x)).toFixed(1)+`px`,r.style.top=Math.min(a-28,Math.max(28,e.y)).toFixed(1)+`px`,r.classList.toggle(`is-offscreen`,!e.visible)})});a.mount(o,s,()=>{i.forEach(e=>c.append(e)),n.dataset.gl=`on`,n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.removeAttribute(`hidden`)});let l=new MutationObserver(()=>{n.dataset.gl===`off`&&(l.disconnect(),p())});l.observe(n,{attributes:!0,attributeFilter:[`data-gl`]}),e.onCleanup(()=>{l.disconnect(),a.unmount(),p()})}catch(e){console.warn(`立体航海图未能启动，保留原转盘。`,e),n.dataset.gl=`off`,p()}}export{C as mountChartRoom};