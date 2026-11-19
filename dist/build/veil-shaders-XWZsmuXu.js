var e=`
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`,t=`
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
`,n=`
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`,r=`
${t}
varying vec3 vDir;
void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`,i=`
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
}`,a=`
${t}
${e}
uniform vec3 uDeep, uGlint, uShallow;
uniform float uTime, uLandSize, uLandZ, uLandOn;
uniform sampler2D uTerrain;
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
      if (texture2D(uTerrain, tuv).r > 0.03) discard; // 陆地底下的海面不画，低地上不会冒出浪尖
      float wide = texture2D(uTerrain, tuv, 5.0).r, nearC = texture2D(uTerrain, tuv, 2.0).r;
      float shallow = smoothstep(0.0, 0.09, wide);
      col = mix(col, uShallow * (0.55 + 0.45 * fres) + col * 0.4, shallow * 0.55 * uLandOn);
      float surf = smoothstep(0.004, 0.02, nearC) * (1.0 - smoothstep(0.02, 0.05, nearC));
      float wob = 0.6 + 0.4 * sin(uTime * 1.4 + (vWorld.x + vWorld.z) * 0.9 + vnoise(vec3(vWorld.xz * 0.5, uTime * 0.3)) * 5.0);
      col += uMoon * surf * wob * 0.09 * uLandOn;
    }
  }
  col = mix(col, uHorizon * 0.9, smoothstep(140.0, 900.0, dist));
  gl_FragColor = vec4(col, 1.0);
}`,o=`
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
}`,s=`
varying vec3 vTint;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a + smoothstep(0.12, 0.0, d);
  gl_FragColor = vec4(vTint * a * vAlpha, 1.0);
}`,c=`
uniform vec3 uColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (a * a * 0.8 + smoothstep(0.08, 0.0, d) * 2.5), 1.0);
}`,l=`
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
}`,u=`
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
}`,d={uniforms:{tDiffuse:{value:null},uTime:{value:0},uGrain:{value:.035},uVignette:{value:.35},uCross:{value:0},uVeil:{value:[.95,.89,.71]}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
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
}`},f=`
uniform sampler2D uHeight;
uniform float uAmp;
varying vec2 vUv;
varying vec3 vWorld;
void main(){
  vUv = uv;
  vec3 p = position;
  p.y += texture2D(uHeight, uv).r * uAmp;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,p=`
uniform sampler2D uMap, uHeight;
uniform vec2 uTexel;
uniform float uAmp, uSize, uInside, uReady, uShadow;
uniform vec3 uLight, uMoon, uGold, uHorizon;
varying vec2 vUv;
varying vec3 vWorld;
float H(vec2 uv){ return texture2D(uHeight, uv).r; }
void main(){
  float h = H(vUv);
  float land = smoothstep(0.004, 0.03, h);
  if (land < 0.01 || uInside < 0.001) discard;
  // 法线：两倍纹素的中心差分，山体更圆润，不出现像素台阶
  vec2 e = uTexel * 2.0;
  float hx = H(vUv + vec2(e.x, 0.0)) - H(vUv - vec2(e.x, 0.0));
  float hz = H(vUv + vec2(0.0, e.y)) - H(vUv - vec2(0.0, e.y));
  float k = uAmp / uSize;
  vec3 N = normalize(vec3(-hx * k / (2.0 * e.x), 1.0, hz * k / (2.0 * e.y)));
  vec3 tex = texture2D(uMap, vUv).rgb;
  float lit = max(dot(N, uLight), 0.0);
  // 山体投影：沿光线方向在高度图上步进，被更高的山挡住则落进阴影（软化成半影）
  float shade = 1.0;
  if (uShadow > 0.5) {
    vec2 dir = normalize(vec2(uLight.x, -uLight.z)) / uSize; // 世界 xz → 纹理 uv（纹理 v 朝北）
    float rise = uLight.y / length(uLight.xz);
    float h0 = h * uAmp;
    for (int i = 1; i <= 18; i++) {
      float d = float(i) * float(i) * 0.06 + float(i) * 0.25; // 近密远疏
      float ray = h0 + d * rise;
      float occ = H(vUv + dir * d) * uAmp - ray;
      shade = min(shade, 1.0 - smoothstep(0.0, 0.6 + d * 0.05, occ));
    }
  }
  // 环境遮蔽：比周围低的凹处（河谷、山间）暗一些，山脊亮一些
  float around = texture2D(uHeight, vUv, 4.0).r;
  float ao = clamp(1.0 + (h - around) * 3.0, 0.55, 1.2);
  vec3 col = tex * (0.16 + 0.95 * lit * (0.25 + 0.75 * shade)) * vec3(0.84, 0.9, 1.0) * ao;
  col += tex * uGold * (0.08 + 0.12 * N.y * h); // 帷幕的金光，高处多一点
  // 海岸：一圈月白的浪花
  float shore = smoothstep(0.004, 0.012, h) * (1.0 - smoothstep(0.012, 0.045, h));
  col += uMoon * shore * 0.16;
  float dist = distance(cameraPosition, vWorld);
  col = mix(col, uHorizon * 0.7, smoothstep(70.0, 190.0, dist) * 0.75);
  gl_FragColor = vec4(col, land * uInside * uReady);
}`;export{f as a,a as c,n as d,s as f,p as i,i as l,d as n,u as o,o as p,c as r,l as s,e as t,r as u};