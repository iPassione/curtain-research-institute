import{F as e,O as t,_ as n,j as r,k as i,m as a,t as o,y as s}from"./stage-kHJ78NE5.js";var c=`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,l=`
uniform sampler2D uL0, uL1, uL2, uDepth, uLights;
uniform float uCount, uV, uLightsOn, uTime, uStrength, uZoom;
uniform vec2 uOffset, uSize;
varying vec2 vUv;

// 视差：从当前像素出发，按此处深度反推「本来该看到的那一点」，迭代三次收敛（比一步更少撕裂）
vec2 parallax(vec2 uv){
  vec2 c = (uv - 0.5) / uZoom + 0.5;          // 略微放大，视差移动时边缘不露底
  vec2 p = c;
  for (int i = 0; i < 3; i++) {
    float d = texture2D(uDepth, p).r;
    p = c - uOffset * (d - 0.45) * uStrength;
  }
  return clamp(p, 0.001, 0.999);
}

// 与 CSS linear-gradient(100deg, …) 相同的光带：后一时段从左向右铺过来
float sweep(float f){
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;   // CSS 像素，y 向下
  vec2 dir = vec2(0.9848, 0.1736);             // 100° 的方向
  float len = abs(uSize.x * dir.x) + abs(uSize.y * dir.y);
  float t = dot(px - uSize * 0.5, dir) / len + 0.5;
  float p = -0.3 + 1.6 * f;
  return 1.0 - smoothstep(p - 0.3, p + 0.3, t);
}

void main(){
  vec2 uv = parallax(vUv);
  vec2 tuv = uv;                               // 载入时贴图已按 y 向上翻转，与 vUv 同向
  vec3 col;
  if (uCount < 1.5) {
    col = texture2D(uL0, tuv).rgb;
  } else {
    float i = min(1.0, floor(uV)), f = uV - i;
    vec3 lo = i < 0.5 ? texture2D(uL0, tuv).rgb : texture2D(uL1, tuv).rgb;
    vec3 hi = i < 0.5 ? texture2D(uL1, tuv).rgb : texture2D(uL2, tuv).rgb;
    col = mix(lo, hi, f > 0.0 ? sweep(f) : 0.0);
  }
  if (uLightsOn > 0.0) {
    // 窗灯：入夜图乘灯光遮罩；光晕取遮罩与入夜图的低一级细节（模糊），屏幕混合，带一点摇曳
    vec3 ev = texture2D(uL2, tuv).rgb;
    float m = texture2D(uLights, tuv).a;
    float mb = texture2D(uLights, tuv, 3.5).a;
    vec3 evb = texture2D(uL2, tuv, 3.5).rgb;
    float flick = 0.86 + 0.08 * sin(uTime * 1.7) + 0.06 * sin(uTime * 4.3 + 1.3);
    vec3 glow = ev * m * 0.3 + evb * mb * 1.25 * flick * vec3(1.05, 0.95, 0.8);
    glow *= uLightsOn;
    col = 1.0 - (1.0 - col) * (1.0 - clamp(glow, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;function u(r,o,u){let d=o;for(let e of[...u.layers,u.depth,u.lights].filter(Boolean))e.colorSpace=``,e.needsUpdate=!0;let f=u.layers[0],p={uL0:{value:u.layers[0]},uL1:{value:u.layers[1]||f},uL2:{value:u.layers[2]||f},uDepth:{value:u.depth},uLights:{value:u.lights||f},uCount:{value:u.layers.length},uV:{value:0},uLightsOn:{value:0},uTime:{value:0},uStrength:{value:u.strength},uZoom:{value:1+u.strength*.9},uOffset:{value:new e},uSize:{value:new e(1,1)}},m=new t,h=new n(-1,1,1,-1,0,1),g=new a(new s(2,2),new i({uniforms:p,vertexShader:c,fragmentShader:l,depthTest:!1,depthWrite:!1}));g.frustumCulled=!1,m.add(g);let _=new e,v=0;return{set(e){e.offset&&_.set(e.offset[0],e.offset[1]),e.v!=null&&(p.uV.value=e.v),e.lights!=null&&(v=e.lights)},resize(e,t){p.uSize.value.set(e,t)},frame(t,n){let i=1-Math.exp(-t*4),a=new e(Math.sin(n*.31)*.18,Math.cos(n*.23)*.14);p.uOffset.value.lerp(_.clone().add(a),i),p.uLightsOn.value=v,p.uTime.value=n,r.setRenderTarget(null),r.render(m,h)},setTier(e){return d=e,d!==`static`},dispose(){g.geometry.dispose(),g.material.dispose();for(let e of[...u.layers,u.depth,u.lights])e?.dispose()}}}function d(e){let t=o();if(t.tier===`static`)return{scene:null,release:()=>{}};let n=!1,i=null,a=new AbortController;e.frame.dataset.gl=`loading`;let s=document.createElement(`div`);s.className=e.className,s.setAttribute(`aria-hidden`,`true`),e.frame.append(s);let c={scene:null,release:f},l=new r,d=e=>new Promise((t,n)=>l.load(e,t,void 0,n));Promise.all([Promise.all(e.layers.map(d)),d(e.depth),e.lights?d(e.lights):Promise.resolve(void 0)]).then(([r,a,o])=>{n?[...r,a,o].forEach(e=>e?.dispose()):(i=u(t.renderer,t.tier,{layers:r,depth:a,lights:o,strength:e.strength}),c.scene=i,e.onScene?.(i),t.mount(s,i,()=>{e.frame.dataset.gl=`on`}))}).catch(()=>{n||(e.frame.dataset.gl=`off`,s.remove())}),matchMedia(`(pointer: coarse)`).matches||(e.frame.addEventListener(`pointermove`,t=>{let n=e.frame.getBoundingClientRect();i?.set({offset:[((t.clientX-n.left)/n.width-.5)*2,((t.clientY-n.top)/n.height-.5)*2]})},{signal:a.signal}),e.frame.addEventListener(`pointerleave`,()=>i?.set({offset:[0,0]}),{signal:a.signal}));function f(){n||(n=!0,a.abort(),i&&t.unmount(),s.remove(),delete e.frame.dataset.gl)}return c}export{d as mountDepthParallax};