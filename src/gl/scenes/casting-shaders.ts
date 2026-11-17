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

// 速度更新。两种状态：
//   施法中（uFx < 0）：按起势、塑形、稳定的权重混合目标吸引力、噪声扰动与阻尼。
//   导出／反噬（uFx ≥ 0）：由场景的效果时间线（uFxT）驱动，三种结构各有专属效果：
//     火焰 0：火球飞向落点，随后爆燃——向四周炸开、热气上浮、湍流翻卷；
//     冰霜 1：冰晶向外迸开，随即被冻住（强阻尼，原地凝固）；
//     防御 2：球壳整体放大，保持完整；
//     反噬 3：结构向外溃散。
//   效果结束后粒子就地熄灭、重新铺开，不会倒放回中心。
export const velocityShader = /* glsl */ `
${COMMON}
${SHAPES}
uniform float uDt, uGather, uShape, uStable, uElement;
uniform float uFx, uFxT, uBurst, uWardGrow;
uniform vec2 uImpact;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec4 V = texture2D(textureVelocity, uv);
  vec3 p = P.xyz, v = V.xyz;
  vec2 id = uv * 91.7;
  float index = floor(gl_FragCoord.y) * resolution.x + floor(gl_FragCoord.x);
  float count = resolution.x * resolution.y;
  vec3 acc = vec3(0.0);
  float damping = 1.4;

  if (uFx < -0.5) {
    // 环境：没有施法时，力量稀薄地漂浮在椭圆形的台面范围内
    acc += curl(p * 0.45 + vec3(0.0, 0.0, uTime * 0.04)) * 0.35 * (1.0 - uGather);
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
    acc += (target - p) * uGather * (2.2 + 4.5 * uShape + 4.0 * uStable * uShape);
    // 扰动：活性越高越躁动；稳定把扰动收敛下去
    float activity = uElement < 0.5 ? 1.0 : uElement < 1.5 ? 0.12 : 0.38;
    acc += curl(p * 2.1 + vec3(uTime * 0.7)) * uGather * mix(0.35, activity * 1.3, uShape) * (1.0 - 0.88 * uStable) * 3.2;
    if (uElement < 0.5) acc.y += uShape * uGather * 1.1 * (1.0 - 0.3 * uStable);
    damping = 1.4 + uShape * (2.0 + 3.5 * uStable) + (uElement > 0.5 && uElement < 1.5 ? 4.0 * uShape : 0.0);
  } else if (uFx < 0.5) {
    // 火焰：先收成火球飞向落点，再爆燃
    vec3 impact = vec3(uImpact, 0.0);
    if (uFxT < 0.32) {
      acc = (impact - p) * 60.0 + curl(p * 3.0 + vec3(uTime * 2.0)) * 1.2;
      damping = 9.0;
    } else {
      if (uBurst > 0.5) {
        // 全方向爆开：方向取均匀分布的随机单位向量，与粒子此刻的位置无关
        float z = h1(id) * 2.0 - 1.0, a = h1b(id) * 6.2831853, rr = sqrt(1.0 - z * z);
        vec3 r = vec3(cos(a) * rr, sin(a) * rr, z * 0.4);
        v = r * (3.5 + 9.0 * pow(h1c(id), 1.6)) + vec3(0.0, 1.0, 0.0);
      }
      acc = curl(p * 1.4 + vec3(uTime * 0.9)) * 3.0 + vec3(0.0, 2.2 * smoothstep(0.32, 0.8, uFxT), 0.0);
      damping = 2.4;
    }
  } else if (uFx < 1.5) {
    // 冰霜：迸开后冻结
    if (uBurst > 0.5) v = normalize(p - CENTER + 0.001) * (2.2 + 3.2 * h1(id)) + vec3(0.0, 0.0, (h1c(id) - 0.5));
    damping = uFxT < 0.22 ? 0.6 : 22.0;
  } else if (uFx < 2.5) {
    // 防御：球壳放大并保持完整
    vec3 shell = CENTER + (wardTarget(id, index, count) - CENTER) * (1.0 + 0.9 * uWardGrow);
    acc = (shell - p) * 16.0;
    damping = 7.0;
  } else {
    // 反噬：向外溃散
    if (uBurst > 0.5) v = normalize(p - CENTER + 0.001) * (3.5 + 6.0 * h1c(id));
    acc = curl(p * 1.3 + vec3(uTime)) * 3.0;
    damping = 1.8;
  }

  v += acc * uDt;
  v *= exp(-uDt * damping);
  gl_FragColor = vec4(v, 1.0);
}`;

export const positionShader = /* glsl */ `
uniform float uDt;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec3 v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(P.xyz + v * uDt, 0.0);
}`;

// 粒子绘制：颜色随结构、速度与导出效果的时间变化；加色混合。uFade 是整体淡入淡出（重新铺开时用）。
export const particleVertex = /* glsl */ `
uniform sampler2D uPositions, uVelocities;
uniform float uSize, uDpr, uShape, uElement, uGather, uStable, uDensity, uFade;
uniform float uFx, uFxT, uBand, uWardGrow;
uniform vec3 uColGather, uColFire, uColFireHot, uColFrost, uColWard, uColEmber;
attribute vec2 aRef;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 P = texture2D(uPositions, aRef);
  vec3 v = texture2D(uVelocities, aRef).xyz;
  float speed = length(v);
  float el = uFx > -0.5 && uFx < 2.5 ? uFx : uElement;
  vec3 shapeCol = el < 0.5 ? mix(uColFire, uColFireHot, clamp(speed * 0.35, 0.0, 1.0)) : el < 1.5 ? uColFrost : uColWard;
  float shape = uFx > -0.5 && uFx < 2.5 ? 1.0 : uShape;
  vec3 col = mix(uColGather, shapeCol, shape) * (0.65 + 0.5 * clamp(speed * 0.25, 0.0, 1.0));
  float alpha = uDensity * (0.07 + 0.93 * max(uGather, step(-0.5, uFx))) * (0.8 + 0.2 * uStable);
  if (el > 0.5 && el < 1.5) alpha *= 1.0 - 0.45 * shape;
  float size = 1.0;

  if (uFx > -0.5 && uFx < 0.5 && uFxT > 0.32) {
    // 爆燃：白热 → 橙 → 余烬红，再化作暗烟
    float age = uFxT - 0.32;
    col = mix(uColFireHot * 2.6, uColFire * 1.4, smoothstep(0.0, 0.22, age));
    col = mix(col, uColEmber, smoothstep(0.25, 0.85, age));
    alpha *= (1.4 - smoothstep(0.6, 1.5, age)) * (1.0 + 1.5 * exp(-age * 8.0));
    size = 1.0 + 1.2 * exp(-age * 5.0);
  } else if (uFx > 0.5 && uFx < 1.5) {
    // 冰冻：刚迸开时一闪，随后是冷白的冰尘
    col = uColFrost * (1.0 + 2.2 * exp(-uFxT * 4.0));
    alpha *= 1.3;
  } else if (uFx > 1.5 && uFx < 2.5) {
    // 护罩放大时，一圈高光沿球面从下往上滚过
    float r = 1.55 * (1.0 + 0.9 * uWardGrow);
    float y = (P.y - 0.15) / r;
    // 正投影下球的两极粒子最密，按纬度压低高光，避免两极一片白
    float band = exp(-pow((y - uBand) * 4.5, 2.0)) * (1.0 - 0.75 * abs(y));
    col = mix(uColWard, vec3(1.0, 0.96, 0.82), band) * (0.8 + 3.0 * band);
    alpha *= 1.0 + 3.0 * band;
    size = 1.0 + 1.8 * band; // 高光带里的粒子放大，读起来是一圈亮环
  } else if (uFx > 2.5) {
    alpha *= 1.0 - smoothstep(0.1, 0.6, uFxT);
  }

  vColor = col;
  vAlpha = alpha * uFade;
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_PointSize = uSize * uDpr * size * (0.8 + 0.6 * fract(aRef.x * 53.0 + aRef.y * 97.0));
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

// 画面效果（泛光之后、输出之前，线性空间）：
//   火焰：落点处的闪光与一圈向外扩散的冲击波（扭曲背景）；
//   冰霜：冰花从画面四边向里冻满，带晶面与冰针纹理，随后成块碎裂褪去。
export const fxShader = {
  uniforms: {
    tDiffuse: { value: null }, uAspect: { value: 1 }, uTime: { value: 0 },
    uImpact: { value: [0.5, 0.5] }, uFlash: { value: 0 }, uShock: { value: -1 }, uShockAmp: { value: 0 },
    uFrost: { value: 0 }, uFrostOut: { value: 0 }, uFrostCol: { value: [0.78, 0.9, 1.0] }, uFlashCol: { value: [1.0, 0.72, 0.38] },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
${COMMON}
uniform sampler2D tDiffuse;
uniform float uAspect, uTime, uFlash, uShock, uShockAmp, uFrost, uFrostOut;
uniform vec2 uImpact;
uniform vec3 uFrostCol, uFlashCol;
varying vec2 vUv;
vec2 cell(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(h1(i + g), h1b(i + g));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2);
}
void main(){
  vec2 uv = vUv;
  vec2 q = vec2((uv.x - uImpact.x) * uAspect, uv.y - uImpact.y);
  float d = length(q);
  // 冲击波：一圈向外扩散的环，扭曲经过处的画面
  float ring = uShock > 0.0 ? exp(-pow((d - uShock) * 22.0, 2.0)) * uShockAmp : 0.0;
  uv -= (d > 0.0 ? q / d : vec2(0.0)) * ring * 0.035 * vec2(1.0 / uAspect, 1.0);
  vec4 c = texture2D(tDiffuse, uv);
  c.rgb += uFlashCol * (uFlash * (0.35 + 1.8 * exp(-d * 4.0)) + ring * 0.5);

  if (uFrost > 0.0) {
    // 从四边向里生长：离边越近越早结霜，霜的边界被两层噪声撕成冰花的轮廓
    vec2 ap = vUv * vec2(uAspect, 1.0);
    float edge = min(min(vUv.x, 1.0 - vUv.x) * uAspect, min(vUv.y, 1.0 - vUv.y));
    float n = vnoise(vec3(ap * 6.0, 1.0)) * 0.6 + vnoise(vec3(ap * 21.0, 2.0)) * 0.4;
    float front = uFrost * 0.25;
    float ice = smoothstep(front + 0.03, front - 0.04, edge + (n - 0.5) * 0.2);
    // 细碎的晶面：两层大小不同的晶胞，只取晶缝做亮线，晶面本身是半透明的冷白
    vec2 c1 = cell(ap * 26.0), c2 = cell(ap * 9.0 + 4.0);
    float cracks = (1.0 - smoothstep(0.0, 0.05, c1.y - c1.x)) * 0.35 + (1.0 - smoothstep(0.0, 0.035, c2.y - c2.x)) * 0.55;
    float grain = vnoise(vec3(ap * 90.0, 3.0));
    // 碎裂褪去：按大晶胞（不规则多边形）成片消失
    vec2 ci = floor(ap * 9.0 + 4.0);
    float shard = h1(ci + floor(cell(ap * 9.0 + 4.0).x * 3.0));
    ice *= 1.0 - smoothstep(shard - 0.15, shard, uFrostOut * 1.2);
    // 越靠边霜越厚，靠里只是一层薄雾
    float thick = pow(smoothstep(front, 0.0, edge), 1.4);
    // 霜窗：边缘厚而亮，往里迅速变薄；颜色是叠加的冷白，不把画面压成灰色
    vec3 frosted = c.rgb * (1.0 - 0.3 * thick) + uFrostCol * (0.42 * thick + cracks * (0.35 + 0.9 * thick) + grain * 0.1 * thick);
    c.rgb = mix(c.rgb, frosted, ice);
  }
  gl_FragColor = c;
}`,
};

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
  // 「∞」回路：用双纽线的隐式方程 (x²+y²)² = a²(x²−y²) 近似求到曲线的距离（|f| / |∇f|），每个像素只算一次
  vec2 l = vPos - vec2(0.0, 0.15);
  float A = 2.75 * 2.75, r2 = dot(l, l);
  float f = r2 * r2 - A * (l.x * l.x - l.y * l.y);
  vec2 g = vec2(4.0 * l.x * r2 - 2.0 * A * l.x, 4.0 * l.y * r2 + 2.0 * A * l.y);
  float best = abs(f) / max(length(g), 1e-3);
  col = mix(col, uLine, (1.0 - smoothstep(0.0, uPx * 1.8, best - uPx * 0.2)) * 0.26);
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
