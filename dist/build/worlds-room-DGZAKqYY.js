import{t as e}from"./gsap-B0gpcuWg.js";import{t}from"./ScrollTrigger-B-BxMyCy.js";import{c as n}from"./index-BJ4Dx4rR.js";import{O as r,_ as i,k as a,m as o,t as s,y as c}from"./stage-kHJ78NE5.js";var l=`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,u=`
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
// 依据《六大世界》：灵之世界温润祥和。拥有灵之视觉的人看到的是一幅油画：
// 琥珀、蜜桃、玫瑰、奶油、淡鼠尾草绿与柔紫的色块柔和地交叠晕开，边缘不留硬线；
// 每块颜料有自己的笔触方向与刷痕，厚涂处有一点微光，底下透出画布纹理；整幅画像温水一样缓缓流转。
vec3 spiritPaint(float t){
  // 暖色调色板：t 在 0–1 之间取色
  vec3 c0 = vec3(0.93, 0.70, 0.42); // 琥珀
  vec3 c1 = vec3(0.96, 0.78, 0.62); // 蜜桃
  vec3 c2 = vec3(0.86, 0.58, 0.56); // 玫瑰
  vec3 c3 = vec3(0.97, 0.90, 0.76); // 奶油
  vec3 c4 = vec3(0.66, 0.74, 0.60); // 淡鼠尾草绿
  vec3 c5 = vec3(0.72, 0.62, 0.80); // 柔紫
  t = fract(t) * 6.0;
  vec3 c = c0;
  c = mix(c, c1, smoothstep(0.0, 1.0, t));
  c = mix(c, c2, smoothstep(1.0, 2.0, t));
  c = mix(c, c3, smoothstep(2.0, 3.0, t));
  c = mix(c, c4, smoothstep(3.0, 4.0, t));
  c = mix(c, c5, smoothstep(4.0, 5.0, t));
  c = mix(c, c0, smoothstep(5.0, 6.0, t));
  return c;
}
vec3 spirit(vec2 p){
  // 缓慢流转的底层流场，让颜料像在温水里慢慢变形
  vec2 w = vec2(fbm(p * 0.8 + vec2(0.0, uTime * 0.025)), fbm(p * 0.8 + vec2(4.3, -uTime * 0.02)));
  float flowAng = (w.x - w.y) * 3.0;
  // 底层色块：权重收紧，每块颜色纯而分明，交界只留窄窄一道晕染
  vec2 q = p * 2.4 + (w - 0.5) * 1.6;
  vec2 i = floor(q), f = fract(q);
  // 先找最近的颜料中心，权重以它为基准：任何位置都至少有一块完整的颜色，不会因权重过小而发黑
  float dmin = 9.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.5 + 0.38 * sin(uTime * 0.05 + 6.2832 * vec2(h1(i + g), h2(i + g))); // 颜料中心缓缓游移
    dmin = min(dmin, length(g + o - f));
  }
  vec3 col = vec3(0.0);
  float total = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.5 + 0.38 * sin(uTime * 0.05 + 6.2832 * vec2(h1(i + g), h2(i + g)));
    float d = length(g + o - f);
    float wgt = exp(-(d * d - dmin * dmin) * 18.0);
    col += spiritPaint(h1(i + g + 17.0) + uTime * 0.004) * wgt;
    total += wgt;
  }
  col /= total;
  // 上层短笔触：小而短的椭圆，一笔一笔点上去；颜色是底色稍亮或稍深的版本，方向随流场微偏
  vec2 q2 = p * 9.0 + (w - 0.5) * 1.4;
  vec2 i2 = floor(q2), f2 = fract(q2);
  float cover = 0.0; vec3 dab = col; vec2 dabDir = vec2(1.0, 0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(h1(i2 + g + 3.0), h2(i2 + g + 5.0));
    vec2 d = g + o - f2;
    float a = flowAng + (h1(i2 + g + 9.0) - 0.5) * 0.9;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 r = vec2(dot(d, dir), dot(d, vec2(-dir.y, dir.x)));
    float m = 1.0 - smoothstep(0.42, 0.55, length(r * vec2(1.0, 2.8)));
    if (m > cover) {
      cover = m;
      float shade = h2(i2 + g + 11.0);
      dab = col * (0.82 + 0.4 * shade) + vec3(0.04, 0.02, 0.0) * shade;
      dabDir = dir;
    }
  }
  col = mix(col, dab, cover * 0.85);
  // 刷痕与厚涂处的微光
  // 刷痕沿每一笔自己的方向（用随位置变化的流场角度会转出一圈圈木纹）
  float bristle = noise(vec2(dot(q2, dabDir) * 3.0, dot(q2, vec2(-dabDir.y, dabDir.x)) * 18.0));
  col *= 0.9 + 0.16 * bristle;
  col += vec3(1.0, 0.95, 0.86) * pow(bristle, 6.0) * 0.12 * cover;
  // 画布纹理
  vec2 cv = p * 260.0;
  col *= 0.98 + 0.02 * noise(cv * 0.5);
  // 温暖而不刺眼：中央略亮
  col *= 0.74 + 0.14 * exp(-dot(p, p) * 2.0);
  return col;
}

// ---------- 镜中世界：扭曲与替换 ----------
// 依据馆藏：「扭曲、混沌与无序构成现实的反面。镜中生灵窥视着物质世界，寻找替换对应原主的机会。」
// 一面氧化发乌的旧银镜：霉斑、细划痕、冷灰里透一点病态的青。镜中映着物质界的等高线——左右颠倒、缓慢扭动；
// 每块碎片里的倒影会不时突然错位，与相邻碎片对不上；偶尔有一圈涟漪从镜子背后荡开，像有什么贴着玻璃；
// 极少数碎片里会慢慢浮现一对苍白的光点，停一会儿又淡去（只有光点，不画具体形象）。克制：越看越不对劲，而不吓人。
vec3 shards(vec2 p){
  vec2 i = floor(p * 4.4), f = fract(p * 4.4);
  float best = 9.0, second = 9.0; vec2 id = vec2(0.0), center = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(h1(i + g), h2(i + g));
    float d = length(g + o - f);
    if (d < best) { second = best; best = d; id = i + g; center = g + o - f; } else if (d < second) second = d;
  }
  return vec3(second - best, h1(id), h2(id));
}
// 每块碎片自己的倾角：同一束光在各块上的反光不同，碎片才像一块块各自歪着的镜片
float tilt(vec2 p, vec3 sh){ vec2 d = vec2(cos(sh.y * 6.2832), sin(sh.y * 6.2832)); return 0.5 + 0.5 * sin(dot(p, d) * 2.4 + sh.z * 6.0); }
vec3 mirror(vec2 p){
  vec3 sh = shards(p);
  // 倒影错位：每块碎片的偏移每隔几秒突然跳一次，各块不同步
  float beat = floor(uTime * 0.22 + sh.y * 7.0);
  vec2 slip = (vec2(h1(vec2(beat, sh.y)), h2(vec2(sh.z, beat))) - 0.5) * 0.09;
  // 镜子背后的压痕：一个缓慢游移的点，周期性地荡出一圈涟漪
  vec2 presser = vec2(sin(uTime * 0.07) * 0.18, cos(uTime * 0.05) * 0.3);
  float age = fract(uTime * 0.11);
  float rd = length(p - presser);
  float ring = exp(-pow((rd - age * 0.45) * 26.0, 2.0)) * (1.0 - age);
  // 缓慢的扭动 + 左右颠倒
  vec2 m = vec2(-p.x, p.y) + slip;
  m += vec2(sin(m.y * 7.0 + uTime * 0.3), cos(m.x * 6.0 - uTime * 0.25)) * 0.012;
  m += (p - presser) / max(rd, 1e-3) * ring * 0.02;
  float h = terrain(m);
  float v = (fract(h * 16.0) - 0.5) / 16.0;
  // 旧银镜：冷灰底，病态的青，霉斑与细划痕
  vec3 col = mix(vec3(0.09, 0.10, 0.105), vec3(0.19, 0.21, 0.21), smoothstep(0.2, 0.8, h));
  col = mix(col, col * vec3(0.85, 1.0, 0.92), 0.5);
  float fox = smoothstep(0.62, 0.78, fbm(p * 6.0 + 3.0));
  col *= 1.0 - fox * 0.45;
  col += vec3(0.5, 0.45, 0.35) * smoothstep(0.7, 0.85, fbm(p * 14.0 + 9.0)) * 0.05;
  float scratch = hair(fract(dot(p, vec2(0.93, 0.37)) * 55.0 + noise(p * 8.0) * 0.6) - 0.5, 0.01) * step(0.6, noise(p * 3.0));
  col += vec3(0.6) * scratch * 0.06;
  // 倒影的等高线：苍白、轻微色散
  float hr = terrain(m + vec2(0.0025, 0.0)), hb = terrain(m - vec2(0.0025, 0.0));
  col += vec3(0.72, 0.70, 0.66) * hair((fract(hr * 16.0) - 0.5) / 16.0, 0.0008) * 0.3;
  col += vec3(0.50, 0.66, 0.66) * hair((fract(hb * 16.0) - 0.5) / 16.0, 0.0008) * 0.3;
  col += vec3(0.65, 0.75, 0.72) * ring * 0.12;
  // 各块碎片的明暗与一道斜向的冷光各不相同
  col *= 0.78 + 0.4 * sh.z;
  col += vec3(0.55, 0.62, 0.62) * pow(tilt(p, sh), 6.0) * 0.12;
  // 镜子里有什么在走：一团看不清的暗影，只在倒影里，缓慢横穿过去（按碎片错位，所以它也是断开的）
  vec2 walker = vec2(mod(uTime * 0.035, 1.6) - 0.8, 0.08 + sin(uTime * 0.05) * 0.1);
  float shade = smoothstep(0.32, 0.0, length((m - vec2(-walker.x, walker.y)) * vec2(1.7, 0.75)));
  col *= 1.0 - 0.55 * shade;
  // 碎片之间的裂纹：细而冷的银线，裂口一侧发暗
  col *= 1.0 - 0.5 * exp(-sh.x * 60.0);
  col += vec3(0.78, 0.82, 0.84) * hair(sh.x, 0.0035) * 0.3;
  // 窥视：少数碎片里浮现一对苍白的光点，缓慢出现、停留、淡去
  float watch = step(0.8, h1(vec2(sh.y * 13.0, floor(uTime * 0.09 + sh.z * 3.0))));
  float life = sin(fract(uTime * 0.09 + sh.z * 3.0) * 3.1416);
  vec2 eye = p * 4.4 - floor(p * 4.4) - vec2(0.5, 0.45);
  vec2 e1 = (eye - vec2(0.085, 0.0)) * vec2(1.0, 2.4), e2 = (eye + vec2(0.085, 0.0)) * vec2(1.0, 2.4);
  float pair = exp(-pow(length(e1) * 24.0, 2.0)) + exp(-pow(length(e2) * 24.0, 2.0));
  float halo = exp(-pow(length(e1) * 7.0, 2.0)) + exp(-pow(length(e2) * 7.0, 2.0));
  col += (vec3(0.88, 0.90, 0.80) * pair + vec3(0.4, 0.5, 0.45) * halo * 0.12) * watch * smoothstep(0.2, 0.8, life) * 0.9;
  // 越靠边越暗，像镜框里积着的黑
  col *= 0.75 + 0.25 * smoothstep(0.9, 0.2, abs(p.y) * 1.4);
  return col;
}

// ---------- 亡者世界：死亡与归宿 ----------
// 依据馆藏：「肉体终结之后，大多数灵魂受到亡者世界牵引，成为亡灵。亡者世界由死亡法则统治，以寂静与终结为其性质。」
// 一片无风的暗原：远处一道苍白的地平线，地平线下是一面完全静止的黑水，倒映着上面的一切（寂静）。
// 一颗颗苍白的灵魂光点从高处缓缓落下，被牵引着汇向地平线上的同一处，越近越小、越淡，到那里熄灭（牵引与终结）。
// 没有骷髅、墓碑之类的具体形象；肃穆，不恐怖。
const float DH = 0.6; // 地平线在亡者世界内的位置（0–1，向下为正）
vec3 deadSky(vec2 q){ // q.y：亡者世界内的纵坐标
  float above = DH - q.y; // 距地平线的高度
  vec3 col = mix(vec3(0.05, 0.042, 0.06), vec3(0.016, 0.013, 0.022), smoothstep(0.0, 0.7, above));
  col += vec3(0.03, 0.022, 0.04) * smoothstep(0.3, 0.75, fbm(vec2(q.x * 0.8 - uTime * 0.006, q.y * 1.5))) * smoothstep(0.1, 0.6, above); // 高处几乎看不出的暗紫云层
  // 极慢的低雾，贴着地平线
  col += vec3(0.10, 0.09, 0.12) * smoothstep(0.42, 0.8, fbm(vec2(q.x * 1.6 + uTime * 0.012, q.y * 5.0))) * exp(-above * 5.0) * 0.6;
  // 地平线上的苍白微光，汇聚处最亮
  col += vec3(0.62, 0.64, 0.74) * exp(-pow(above * 26.0, 2.0)) * (0.10 + 0.22 * exp(-q.x * q.x * 6.0));
  col += vec3(0.50, 0.50, 0.62) * exp(-above * 9.0 - q.x * q.x * 3.0) * 0.07;
  // 灵魂：从高处落下，沿弧线汇向地平线上的一点
  vec2 sink = vec2(0.0, DH);
  for (int i = 0; i < 30; i++) {
    float fi = float(i);
    float seed = fract(sin(fi * 91.7) * 4375.85);
    float t = fract(uTime * (0.016 + 0.01 * seed) + seed * 7.0);
    vec2 start = vec2((fract(seed * 13.7) - 0.5) * 2.4, -0.35 - 0.3 * fract(seed * 5.3));
    float e = t * t * (3.0 - 2.0 * t);
    vec2 pos = mix(start, sink, e);
    pos.x += sin(t * 3.1416) * 0.12 * (fract(seed * 3.1) - 0.5); // 下落时略微偏离直线
    vec2 dir = normalize(sink - start);
    float size = mix(0.006, 0.0015, e);
    float life = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.75, 1.0, t));
    // 光点与身后一小段淡尾
    vec2 d = q - pos;
    float along = clamp(dot(d, -dir), 0.0, 0.05 * (1.0 - e));
    float trail = exp(-dot(d + dir * along, d + dir * along) / (size * size * 1.5)) * (1.0 - along / 0.05) * 0.35;
    float core = exp(-dot(d, d) / (size * size));
    float glow = exp(-dot(d, d) / (size * size * 30.0)) * 0.12;
    col += vec3(0.86, 0.85, 0.92) * (core + glow + trail) * life * (0.55 + 0.45 * seed);
  }
  return col;
}
vec3 dead(vec2 p, float y){
  float ly = y - 4.0;
  vec3 col;
  if (ly < DH) {
    col = deadSky(vec2(p.x, ly));
  } else {
    // 静水：倒影上下颠倒、压暗，几乎不动；只有极轻的横向微漾
    float depth = ly - DH;
    vec2 r = vec2(p.x + sin(ly * 90.0 + uTime * 0.25) * 0.0012 * depth * 4.0, DH - depth);
    col = deadSky(r) * mix(0.8, 0.3, smoothstep(0.0, 0.1, depth)) * exp(-depth * 1.8) + vec3(0.008, 0.007, 0.012);
    col += vec3(0.62, 0.64, 0.74) * exp(-pow(depth * 60.0, 2.0)) * 0.05; // 水线
  }
  // 极稀的灰烬，缓慢下沉
  vec2 aq = vec2(p.x, y) * 26.0 + vec2(sin(y * 3.0) * 0.3, -uTime * 0.12);
  col += vec3(0.6, 0.58, 0.66) * step(0.95, h1(floor(aq))) * smoothstep(0.07, 0.0, length(fract(aq) - 0.5)) * 0.18;
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


// 柱上 [a, b] 一段世界的浓度：两端各有约 0.6 屏的羽化
float presence(float y, float a, float b){ return smoothstep(a - 0.3, a + 0.3, y) * (1.0 - smoothstep(b - 0.3, b + 0.3, y)); }

void main(){
  vec2 p = vec2((vUv.x - 0.5) * uAspect, 0.5 - vUv.y); // p.y 向下为正
  float y = uDepth + p.y;                                // 诸界柱上的纵坐标
  float sy = -vUv.y;                                      // 画面坐标：长河用它，所以跟着读者

  // 各世界在柱上的位置；边界羽化放宽到约 0.6 屏，世界与长河之间是一段渐隐而不是一道分界
  float wS = presence(y, -9.0, 1.0);
  float wM = presence(y, 2.0, 3.0);
  float wD = presence(y, 4.0, 5.0);
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

  // 长河：世界之中隐入深处，衔接段与最后展开成画面的主体。
  // 画面中心所在的层（整体状态）与此处的世界浓度共同决定亮度：整体占六成，避免画面里出现横向的明暗分界。
  // 离开世界时先亮（中心先亮起），再展开（光丝随后铺开），两条曲线分开。
  float yc = uDepth;
  float worldC = clamp(presence(yc, -9.0, 1.0) + presence(yc, 2.0, 3.0) + presence(yc, 4.0, 5.0), 0.0, 1.0);
  float open = 1.0 - worldC;
  float bright = mix(1.0 - world, smoothstep(0.0, 0.55, open), 0.6);
  float shape = smoothstep(0.25, 0.95, open);
  col += river(p, sy, shape, bright) * (1.0 - 0.6 * world);

  // 暗角
  col *= 1.0 - 0.35 * smoothstep(0.4, 1.0, length(vec2(p.x / uAspect, p.y) * 1.6));
  gl_FragColor = vec4(col * uFade, 1.0);
}`;function d(e,t){let n=t,s=new r,d=new i(-1,1,1,-1,0,1),f={uTime:{value:0},uDepth:{value:0},uAspect:{value:1},uFocus:{value:0},uFade:{value:1}},p=new o(new c(2,2),new a({uniforms:f,vertexShader:l,fragmentShader:u,depthTest:!1,depthWrite:!1}));p.frustumCulled=!1,s.add(p);let m={depth:0,focus:0},h=!0;return{set(e,t,n){m={depth:e,focus:t},n&&(h=!0)},resize(e,t){f.uAspect.value=e/t},frame(t,n){let r=h?1:1-Math.exp(-t*2.6);h=!1,f.uTime.value=n,f.uDepth.value+=(m.depth-f.uDepth.value)*r,f.uFocus.value+=(m.focus-f.uFocus.value)*r,e.setRenderTarget(null),e.render(s,d)},setTier(e){return n=e,n!==`static`},dispose(){p.geometry.dispose(),p.material.dispose()}}}var f=[[0,.5],[.1,.5],[.17,1.5],[.24,1.5],[.31,2.5],[.6,2.5],[.67,3.5],[.74,3.5],[.81,4.5],[.88,4.5],[.95,5.5],[1,5.5]],p=[[.31,0],[.39,0],[.43,1],[.49,1],[.53,2],[.6,2]],m=(e,t)=>{if(t<=e[0][0])return e[0][1];for(let n=1;n<e.length;n++){let[r,i]=e[n],[a,o]=e[n-1];if(t<=r){let e=(t-a)/(r-a),n=e*e*(3-2*e);return o+(i-o)*n}}return e[e.length-1][1]},h=[[`stars`,.01,.12],[`matter`,.31,.4],[`spirit`,.42,.5],[`mirror`,.52,.61],[`dead`,.8,.89],[`time`,.965,2]];function g(r,i,a){let o=s();if(o.tier===`static`)return;e.registerPlugin(t);let c=Object.fromEntries(a.map(e=>[e.id,e])),l=document.createElement(`section`);l.className=`worlds-dive`,l.dataset.gl=`loading`,l.setAttribute(`aria-label`,`下潜观测：六大世界`),l.innerHTML=`<div class="worlds-dive-stage"><div class="worlds-dive-gl" aria-hidden="true"></div>
<a class="worlds-dive-skip" href="#world-observation">跳到观测台 ↓</a>
<div class="worlds-dive-cards" aria-hidden="true">${h.map(([e])=>{let t=c[e];return t?`<div class="worlds-card" data-card="${e}"><p class="worlds-card-pos">${n(t.position)}</p><p class="worlds-card-name">${n(t.name)}</p><p class="worlds-card-title">${n(t.title)}</p><p class="worlds-card-text">${n(t.text)}</p><p class="worlds-card-auth"><span>代表权柄</span>${n(t.authority)}</p></div>`:``}).join(``)}</div>
<div class="worlds-dive-depth" aria-hidden="true"><span></span></div></div>`,i.after(l),r.onCleanup(()=>l.remove());let u=l.querySelector(`.worlds-dive-gl`),g=null;try{g=d(o.renderer,o.tier),o.mount(u,g,()=>{l.dataset.gl=`on`}),r.onCleanup(()=>o.unmount())}catch(e){console.warn(`诸界下潜未能启动。`,e),l.remove();return}let _=e.context(()=>{let t=e.timeline({defaults:{ease:`none`},scrollTrigger:{trigger:l,start:`top top`,end:`bottom bottom`,scrub:.5,onUpdate:e=>g?.set(m(f,e.progress),m(p,e.progress))}});t.fromTo(`.worlds-dive-depth > span`,{scaleY:0},{scaleY:1,duration:1},0);for(let[e,n,r]of h){let i=`.worlds-card[data-card="${e}"]`,a=e===`time`;t.fromTo(i,{opacity:0,y:24,filter:`blur(6px)`},{opacity:1,y:0,filter:`blur(0px)`,duration:a?.03:.025,ease:`power2.out`},n),r<=1&&t.to(i,{opacity:0,y:-24,filter:`blur(6px)`,duration:.02,ease:`power1.in`},r-.02)}t.set({},{},1);let n=t.scrollTrigger?.progress??0;g?.set(m(f,n),m(p,n),!0)},l);r.onCleanup(()=>_.revert())}export{g as mountWorldsDive};