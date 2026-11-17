import{A as e,D as t,I as n,S as r,T as i,_ as a,c as o,f as s,h as c,j as l,l as u,m as d,n as f,o as p,r as m,t as h,u as g,w as _,x as v,y,z as b}from"./OutputPass-DIvUokWw.js";import{t as x}from"./UnrealBloomPass-BUfpx3rC.js";var S=class{constructor(e,n,r){this.variables=[],this.currentTextureIndex=0;let i=c,a={passThruTexture:{value:null}},o=f(h(),a),s=new p(o);this.setDataType=function(e){return i=e,this},this.addVariable=function(e,t,n){let r={name:e,initialValueTexture:n,material:this.createShaderMaterial(t),dependencies:null,renderTargets:[],wrapS:null,wrapT:null,minFilter:v,magFilter:v};return this.variables.push(r),r},this.setVariableDependencies=function(e,t){e.dependencies=t},this.init=function(){if(r.capabilities.maxVertexTextures===0)return`No support for vertex shader textures.`;for(let t=0;t<this.variables.length;t++){let r=this.variables[t];r.renderTargets[0]=this.createRenderTarget(e,n,r.wrapS,r.wrapT,r.minFilter,r.magFilter),r.renderTargets[1]=this.createRenderTarget(e,n,r.wrapS,r.wrapT,r.minFilter,r.magFilter),this.renderTexture(r.initialValueTexture,r.renderTargets[0]),this.renderTexture(r.initialValueTexture,r.renderTargets[1]);let i=r.material,a=i.uniforms;if(r.dependencies!==null)for(let e=0;e<r.dependencies.length;e++){let t=r.dependencies[e];if(t.name!==r.name){let e=!1;for(let n=0;n<this.variables.length;n++)if(t.name===this.variables[n].name){e=!0;break}if(!e)return`Variable dependency not found. Variable=`+r.name+`, dependency=`+t.name}a[t.name]={value:null},i.fragmentShader=`
uniform sampler2D `+t.name+`;
`+i.fragmentShader}}return this.currentTextureIndex=0,null},this.compute=function(){let e=this.currentTextureIndex,t=+(this.currentTextureIndex===0);for(let n=0,r=this.variables.length;n<r;n++){let r=this.variables[n];if(r.dependencies!==null){let t=r.material.uniforms;for(let n=0,i=r.dependencies.length;n<i;n++){let i=r.dependencies[n];t[i.name].value=i.renderTargets[e].texture}}this.doRenderTarget(r.material,r.renderTargets[t])}this.currentTextureIndex=t},this.getCurrentRenderTarget=function(e){return e.renderTargets[this.currentTextureIndex]},this.getAlternateRenderTarget=function(e){return e.renderTargets[+(this.currentTextureIndex===0)]},this.dispose=function(){s.dispose();let e=this.variables;for(let t=0;t<e.length;t++){let n=e[t];n.initialValueTexture&&n.initialValueTexture.dispose();let r=n.renderTargets;for(let e=0;e<r.length;e++)r[e].dispose();n.material.dispose()}};function u(t){t.defines.resolution=`vec2( `+e.toFixed(1)+`, `+n.toFixed(1)+` )`}this.addResolutionDefine=u;function f(e,t){t=t||{};let n=new l({name:`GPUComputationShader`,uniforms:t,vertexShader:m(),fragmentShader:e});return u(n),n}this.createShaderMaterial=f,this.createRenderTarget=function(r,a,o,s,c,l){return r=r||e,a=a||n,o=o||1001,s=s||1001,c=c||1003,l=l||1003,new b(r,a,{wrapS:o,wrapT:s,minFilter:c,magFilter:l,format:t,type:i,depthBuffer:!1})},this.createTexture=function(){let r=new Float32Array(e*n*4),i=new d(r,e,n,t,c);return i.needsUpdate=!0,i},this.renderTexture=function(e,t){a.passThruTexture.value=e,this.doRenderTarget(o,t),a.passThruTexture.value=null},this.doRenderTarget=function(e,t){let n=r.getRenderTarget(),i=r.xr.enabled,a=r.shadowMap.autoUpdate;r.xr.enabled=!1,r.shadowMap.autoUpdate=!1,s.material=e,r.setRenderTarget(t),s.render(r),s.material=o,r.xr.enabled=i,r.shadowMap.autoUpdate=a,r.setRenderTarget(n)};function m(){return`void main()	{

	gl_Position = vec4( position, 1.0 );

}
`}function h(){return`uniform sampler2D passThruTexture;

void main() {

	vec2 uv = gl_FragCoord.xy / resolution.xy;

	gl_FragColor = texture2D( passThruTexture, uv );

}
`}}},C=`
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
`,w=`
${C}

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
}`,T=`
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
}`,E=`
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
}`,D=`
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
}`,O=`varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,k=`
${C}
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
}`,A=8,j=5.2,M=3.15,N=e=>new s(e);function P(e){return e.capabilities.maxVertexTextures===0?null:e.extensions.has(`EXT_color_buffer_float`)?c:e.extensions.has(`EXT_color_buffer_half_float`)?a:null}function F(t,a,o){let s=a,c=s===`full`?256:128,d=new e,p=new r(-4,A/2,j/2,-5.2/2,-10,10),v=new S(c,c,t);v.setDataType(o);let b=v.createTexture(),C=v.createTexture(),P=b.image.data,F=1077,I=()=>(F=F*16807%2147483647,F/2147483647);for(let e=0;e<c*c;e++){let t=I()*Math.PI*2,n=Math.sqrt(I());P[e*4]=Math.cos(t)*n*3.2,P[e*4+1]=.15+Math.sin(t)*n*2,P[e*4+2]=(I()-.5)*.6,P[e*4+3]=0}let L=v.addVariable(`textureVelocity`,w,C),R=v.addVariable(`texturePosition`,T,b);v.setVariableDependencies(L,[L,R]),v.setVariableDependencies(R,[L,R]);let z=L.material.uniforms,ee=R.material.uniforms;Object.assign(z,{uTime:{value:0},uDt:{value:0},uGather:{value:0},uShape:{value:0},uStable:{value:0},uRelease:{value:0},uCollapse:{value:0},uElement:{value:0},uRadius:{value:M},uDir:{value:new n(1,.3).normalize()}}),Object.assign(ee,{uDt:z.uDt,uRelease:z.uRelease,uRadius:z.uRadius});let B=v.init();if(B)throw Error(B);let V={uDeep:{value:N(`#0d2526`)},uField:{value:N(`#3d5f55`)},uLine:{value:N(`#c6bd8d`)},uNode:{value:N(`#25413b`)},uNodeOn:{value:N(`#e3d5a1`)},uPhase:{value:0},uArc:{value:0},uRadius:{value:M},uPx:{value:.01}},H=new y(new _(24,j*3),new l({uniforms:V,vertexShader:O,fragmentShader:k}));H.position.z=-2,d.add(H);let U=new Float32Array(c*c*2);for(let e=0;e<c;e++)for(let t=0;t<c;t++){let n=e*c+t;U[n*2]=(t+.5)/c,U[n*2+1]=(e+.5)/c}let W=new g;W.setAttribute(`position`,new u(new Float32Array(c*c*3),3)),W.setAttribute(`aRef`,new u(U,2));let G={uPositions:{value:null},uVelocities:{value:null},uSize:{value:s===`full`?2.2:3},uDpr:{value:1},uDensity:{value:s===`full`?.3:.55},uShape:z.uShape,uElement:z.uElement,uGather:z.uGather,uStable:z.uStable,uColGather:{value:N(`#fff2c2`)},uColFire:{value:N(`#ff9a3c`)},uColFireHot:{value:N(`#ffe9b0`)},uColFrost:{value:N(`#cfe9ff`)},uColWard:{value:N(`#e3c87a`)}},K=new i(W,new l({uniforms:G,vertexShader:E,fragmentShader:D,blending:2,depthWrite:!1,depthTest:!1,transparent:!0}));K.frustumCulled=!1,d.add(K);let q=new m(t);q.addPass(new f(d,p));let J=new x(new n(256,256),.55,.45,.72);q.addPass(J),q.addPass(new h);let Y=()=>{J.enabled=s===`full`};Y();let X={gather:0,shape:0,stable:0,release:0,collapse:0,element:0,dir:new n(1,.35).normalize(),phase:0,arc:0},Z={gather:0,shape:0,stable:0,release:0,collapse:0,phase:0,arc:0},te=!0,Q=A,$=j;return{weights:X,toTable(e,t,r){return new n(((e-r.left)/r.width-.5)*Q,-((t-r.top)/r.height-.5)*$)},resize(e,t,n){let r=e/t;Q=Math.max(A,j*r),$=Q/r,$<j&&($=j,Q=j*r),p.left=-Q/2,p.right=Q/2,p.top=$/2,p.bottom=-$/2,p.updateProjectionMatrix(),q.setPixelRatio(n),q.setSize(e,t),J.resolution.set(e*n*.5,t*n*.5),G.uDpr.value=n,V.uPx.value=$/(t*n)*1.2},frame(e,n){t.setClearColor(861478,1);let r=(t,n)=>{Z[t]=te?X[t]:Z[t]+(X[t]-Z[t])*(1-Math.exp(-e*n))};r(`gather`,X.collapse>.5?14:3),r(`shape`,2.4),r(`stable`,3),r(`release`,9),r(`collapse`,10),r(`phase`,5),r(`arc`,4),te=!1,z.uTime.value=n,z.uDt.value=Math.min(e,1/30),z.uGather.value=Z.gather,z.uShape.value=Z.shape,z.uStable.value=Z.stable,z.uRelease.value=Z.release,z.uCollapse.value=Z.collapse,z.uElement.value=X.element,z.uDir.value.copy(X.dir),V.uPhase.value=Z.phase,V.uArc.value=Z.arc,v.compute(),G.uPositions.value=v.getCurrentRenderTarget(R).texture,G.uVelocities.value=v.getCurrentRenderTarget(L).texture,q.render(e)},setTier(e){return s=e,s!==`static`&&(Y(),!0)},dispose(){v.dispose(),q.dispose(),W.dispose(),K.material.dispose(),H.geometry.dispose(),H.material.dispose()}}}var I=[{id:0,name:`火焰`},{id:1,name:`冰霜`},{id:2,name:`防御`}],L=`咒文稳定并进一步雕琢已经成形的魔力，使其更接近施法者的意图。`,R=1.1,z=1.3,ee=2.6,B=2.4,V=1,H=new n(.94,.34).normalize();function U(e,t){let r=t.querySelector(`.casting-stage`);if(!r)return;let i=o();if(i.tier===`static`)return;let a=P(i.renderer);if(!a)return;let s=[...t.querySelectorAll(`[data-step]`)];r.dataset.gl=`loading`;let c=document.createElement(`div`);c.className=`casting-gl`,c.setAttribute(`aria-hidden`,`true`),r.prepend(c);let l=document.createElement(`div`);l.className=`casting-ui`,l.innerHTML=`<p class="casting-spell" aria-hidden="true">${[...L].map(e=>`<span>${e}</span>`).join(``)}</p>
<div class="casting-nodes" aria-hidden="true">${[`起势`,`塑形`,`稳定`,`导出`].map(e=>`<span>${e}</span>`).join(``)}</div>
<div class="casting-bar"><div class="casting-elements" role="group" aria-label="选择要塑成的结构">${I.map(e=>`<button type="button" data-element="${e.id}" aria-pressed="${e.id===0}">${e.name}</button>`).join(``)}</div>
<button type="button" class="casting-hold" aria-describedby="casting-help">按住施法</button>
<p id="casting-help" class="casting-help">按住台面或按钮：起势、塑形、稳定；稳定后松手导出，方向朝向指针。提前松手，结构散去。</p>
<p class="casting-status" role="status" aria-live="polite"></p></div>`,r.append(l);let u=l.querySelector(`.casting-hold`),d=l.querySelector(`.casting-status`),f=[...l.querySelectorAll(`.casting-spell span`)],p=[...l.querySelectorAll(`.casting-nodes span`)],m;try{m=F(i.renderer,i.tier,a)}catch(e){console.warn(`施法台未能启动，保留原图解。`,e),c.remove(),l.remove(),r.dataset.gl=`off`;return}let h=m.weights,{signal:g}=e,_=`idle`,v=0,y=0,b=0,x=0,S=!1,C=-1,w=H.clone(),T=e=>{C!==e&&(C=e,S=!0,s[e]?.click(),S=!1)},E=e=>{let t=Math.round(e*f.length);f.forEach((e,n)=>e.classList.toggle(`on`,n<t))},D=()=>{_=`idle`,v=0,Object.assign(h,{gather:0,shape:0,stable:0,release:0,collapse:0,arc:0}),E(0),u.textContent=`按住施法`,u.classList.remove(`is-ready`)},O=e=>{b=0;let t=x?Math.min(.5,(e-x)/1e3):0;if(x=e,_===`casting`){v+=t,h.gather=1;let e=Math.min(1,v/R),n=Math.min(1,Math.max(0,(v-R)/z)),r=Math.min(1,Math.max(0,(v-R-z)/ee));h.shape=n,h.stable=r,h.phase=r>0?2+r*.99:n>0?1+n:e,E(r),T(r>0?2:+(n>0)),r>=1&&!u.classList.contains(`is-ready`)&&(u.classList.add(`is-ready`),u.textContent=`松手导出 ↗`,d.textContent=`结构已稳定，松手导出。`)}else(_===`release`||_===`collapse`)&&(y-=t,_===`release`&&(h.arc=+(y>.6),h.release=+(y>1.0999999999999999)),y<=0&&(D(),h.phase=0));_!==`idle`&&_!==`showcase`&&(b=requestAnimationFrame(O))},k=()=>{b||(x=0,b=requestAnimationFrame(O))},A=()=>{_!==`casting`&&_!==`release`&&(_=`casting`,v=0,C=-1,Object.assign(h,{release:0,collapse:0,arc:0}),d.textContent=``,u.textContent=`继续按住…`,k())},j=()=>{_===`casting`&&(h.stable>=.99?(_=`release`,y=B,h.dir.copy(w),h.release=1,h.arc=1,h.phase=3.99,T(3),d.textContent=`${I[h.element].name}已导出。`):(_=`collapse`,y=V,Object.assign(h,{gather:0,shape:0,stable:0,collapse:1,phase:0}),E(0),T(0),d.textContent=`结构未稳，力量散去。`,window.setTimeout(()=>{h.collapse=0},450)),u.textContent=`按住施法`,u.classList.remove(`is-ready`),k())},M=()=>c.getBoundingClientRect(),N=e=>{let t=m.toTable(e.clientX,e.clientY,M()).sub(new n(0,.15));t.length()>.45&&w.copy(t.normalize())};r.addEventListener(`pointerdown`,e=>{r.dataset.gl!==`on`||e.button!==0||e.target.closest(`button, a`)||(N(e),r.setPointerCapture(e.pointerId),A())},{signal:g}),r.addEventListener(`pointermove`,e=>{_===`casting`&&N(e)},{signal:g}),r.addEventListener(`pointerup`,e=>{r.hasPointerCapture(e.pointerId)&&r.releasePointerCapture(e.pointerId),j()},{signal:g}),r.addEventListener(`pointercancel`,()=>j(),{signal:g}),u.addEventListener(`pointerdown`,e=>{e.button===0&&(w.copy(H),u.setPointerCapture(e.pointerId),A())},{signal:g}),u.addEventListener(`pointerup`,()=>j(),{signal:g}),u.addEventListener(`pointercancel`,()=>j(),{signal:g}),u.addEventListener(`keydown`,e=>{e.key!==` `&&e.key!==`Enter`||e.repeat||(e.preventDefault(),w.copy(H),A())},{signal:g}),u.addEventListener(`keyup`,e=>{(e.key===` `||e.key===`Enter`)&&(e.preventDefault(),j())},{signal:g}),u.addEventListener(`blur`,()=>j(),{signal:g}),u.addEventListener(`click`,e=>e.preventDefault(),{signal:g}),l.querySelectorAll(`[data-element]`).forEach(e=>e.addEventListener(`click`,()=>{h.element=Number(e.dataset.element),l.querySelectorAll(`[data-element]`).forEach(t=>t.setAttribute(`aria-pressed`,String(t===e)))},{signal:g}));let U=new MutationObserver(()=>{if(S||_===`casting`)return;let e=s.findIndex(e=>e.getAttribute(`aria-pressed`)===`true`);e<0||e===C||(C=e,e===3?(Object.assign(h,{gather:1,shape:1,stable:1,collapse:0,phase:3.99}),h.dir.copy(H),_=`release`,y=B,h.release=1,h.arc=1,E(1),k()):(_=`showcase`,Object.assign(h,{gather:1,shape:+(e>=1),stable:+(e>=2),release:0,collapse:0,arc:0,phase:e+.99}),E(+(e>=2))))});s.forEach(e=>U.observe(e,{attributes:!0,attributeFilter:[`aria-pressed`]}));let W=()=>{let e=M(),t=m.toTable(e.right,e.top,e);p.forEach((e,n)=>{e.style.left=`${50+(-2.4+1.6*n)/(t.x*2)*100}%`,e.style.top=`${50- -.47/(t.y*2)*100}%`})},G=new ResizeObserver(W);G.observe(r),i.mount(c,m,()=>{r.dataset.gl=`on`,W()}),e.onCleanup(()=>{cancelAnimationFrame(b),U.disconnect(),G.disconnect(),i.unmount(),c.remove(),l.remove()}),D()}export{U as mountCastingRoom};