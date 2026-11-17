import{B as e,D as t,L as n,M as r,S as i,T as a,_ as o,c as s,f as c,h as l,i as u,j as d,l as f,m as p,n as m,o as h,r as g,t as _,u as v,w as y,x as b,y as x}from"./OutputPass-CyoMI3E_.js";import{t as S}from"./UnrealBloomPass-BSW2z2bq.js";var C=class{constructor(n,i,a){this.variables=[],this.currentTextureIndex=0;let o=l,s={passThruTexture:{value:null}},c=f(g(),s),u=new h(c);this.setDataType=function(e){return o=e,this},this.addVariable=function(e,t,n){let r={name:e,initialValueTexture:n,material:this.createShaderMaterial(t),dependencies:null,renderTargets:[],wrapS:null,wrapT:null,minFilter:b,magFilter:b};return this.variables.push(r),r},this.setVariableDependencies=function(e,t){e.dependencies=t},this.init=function(){if(a.capabilities.maxVertexTextures===0)return`No support for vertex shader textures.`;for(let e=0;e<this.variables.length;e++){let t=this.variables[e];t.renderTargets[0]=this.createRenderTarget(n,i,t.wrapS,t.wrapT,t.minFilter,t.magFilter),t.renderTargets[1]=this.createRenderTarget(n,i,t.wrapS,t.wrapT,t.minFilter,t.magFilter),this.renderTexture(t.initialValueTexture,t.renderTargets[0]),this.renderTexture(t.initialValueTexture,t.renderTargets[1]);let r=t.material,a=r.uniforms;if(t.dependencies!==null)for(let e=0;e<t.dependencies.length;e++){let n=t.dependencies[e];if(n.name!==t.name){let e=!1;for(let t=0;t<this.variables.length;t++)if(n.name===this.variables[t].name){e=!0;break}if(!e)return`Variable dependency not found. Variable=`+t.name+`, dependency=`+n.name}a[n.name]={value:null},r.fragmentShader=`
uniform sampler2D `+n.name+`;
`+r.fragmentShader}}return this.currentTextureIndex=0,null},this.compute=function(){let e=this.currentTextureIndex,t=+(this.currentTextureIndex===0);for(let n=0,r=this.variables.length;n<r;n++){let r=this.variables[n];if(r.dependencies!==null){let t=r.material.uniforms;for(let n=0,i=r.dependencies.length;n<i;n++){let i=r.dependencies[n];t[i.name].value=i.renderTargets[e].texture}}this.doRenderTarget(r.material,r.renderTargets[t])}this.currentTextureIndex=t},this.getCurrentRenderTarget=function(e){return e.renderTargets[this.currentTextureIndex]},this.getAlternateRenderTarget=function(e){return e.renderTargets[+(this.currentTextureIndex===0)]},this.dispose=function(){u.dispose();let e=this.variables;for(let t=0;t<e.length;t++){let n=e[t];n.initialValueTexture&&n.initialValueTexture.dispose();let r=n.renderTargets;for(let e=0;e<r.length;e++)r[e].dispose();n.material.dispose()}};function d(e){e.defines.resolution=`vec2( `+n.toFixed(1)+`, `+i.toFixed(1)+` )`}this.addResolutionDefine=d;function f(e,t){t=t||{};let n=new r({name:`GPUComputationShader`,uniforms:t,vertexShader:m(),fragmentShader:e});return d(n),n}this.createShaderMaterial=f,this.createRenderTarget=function(r,a,s,c,l,u){return r=r||n,a=a||i,s=s||1001,c=c||1001,l=l||1003,u=u||1003,new e(r,a,{wrapS:s,wrapT:c,minFilter:l,magFilter:u,format:t,type:o,depthBuffer:!1})},this.createTexture=function(){let e=new Float32Array(n*i*4),r=new p(e,n,i,t,l);return r.needsUpdate=!0,r},this.renderTexture=function(e,t){s.passThruTexture.value=e,this.doRenderTarget(c,t),s.passThruTexture.value=null},this.doRenderTarget=function(e,t){let n=a.getRenderTarget(),r=a.xr.enabled,i=a.shadowMap.autoUpdate;a.xr.enabled=!1,a.shadowMap.autoUpdate=!1,u.material=e,a.setRenderTarget(t),u.render(a),u.material=c,a.xr.enabled=r,a.shadowMap.autoUpdate=i,a.setRenderTarget(n)};function m(){return`void main()	{

	gl_Position = vec4( position, 1.0 );

}
`}function g(){return`uniform sampler2D passThruTexture;

void main() {

	vec2 uv = gl_FragCoord.xy / resolution.xy;

	gl_FragColor = texture2D( passThruTexture, uv );

}
`}}},w=`
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
`,T=`
${w}

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
}`,E=`
uniform float uDt;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 P = texture2D(texturePosition, uv);
  vec3 v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(P.xyz + v * uDt, 0.0);
}`,ee=`
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
}`,te=`
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
}`,D={uniforms:{tDiffuse:{value:null},uAspect:{value:1},uTime:{value:0},uImpact:{value:[.5,.5]},uFlash:{value:0},uShock:{value:-1},uShockAmp:{value:0},uFrost:{value:0},uFrostOut:{value:0},uFrostCol:{value:[.78,.9,1]},uFlashCol:{value:[1,.72,.38]}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
${w}
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
}`},O=`varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,k=`
${w}
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
}`,A=8,j=5.2,M=3.15,N=e=>new c(e),P={0:3.1,1:3.3,2:2.9,3:1.7};function F(e){return e.capabilities.maxVertexTextures===0?null:e.extensions.has(`EXT_color_buffer_float`)?l:e.extensions.has(`EXT_color_buffer_half_float`)?o:null}function I(e,t,o){let s=t,c=s===`full`?256:128,l=new d,p=new i(-4,A/2,j/2,-5.2/2,-10,10),h=new C(c,c,e);h.setDataType(o);let b=h.createTexture(),w=h.createTexture(),F=b.image.data,I=1077,L=()=>(I=I*16807%2147483647,I/2147483647);for(let e=0;e<c*c;e++){let t=L()*Math.PI*2,n=Math.sqrt(L());F[e*4]=Math.cos(t)*n*3.2,F[e*4+1]=.15+Math.sin(t)*n*2,F[e*4+2]=(L()-.5)*.6,F[e*4+3]=0}let R=h.addVariable(`textureVelocity`,T,w),z=h.addVariable(`texturePosition`,E,b);h.setVariableDependencies(R,[R,z]),h.setVariableDependencies(z,[R,z]);let B=R.material.uniforms,ne=z.material.uniforms;Object.assign(B,{uTime:{value:0},uDt:{value:0},uGather:{value:0},uShape:{value:0},uStable:{value:0},uElement:{value:0},uFx:{value:-1},uFxT:{value:0},uBurst:{value:0},uWardGrow:{value:0},uImpact:{value:new n}}),Object.assign(ne,{uDt:B.uDt});let V=h.init();if(V)throw Error(V);let H={uDeep:{value:N(`#0d2526`)},uField:{value:N(`#3d5f55`)},uLine:{value:N(`#c6bd8d`)},uNode:{value:N(`#25413b`)},uNodeOn:{value:N(`#e3d5a1`)},uPhase:{value:0},uArc:{value:0},uRadius:{value:M},uPx:{value:.01}},U=new x(new y(24,j*3),new r({uniforms:H,vertexShader:O,fragmentShader:k}));U.position.z=-2,l.add(U);let W=new Float32Array(c*c*2);for(let e=0;e<c;e++)for(let t=0;t<c;t++){let n=e*c+t;W[n*2]=(t+.5)/c,W[n*2+1]=(e+.5)/c}let G=new v;G.setAttribute(`position`,new f(new Float32Array(c*c*3),3)),G.setAttribute(`aRef`,new f(W,2));let K={uPositions:{value:null},uVelocities:{value:null},uSize:{value:s===`full`?2.2:3},uDpr:{value:1},uDensity:{value:s===`full`?.3:.55},uShape:B.uShape,uElement:B.uElement,uGather:B.uGather,uStable:B.uStable,uColGather:{value:N(`#fff2c2`)},uColFire:{value:N(`#ff9a3c`)},uColFireHot:{value:N(`#ffe9b0`)},uColFrost:{value:N(`#cfe9ff`)},uColWard:{value:N(`#e3c87a`)},uColEmber:{value:N(`#8a2a10`)},uFade:{value:1},uFx:B.uFx,uFxT:B.uFxT,uWardGrow:B.uWardGrow,uBand:{value:-2}},re=new a(G,new r({uniforms:K,vertexShader:ee,fragmentShader:te,blending:2,depthWrite:!1,depthTest:!1,transparent:!0}));re.frustumCulled=!1,l.add(re);let q=new g(e);q.addPass(new m(l,p));let ie=new S(new n(256,256),.55,.45,.72);q.addPass(ie);let J=new u(D);q.addPass(J),q.addPass(new _);let ae=()=>{ie.enabled=s===`full`};ae();let Y={gather:0,shape:0,stable:0,element:0,phase:0},X={gather:0,shape:0,stable:0,phase:0},Z={kind:-1,t:0,impact:new n,burstAt:0,burstDone:!1,respawned:!1},oe=()=>{for(let e of z.renderTargets)h.renderTexture(b,e);for(let e of R.renderTargets)h.renderTexture(w,e);X.gather=X.shape=X.stable=0},se=(e,t)=>{Z.kind=e,Z.t=0,Z.burstDone=!1,Z.respawned=!1,Z.burstAt=e===0?.32:0,t&&Z.impact.set(0,.15).addScaledVector(t,2.3),K.uFade.value=1},ce=e=>[(e.x-p.left)/(p.right-p.left),(e.y-p.bottom)/(p.top-p.bottom)],le=!0,Q=A,$=j;return{weights:Y,toTable(e,t,r){return new n(((e-r.left)/r.width-.5)*Q,-((t-r.top)/r.height-.5)*$)},resize(e,t,n){let r=e/t;Q=Math.max(A,j*r),$=Q/r,$<j&&($=j,Q=j*r),p.left=-Q/2,p.right=Q/2,p.top=$/2,p.bottom=-$/2,p.updateProjectionMatrix(),q.setPixelRatio(n),q.setSize(e,t),ie.resolution.set(e*n*.5,t*n*.5),J.uniforms.uAspect.value=r,K.uDpr.value=n,H.uPx.value=$/(t*n)*1.2},frame(t,n){e.setClearColor(861478,1);let r=(e,n)=>{X[e]=le?Y[e]:X[e]+(Y[e]-X[e])*(1-Math.exp(-t*n))};Z.kind<0&&(r(`gather`,3),r(`shape`,2.4),r(`stable`,3)),r(`phase`,5),le=!1,B.uTime.value=n,B.uDt.value=Math.min(t,1/30),B.uGather.value=X.gather,B.uShape.value=X.shape,B.uStable.value=X.stable,B.uElement.value=Y.element,H.uPhase.value=X.phase,H.uArc.value=0;let i=0,a=-1,o=0,s=0,c=0,l=0,u=-2,d=0;if(B.uBurst.value=0,Z.kind>=0){Z.t+=Math.min(t,.1);let e=Z.t,n=Z.kind,r=P[n];!Z.burstDone&&e>=Z.burstAt&&(B.uBurst.value=1,Z.burstDone=!0);let f=r-1.2,p=r-.8;if(n===0){let t=e-.32;t>=0&&(i=Math.exp(-t*7)*1.4,a=t*1.1,o=Math.exp(-t*2.6),l=Math.exp(-t*9)*.09)}else n===1?(s=1-(1-Math.min(1,Math.max(0,(e-.1)/1.1)))**2,c=Math.max(0,(e-1.7)/.8),i=Math.exp(-e*6)*.25):n===2&&(d=1-(1-Math.min(1,e/.9))**3,u=-1.3+Math.max(0,e-.35)*2.6);B.uWardGrow.value=d,K.uBand.value=u,e<p?K.uFade.value=1-Math.max(0,(e-f)/(p-f)):(Z.respawned||(oe(),Z.respawned=!0,B.uFx.value=-1),K.uFade.value=Math.min(1,(e-p)/.8)),Z.respawned||(B.uFx.value=n,B.uFxT.value=e,B.uImpact.value.copy(Z.impact)),e>=r&&(Z.kind=-1,K.uFade.value=1)}let f=ce(Z.impact);J.uniforms.uImpact.value=f,J.uniforms.uFlash.value=i,J.uniforms.uShock.value=a,J.uniforms.uShockAmp.value=o,J.uniforms.uFrost.value=s,J.uniforms.uFrostOut.value=c,J.uniforms.uTime.value=n,p.position.set((Math.random()-.5)*l,(Math.random()-.5)*l,0),h.compute(),K.uPositions.value=h.getCurrentRenderTarget(z).texture,K.uVelocities.value=h.getCurrentRenderTarget(R).texture,q.render(t)},release(e,t){se(e,t)},collapse(){se(3)},setTier(e){return s=e,s!==`static`&&(ae(),!0)},dispose(){h.dispose(),q.dispose(),G.dispose(),re.material.dispose(),U.geometry.dispose(),U.material.dispose()}}}var L=[{id:0,name:`火焰`},{id:1,name:`冰霜`},{id:2,name:`防御`}],R=`咒文稳定并进一步雕琢已经成形的魔力，使其更接近施法者的意图。`,z=1.1,B=1.3,ne=2.6,V=new n(.94,.34).normalize();function H(e,t){let r=t.querySelector(`.casting-stage`);if(!r)return;let i=s();if(i.tier===`static`)return;let a=F(i.renderer);if(!a)return;let o=[...t.querySelectorAll(`[data-step]`)];r.dataset.gl=`loading`;let c=document.createElement(`div`);c.className=`casting-gl`,c.setAttribute(`aria-hidden`,`true`),r.prepend(c);let l=document.createElement(`div`);l.className=`casting-ui`,l.innerHTML=`<p class="casting-spell" aria-hidden="true">${[...R].map(e=>`<span>${e}</span>`).join(``)}</p>
<div class="casting-nodes" aria-hidden="true">${[`起势`,`塑形`,`稳定`,`导出`].map(e=>`<span>${e}</span>`).join(``)}</div>
<div class="casting-bar"><div class="casting-elements" role="group" aria-label="选择要塑成的结构">${L.map(e=>`<button type="button" data-element="${e.id}" aria-pressed="${e.id===0}">${e.name}</button>`).join(``)}</div>
<button type="button" class="casting-hold" aria-describedby="casting-help">按住施法</button>
<p id="casting-help" class="casting-help">按住台面或按钮：起势、塑形、稳定；稳定后松手导出，方向朝向指针。提前松手，结构散去。</p>
<p class="casting-status" role="status" aria-live="polite"></p></div>`,r.append(l);let u=l.querySelector(`.casting-hold`),d=l.querySelector(`.casting-status`),f=[...l.querySelectorAll(`.casting-spell span`)],p=[...l.querySelectorAll(`.casting-nodes span`)],m;try{m=I(i.renderer,i.tier,a)}catch(e){console.warn(`施法台未能启动，保留原图解。`,e),c.remove(),l.remove(),r.dataset.gl=`off`;return}let h=m.weights,{signal:g}=e,_=`idle`,v=0,y=0,b=0,x=0,S=!1,C=-1,w=V.clone(),T=e=>{C!==e&&(C=e,S=!0,o[e]?.click(),S=!1)},E=e=>{let t=Math.round(e*f.length);f.forEach((e,n)=>e.classList.toggle(`on`,n<t))},ee=()=>{_=`idle`,v=0,Object.assign(h,{gather:0,shape:0,stable:0}),E(0),u.textContent=`按住施法`,u.classList.remove(`is-ready`)},te=e=>{b=0;let t=x?Math.min(.5,(e-x)/1e3):0;if(x=e,_===`casting`){v+=t,h.gather=1;let e=Math.min(1,v/z),n=Math.min(1,Math.max(0,(v-z)/B)),r=Math.min(1,Math.max(0,(v-z-B)/ne));h.shape=n,h.stable=r,h.phase=r>0?2+r*.99:n>0?1+n:e,E(r),T(r>0?2:+(n>0)),r>=1&&!u.classList.contains(`is-ready`)&&(u.classList.add(`is-ready`),u.textContent=`松手导出 ↗`,d.textContent=`结构已稳定，松手导出。`)}else(_===`release`||_===`collapse`)&&(y-=t,y<=0&&(ee(),h.phase=0,d.textContent=``));_!==`idle`&&_!==`showcase`&&(b=requestAnimationFrame(te))},D=()=>{b||(x=0,b=requestAnimationFrame(te))},O=()=>{_!==`casting`&&_!==`release`&&(_=`casting`,v=0,C=-1,d.textContent=``,u.textContent=`继续按住…`,D())},k=()=>{_===`casting`&&(h.stable>=.99?(_=`release`,y=P[h.element],m.release(h.element,w),Object.assign(h,{gather:0,shape:0,stable:0,phase:3.99}),E(0),T(3),d.textContent=`${L[h.element].name}已导出。`):(_=`collapse`,y=P[3],m.collapse(),Object.assign(h,{gather:0,shape:0,stable:0,phase:0}),E(0),T(0),d.textContent=`结构未稳，力量散去。`),u.textContent=`按住施法`,u.classList.remove(`is-ready`),D())},A=()=>c.getBoundingClientRect(),j=e=>{let t=m.toTable(e.clientX,e.clientY,A()).sub(new n(0,.15));t.length()>.45&&w.copy(t.normalize())};r.addEventListener(`pointerdown`,e=>{r.dataset.gl!==`on`||e.button!==0||e.target.closest(`button, a`)||(j(e),r.setPointerCapture(e.pointerId),O())},{signal:g}),r.addEventListener(`pointermove`,e=>{_===`casting`&&j(e)},{signal:g}),r.addEventListener(`pointerup`,e=>{r.hasPointerCapture(e.pointerId)&&r.releasePointerCapture(e.pointerId),k()},{signal:g}),r.addEventListener(`pointercancel`,()=>k(),{signal:g}),u.addEventListener(`pointerdown`,e=>{e.button===0&&(w.copy(V),u.setPointerCapture(e.pointerId),O())},{signal:g}),u.addEventListener(`pointerup`,()=>k(),{signal:g}),u.addEventListener(`pointercancel`,()=>k(),{signal:g}),u.addEventListener(`keydown`,e=>{e.key!==` `&&e.key!==`Enter`||e.repeat||(e.preventDefault(),w.copy(V),O())},{signal:g}),u.addEventListener(`keyup`,e=>{(e.key===` `||e.key===`Enter`)&&(e.preventDefault(),k())},{signal:g}),u.addEventListener(`blur`,()=>k(),{signal:g}),u.addEventListener(`click`,e=>e.preventDefault(),{signal:g}),l.querySelectorAll(`[data-element]`).forEach(e=>e.addEventListener(`click`,()=>{h.element=Number(e.dataset.element),l.querySelectorAll(`[data-element]`).forEach(t=>t.setAttribute(`aria-pressed`,String(t===e)))},{signal:g}));let M=new MutationObserver(()=>{if(S||_===`casting`)return;let e=o.findIndex(e=>e.getAttribute(`aria-pressed`)===`true`);e<0||e===C||(C=e,e===3?(Object.assign(h,{gather:0,shape:0,stable:0,phase:3.99}),_=`release`,y=P[h.element],m.release(h.element,V),E(0),D()):_!==`release`&&_!==`collapse`&&(_=`showcase`,Object.assign(h,{gather:1,shape:+(e>=1),stable:+(e>=2),phase:e+.99}),E(+(e>=2))))});o.forEach(e=>M.observe(e,{attributes:!0,attributeFilter:[`aria-pressed`]}));let N=()=>{let e=A(),t=m.toTable(e.right,e.top,e);p.forEach((e,n)=>{e.style.left=`${50+(-2.4+1.6*n)/(t.x*2)*100}%`,e.style.top=`${50- -.47/(t.y*2)*100}%`})},H=new ResizeObserver(N);H.observe(r),i.mount(c,m,()=>{r.dataset.gl=`on`,N()}),e.onCleanup(()=>{cancelAnimationFrame(b),M.disconnect(),H.disconnect(),i.unmount(),c.remove(),l.remove()}),ee()}export{H as mountCastingRoom};