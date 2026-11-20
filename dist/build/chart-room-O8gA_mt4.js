import{E as e,F as t,I as n,N as r,O as i,T as a,a as o,b as s,d as c,j as l,k as u,m as d,n as f,p,r as m,s as h,t as g,v as _,x as v,y as ee}from"./stage-DsLM7H9W.js";import{i as y,n as te,r as ne,t as re}from"./OutputPass-CmbV6HSY.js";import{n as ie,r as b,t as ae}from"./terrain-towns-BNHzHas9.js";var oe=`
uniform sampler2D uHeight, uCover;
uniform float uAmp;
varying vec2 vUv;
varying vec3 vWorld;
void main(){
  vUv = uv;
  float edge = 1.0 - smoothstep(0.44, 0.47, length(uv - 0.5));
  vec3 p = position;
  vec2 t = texture2D(uHeight, uv).rg;
  p.y += ((t.r + t.g / 256.0) * uAmp - texture2D(uCover, uv).r * 0.03) * edge;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,x=`
${b}
uniform sampler2D uMap, uHeight, uCover;
uniform vec2 uTexel;
uniform float uAmp, uSize, uTime, uFocus, uHover, uAmbient, uSunStr, uNight;
uniform vec3 uSunCol;
uniform vec2 uCenters[5];
uniform int uSel, uHot;
uniform vec3 uLight, uInk, uShadowTint;
varying vec2 vUv;
varying vec3 vWorld;
float H(vec2 uv){ vec2 t = texture2D(uHeight, uv).rg; return t.r + t.g / 256.0; }
int nearest(vec2 uv){
  int k = 0; float best = 1e9;
  for (int i = 0; i < 5; i++) { float d = distance(uv, uCenters[i]); if (d < best) { best = d; k = i; } }
  return k;
}
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  if (r > 0.985) discard;
  float h = H(vUv);
  vec2 e = uTexel * 1.5;
  float hx = H(vUv + vec2(e.x, 0.0)) - H(vUv - vec2(e.x, 0.0));
  float hz = H(vUv + vec2(0.0, e.y)) - H(vUv - vec2(0.0, e.y));
  float k = uAmp * 2.2 / (2.0 * uSize); // 光照用的起伏放大 2.2 倍：山脊与河谷读得清
  vec3 N = normalize(vec3(-hx * k / e.x, 1.0, hz * k / e.y));
  vec3 col = texture2D(uMap, vUv).rgb;
  // 地形的凹凸：谷底略暗、山脊略亮（与周围平均高度相比）
  vec2 tb = texture2D(uHeight, vUv, 3.5).rg;
  float around = tb.r + tb.g / 256.0;
  col *= clamp(1.0 + (h - around) * 5.0, 0.8, 1.12);

  // 侧光照出浮雕；背光面略偏冷，像纸面上的阴影。
  float lit = max(dot(N, uLight), 0.0);
  float shade = uAmbient + uSunStr * lit * (1.0 - 0.45 * uNight);
  col *= shade * uSunCol;
  // 夜里：整体偏冷偏暗，背光面更深
  col = mix(col, col * vec3(0.55, 0.68, 0.95), uNight * 0.5);
  col = mix(col, col * uShadowTint, (1.0 - lit) * 0.25);

  // 河流与湖泊：在纸面上刻出的水道，偏蓝的墨色，白天映出一点天光
  float water = smoothstep(0.2, 0.7, texture2D(uCover, vUv).r) * smoothstep(0.01, 0.04, h);
  vec3 V = normalize(cameraPosition - vWorld);
  float glint = pow(max(dot(reflect(-uLight, vec3(0.0, 1.0, 0.0)), V), 0.0), 24.0);
  col = mix(col, mix(vec3(0.16, 0.27, 0.32), vec3(0.05, 0.08, 0.12), uNight) + uSunCol * glint * 0.35, water * 0.75);

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
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,S=`
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,C=`
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
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,le=`
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
}`,T={uniforms:{tDiffuse:{value:null},uTexel:{value:[1/1024,1/1024]},uAmount:{value:1},uFocusY:{value:.5}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
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
}`},ue=`
uniform sampler2D uHeight;
uniform float uAmp, uSize, uDpr, uTime;
attribute float aSize, aPhase, aBright;
varying float vGlow;
void main(){
  vec2 uv = position.xz;
  vec2 t = texture2D(uHeight, uv).rg;
  vec3 p = vec3((uv.x - 0.5) * uSize, (t.r + t.g / 256.0) * uAmp + 0.03, (0.5 - uv.y) * uSize);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vGlow = aBright * (0.78 + 0.22 * sin(uTime * (1.3 + aPhase * 2.1) + aPhase * 37.0));
  gl_PointSize = max(aSize * uDpr * 26.0 / max(1.0, -mv.z) * 4.0, 2.0 * uDpr);
  gl_Position = projectionMatrix * mv;
}`,de=`
uniform float uOn;
varying float vGlow;
void main(){
  float d = length(gl_PointCoord - 0.5);
  vec3 c = vec3(1.0, 0.64, 0.3) * (smoothstep(0.12, 0.0, d) * 2.6 + pow(smoothstep(0.5, 0.0, d), 2.0) * 0.7) * vGlow;
  gl_FragColor = vec4(c * uOn, 1.0);
}`,E=40,D=E*.49,fe=1,O=e=>new o(e),k=Math.PI/180,pe=2600;function me(g,b,me,A,he){let j=b,M=new i,N=new _(32,1,1,600),P=new c;M.add(P);let F=new n(-.55,.75,-.4).normalize(),ge=new n,_e=me.map(([e,n])=>new t(e/100,1-n/100)),I={uMap:{value:null},uHeight:{value:null},uCover:{value:null},uTexel:{value:new t(1/2048,1/2048)},uAmp:{value:fe},uSize:{value:E},uTime:{value:0},uFocus:{value:0},uHover:{value:0},uCenters:{value:_e},uSel:{value:0},uHot:{value:-1},uLight:{value:ge},uInk:{value:O(`#5c4628`)},uShadowTint:{value:O(`#b9c3c8`)},uSunCol:{value:new o(1,1,1)},uAmbient:{value:.7},uSunStr:{value:.42},uNight:{value:0}},ve=new ee(E,E,j===`full`?400:200,j===`full`?400:200);ve.rotateX(-Math.PI/2);let ye=new d(ve,new u({uniforms:I,vertexShader:oe,fragmentShader:x}));ye.visible=!1,P.add(ye);let be=O(`#8d7246`),xe={uColor:{value:be.clone()},uLight:{value:F}},Se=new d(new h(D,D,.9,160,1,!0),new u({uniforms:xe,vertexShader:ce,fragmentShader:se}));Se.position.y=-.45,P.add(Se);let Ce=O(`#e4d3b1`),we=O(`#b59a6a`),Te=O(`#2b3138`),Ee=O(`#14181d`),L={uInner:{value:Ce.clone()},uOuter:{value:we.clone()},uDisc:{value:D},uFar:{value:70},uShadowOffset:{value:new t(1.4,1)}},De=new d(new ee(600,600),new u({uniforms:L,vertexShader:S,fragmentShader:C}));De.rotation.x=-Math.PI/2,De.position.y=-.9,M.add(De);let Oe=[],ke=[],Ae=[],je=[],Me=7,R=()=>(Me=Me*16807%2147483647)/2147483647;for(let[e,t,n]of ae)for(let r=0,i=2+Math.round(n*5);r<i;r++){let r=R()*Math.PI*2,i=Math.sqrt(R())*(.002+n*.005);Oe.push(e/100+Math.cos(r)*i,0,1-t/100+Math.sin(r)*i),ke.push(1+n),Ae.push(R()),je.push(1)}for(let[e,t,n]of ie)Oe.push(e/100,0,1-t/100),ke.push(.6+n),Ae.push(R()),je.push(.4+n*.5);let z=new m;z.setAttribute(`position`,new f(new Float32Array(Oe),3)),z.setAttribute(`aSize`,new f(new Float32Array(ke),1)),z.setAttribute(`aPhase`,new f(new Float32Array(Ae),1)),z.setAttribute(`aBright`,new f(new Float32Array(je),1));let Ne={uHeight:I.uHeight,uAmp:I.uAmp,uSize:I.uSize,uDpr:{value:1},uTime:I.uTime,uOn:{value:0}},B=new s(z,new u({uniforms:Ne,vertexShader:ue,fragmentShader:de,transparent:!0,depthWrite:!1,blending:2}));B.frustumCulled=!1,B.renderOrder=1,B.visible=!1,P.add(B);let V=me.map(([e,t])=>new n((e/100-.5)*E,fe*.85,(t/100-.5)*E)),Pe=V.slice(1).map((e,t)=>{let n=V[0],i=n.clone().lerp(e,.5);i.y+=5.5;let a=new v(n.clone(),i,e.clone()),o=new u({uniforms:{uColor:{value:O(`#d4b36e`)},uTime:I.uTime,uGlow:{value:0},uPhase:{value:t*.27},uReveal:{value:0},uHead:{value:-1}},vertexShader:w,fragmentShader:le,transparent:!0,depthWrite:!1,blending:2}),s=new d(new r(a,64,.075,6,!1),o);return s.renderOrder=2,P.add(s),{mesh:s,material:o,target:t+1}}),Fe=``,H=null,U=null,W=new u({uniforms:{uColor:{value:O(`#f1e2b4`)},uTime:I.uTime,uGlow:{value:1},uPhase:{value:0},uReveal:{value:0},uHead:{value:0}},vertexShader:w,fragmentShader:le,transparent:!0,depthWrite:!1,blending:2}),G=new m;G.setAttribute(`position`,new f(new Float32Array(3),3));let Ie=new u({uniforms:{uColor:{value:O(`#fff2c2`)},uSize:{value:34},uAlpha:{value:0}},vertexShader:`uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; gl_Position = projectionMatrix * mv; }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * (smoothstep(0.5, 0.0, d) * 0.9 + smoothstep(0.12, 0.0, d) * 2.0) * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2}),Le=new s(G,Ie);Le.frustumCulled=!1,Le.renderOrder=4,P.add(Le);let Re=new u({uniforms:{uColor:{value:O(`#f1e2b4`)},uAlpha:{value:0}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor * uAlpha, 1.0); }`,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:2}),K=new d(new a(.85,1,64),Re);K.rotation.x=-Math.PI/2,K.renderOrder=4,P.add(K);let q=new n,ze=()=>{let e=A.route?.()??null,t=e?`${e.from}-${e.to}-${e.start}`:``;if(t!==Fe&&(Fe=t,U&&(P.remove(U),U.geometry.dispose(),U=null),H=null,e&&e.from!==e.to)){let t=V[e.from],n=V[e.to],i=t.clone().lerp(n,.5);i.y+=4+t.distanceTo(n)*.28,H=new v(t.clone(),i,n.clone()),U=new d(new r(H,80,.09,6,!1),W),U.renderOrder=3,P.add(U)}if(!e||!H){Ie.uniforms.uAlpha.value=0,Re.uniforms.uAlpha.value=0,W.uniforms.uReveal.value=0;return}let n=(performance.now()-e.start)/pe,i=Math.min(1,Math.max(0,n/.72)),a=i<.5?2*i*i:1-(-2*i+2)**2/2;H.getPoint(a,q),W.uniforms.uHead.value=i<1?a:1.2,G.attributes.position.array.set([q.x,q.y,q.z]),G.attributes.position.needsUpdate=!0,Ie.uniforms.uAlpha.value=i<1?Math.min(1,n*6):Math.max(0,1-(n-.72)*5),W.uniforms.uReveal.value=Math.min(1,n*4)*(n>1.6?Math.max(.35,1-(n-1.6)):1);let o=(n-.72)/.28;K.position.copy(V[A.route().to]).setY(fe*.9),K.scale.setScalar(.3+Math.max(0,o)*4.5),Re.uniforms.uAlpha.value=o>0&&o<1?(1-o)*1.2:0},J=!1,Be=0,Ve=new l,He=()=>{++Be===3&&(ye.visible=B.visible=!0)};Ve.load(`assets/nautical-chart-1254.webp`,t=>{if(J)return t.dispose();t.colorSpace=e,t.anisotropy=Math.min(8,g.capabilities.getMaxAnisotropy()),I.uMap.value=t,He()}),Ve.load(`assets/data/nautical-terrain.webp`,e=>{if(J)return e.dispose();e.magFilter=p,I.uHeight.value=e,He()}),Ve.load(`assets/data/nautical-cover.webp`,e=>{if(J)return e.dispose();I.uCover.value=e,He()});let Y=new ne(g);Y.addPass(new te(M,N));let X=new y(T);Y.addPass(X),Y.addPass(new re);let Ue=()=>{X.enabled=j===`full`};Ue();let Z=1,We=1,Ge=!0,Ke=0,qe=new n,Je=new n,Ye=new n,Xe=60,Ze=52,Q=0,Qe=0,$=me.map(()=>({x:0,y:0,visible:!1})),$e=new n,et=e=>{let t=N.fov*k,n=2*Math.atan(Math.tan(t/2)*N.aspect);return e*(N.aspect<1.4?1.32:1.12)/Math.tan(Math.min(t,n)/2)};return{places:V,resize(e,t,n){Z=e,We=t,Y.setPixelRatio(n),Y.setSize(e,t),X.uniforms.uTexel.value=[1/(e*n),1/(t*n)],Ne.uDpr.value=n},frame(e,t){g.setClearColor(new o(1843494).lerp(new o(13217928),Math.min(1,Math.max(0,(Math.sin(((A.hour?.()??15)-6)/12*Math.PI)+.12)/.4))),1);let r=Ge?1:1-Math.exp(-e*3.2);Ge=!1,I.uTime.value=t;let i=A.angle()*k;P.rotation.y=-i;let a=A.hour?.()??15,s=Math.atan2(-.4,-.55)+(a-15)/24*Math.PI*2,c=Math.sin((a-6)/12*Math.PI),l=Math.min(1,Math.max(0,(c+.12)/.4)),u=(l>.02?Math.max(.12,c):.5)*1,d=l>.02?s:s+Math.PI;F.set(Math.cos(d)*Math.cos(u),Math.sin(Math.max(.12,u)),Math.sin(d)*Math.cos(u)).normalize(),ge.copy(F).applyAxisAngle(new n(0,1,0),i);let f=Math.max(0,1-Math.abs(c)/.35)*l;I.uSunCol.value.setRGB(1,1-.18*f,1-.35*f).lerp(new o(.55,.66,.95),1-l),I.uAmbient.value=.16+.54*l,I.uSunStr.value=.2+.22*l+.15*f,I.uNight.value=1-l,Ne.uOn.value=Math.max(0,1-l*1.6),L.uInner.value.copy(Te).lerp(Ce,l),L.uOuter.value.copy(Ee).lerp(we,l),xe.uColor.value.copy(be).multiplyScalar(.35+.65*l),L.uShadowOffset.value.set(-F.x*2.2,-F.z*2.2),ze();let p=A.selected(),m=A.hot();I.uSel.value=p.index,I.uHot.value=m,Q+=(+!!p.focused-Q)*r,Qe+=(+(m>=0)-Qe)*(Ge?1:1-Math.exp(-e*8)),I.uFocus.value=Q,I.uHover.value=Qe,Ke+=(1-Ke)*(1-Math.exp(-e*1.2));for(let t of Pe){let n=p.index===t.target||m===t.target||p.index===0&&p.focused?1:m===0?.6:0;t.material.uniforms.uGlow.value+=(n-t.material.uniforms.uGlow.value)*(1-Math.exp(-e*6)),t.material.uniforms.uReveal.value=Ke}N.aspect=Z/We,N.fov=N.aspect<1?44:32,Je.set(0,0,0),p.focused&&Je.copy(V[p.index]).setY(0).applyAxisAngle(new n(0,1,0),-i),qe.lerp(Je,r);let h=et(D)*(1-.45*Q)/(A.zoom?.()??1);Xe+=(h-Xe)*r;let _=Math.min(80,Math.max(30,52+10*Q+A.pitch()));Ze+=(_-Ze)*r,Ye.set(0,Math.sin(Ze*k)*Xe,Math.cos(Ze*k)*Xe).add(qe),N.position.copy(Ye),N.lookAt(qe),N.updateProjectionMatrix(),X.uniforms.uFocusY.value=.5,Y.render(e),P.updateMatrixWorld();for(let e=0;e<V.length;e++)$e.copy(V[e]).applyMatrix4(P.matrixWorld).project(N),$[e].x=($e.x*.5+.5)*Z,$[e].y=(-$e.y*.5+.5)*We,$[e].visible=$e.z<1&&$[e].x>-20&&$[e].x<Z+20&&$[e].y>-20&&$[e].y<We+20;he($)},setTier(e){return j=e,j!==`static`&&(Ue(),!0)},dispose(){J=!0,Y.dispose(),I.uMap.value?.dispose(),I.uHeight.value?.dispose(),I.uCover.value?.dispose(),M.traverse(e=>{let t=e;t.geometry?.dispose(),t.material?.dispose?.()})}}}var A=[`camorria`,`eisenrod`,`tsvergno`,`esperanza`,`enchanteves`];function he(e,t){let{stage:n,frame:r,buttons:i}=t,a=g();if(a.tier===`static`)return;n.dataset.gl=`loading`;let o=document.createElement(`div`);o.className=`chart-gl`,o.setAttribute(`aria-hidden`,`true`),r.prepend(o);let s=document.createElement(`div`);s.className=`chart-overlay`,r.append(s);let c=i.map(e=>(e.getAttribute(`aria-label`)||``).split(`：`)[1]||``),l=document.createElement(`div`);l.className=`chart-extra`,l.hidden=!0,l.innerHTML=`<div class="chart-extra-row"><label class="chart-hour-label" for="chart-hour">昼夜 <output for="chart-hour">15:00</output></label><input id="chart-hour" type="range" min="0" max="24" step="0.25" value="15" aria-label="一天中的时刻"><button type="button" class="chart-day" aria-pressed="false">日升日落</button><span class="chart-zoom" role="group" aria-label="缩放"><button type="button" data-zoom="out" aria-label="缩小">－</button><button type="button" data-zoom="in" aria-label="放大">＋</button></span></div>
<fieldset class="chart-route"><legend>界门往来</legend><label>从 <select id="route-from">${c.map((e,t)=>`<option value="${t}" ${t===1?`selected`:``}>${e}</option>`).join(``)}</select></label><span aria-hidden="true">→</span><label>到 <select id="route-to">${c.map((e,t)=>`<option value="${t}" ${t===4?`selected`:``}>${e}</option>`).join(``)}</select></label><button type="button" class="route-go">走一趟界门</button><a class="route-travel" hidden>去旅行案头整理行装 ↗</a><p class="route-status" role="status" aria-live="polite"></p></fieldset>`;let u=n.closest(`.nautical-left`)?.querySelector(`.chart-tools`);u?.append(l);let d=15,f=!1,p=1,m=null,h=0,_=0,v=l.querySelector(`#chart-hour`),ee=l.querySelector(`output`),y=l.querySelector(`.chart-day`),te=e=>`${String(Math.floor(e)%24).padStart(2,`0`)}:${String(Math.round(e%1*60)%60).padStart(2,`0`)}`,ne=e=>{d=(e%24+24)%24,v.value=String(d),ee.value=te(d)},re=e=>{let t=_?Math.min(.1,(e-_)/1e3):0;_=e,ne(d+t*1.6),h=f?requestAnimationFrame(re):0},ie=e=>{f=e&&!matchMedia(`(prefers-reduced-motion: reduce)`).matches,y.setAttribute(`aria-pressed`,String(f)),y.textContent=f?`停在此刻`:`日升日落`,cancelAnimationFrame(h),_=0,f&&(h=requestAnimationFrame(re))};v.addEventListener(`input`,()=>{ie(!1),ne(Number(v.value))},{signal:e.signal}),y.addEventListener(`click`,()=>ie(!f),{signal:e.signal});let b=e=>{p=Math.min(2.4,Math.max(.75,e))};l.querySelectorAll(`[data-zoom]`).forEach(t=>t.addEventListener(`click`,()=>b(p*(t.dataset.zoom===`in`?1.25:.8)),{signal:e.signal})),r.addEventListener(`dblclick`,e=>{n.dataset.gl===`on`&&!e.target.closest(`button`)&&b(p>=2.3?1:p*1.4)},{signal:e.signal}),r.addEventListener(`wheel`,e=>{n.dataset.gl===`on`&&(e.ctrlKey||e.metaKey)&&(e.preventDefault(),b(p*Math.exp(-e.deltaY*.0015)))},{passive:!1,signal:e.signal}),u?.querySelector(`.chart-reset`)?.addEventListener(`click`,()=>b(1),{signal:e.signal});let ae=l.querySelector(`#route-from`),oe=l.querySelector(`#route-to`),x=l.querySelector(`.route-travel`),se=l.querySelector(`.route-status`);l.querySelector(`.route-go`).addEventListener(`click`,()=>{let e=Number(ae.value),t=Number(oe.value);e===t?(se.textContent=`出发与目的是同一块大陆，换一个目的地试试。`,x.hidden=!0):(m={from:e,to:t,start:performance.now()},se.textContent=`经界门从${c[e]}前往${c[t]}（示意）。`,x.href=`?page=travel&from=${A[e]}&to=${A[t]}&mode=gate`,x.hidden=!0,window.setTimeout(()=>{m&&m.from===e&&m.to===t&&(x.hidden=!1)},pe*.75))},{signal:e.signal});let ce={hour:()=>d,zoom:()=>p,route:()=>m},S=i[0]?.parentElement??null,C=i[i.length-1]?.nextSibling??null;for(;C&&i.includes(C);)C=C.nextSibling;let w=i.map(e=>({left:e.style.left,top:e.style.top})),le=!1,T=()=>{le||(le=!0,i.forEach((e,t)=>{S&&S.insertBefore(e,C&&C.parentNode===S?C:null),e.style.left=w[t].left,e.style.top=w[t].top,e.classList.remove(`is-offscreen`)}),o.remove(),s.remove(),l.remove(),cancelAnimationFrame(h),n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.setAttribute(`hidden`,``))};try{let c=me(a.renderer,a.tier,t.positions,{...t,...ce,angle:t.angle,selected:t.selected,hot:t.hot,pitch:t.pitch},e=>{if(n.dataset.gl!==`on`)return;let t=r.clientWidth,a=r.clientHeight;e.forEach((e,n)=>{let r=i[n];r.style.left=Math.min(t-28,Math.max(28,e.x)).toFixed(1)+`px`,r.style.top=Math.min(a-28,Math.max(28,e.y)).toFixed(1)+`px`,r.classList.toggle(`is-offscreen`,!e.visible)})});a.mount(o,c,()=>{i.forEach(e=>s.append(e)),n.dataset.gl=`on`,l.hidden=!1,n.closest(`.nautical-left`)?.querySelector(`.chart-gl-note`)?.removeAttribute(`hidden`)});let u=new MutationObserver(()=>{n.dataset.gl===`off`&&(u.disconnect(),T())});u.observe(n,{attributes:!0,attributeFilter:[`data-gl`]}),e.onCleanup(()=>{u.disconnect(),a.unmount(),T()})}catch(e){console.warn(`立体航海图未能启动，保留原转盘。`,e),n.dataset.gl=`off`,T()}}export{he as mountChartRoom};