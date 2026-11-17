// 诸界观测「层积的六界」：一个全屏片元着色器。镜头像钻探岩芯一样往下穿过一根竖直的「诸界柱」，
// 依据《六大世界》：「现实如层积的岩石，上下堆叠」——最上层星之世界，中层物质、灵、镜三界并立，最下层亡者的归处；
// 时间长河贯穿所有世界。层与层之间是沉积岩一样的地层带。
// 柱上的纵坐标（单位：屏）：0–1.15 星界，1.15–1.45 地层，1.45–3.7 中层三界，3.7–4.0 地层，4.0–5.2 亡者世界。
export const worldsVertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const worldsFragment = /* glsl */ `
uniform float uTime, uDepth, uAspect, uFocus, uRiverX, uFade;
varying vec2 vUv;

float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
float noise(vec2 x){
  vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
vec3 srgb(vec3 c){ return c; } // 本场景直接画到屏幕（不经后期合成），颜色按显示值书写

// 星之世界：深蓝夜空；星点沿同心椭圆轨道严格运行（相位固定、速度只取决于轨道半径），细金色轨道线；
// 上方一片极淡的金色光晕（天上神国坐落其中，不描绘具体形象）。
vec3 stars(vec2 p, float y){
  vec3 col = mix(srgb(vec3(0.02, 0.04, 0.09)), srgb(vec3(0.05, 0.09, 0.16)), smoothstep(-0.2, 1.2, y));
  vec2 c = vec2(0.0, 0.55);
  vec2 q = (p - c) * vec2(1.0, 2.2);
  float r = length(q);
  float ang = atan(q.y, q.x);
  for (int i = 1; i <= 7; i++) {
    float R = float(i) * 0.17;
    col += srgb(vec3(0.83, 0.70, 0.43)) * (1.0 - smoothstep(0.0, 0.0035 * float(i) * 0.5 + 0.002, abs(r - R))) * 0.18;
    // 每条轨道上若干颗星：角速度只由半径决定（开普勒式），没有随机扰动
    float n = 3.0 + float(i);
    float w = 0.35 / pow(R, 1.5);
    float a = ang - uTime * w * 0.12;
    float k = fract(a / 6.2831853 * n);
    float d = length(vec2((k - 0.5) * 6.2831853 / n * R, r - R));
    col += srgb(vec3(1.0, 0.95, 0.82)) * exp(-d * d * 9000.0) * 1.6;
  }
  // 远星：固定不动的细点
  vec2 g = floor(p * 90.0);
  float s = step(0.985, h1(g)) * h2(g);
  col += vec3(0.8, 0.85, 1.0) * s * 0.35 * step(length(fract(p * 90.0) - 0.5), 0.12);
  col += srgb(vec3(0.95, 0.83, 0.55)) * exp(-pow((y - 0.05) * 3.0, 2.0)) * 0.12 * (1.0 - abs(p.x) * 0.8);
  return col;
}

// 物质世界：深绿土地上的等高线缓缓移动——万事在当下留下结果
vec3 matter(vec2 p){
  float h = fbm(p * 2.2 + vec2(uTime * 0.02, 0.0));
  vec3 col = mix(srgb(vec3(0.05, 0.12, 0.10)), srgb(vec3(0.16, 0.26, 0.18)), h);
  float lines = abs(fract(h * 14.0) - 0.5);
  col += srgb(vec3(0.78, 0.74, 0.55)) * (1.0 - smoothstep(0.0, 0.06, lines)) * 0.22;
  return col;
}
// 灵之世界：心灵、故事、梦境汇成的柔雾，域扭曲后缓缓流动，浮着细小的光点
vec3 spirit(vec2 p){
  vec2 w = vec2(fbm(p * 1.4 + vec2(0.0, uTime * 0.06)), fbm(p * 1.4 + vec2(5.2, -uTime * 0.05)));
  float f = fbm(p * 2.0 + w * 2.4);
  vec3 col = mix(vec3(0.05, 0.06, 0.12), vec3(0.42, 0.52, 0.66), smoothstep(0.3, 0.78, f));
  col = mix(col, vec3(0.58, 0.50, 0.70), smoothstep(0.55, 0.85, w.x) * 0.45);
  // 发光的雾带：沿等值线的细亮边
  col += vec3(0.78, 0.74, 0.96) * (1.0 - smoothstep(0.0, 0.025, abs(f - 0.56))) * 0.35;
  col += vec3(0.62, 0.78, 0.86) * (1.0 - smoothstep(0.0, 0.02, abs(f - 0.44))) * 0.2;
  vec2 g = floor(p * 26.0 + vec2(0.0, uTime * 0.6));
  col += vec3(0.9, 0.92, 1.0) * step(0.97, h1(g)) * step(length(fract(p * 26.0 + vec2(0.0, uTime * 0.6)) - 0.5), 0.08) * 0.8;
  return col;
}
// 镜中世界：物质界的镜像被打碎成错位的晶片，颜色反转偏冷，边缘有色散
vec3 mirror(vec2 p){
  vec2 cellId = floor(p * vec2(5.0, 4.0) + vec2(0.0, uTime * 0.03));
  vec2 shift = (vec2(h1(cellId), h2(cellId)) - 0.5) * 0.12;
  vec2 m = vec2(-p.x, p.y) + shift;
  vec3 a = matter(m + vec2(0.006, 0.0)), b = matter(m - vec2(0.006, 0.0));
  vec3 col = vec3(a.r, b.g, (a.b + b.b) * 0.5);
  col = vec3(0.07, 0.07, 0.10) + (vec3(0.3) - col) * vec3(0.5, 0.52, 0.66) * 0.75; // 反色、偏冷、压暗
  vec2 f = fract(p * vec2(5.0, 4.0) + vec2(0.0, uTime * 0.03));
  float edge = 1.0 - smoothstep(0.0, 0.03, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  col += vec3(0.7, 0.74, 0.86) * edge * 0.14;
  return col;
}
// 亡者世界：暗紫灰的深处，灰烬缓缓下沉，最底部一片微弱的冷光
vec3 dead(vec2 p, float y){
  vec3 col = mix(srgb(vec3(0.07, 0.06, 0.09)), srgb(vec3(0.02, 0.02, 0.03)), smoothstep(4.0, 5.2, y));
  for (int i = 0; i < 3; i++) {
    float s = 18.0 + float(i) * 14.0;
    vec2 q = p * s + vec2(0.0, uTime * (0.25 + float(i) * 0.12));
    vec2 g = floor(q);
    float on = step(0.93, h1(g + float(i) * 13.0));
    col += srgb(vec3(0.62, 0.58, 0.66)) * on * step(length(fract(q) - 0.5), 0.07 + 0.03 * float(i)) * (0.35 - 0.08 * float(i));
  }
  col += srgb(vec3(0.45, 0.5, 0.62)) * exp(-pow((y - 5.0) * 2.4, 2.0)) * 0.15;
  return col;
}
// 地层：一层层颜色不同的沉积带，边界被噪声扭成起伏的岩线
vec3 strata(vec2 p, float y){
  float b = y * 18.0 + fbm(vec2(p.x * 2.5, y * 3.0)) * 3.0;
  float band = fract(b);
  vec3 col = mix(srgb(vec3(0.16, 0.13, 0.10)), srgb(vec3(0.30, 0.25, 0.18)), h1(vec2(floor(b), 3.0)));
  col *= 0.75 + 0.25 * fbm(p * vec2(18.0, 3.0));
  col += srgb(vec3(0.83, 0.70, 0.43)) * (1.0 - smoothstep(0.0, 0.04, abs(band - 0.5) - 0.46)) * 0.12;
  return col;
}

void main(){
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
  float y = uDepth + (0.5 - vUv.y); // 柱上的纵坐标：向下为正
  vec3 col;
  // 各层之间用地层过渡；层内按坐标取对应的世界
  float s1 = smoothstep(1.05, 1.2, y) * (1.0 - smoothstep(1.4, 1.55, y));
  float s2 = smoothstep(3.6, 3.75, y) * (1.0 - smoothstep(3.95, 4.1, y));
  vec3 upper = stars(p, y);
  // 中层三界并立：三栏，聚焦的一栏完整，其余两栏压暗
  float colW = uAspect / 3.0;
  float xi = clamp(floor((p.x + uAspect * 0.5) / colW), 0.0, 2.0);
  vec2 pc = vec2(p.x - (xi - 1.0) * colW, p.y + y * 0.6);
  vec3 mid = xi < 0.5 ? matter(pc) : xi < 1.5 ? spirit(pc) : mirror(pc);
  float focus = 1.0 - smoothstep(0.0, 0.9, abs(uFocus - xi));
  mid *= 0.45 + 0.55 * focus;
  float seam = abs(fract((p.x + uAspect * 0.5) / colW + 0.5) - 0.5) * colW;
  mid += srgb(vec3(0.83, 0.70, 0.43)) * (1.0 - smoothstep(0.0, 0.004, seam)) * 0.35;
  vec3 lower = dead(p, y);
  col = y < 1.3 ? upper : y < 3.85 ? mid : lower;
  col = mix(col, strata(p, y), max(s1, s2));

  // 时间长河：固定在画面一侧，始终向下流淌（只随真实时间流动，不随滚动方向倒流）。
  // 细的河心 + 一层柔光；纹路顺着水流方向拉长；细小的光点向下漂。
  float rx = uRiverX + sin(vUv.y * 5.0 + 1.3) * 0.03 + sin(vUv.y * 13.0) * 0.008;
  float dx = (vUv.x - rx) * uAspect;
  float core = exp(-dx * dx * 5200.0);
  float glow = exp(-dx * dx * 260.0);
  float f1 = noise(vec2(dx * 38.0, vUv.y * 5.0 + uTime * 0.85));
  float f2 = noise(vec2(dx * 90.0 + 3.0, vUv.y * 12.0 + uTime * 1.5));
  float flowL = smoothstep(0.45, 0.92, f1 * 0.6 + f2 * 0.4);
  vec3 gold = vec3(0.95, 0.86, 0.6);
  col += gold * (core * 0.75 + glow * (0.06 + 0.45 * flowL));
  vec2 mg = vec2(dx * 70.0, vUv.y * 34.0 + uTime * 2.4);
  vec2 gi = floor(mg);
  col += vec3(1.0, 0.96, 0.84) * step(0.86, h1(gi)) * step(length(fract(mg) - 0.5), 0.14) * exp(-dx * dx * 700.0) * 0.9;

  gl_FragColor = vec4(col * uFade, 1.0);
}`;
