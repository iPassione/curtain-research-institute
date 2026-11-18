// 开放展室的深度视差（阶段 6）：一块全屏四边形，按深度图把插画的像素前后错开，指针移动时像侧身去看。
// 深度图由 scripts/derive-depth.py 生成（越近越亮）。城市切片另外在相邻两个时段之间沿斜向光带过渡、入夜点亮窗灯，
// 规则与 DOM 版（src/features/street-time.ts）相同，只是这里每一层都带视差。
// 贴图按原始数值读写（不做色彩空间转换），画面与原图一致。
import { Mesh, NoColorSpace, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, Vector2 } from 'three';
import type { WebGLRenderer } from 'three';
import type { GLScene } from '../stage';
import type { Tier } from '../tier';

const vertex = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const fragment = /* glsl */ `
uniform sampler2D uL0, uL1, uL2, uDepth, uLights;
uniform float uCount, uV, uLightsOn, uTime, uStrength, uZoom;
uniform vec2 uOffset, uSize;
varying vec2 vUv;

// 视差：从当前像素出发，按此处深度反推「本来该看到的那一点」，迭代三次收敛（比一步更少撕裂）
vec2 parallax(vec2 uv){
  vec2 c = (uv - 0.5) / uZoom + 0.5;          // 略微放大，视差移动时边缘不露底
  vec2 p = c;
  for (int i = 0; i < 3; i++) {
    float d = texture2D(uDepth, p).r;
    p = c - uOffset * (d - 0.45) * uStrength;
  }
  return clamp(p, 0.001, 0.999);
}

// 与 CSS linear-gradient(100deg, …) 相同的光带：后一时段从左向右铺过来
float sweep(float f){
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;   // CSS 像素，y 向下
  vec2 dir = vec2(0.9848, 0.1736);             // 100° 的方向
  float len = abs(uSize.x * dir.x) + abs(uSize.y * dir.y);
  float t = dot(px - uSize * 0.5, dir) / len + 0.5;
  float p = -0.3 + 1.6 * f;
  return 1.0 - smoothstep(p - 0.3, p + 0.3, t);
}

void main(){
  vec2 uv = parallax(vUv);
  vec2 tuv = uv;                               // 载入时贴图已按 y 向上翻转，与 vUv 同向
  vec3 col;
  if (uCount < 1.5) {
    col = texture2D(uL0, tuv).rgb;
  } else {
    float i = min(1.0, floor(uV)), f = uV - i;
    vec3 lo = i < 0.5 ? texture2D(uL0, tuv).rgb : texture2D(uL1, tuv).rgb;
    vec3 hi = i < 0.5 ? texture2D(uL1, tuv).rgb : texture2D(uL2, tuv).rgb;
    col = mix(lo, hi, f > 0.0 ? sweep(f) : 0.0);
  }
  if (uLightsOn > 0.0) {
    // 窗灯：入夜图乘灯光遮罩；光晕取遮罩与入夜图的低一级细节（模糊），屏幕混合，带一点摇曳
    vec3 ev = texture2D(uL2, tuv).rgb;
    float m = texture2D(uLights, tuv).a;
    float mb = texture2D(uLights, tuv, 3.5).a;
    vec3 evb = texture2D(uL2, tuv, 3.5).rgb;
    float flick = 0.86 + 0.08 * sin(uTime * 1.7) + 0.06 * sin(uTime * 4.3 + 1.3);
    vec3 glow = ev * m * 0.3 + evb * mb * 1.25 * flick * vec3(1.05, 0.95, 0.8);
    glow *= uLightsOn;
    col = 1.0 - (1.0 - col) * (1.0 - clamp(glow, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export interface DepthImageOptions {
  layers: Texture[];          // 1 张（展品）或 3 张（清晨、午后、入夜）
  depth: Texture;
  lights?: Texture;           // 城市切片的灯光遮罩（透明度通道）
  strength: number;           // 视差幅度（贴图坐标）
}

export interface DepthImageScene extends GLScene {
  /** offset：指针相对画面中心的位置（-1–1）；v：时段（0–2，只对 3 层有效）；lights：窗灯亮度 0–1。 */
  set(state: { offset?: [number, number]; v?: number; lights?: number }): void;
}

export function createDepthImageScene(renderer: WebGLRenderer, startTier: Tier, o: DepthImageOptions): DepthImageScene {
  let tier = startTier;
  for (const t of [...o.layers, o.depth, o.lights].filter(Boolean) as Texture[]) { t.colorSpace = NoColorSpace; t.needsUpdate = true; }
  const blank = o.layers[0];
  const uniforms = {
    uL0: { value: o.layers[0] }, uL1: { value: o.layers[1] || blank }, uL2: { value: o.layers[2] || blank },
    uDepth: { value: o.depth }, uLights: { value: o.lights || blank },
    uCount: { value: o.layers.length }, uV: { value: 0 }, uLightsOn: { value: 0 }, uTime: { value: 0 },
    uStrength: { value: o.strength }, uZoom: { value: 1 + o.strength * 0.9 },
    uOffset: { value: new Vector2() }, uSize: { value: new Vector2(1, 1) },
  };
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  scene.add(quad);
  const want = new Vector2();
  let wantLights = 0;

  return {
    set(s) {
      if (s.offset) want.set(s.offset[0], s.offset[1]);
      if (s.v != null) uniforms.uV.value = s.v;
      if (s.lights != null) wantLights = s.lights;
    },
    resize(w, h) { uniforms.uSize.value.set(w, h); },
    frame(dt, time) {
      // 指针跟随带一点惯性；再叠一层极慢的漂移，静止时画面也有呼吸
      const k = 1 - Math.exp(-dt * 4);
      const drift = new Vector2(Math.sin(time * 0.31) * 0.18, Math.cos(time * 0.23) * 0.14);
      uniforms.uOffset.value.lerp(want.clone().add(drift), k);
      uniforms.uLightsOn.value = wantLights;
      uniforms.uTime.value = time;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    setTier(next) { tier = next; return tier !== 'static'; },
    dispose() {
      quad.geometry.dispose(); (quad.material as ShaderMaterial).dispose();
      for (const t of [...o.layers, o.depth, o.lights]) t?.dispose();
    },
  };
}
