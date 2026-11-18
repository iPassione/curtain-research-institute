// 诸界观测「层积的六界」：一个全屏片元着色器。
// 依据《六大世界》：「现实如层积的岩石，上下堆叠」——最上层星之世界，中层物质、灵、镜三界并立，最下层亡者的归处；
// 时间长河贯穿所有世界，它不承载空间，以持续流淌的维度贯穿诸界。
//
// 诸界柱上的纵坐标（单位：屏，向下为正）：
//   0–1 星之世界 · 1–2 长河（衔接）· 2–3 中层三界 · 3–4 长河（衔接）· 4–5 亡者世界 · 5–6 长河（揭晓）
// 世界跟着诸界柱移动；时间长河跟着画面——无论往哪个方向滚，它都在画面中央向下流，读者是随着它一路漂下来的。
// 在世界之中，长河收窄、变淡、退到深处；在衔接段与最后，它展开成画面的主体。
export const worldsVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const worldsFragment = /* glsl */ `
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
}`;
