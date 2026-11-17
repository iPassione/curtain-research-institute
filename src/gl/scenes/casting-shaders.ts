// 魔法研究室「施法台」的着色器。粒子位置与速度存在两张浮点纹理里，每帧在 GPU 上更新。
// 依据《施法原理详论》：施法分起势、塑形、稳定、导出四个阶段；
// 火焰需要高活性结构，冰霜需要低活性结构，防御追求稳定；结构不稳时，力量可能在释放之前反噬。

// 公共函数：哈希、值噪声、卷曲噪声（无散度的流场，粒子看起来像在流体里漂）。
const COMMON = /* glsl */ `
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h1b(vec2 p){ return fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453); }
float h1c(vec2 p){ return fract(sin(dot(p, vec2(419.2, 371.9))) * 43758.5453); }
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 curl(vec3 p){
  const float e = 0.12;
  float n1 = vnoise(p + vec3(0, e, 0)), n2 = vnoise(p - vec3(0, e, 0));
  float n3 = vnoise(p + vec3(0, 0, e)), n4 = vnoise(p - vec3(0, 0, e));
  float n5 = vnoise(p + vec3(e, 0, 0)), n6 = vnoise(p - vec3(e, 0, 0));
  float m1 = vnoise(p.zxy + vec3(0, e, 0) + 31.0), m2 = vnoise(p.zxy - vec3(0, e, 0) + 31.0);
  float m3 = vnoise(p.zxy + vec3(0, 0, e) + 31.0), m4 = vnoise(p.zxy - vec3(0, 0, e) + 31.0);
  return vec3((n1 - n2) - (m3 - m4), (n3 - n4) - (n5 - n6), (m1 - m2) - (n1 - n2)) / (2.0 * e);
}
// 「∞」形回路（伯努利双纽线），与原演示图上的回路一致。
vec2 lemniscate(float t, float a){
  float s = sin(t), c = cos(t), d = 1.0 + s * s;
  return vec2(a * c / d, a * s * c / d);
}
`;

// 三种结构的目标点（由粒子编号确定，每个粒子一个位置）。
const SHAPES = /* glsl */ `
uniform float uTime;
const vec3 CENTER = vec3(0.0, 0.15, 0.0);
// 火焰：高活性。粒子从底部不断向上流动，越高越窄，并有闪烁的横向扰动。
vec3 fireTarget(vec2 id){
  float a = h1(id), b = h1b(id), c = h1c(id);
  float k = fract(a + uTime * (0.32 + 0.25 * c));
  float y = -1.0 + k * 2.9;
  float r = 0.95 * pow(1.0 - k, 0.75) * sqrt(b);
  float ang = b * 6.2831853 + uTime * 1.3;
  float sway = (vnoise(vec3(y * 1.7, uTime * 1.9, c * 9.0)) - 0.5) * 0.55 * k;
  return CENTER + vec3(cos(ang) * r + sway, y, sin(ang) * r * 0.6);
}
// 冰霜：低活性。六条主枝与侧枝组成的冰晶，位置吸附到细小的格点上，几乎不动。
vec3 frostTarget(vec2 id){
  float a = h1(id), b = h1b(id), c = h1c(id);
  float arm = floor(a * 6.0);
  float ang = arm * 1.0471976 + 0.5235988 + uTime * 0.03;
  vec2 dir = vec2(cos(ang), sin(ang));
  float s = pow(b, 0.8) * 1.75;
  vec2 p = dir * s;
  if (c > 0.55) {
    // 侧枝：在主枝的 0.35、0.65 处分出，与主枝成 60°，越外越短
    float at = c > 0.78 ? 0.65 : 0.35;
    float side = fract(c * 7.0) > 0.5 ? 1.0 : -1.0;
    float bang = ang + side * 1.0471976;
    float len = (1.0 - at) * 0.75 * fract(c * 13.0);
    p = dir * (at * 1.75) + vec2(cos(bang), sin(bang)) * len;
  }
  p = floor(p / 0.06 + 0.5) * 0.06;
  return CENTER + vec3(p, (fract(a * 17.0) - 0.5) * 0.08);
}
// 防御：追求稳定。均匀铺在球壳上的点，整体缓慢转动，壳面平衡完整。
vec3 wardTarget(vec2 id, float index, float count){
  float y = 1.0 - 2.0 * (index + 0.5) / count;
  float r = sqrt(1.0 - y * y);
  float phi = index * 2.3999632 + uTime * 0.35;
  vec3 p = vec3(cos(phi) * r, y, sin(phi) * r) * 1.55;
  return CENTER + p;
}
`;

// 速度更新：根据各阶段的权重混合目标吸引力、噪声扰动与阻尼。
export const velocityShader = /* glsl */ `
${COMMON}
${SHAPES}
uniform float uDt, uGather, uShape, uStable, uRelease, uCollapse, uElement, uRadius;
uniform vec2 uDir;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec4 V = texture2D(textureVelocity, uv);
  vec3 p = P.xyz, v = V.xyz;
  vec2 id = uv * 91.7;
  float index = floor(gl_FragCoord.y) * resolution.x + floor(gl_FragCoord.x);
  float count = resolution.x * resolution.y;

  // 环境：没有施法时，力量稀薄地漂浮在台面上
  vec3 acc = curl(p * 0.45 + vec3(0.0, 0.0, uTime * 0.04)) * 0.35 * (1.0 - uGather);
  // 静候时停在椭圆形的台面范围内，越出边界就被轻轻拉回
  vec2 e = (p.xy - CENTER.xy) / vec2(3.3, 2.1);
  acc.xy -= (p.xy - CENTER.xy) * smoothstep(0.85, 1.15, length(e)) * 1.6 * (1.0 - uGather);
  acc.z -= p.z * 0.4;

  // 起势：沿「∞」回路流动
  float t = h1(id) * 6.2831853 + uTime * (0.7 + 0.5 * h1b(id));
  vec2 L = lemniscate(t, 2.75);
  vec3 gather = vec3(L + (vec2(h1b(id), h1c(id)) - 0.5) * 0.22, (h1c(id) - 0.5) * 0.35);

  // 塑形：三种结构
  vec3 shape = uElement < 0.5 ? fireTarget(id) : uElement < 1.5 ? frostTarget(id) : wardTarget(id, index, count);
  vec3 target = mix(gather, shape, uShape);
  float pull = uGather * (2.2 + 4.5 * uShape + 4.0 * uStable * uShape) * (1.0 - uRelease) * (1.0 - uCollapse);
  acc += (target - p) * pull;

  // 扰动：活性越高越躁动；稳定把扰动收敛下去
  float activity = uElement < 0.5 ? 1.0 : uElement < 1.5 ? 0.12 : 0.38;
  float jitter = uGather * mix(0.35, activity * 1.3, uShape) * (1.0 - 0.88 * uStable);
  acc += curl(p * 2.1 + vec3(uTime * 0.7)) * jitter * 3.2;
  if (uElement < 0.5) acc.y += uShape * uGather * 1.1 * (1.0 - 0.3 * uStable) * (1.0 - uRelease); // 导出时不再上浮，沿瞄准方向射出

  // 导出：力量沿瞄准方向射出，粒子之间略有发散
  if (uRelease > 0.0) {
    vec2 perp = vec2(-uDir.y, uDir.x);
    float spread = (h1b(id) - 0.5) * 0.9;
    acc += vec3(uDir * (10.0 + 12.0 * h1(id)) + perp * spread * 4.0, 0.0) * uRelease;
    // 碰到台面边缘的弧线：散成光尘
    vec2 rel = p.xy - CENTER.xy;
    if (length(rel) > uRadius && dot(v.xy, rel) > 0.0) {
      vec2 n = normalize(rel);
      v.xy = reflect(v.xy, n) * 0.18 + (vec2(h1(id + uTime), h1b(id - uTime)) - 0.5) * 1.6;
      v.z += (h1c(id) - 0.5) * 1.2;
    }
  }
  // 反噬：提前松手，结构溃散
  acc += normalize(p - CENTER + 0.001) * uCollapse * (9.0 + 10.0 * h1c(id));
  acc += curl(p * 1.3 + vec3(uTime)) * uCollapse * 5.0;

  v += acc * uDt;
  float damping = 1.4 + uShape * (2.0 + 3.5 * uStable) + (uElement > 0.5 && uElement < 1.5 ? 4.0 * uShape : 0.0);
  damping *= 1.0 - 0.75 * uRelease;
  v *= exp(-uDt * damping);
  gl_FragColor = vec4(v, 1.0);
}`;

// 位置更新；w 通道记录「已撞上边缘弧线」，用于把光尘逐渐熄灭。
export const positionShader = /* glsl */ `
uniform float uDt, uRelease, uRadius;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec3 v = texture2D(textureVelocity, uv).xyz;
  vec3 p = P.xyz + v * uDt;
  float spark = P.w;
  if (uRelease > 0.0 && length(p.xy - vec2(0.0, 0.15)) > uRadius) spark = 1.0;
  if (uRelease <= 0.0) spark = max(0.0, spark - uDt * 0.8);
  gl_FragColor = vec4(p, spark);
}`;

// 粒子绘制：从位置纹理取坐标；颜色随结构与速度变化，加色混合。
export const particleVertex = /* glsl */ `
uniform sampler2D uPositions, uVelocities;
uniform float uSize, uDpr, uShape, uElement, uGather, uStable, uDensity;
uniform vec3 uColGather, uColFire, uColFireHot, uColFrost, uColWard;
attribute vec2 aRef;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 P = texture2D(uPositions, aRef);
  vec3 v = texture2D(uVelocities, aRef).xyz;
  float speed = length(v);
  vec3 shapeCol = uElement < 0.5 ? mix(uColFire, uColFireHot, clamp(speed * 0.35, 0.0, 1.0)) : uElement < 1.5 ? uColFrost : uColWard;
  vColor = mix(uColGather, shapeCol, uShape) * (0.65 + 0.5 * clamp(speed * 0.25, 0.0, 1.0));
  vColor = mix(vColor, uColGather * 1.4, P.w * 0.6);
  // 粒子越多单个越暗，避免叠加后过曝；静候时只剩稀薄的光尘
  vAlpha = uDensity * (0.07 + 0.93 * uGather) * (1.0 - 0.6 * P.w) * (0.8 + 0.2 * uStable) * (uElement > 0.5 && uElement < 1.5 ? 1.0 - 0.45 * uShape : 1.0);
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_PointSize = uSize * uDpr * (0.8 + 0.6 * fract(aRef.x * 53.0 + aRef.y * 97.0));
  gl_Position = projectionMatrix * mv;
}`;
export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
}`;

// 台面：深绿径向底色、三道淡淡的轨道环、「∞」回路与四个阶段节点（节点按进度点亮），
// 以及导出时才显现的边缘弧线。
export const tableVertex = /* glsl */ `varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const tableFragment = /* glsl */ `
${COMMON}
uniform vec3 uDeep, uField, uLine, uNode, uNodeOn;
uniform float uPhase, uArc, uRadius, uPx;
varying vec2 vPos;
float ring(float d, float r, float w){ return 1.0 - smoothstep(0.0, w, abs(d - r)); }
void main(){
  vec2 c = vPos - vec2(0.0, 0.15);
  float d = length(c);
  vec3 col = mix(uField, uDeep, smoothstep(0.0, 2.9, d));
  float w = uPx * 1.2;
  col = mix(col, uLine, (ring(d, 1.9, w) + ring(d, 1.74, w) + ring(d, 1.16, w)) * 0.22);
  // 「∞」回路：取最近的采样点距离
  float best = 1e9;
  for (int i = 0; i < 96; i++) {
    vec2 q = lemniscate(float(i) / 96.0 * 6.2831853, 2.75) + vec2(0.0, 0.15);
    best = min(best, distance(vPos, q));
  }
  col = mix(col, uLine, (1.0 - smoothstep(0.0, uPx * 2.2, best - uPx * 0.4)) * 0.4);
  // 四个阶段节点
  for (int i = 0; i < 4; i++) {
    vec2 q = vec2(-2.4 + 1.6 * float(i), 0.15);
    float nd = distance(vPos, q);
    float on = clamp(uPhase - float(i) + 1.0, 0.0, 1.0);
    float r = i == 3 ? 0.23 : 0.18;
    col = mix(col, mix(uNode, uNodeOn, on), 1.0 - smoothstep(r - uPx, r + uPx, nd));
    col = mix(col, uNodeOn, ring(nd, r + 0.11, w) * (0.15 + 0.6 * on));
    col += uNodeOn * on * exp(-nd * nd * 12.0) * 0.25;
  }
  // 导出时的边缘弧线
  col += uNodeOn * ring(d, uRadius, uPx * 3.0) * uArc * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`;
