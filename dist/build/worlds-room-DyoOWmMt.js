import{t as e}from"./gsap-B0gpcuWg.js";import{t}from"./ScrollTrigger-B-BxMyCy.js";import{c as n}from"./index-qAVWwbAa.js";import{O as r,_ as i,k as a,m as o,t as s,y as c}from"./stage-kHJ78NE5.js";var l=`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,u=`
uniform float uTime, uDepth, uAspect, uFocus, uFade;
varying vec2 vUv;

const vec3 GOLD = vec3(0.83, 0.70, 0.43);
const vec3 VEIL = vec3(0.95, 0.89, 0.71);
const vec3 TEAL = vec3(0.55, 0.78, 0.76);

float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
float noise(vec2 x){
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
// 抗锯齿的细线：d 为到线的距离，w 为线宽（屏幕高度单位）
float hair(float d, float w){ float aa = fwidth(d) * 1.2; return 1.0 - smoothstep(w, w + aa, abs(d)); }

// ---------- 星之世界：秩序与星辰 ----------
// 带透视的同心椭圆轨道（细点线），星点严格沿轨道运行，角速度只由半径决定，没有随机扰动；
// 星点带细小的十字星芒；一条极淡的天穹光带斜贯夜空；上方一片克制的金色光晕（天上神国坐落其中，不描绘形象）。
vec3 stars(vec2 p, float y){
  vec3 col = mix(vec3(0.012, 0.022, 0.05), vec3(0.03, 0.06, 0.10), smoothstep(-0.3, 0.9, y));
  // 天穹光带
  float band = exp(-pow((p.y + p.x * 0.35 + 0.05) * 3.2, 2.0));
  col += vec3(0.16, 0.18, 0.24) * band * (0.5 + 0.5 * fbm(p * 5.0)) * 0.6;
  // 远星
  vec2 g = p * 140.0, gi = floor(g);
  float s = step(0.988, h1(gi));
  col += vec3(0.85, 0.88, 1.0) * s * smoothstep(0.18, 0.0, length(fract(g) - 0.5)) * (0.4 + 0.6 * h2(gi)) * (0.7 + 0.3 * sin(uTime * (1.0 + h2(gi) * 2.0) + h1(gi) * 20.0));
  // 透视轨道：中心在画面上方，纵向压扁
  vec2 c = vec2(0.0, -0.18);
  vec2 q = (p - c) * vec2(1.0, 3.0);
  float r = length(q), ang = atan(q.y, q.x);
  for (int i = 1; i <= 6; i++) {
    float R = 0.12 + float(i) * 0.115;
    float dotted = step(0.5, fract(ang * (18.0 + float(i) * 8.0) / 6.2832));
    col += GOLD * hair(r - R, 0.0012 * 3.0) * 0.32 * dotted;
    float n = 2.0 + float(i);
    float w = 0.22 / pow(R, 1.5);
    float a = ang + uTime * w * 0.1;
    float k = fract(a / 6.2832 * n);
    vec2 sp = vec2((k - 0.5) * 6.2832 / n * R, (r - R) / 3.0);
    float d = length(sp);
    float core = exp(-d * d * 60000.0);
    float spike = exp(-abs(sp.x) * 900.0) * exp(-abs(sp.y) * 90.0) + exp(-abs(sp.y) * 900.0) * exp(-abs(sp.x) * 160.0);
    col += VEIL * (core * 1.6 + spike * 0.35);
  }
  // 神国：上方极淡的光晕
  col += GOLD * exp(-pow(length((p - vec2(0.0, -0.42)) * vec2(0.7, 1.8)), 2.0) * 4.0) * 0.16;
  return col;
}

// ---------- 物质世界：土地与当下 ----------
// 铜金墨线刻出的等高线地形图：深绿底、首曲线与计曲线、细密的阴影排线；整体缓缓平移。
float terrain(vec2 p){ return fbm(p * 1.9 + vec2(uTime * 0.012, 0.0)) * 0.85 + fbm(p * 5.0) * 0.15; }
vec3 matter(vec2 p){
  float h = terrain(p);
  vec3 col = mix(vec3(0.03, 0.08, 0.07), vec3(0.08, 0.16, 0.12), smoothstep(0.25, 0.75, h));
  float v = h * 16.0;
  float d = (fract(v) - 0.5) / 16.0;
  float major = step(0.5, fract(floor(v) / 5.0 + 0.1));
  col += GOLD * hair(d, 0.0006 + 0.0008 * major) * (0.35 + 0.35 * major);
  // 阴影排线：只在坡的背光一侧
  vec2 e = vec2(0.004, 0.0);
  float slope = terrain(p + e.xy) - terrain(p - e.xy);
  float hatch = hair(fract((p.x + p.y) * 140.0) - 0.5, 0.06);
  col *= 1.0 - smoothstep(0.0, 0.02, slope) * hatch * 0.35;
  return col;
}

// ---------- 灵之世界：心灵、故事与梦境 ----------
// 蓝紫色的水墨晕染，域扭曲后缓缓流动；若隐若现的细光丝穿行其中（故事与梦境的脉络）。
vec3 spirit(vec2 p){
  vec2 w = vec2(fbm(p * 1.3 + vec2(0.0, uTime * 0.04)), fbm(p * 1.3 + vec2(5.2, -uTime * 0.035)));
  float f = fbm(p * 1.7 + w * 2.6);
  vec3 col = mix(vec3(0.05, 0.06, 0.11), vec3(0.30, 0.35, 0.50), smoothstep(0.3, 0.8, f));
  col = mix(col, vec3(0.30, 0.25, 0.40), smoothstep(0.5, 0.85, w.x) * 0.5);
  // 水墨边缘：晕染交界处略深
  col *= 0.85 + 0.15 * smoothstep(0.0, 0.08, abs(f - 0.5));
  // 细光丝
  col += vec3(0.82, 0.80, 1.0) * hair(f - 0.58, 0.0025) * 0.6;
  col += TEAL * hair(f - 0.42, 0.002) * 0.25;
  return col;
}

// ---------- 镜中世界：扭曲与替换 ----------
// 物质界的等高线左右颠倒，被打碎成错位的镜片；反色偏冷；镜片之间是银色的细裂纹，边缘有一点色散。
vec2 shards(vec2 p){
  vec2 i = floor(p * 3.2), f = fract(p * 3.2);
  float best = 9.0, second = 9.0; vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(h1(i + g), h2(i + g));
    float d = length(g + o - f);
    if (d < best) { second = best; best = d; id = i + g; } else if (d < second) second = d;
  }
  return vec2(second - best, h1(id));
}
vec3 mirror(vec2 p){
  vec2 sh = shards(p + vec2(0.0, uTime * 0.01));
  vec2 offset = (vec2(sh.y, fract(sh.y * 7.0)) - 0.5) * 0.08;
  vec2 m = vec2(-p.x, p.y) + offset;
  float hr = terrain(m + vec2(0.003, 0.0)), hb = terrain(m - vec2(0.003, 0.0));
  float vr = (fract(hr * 16.0) - 0.5) / 16.0, vb = (fract(hb * 16.0) - 0.5) / 16.0;
  vec3 col = mix(vec3(0.05, 0.05, 0.08), vec3(0.11, 0.11, 0.17), sh.y);
  col += vec3(0.75, 0.62, 0.70) * hair(vr, 0.0009) * 0.4 + vec3(0.55, 0.70, 0.85) * hair(vb, 0.0009) * 0.4;
  col += vec3(0.82, 0.85, 0.92) * hair(sh.x, 0.004) * 0.35;
  return col;
}

// ---------- 亡者世界：死亡与归宿 ----------
// 深梅黑；三层景深的灰烬缓缓下沉（远处小而慢、近处大而略快）；薄雾横移；地平线上一抹苍白的微光。
vec3 dead(vec2 p, float y){
  vec3 col = mix(vec3(0.045, 0.03, 0.045), vec3(0.015, 0.012, 0.02), smoothstep(4.0, 5.0, y));
  col += vec3(0.08, 0.07, 0.10) * smoothstep(0.35, 0.8, fbm(vec2(p.x * 2.0 + uTime * 0.02, y * 3.0))) * 0.5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float s = 34.0 - fi * 9.0;
    vec2 q = vec2(p.x, y) * s + vec2(sin(y * 3.0 + fi) * 0.3, -uTime * (0.18 + fi * 0.1));
    vec2 g = floor(q);
    float on = step(0.92, h1(g + fi * 13.0));
    float sz = 0.06 + fi * 0.03;
    col += vec3(0.70, 0.66, 0.74) * on * smoothstep(sz, 0.0, length(fract(q) - 0.5)) * (0.25 + fi * 0.15);
  }
  col += vec3(0.62, 0.66, 0.78) * exp(-pow((y - 4.82) * 7.0, 2.0)) * 0.12 * (1.0 - abs(p.x) * 0.5);
  return col;
}

// ---------- 时间长河 ----------
// 九股粗细明暗各不相同的细光丝（金到淡青）在画面中央交织，光点沿丝向下流；外面裹着一层缓缓流动的雾。
// 坐标用画面坐标，所以它跟着读者，不跟着诸界柱。
// shape：长河展开的程度（按画面中心所在的层统一决定，避免上宽下窄）；k：此处的亮度（按像素柔和过渡）。
vec3 river(vec2 p, float sy, float shape, float k){
  vec3 col = vec3(0.0);
  float spread = mix(0.03, 0.2, shape);
  for (int i = 0; i < 9; i++) {
    float fi = float(i), ph = fi * 1.71;
    float lane = fi / 8.0 - 0.5;
    float strength = 0.35 + 0.65 * fract(sin(fi * 12.9898) * 43758.5453); // 每股粗细明暗各不相同
    float x = lane * spread * 2.0 * (0.75 + 0.25 * sin(fi * 2.3))
            + sin(sy * 2.1 - uTime * 0.18 + ph) * (0.012 + 0.045 * shape)
            + sin(sy * 5.7 + uTime * 0.27 + ph * 2.0) * 0.006;
    float d = p.x - x;
    float w = (0.0008 + 0.0008 * shape) * (0.6 + 0.6 * strength);
    float core = exp(-d * d / (w * w));
    float glow = exp(-d * d / (w * w * 140.0));
    float pulse = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(sy * 6.0 - uTime * 1.3 + ph * 3.0), 3.0); // 光沿丝向下走
    vec3 tint = mix(VEIL, TEAL, fract(fi * 0.37) * 0.85);
    col += tint * strength * (core * (0.5 + 0.9 * pulse) + glow * 0.13);
  }
  float body = exp(-p.x * p.x / (spread * spread * 2.6));
  col += GOLD * body * (0.03 + 0.13 * shape) * (0.45 + 0.55 * fbm(vec2(p.x * 4.0, sy * 2.5 - uTime * 0.3)));
  // 更宽的一层薄光，让展开时的长河撑得起整个画面
  col += mix(GOLD, TEAL, 0.4) * exp(-p.x * p.x / (spread * spread * 9.0)) * 0.05 * shape * (0.6 + 0.4 * fbm(vec2(p.x * 1.5, sy * 1.2 - uTime * 0.15)));
  // 漂流的细尘
  vec2 mg = vec2(p.x * 70.0, sy * 30.0 - uTime * 1.8), gi = floor(mg);
  col += VEIL * step(0.92, h1(gi)) * smoothstep(0.12, 0.0, length(fract(mg) - 0.5)) * body * (0.35 + 0.6 * shape);
  return col * mix(0.1, 1.5, k);
}


void main(){
  vec2 p = vec2((vUv.x - 0.5) * uAspect, 0.5 - vUv.y); // p.y 向下为正
  float y = uDepth + p.y;                                // 诸界柱上的纵坐标
  float sy = -vUv.y;                                      // 画面坐标：长河用它，所以跟着读者

  // 各世界在柱上的位置与柔和的边界
  float wS = 1.0 - smoothstep(0.8, 1.15, y);
  float wM = smoothstep(1.85, 2.2, y) * (1.0 - smoothstep(2.8, 3.15, y));
  float wD = smoothstep(3.85, 4.2, y) * (1.0 - smoothstep(4.8, 5.15, y));
  float world = clamp(wS + wM + wD, 0.0, 1.0);

  vec3 col = vec3(0.006, 0.01, 0.014);
  if (wS > 0.0) col = mix(col, stars(p, y), wS);
  if (wM > 0.0) {
    // 中层三界并立：三栏柔和过渡，聚焦的一栏完整，另两栏退暗
    float colW = uAspect / 3.0;
    float u = (p.x + uAspect * 0.5) / colW;      // 0–3
    vec2 pm = vec2(p.x, p.y + y * 0.5);
    vec3 a = matter(pm), b = spirit(pm), c = mirror(pm);
    float ta = 1.0 - smoothstep(0.92, 1.08, u), tc = smoothstep(1.92, 2.08, u);
    vec3 mid = a * ta + b * (1.0 - ta - tc) + c * tc;
    float idx = clamp(u - 0.5, 0.0, 2.0);
    mid *= 0.42 + 0.58 * (1.0 - smoothstep(0.35, 1.0, abs(uFocus - idx)));
    // 栏与栏之间一道极细的金线，上下渐隐
    float seam = min(abs(u - 1.0), abs(u - 2.0)) * colW;
    mid += GOLD * hair(seam, 0.0008) * 0.35 * (1.0 - abs(p.y) * 1.6);
    col = mix(col, mid, wM);
  }
  if (wD > 0.0) col = mix(col, dead(p, y), wD);

  // 长河：世界之中隐入深处（只用加光，淡得几乎只是底光）；衔接段与最后展开成画面的主体
  // 画面中心所在的层决定长河展开的程度
  float yc = uDepth;
  float worldC = clamp((1.0 - smoothstep(0.8, 1.15, yc)) + smoothstep(1.85, 2.2, yc) * (1.0 - smoothstep(2.8, 3.15, yc)) + smoothstep(3.85, 4.2, yc) * (1.0 - smoothstep(4.8, 5.15, yc)), 0.0, 1.0);
  float k = 1.0 - world;
  col += river(p, sy, 1.0 - worldC, k) * (1.0 - 0.7 * world);

  // 暗角
  col *= 1.0 - 0.35 * smoothstep(0.4, 1.0, length(vec2(p.x / uAspect, p.y) * 1.6));
  gl_FragColor = vec4(col * uFade, 1.0);
}`;function d(e,t){let n=t,s=new r,d=new i(-1,1,1,-1,0,1),f={uTime:{value:0},uDepth:{value:0},uAspect:{value:1},uFocus:{value:0},uFade:{value:1}},p=new o(new c(2,2),new a({uniforms:f,vertexShader:l,fragmentShader:u,depthTest:!1,depthWrite:!1}));p.frustumCulled=!1,s.add(p);let m={depth:0,focus:0},h=!0;return{set(e,t,n){m={depth:e,focus:t},n&&(h=!0)},resize(e,t){f.uAspect.value=e/t},frame(t,n){let r=h?1:1-Math.exp(-t*4);h=!1,f.uTime.value=n,f.uDepth.value+=(m.depth-f.uDepth.value)*r,f.uFocus.value+=(m.focus-f.uFocus.value)*r,e.setRenderTarget(null),e.render(s,d)},setTier(e){return n=e,n!==`static`},dispose(){p.geometry.dispose(),p.material.dispose()}}}var f=[[0,.5],[.1,.5],[.17,1.5],[.24,1.5],[.31,2.5],[.6,2.5],[.67,3.5],[.74,3.5],[.81,4.5],[.88,4.5],[.95,5.5],[1,5.5]],p=[[.31,0],[.39,0],[.43,1],[.49,1],[.53,2],[.6,2]],m=(e,t)=>{if(t<=e[0][0])return e[0][1];for(let n=1;n<e.length;n++){let[r,i]=e[n],[a,o]=e[n-1];if(t<=r){let e=(t-a)/(r-a),n=e*e*(3-2*e);return o+(i-o)*n}}return e[e.length-1][1]},h=[[`stars`,.01,.12],[`matter`,.31,.4],[`spirit`,.42,.5],[`mirror`,.52,.61],[`dead`,.8,.89],[`time`,.95,2]];function g(r,i,a){let o=s();if(o.tier===`static`)return;e.registerPlugin(t);let c=Object.fromEntries(a.map(e=>[e.id,e])),l=document.createElement(`section`);l.className=`worlds-dive`,l.dataset.gl=`loading`,l.setAttribute(`aria-label`,`下潜观测：六大世界`),l.innerHTML=`<div class="worlds-dive-stage"><div class="worlds-dive-gl" aria-hidden="true"></div>
<a class="worlds-dive-skip" href="#world-observation">跳到观测台 ↓</a>
<div class="worlds-dive-cards" aria-hidden="true">${h.map(([e])=>{let t=c[e];return t?`<div class="worlds-card" data-card="${e}"><p class="worlds-card-pos">${n(t.position)}</p><p class="worlds-card-name">${n(t.name)}</p><p class="worlds-card-title">${n(t.title)}</p><p class="worlds-card-text">${n(t.text)}</p><p class="worlds-card-auth"><span>代表权柄</span>${n(t.authority)}</p></div>`:``}).join(``)}</div>
<div class="worlds-dive-depth" aria-hidden="true"><span></span></div></div>`,i.after(l),r.onCleanup(()=>l.remove());let u=l.querySelector(`.worlds-dive-gl`),g=null;try{g=d(o.renderer,o.tier),o.mount(u,g,()=>{l.dataset.gl=`on`}),r.onCleanup(()=>o.unmount())}catch(e){console.warn(`诸界下潜未能启动。`,e),l.remove();return}let _=e.context(()=>{let t=e.timeline({defaults:{ease:`none`},scrollTrigger:{trigger:l,start:`top top`,end:`bottom bottom`,scrub:.5,onUpdate:e=>g?.set(m(f,e.progress),m(p,e.progress))}});t.fromTo(`.worlds-dive-depth > span`,{scaleY:0},{scaleY:1,duration:1},0);for(let[e,n,r]of h){let i=`.worlds-card[data-card="${e}"]`;t.fromTo(i,{opacity:0,y:30},{opacity:1,y:0,duration:.025,ease:`power2.out`},n),r<=1&&t.to(i,{opacity:0,y:-30,duration:.02,ease:`power1.in`},r-.02)}t.set({},{},1);let n=t.scrollTrigger?.progress??0;g?.set(m(f,n),m(p,n),!0)},l);r.onCleanup(()=>_.revert())}export{g as mountWorldsDive};