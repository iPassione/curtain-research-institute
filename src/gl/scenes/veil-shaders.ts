// 首页「穿过帷幕」的着色器。颜色以线性空间计算，最终由 OutputPass 转成 sRGB。

// 三维值噪声（哈希取自 Inigo Quilez 的公开写法）。
export const NOISE = /* glsl */ `
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

// 天空：天顶到地平线的夜色渐变、月轮与月晕；穹顶显形时，帷幕方向的地平线泛起极淡的金光。
export const SKY = /* glsl */ `
uniform vec3 uZenith, uHorizon, uMoon, uGold, uMoonDir;
uniform float uReveal;
vec3 skyColor(vec3 dir){
  float h = max(dir.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.42));
  col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.08, dir.y));
  float m = max(dot(dir, uMoonDir), 0.0);
  col += uMoon * (smoothstep(0.99993, 0.99996, m) * 1.15 + pow(m, 2400.0) * 0.28 + pow(m, 90.0) * 0.035);
  float toward = smoothstep(0.1, 0.95, -dir.z);
  col += uGold * uReveal * toward * exp(-abs(dir.y) * 18.0) * 0.012;
  return col;
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
export const skyFragment = /* glsl */ `
${SKY}
varying vec3 vDir;
void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`;

// 海面：四组 Gerstner 波叠加，菲涅尔反射天色，月光高光与细碎闪光，远处融进地平线。
export const seaVertex = /* glsl */ `
uniform float uTime;
uniform vec4 uWaves[4];
varying vec3 vWorld;
varying vec3 vNormalW;
vec3 gerstner(vec4 w, vec2 p, inout vec3 t, inout vec3 b){
  float k = 6.2831853 / w.w;
  float c = sqrt(9.8 / k);
  vec2 d = normalize(w.xy);
  float f = k * (dot(d, p) - c * uTime);
  float a = w.z / k;
  float s = sin(f), co = cos(f);
  t += vec3(-d.x * d.x * w.z * s, d.x * w.z * co, -d.x * d.y * w.z * s);
  b += vec3(-d.x * d.y * w.z * s, d.y * w.z * co, -d.y * d.y * w.z * s);
  return vec3(d.x * a * co, a * s, d.y * a * co);
}
void main(){
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 t = vec3(1.0, 0.0, 0.0), b = vec3(0.0, 0.0, 1.0);
  vec3 off = vec3(0.0);
  for (int i = 0; i < 4; i++) off += gerstner(uWaves[i], p.xz, t, b);
  p += off;
  vWorld = p;
  vNormalW = normalize(cross(b, t));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
export const seaFragment = /* glsl */ `
${SKY}
${NOISE}
uniform vec3 uDeep, uGlint;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vec3 N = normalize(vNormalW);
  float dist = distance(cameraPosition.xz, vWorld.xz);
  // 细小波纹：只在近处扰动法线，远处保持平静，避免闪烁。
  float near = 1.0 - smoothstep(30.0, 220.0, dist);
  vec2 q = vWorld.xz * 0.9 + vec2(uTime * 0.6, uTime * 0.35);
  N = normalize(N + near * 0.12 * vec3(vnoise(vec3(q, 1.0)) - 0.5, 0.0, vnoise(vec3(q.yx, 7.0)) - 0.5));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 col = mix(uDeep, skyColor(R), fres);
  float m = max(dot(R, uMoonDir), 0.0);
  col += uMoon * (pow(m, 1400.0) * 1.6 + pow(m, 80.0) * 0.05);
  // 月光路上的碎光
  float sparkle = step(0.985, vnoise(vec3(vWorld.xz * 2.2, uTime * 1.3))) * pow(m, 18.0);
  col += uGlint * sparkle * 0.7;
  // 帷幕显形时，朝向穹顶的海面映出一层淡金
  col += uGold * uReveal * smoothstep(0.55, 0.95, -R.z) * smoothstep(0.08, 0.35, R.y) * fres * 0.05;
  col = mix(col, uHorizon * 0.9, smoothstep(140.0, 900.0, dist));
  gl_FragColor = vec4(col, 1.0);
}`;

// 星空：固定种子的点精灵，靠近地平线渐隐，相位各异地微微闪烁。
export const starVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aTint;
uniform float uTime, uDpr;
varying vec3 vTint;
varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aPhase * 1.7) + aPhase * 40.0);
  vec3 dir = normalize(position);
  vAlpha = smoothstep(0.0, 0.18, dir.y) * tw;
  vTint = aTint;
  gl_PointSize = aSize * uDpr;
  gl_Position = projectionMatrix * mv;
}`;
export const starFragment = /* glsl */ `
varying vec3 vTint;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a + smoothstep(0.12, 0.0, d);
  gl_FragColor = vec4(vTint * a * vAlpha, 1.0);
}`;

// 船灯：一盏暖色小灯，随浪轻微起伏。
export const lampFragment = /* glsl */ `
uniform vec3 uColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (a * a * 0.8 + smoothstep(0.08, 0.0, d) * 2.5), 1.0);
}`;

// 帷幕薄膜：
// · 顶点：两层噪声的缓慢「呼吸」，加上指针掠过时的环形涟漪（最多 8 个）。底边固定在海面。
// · 片元：菲涅尔决定可见度；薄膜干涉色限制在金与青绿之间；极淡的经纬织纹；
//   折射采样「不含薄膜的场景」离屏纹理，按视空间法线偏移。uRefract=0 时只有边缘光（精简档）。
export const membraneVertex = /* glsl */ `
${NOISE}
uniform float uTime, uBreath;
uniform vec4 uRipples[8];
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vViewNormal;
varying vec2 vUv;
varying float vRipple;
varying float vNoise;
void main(){
  vec3 p = position;
  vec3 n = normalize(position);
  float base = smoothstep(0.0, 14.0, p.y);
  float breath = vnoise(p * 0.035 + vec3(0.0, uTime * 0.06, 0.0)) * 0.7 + vnoise(p * 0.11 - vec3(uTime * 0.09)) * 0.3;
  vNoise = breath;
  float ripple = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.w;
    if (r.w < 0.0 || age < 0.0 || age > 6.0) continue;
    float d = distance(p, r.xyz);
    float front = d - age * 16.0;
    ripple += exp(-front * front / 30.0) * exp(-age * 0.75) * smoothstep(0.0, 0.3, age);
  }
  vRipple = ripple;
  p += n * base * ((breath - 0.5) * uBreath + ripple * 1.1);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vViewNormal = normalize(normalMatrix * n);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
export const membraneFragment = /* glsl */ `
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uReveal, uRefract, uTime;
uniform vec3 uGold, uTeal, uVeil;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vViewNormal;
varying vec2 vUv;
varying float vRipple;
varying float vNoise;
float gridLine(float x, float scale){
  float v = x * scale;
  float w = fwidth(v);
  return 1.0 - smoothstep(0.0, w * 1.5, abs(fract(v) - 0.5) - 0.5 + w);
}
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = abs(dot(N, V));
  float fres = pow(1.0 - ndv, 3.0);
  // 薄膜干涉：随视角、噪声与时间缓慢流转，色域只在铜金与青绿之间。
  float phase = ndv * 1.7 + vNoise * 0.9 + uTime * 0.015;
  float t = 0.5 + 0.5 * cos(6.2831853 * phase);
  vec3 film = mix(uGold, uTeal, t * 0.7);
  float weave = max(gridLine(vUv.x, 96.0), gridLine(vUv.y, 22.0)) * (0.25 + 0.75 * fres);
  float edge = smoothstep(0.55, 1.0, fres);
  vec3 glow = film * (pow(fres, 1.8) * 0.9 + vRipple * 0.8) + uVeil * edge * 0.75 + film * weave * 0.04;
  vec3 col = glow;
  float alpha = uReveal * clamp(fres * 0.95 + vRipple * 0.5 + weave * 0.05, 0.0, 1.0);
#ifndef NEAR_SIDE
  // 远侧内壁（先画）：只留边缘光与织纹，不做折射，避免与近侧叠成重影。
  gl_FragColor = vec4(glow * 0.75, uReveal * clamp(fres * 0.85 + vRipple * 0.3 + weave * 0.04, 0.0, 1.0));
  return;
#endif
  if (uRefract > 0.0) {
    vec2 suv = gl_FragCoord.xy / uResolution;
    vec2 off = vViewNormal.xy * uRefract * (0.012 + 0.05 * fres + vRipple * 0.03);
    vec3 bg = texture2D(uScene, clamp(suv + off, 0.001, 0.999)).rgb;
    // 近侧折射层半透明，远侧的弧光仍能透出来。
    col = bg * (1.0 - fres * 0.25) + glow;
    alpha = uReveal * clamp(0.22 + fres * 0.78 + vRipple * 0.3, 0.0, 1.0);
  }
  gl_FragColor = vec4(col, alpha);
}`;

// 收尾：极轻的颗粒与暗角（在 sRGB 输出之后）。
export const finishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVignette: { value: 0.35 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime, uGrain, uVignette;
varying vec2 vUv;
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float g = rand(vUv * 1000.0 + fract(uTime * 7.0)) - 0.5;
  c.rgb += g * uGrain;
  vec2 d = vUv - 0.5;
  c.rgb *= 1.0 - uVignette * smoothstep(0.35, 0.95, dot(d, d) * 2.2);
  gl_FragColor = c;
}`,
};
