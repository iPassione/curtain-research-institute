// 地理馆立体航海图的着色器。颜色在线性空间计算，OutputPass 转为 sRGB。
import { NOISE } from './veil-shaders';

// 浮雕：与首页「穹顶之下」共用侵蚀后的地形（scripts/derive-terrain.py：高度 h = R + G/256），
// 像一张按航海图做的立体沙盘：河谷与湖泊下凹、映着天光；圆盘外缘压平。片元求法线时把起伏放大，侧光照出山脊。
export const reliefVertex = /* glsl */ `
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
}`;

export const reliefFragment = /* glsl */ `
${NOISE}
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
}`;

// 圆盘侧缘：铜色木框，随光照明暗。
export const rimFragment = /* glsl */ `
uniform vec3 uColor, uLight;
varying vec3 vNormalW;
void main(){
  float lit = max(dot(normalize(vNormalW), uLight), 0.0);
  gl_FragColor = vec4(uColor * (0.45 + 0.6 * lit), 1.0);
}`;
export const rimVertex = /* glsl */ `
varying vec3 vNormalW;
void main(){ vNormalW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// 桌面：与原航海图室一致的米色径向渐层，圆盘下方有一圈随光源偏移的柔和投影。
export const groundVertex = /* glsl */ `
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
export const groundFragment = /* glsl */ `
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
}`;

// 界门弧线：金色细管，一道光沿弧线缓缓流过；uGlow 由悬停/选中控制。
export const arcVertex = /* glsl */ `
varying float vT;
void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const arcFragment = /* glsl */ `
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
}`;

// 移轴：画面上下边缘轻微虚化，像低头看一张桌上的模型（只在完整档）。
export const tiltShader = {
  uniforms: { tDiffuse: { value: null }, uTexel: { value: [1 / 1024, 1 / 1024] }, uAmount: { value: 1 }, uFocusY: { value: 0.5 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
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
}`,
};

// 城镇灯火：入夜后在沙盘上亮起（与首页同一份城镇与村落位置），白天不画。
export const townVertex = /* glsl */ `
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
}`;
export const townFragment = /* glsl */ `
uniform float uOn;
varying float vGlow;
void main(){
  float d = length(gl_PointCoord - 0.5);
  vec3 c = vec3(1.0, 0.64, 0.3) * (smoothstep(0.12, 0.0, d) * 2.6 + pow(smoothstep(0.5, 0.0, d), 2.0) * 0.7) * vGlow;
  gl_FragColor = vec4(c * uOn, 1.0);
}`;
