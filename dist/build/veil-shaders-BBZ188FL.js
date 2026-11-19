var e=`
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`,t=`
uniform float uCurve; // 1 / (2 × 星球半径)，穹顶内才生效
vec3 curved(vec3 w){ vec2 d = w.xz - cameraPosition.xz; w.y -= dot(d, d) * uCurve; return w; }
`,n=`
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
`,r=`
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`,i=`
${n}
varying vec3 vDir;
void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`,a=`
uniform float uTime;
uniform vec4 uWaves[4];
${t}
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
  gl_Position = projectionMatrix * viewMatrix * vec4(curved(p), 1.0);
}`,o=`
${n}
${e}
uniform vec3 uDeep, uGlint, uShallow;
uniform float uTime, uLandSize, uLandZ, uLandOn;
uniform sampler2D uTerrain;
uniform sampler2D uRegions;
uniform float uLift[5];
varying vec3 vWorld;
float seaLift(vec2 uv){ float id = floor(texture2D(uRegions, uv).r * 255.0 / 60.0 + 0.5), l = 0.0; for (int i = 0; i < 5; i++) if (float(i) == id) l = uLift[i]; return l; }
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
  col += uMoon * (pow(m, 1400.0) * 1.6 + pow(m, 80.0) * 0.05) * (1.0 - 0.85 * uLandOn); // 穹顶内俯瞰时压低月光反射，不抢大陆
  // 月光路上的碎光
  float sparkle = step(0.985, vnoise(vec3(vWorld.xz * 2.2, uTime * 1.3))) * pow(m, 18.0);
  col += uGlint * sparkle * 0.7 * (1.0 - 0.8 * uLandOn);
  // 帷幕显形时，朝向穹顶的海面映出一层淡金
  col += uGold * uReveal * smoothstep(0.55, 0.95, -R.z) * smoothstep(0.08, 0.35, R.y) * fres * 0.05;
  // 穹顶之内：大陆周围的浅海泛起青绿，近岸一圈随浪起伏的白沫，让陆地有了海岸与水深
  if (uLandOn > 0.001) {
    vec2 tuv = vec2(vWorld.x / uLandSize + 0.5, 0.5 - (vWorld.z - uLandZ) / uLandSize);
    if (all(greaterThan(tuv, vec2(0.0))) && all(lessThan(tuv, vec2(1.0)))) {
      vec2 t0 = texture2D(uTerrain, tuv).rg;
      if (t0.r + t0.g / 256.0 > 0.02) discard; // 陆地底下的海面不画，低地上不会冒出浪尖
      float wide = texture2D(uTerrain, tuv, 5.0).r * 3.0, nearC = texture2D(uTerrain, tuv, 2.0).r * 3.0;
      float shallow = smoothstep(0.0, 0.09, wide);
      col = mix(col, uShallow * (0.4 + 0.4 * fres) + col * 0.5, shallow * 0.22 * uLandOn);
      float surf = smoothstep(0.004, 0.02, nearC) * (1.0 - smoothstep(0.02, 0.05, nearC));
      float wob = 0.6 + 0.4 * sin(uTime * 1.4 + (vWorld.x + vWorld.z) * 0.9 + vnoise(vec3(vWorld.xz * 0.5, uTime * 0.3)) * 5.0);
      col += uMoon * surf * wob * 0.035 * uLandOn;
      // 选中的大陆：周围的浅海映出一圈金光
      float lift = seaLift(tuv);
      col += uGold * lift * uLandOn * (shallow * 0.22 + surf * wob * 0.9);
    }
  }
  col = mix(col, uHorizon * 0.9, smoothstep(140.0, 900.0, dist));
  gl_FragColor = vec4(col, 1.0);
}`,s=`
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
}`,c=`
varying vec3 vTint;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a + smoothstep(0.12, 0.0, d);
  gl_FragColor = vec4(vTint * a * vAlpha, 1.0);
}`,l=`
uniform vec3 uColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (a * a * 0.8 + smoothstep(0.08, 0.0, d) * 2.5), 1.0);
}`,u=`
${e}
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
}`,d=`
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uReveal, uRefract, uTime, uInside, uNear;
uniform vec3 uGold, uTeal, uVeil;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vViewNormal;
varying vec2 vUv;
varying float vRipple;
varying float vNoise;
// 织纹线：远看是一像素的细线；贴近时线宽按格子比例（frac）放大，与格子一起变大。
float gridLine(float x, float scale, float frac){
  float v = x * scale;
  float w = fwidth(v);
  float d = min(fract(v), 1.0 - fract(v));
  float core = min(frac, w * 2.5); // 线宽上限约 5 像素，贴得再近也是细线
  float line = 1.0 - smoothstep(core, core + w * 1.5, d);
  float halo = (1.0 - smoothstep(0.0, core + w * 10.0, d)) * 0.35 * step(0.0001, frac); // 贴近时的柔光
  return max(line, halo);
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
  float frac = 0.035 * uNear;
  float weave = max(gridLine(vUv.x, 96.0, frac), gridLine(vUv.y, 22.0, frac)) * (0.25 + 0.75 * max(fres, uNear));
  float edge = smoothstep(0.55, 1.0, fres);
  vec3 glow = film * (pow(fres, 1.8) * 0.9 + vRipple * 0.8) + uVeil * edge * 0.75 + film * weave * 0.04;
  vec3 col = glow;
  float alpha = uReveal * clamp(fres * 0.95 + vRipple * 0.5 + weave * 0.05, 0.0, 1.0);
#ifndef NEAR_SIDE
  // 远侧内壁（先画）：只留边缘光与织纹，不做折射，避免与近侧叠成重影。
  // 进入穹顶后，内壁的经纬织纹成为头顶的天幕：神明用执念织就的结界。
  vec3 inner = glow * 0.75 + film * weave * uInside * 0.55;
  gl_FragColor = vec4(inner, uReveal * clamp(fres * 0.85 + vRipple * 0.3 + weave * (0.04 + uInside * 0.2), 0.0, 1.0));
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
  // 贴近薄膜：经纬织纹放大、清楚起来，膜面泛起一层干涉色，让人知道「快要碰到它了」。
  col += film * (weave * 1.1 + 0.05) * uNear;
  alpha = max(alpha, uReveal * uNear * clamp(0.18 + weave * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}`,f={uniforms:{tDiffuse:{value:null},uTime:{value:0},uGrain:{value:.035},uVignette:{value:.35},uCross:{value:0},uVeil:{value:[.95,.89,.71]}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
uniform sampler2D tDiffuse;
uniform float uTime, uGrain, uVignette, uCross;
uniform vec3 uVeil;
varying vec2 vUv;
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  // 穿幕：镜头贴着薄膜穿过的一瞬，整个画面像水面一样荡开，并泛起一层帷光。
  vec2 d0 = vUv - 0.5;
  float r = length(d0);
  vec2 uv = vUv + (r > 0.0 ? d0 / r : vec2(0.0)) * sin(r * 38.0 - uTime * 7.0) * 0.012 * uCross;
  vec4 c = texture2D(tDiffuse, uv);
  c.rgb = mix(c.rgb, uVeil, uCross * 0.2 * (0.55 + 0.45 * smoothstep(0.7, 0.0, r)));
  float g = rand(vUv * 1000.0 + fract(uTime * 7.0)) - 0.5;
  c.rgb += g * uGrain;
  vec2 d = vUv - 0.5;
  c.rgb *= 1.0 - uVignette * smoothstep(0.35, 0.95, dot(d, d) * 2.2);
  gl_FragColor = c;
}`},p=`
uniform sampler2D uHeight; // R、G 高度（h = R + G/256）B 林地
uniform sampler2D uCover;  // R 河流与湖泊 G 积雪
uniform float uAmp, uSize;
uniform sampler2D uRegions; // 每处属于哪块大陆：序号 × 60
uniform float uLift[5];
float th(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(th(i), th(i + vec2(1.0, 0.0)), u.x), mix(th(i + vec2(0.0, 1.0)), th(i + vec2(1.0, 1.0)), u.x), u.y); }
const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += tn(p) * a; p = ROT * p; a *= 0.5; } return s; }
float H(vec2 uv){ vec2 t = texture2D(uHeight, uv).rg; return t.r + t.g / 256.0; }
float liftAt(vec2 uv){
  float id = floor(texture2D(uRegions, uv).r * 255.0 / 60.0 + 0.5), lift = 0.0;
  for (int i = 0; i < 5; i++) if (float(i) == id) lift = uLift[i];
  return lift;
}
// 隆起的幅度随地势增加：海岸留在水边，整块大陆向上鼓起
float liftShape(float h){ return smoothstep(0.0, 0.5, h); }
// 地面高度（相对陆地基准，世界单位）；河流与湖泊略低于两岸
float elevation(vec2 uv){
  float h = H(uv);
  float water = texture2D(uCover, uv).r;
  return h * uAmp + (tn(uv * uSize * 3.0) - 0.5) * 0.03 * smoothstep(0.01, 0.05, h) - water * 0.05;
}
// 片元里再加一层只影响光照的细节：坡面细沟、林冠一团团的树冠
// 顺坡的细沟（「侵蚀滤镜」的思路，按原理自写）：条纹沿最陡下坡方向延伸、在横坡方向起伏，
// 网格上每格取随机相位，四格按位置混合，避免出现无限长的直线。只改法线，返回高度对 w 的梯度。
// 频率高到一个像素放不下时淡出，避免远处闪烁。
vec2 gullies(vec2 w, vec2 down, float amount, vec2 dwx, vec2 dwy){ // dwx、dwy：w 的屏幕导数（在分支外求）
  vec2 across = vec2(-down.y, down.x);
  float foot = abs(dot(dwx, across)) + abs(dot(dwy, across)); // 一个像素在横坡方向覆盖的长度
  vec2 grad = vec2(0.0);
  float freq = 1.1, amp = 0.045;
  for (int o = 0; o < 2; o++) {
    vec2 q = w * freq * 0.5;
    vec2 i = floor(q), f = fract(q);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float fade = 1.0 - smoothstep(0.12, 0.3, foot * freq); // 每像素超过约 0.2 个周期就淡出，避免闪成噪点
    for (int k = 0; k < 4; k++) {
      vec2 cell = i + vec2(float(k - (k / 2) * 2), float(k / 2));
      float wt = mix(1.0 - u.x, u.x, float(k - (k / 2) * 2)) * mix(1.0 - u.y, u.y, float(k / 2));
      float phase = th(cell + float(o) * 17.0) * 6.2831853;
      // 相对格子中心的局部坐标：坡向在像素间的细微抖动不会被放大成相位的跳变
      float x = dot(w - (cell + 0.5) / (freq * 0.5), across) * freq * 6.2831853 + phase;
      // 截面取平滑的正弦：尖底的沟在一个像素内正负翻转，会闪成黑点
      grad += wt * fade * amp * cos(x) * freq * 6.2831853 * across;
    }
    freq *= 2.1; amp *= 0.42;
  }
  return grad * amount;
}
`,m=`
${p}
${t}
varying vec2 vUv;
varying vec3 vWorld;
varying float vLift;
void main(){
  vUv = uv;
  float h = H(uv);
  vLift = liftAt(uv);
  vec3 p = position;
  p.y += elevation(uv) + vLift * 1.6 * liftShape(h);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(curved(w.xyz), 1.0);
}`,h=`
${p}
#define SHADE_X 3.2
uniform sampler2D uTint;
uniform vec2 uTexel;
uniform float uInside, uReady, uShadow, uTime, uAnyHot, uBaseY;
uniform vec3 uLight, uMoon, uGold, uHorizon;
varying vec2 vUv;
varying vec3 vWorld;
varying float vLift;
void main(){
  float h = H(vUv);
  // 海岸抗锯齿：按屏幕上高度的变化率取过渡宽度
  float fw = fwidth(h) * 1.2 + 0.0008;
  vec2 dwx = dFdx(vUv * uSize), dwy = dFdy(vUv * uSize); // 屏幕导数在 discard 之前求
  float pix = length(abs(dwx) + abs(dwy));
  float land = smoothstep(0.006 - fw, 0.006 + fw, h);
  if (land < 0.01 || uInside < 0.001) discard;
  vec2 w = vUv * uSize;
  vec3 cover = texture2D(uCover, vUv).rgb;
  float forestData = cover.b;
  // 法线：地面高度做中心差分，再叠细节层（更小的步长）
  vec2 e = vec2(uTexel.x * 1.25, 0.0);
  float ex = elevation(vUv + e.xy) - elevation(vUv - e.xy);
  float ez = elevation(vUv + e.yx) - elevation(vUv - e.yx);
  float span = 2.0 * e.x * uSize / SHADE_X; // 光照用的起伏放大几倍（地形本身不放大）：山谷与河道读得清，又不像模型
  float forest = smoothstep(0.12, 0.6, forestData + (fbm(w * 1.1) - 0.5) * 0.3 + (fbm(w * 3.7 + 9.0) - 0.5) * 0.1);
  vec2 slopeV = vec2(ex, -ez) / span; // 地面高度对世界 x、z 的变化率（z 朝南为正；纹理 v 朝北）
  float steep = length(slopeV);
  vec2 down = steep > 1e-5 ? -slopeV / steep : vec2(0.0, 1.0);
  vec2 gg = gullies(w * vec2(1.0, -1.0), down * vec2(1.0, -1.0), smoothstep(0.04, 0.35, steep) * (1.0 - forest * 0.7) * smoothstep(0.01, 0.05, h), dwx * vec2(1.0, -1.0), dwy * vec2(1.0, -1.0));
  // 林冠：只在林地，一团团细小的明暗，远处淡出
  float canopyFade = (1.0 - smoothstep(0.02, 0.05, pix)) * forest; // 只在很近时才有，否则细到一个像素以下会变成黑点
  vec2 cw = w * 9.0;
  vec2 crown = vec2(tn(cw + vec2(0.5, 0.0)) - tn(cw - vec2(0.5, 0.0)), tn(cw + vec2(0.0, 0.5)) - tn(cw - vec2(0.0, 0.5))) * 0.18 * canopyFade;
  vec3 N = normalize(vec3(-slopeV.x - gg.x - crown.x, 1.0, -slopeV.y - gg.y - crown.y));
  float slope = 1.0 - N.y;

  // 地表材质
  vec3 tint = texture2D(uTint, vUv).rgb;
  // 地形结构：比周围高的是山脊、低的是谷底（两个尺度）；水边更湿
  vec2 b1 = texture2D(uHeight, vUv, 2.5).rg, b2 = texture2D(uHeight, vUv, 4.5).rg;
  float curv = (h - (b1.r + b1.g / 256.0)) * 45.0 + (h - (b2.r + b2.g / 256.0)) * 14.0;
  float ridge = smoothstep(0.05, 0.7, curv), valley = smoothstep(0.05, 0.7, -curv);
  float wet = texture2D(uCover, vUv, 3.0).r;
  float n1 = fbm(w * 1.1), n2 = mix(fbm(w * 5.0 + 3.0), 0.5, smoothstep(0.08, 0.25, pix)), n3 = tn(w * 2.6); // n2 远处取平均，免得闪烁成方块
  vec3 grass = mix(vec3(0.07, 0.1, 0.035), tint * tint * 0.85, 0.5) * (0.85 + 0.3 * n1);
  grass = mix(grass, grass * vec3(0.72, 0.9, 0.7), clamp(valley + wet * 1.5, 0.0, 1.0)); // 谷底与河岸：更深更绿
  grass = mix(grass, tint * 0.55 * vec3(1.05, 1.0, 0.9), ridge * 0.45); // 山脊：偏干、偏亮
  vec3 canopy = vec3(0.026, 0.045, 0.02) * (0.6 + 0.8 * n2);
  vec3 rock = mix(vec3(0.17, 0.15, 0.13), tint * 0.4, 0.35) * (0.7 + 0.6 * n3);
  vec3 sand = vec3(0.44, 0.37, 0.25) * (0.85 + 0.3 * n2);
  vec3 snowC = vec3(0.68, 0.74, 0.82);
  forest = clamp(forest + valley * 0.12 - ridge * 0.2, 0.0, 1.0);
  float rocky = clamp(smoothstep(0.42, 0.7, slope + (n3 - 0.5) * 0.12) + ridge * smoothstep(0.35, 0.7, h) * 0.6, 0.0, 1.0) * (1.0 - forest * 0.6) * smoothstep(0.15, 0.4, h);
  float beach = (1.0 - smoothstep(0.004, 0.012, h + (n2 - 0.5) * 0.004)) * 0.7;
  float snow = smoothstep(0.3, 0.75, cover.g * smoothstep(0.08, 0.45, h) + (n1 - 0.5) * 0.2) * (1.0 - smoothstep(0.55, 0.85, slope)) * 0.85;
  vec3 alb = mix(grass, canopy, forest);
  alb = mix(alb, rock, rocky);
  alb = mix(alb, sand, beach);
  alb = mix(alb, snowC, snow);

  // 月光与山体投影
  float lit = max(dot(N, uLight), 0.0);
  float shade = 1.0;
  if (uShadow > 0.5) {
    vec2 dir = normalize(vec2(uLight.x, -uLight.z)) / uSize;
    float rise = uLight.y / length(uLight.xz);
    float h0 = h * uAmp * SHADE_X;
    for (int i = 1; i <= 16; i++) {
      float d = float(i) * float(i) * 0.05 + float(i) * 0.2;
      float occ = H(vUv + dir * d) * uAmp * SHADE_X - (h0 + d * rise);
      shade = min(shade, 1.0 - smoothstep(0.0, 0.25 + d * 0.03, occ));
    }
  }
  vec2 tb = texture2D(uHeight, vUv, 4.0).rg;
  float ao = clamp(1.0 + (h - (tb.r + tb.g / 256.0)) * 6.0, 0.55, 1.15) * (1.0 - forest * 0.15);
  vec3 moon = vec3(0.64, 0.73, 0.95) * 2.4;
  vec3 sky = vec3(0.03, 0.055, 0.07) * (0.55 + 0.45 * N.y) * 1.9;
  vec3 col = alb * (moon * lit * shade + sky + uGold * 0.06 * N.y) * ao;
  vec3 V = normalize(cameraPosition - vWorld);
  col += moon * pow(max(dot(N, normalize(uLight + V)), 0.0), 36.0) * 0.05 * snow * shade;
  // 河流与湖泊：深色的水面映出天光与月亮
  float water = smoothstep(0.15, 0.6, cover.r);
  vec3 Rw = reflect(-V, vec3(0.0, 1.0, 0.0));
  float fres = 0.04 + 0.96 * pow(1.0 - max(V.y, 0.0), 5.0);
  vec3 wcol = vec3(0.01, 0.02, 0.03) + mix(vec3(0.02, 0.04, 0.05), uHorizon * 1.6, fres);
  wcol += uMoon * pow(max(dot(Rw, normalize(vec3(uLight.x, 0.35, uLight.z))), 0.0), 60.0) * 0.6;
  wcol += uGold * vLift * 0.35;
  col = mix(col, wcol, water);
  // 云影
  float cloud = smoothstep(0.55, 0.8, fbm(w * 0.08 + uTime * vec2(0.012, 0.005)));
  col *= 1.0 - 0.3 * cloud;
  // 选中：其余大陆暗下去；这一块被暖金色的光照亮
  col *= 1.0 - 0.42 * uAnyHot * (1.0 - vLift);
  vec3 warmDir = normalize(vec3(-0.35, 0.75, 0.55));
  col += alb * vec3(1.0, 0.72, 0.38) * vLift * (0.75 * pow(max(dot(N, warmDir), 0.0), 1.6) + 0.06) * (1.0 - water);
  float coast = 1.0 - smoothstep(0.003, 0.03, h);
  col += uGold * vLift * coast * 0.5;
  // 河谷里的薄雾
  float mist = (1.0 - smoothstep(0.15, 0.9, vWorld.y - uBaseY)) * smoothstep(0.45, 0.75, fbm(w * 0.16 + uTime * vec2(0.02, 0.008))) * smoothstep(0.02, 0.1, h);
  col = mix(col, vec3(0.14, 0.18, 0.2), mist * (0.15 + 0.35 * valley) * (1.0 - vLift * 0.7));
  // 空气透视：随距离吞进夜色，越远越偏青
  float dist = distance(cameraPosition, vWorld);
  float haze = 1.0 - exp(-max(dist - 18.0, 0.0) * 0.012);
  col = mix(col, uHorizon * 0.62, clamp(haze, 0.0, 0.85));
  gl_FragColor = vec4(col, land * uInside * uReady);
}`,g=`
${p}
${t}
attribute float aSize;
attribute float aPhase;
uniform float uTime, uDpr, uBaseY, uBaseZ;
varying float vGlow;
void main(){
  vec2 uv = position.xz;
  float lift = liftAt(uv);
  vec3 p = vec3((uv.x - 0.5) * uSize, uBaseY + elevation(uv) + lift * 1.6 * liftShape(H(uv)) + 0.08, (0.5 - uv.y) * uSize + uBaseZ);
  vec4 mv = viewMatrix * vec4(curved(p), 1.0);
  float flick = 0.75 + 0.25 * sin(uTime * (1.3 + aPhase * 2.1) + aPhase * 37.0);
  vGlow = flick * (1.0 + lift * 1.6) * (1.0 - smoothstep(60.0, 170.0, -mv.z) * 0.7);
  gl_PointSize = aSize * uDpr * 110.0 / max(1.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`,_=`
uniform float uOn;
varying float vGlow;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.1, 0.0, d), halo = smoothstep(0.5, 0.0, d);
  vec3 c = vec3(1.0, 0.64, 0.28) * (core * 3.0 + halo * halo * 0.6) * vGlow;
  gl_FragColor = vec4(c * uOn, 1.0);
}`,v=`
${t}
varying vec3 vWorld;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * vec4(curved(w.xyz), 1.0); }`,y=`
${e}
uniform float uTime, uOn, uDrift, uDensity;
uniform vec2 uCenter;
uniform float uRadius;
varying vec3 vWorld;
float cfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += vnoise(vec3(p, uDrift)) * a; p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
void main(){
  vec2 p = vWorld.xz * 0.075 + uTime * vec2(0.012, 0.005) * (1.0 + uDrift * 0.2);
  float f = cfbm(p);
  float a = smoothstep(0.56, 0.82, f) * uDensity;
  float edge = 1.0 - smoothstep(uRadius * 0.7, uRadius, distance(vWorld.xz, uCenter));
  float near = smoothstep(6.0, 22.0, distance(cameraPosition, vWorld));
  a *= edge * near * uOn;
  if (a < 0.003) discard;
  vec3 c = mix(vec3(0.06, 0.08, 0.1), vec3(0.5, 0.56, 0.64), smoothstep(0.58, 0.9, f));
  gl_FragColor = vec4(c, a);
}`;export{g as _,l as a,d as c,a as d,i as f,_ as g,s as h,f as i,u as l,c as m,y as n,h as o,r as p,v as r,m as s,e as t,o as u};