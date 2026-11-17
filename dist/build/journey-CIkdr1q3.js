import{t as e}from"./gsap-B0gpcuWg.js";import{n as t}from"./home-kuLPCln2.js";import{A as n,B as r,C as i,D as a,F as o,G as s,H as c,I as l,K as u,L as d,M as f,N as p,R as m,S as h,U as g,W as _,_ as v,a as y,b,c as x,d as ee,f as S,g as te,h as C,i as w,j as ne,k as T,l as re,m as ie,n as ae,o as oe,p as se,r as ce,s as le,u as ue,v as E,w as D,x as O,y as de,z as fe}from"./veil-shaders-Cp5PPSn8.js";var pe={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new D(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},k=class e extends de{constructor(e,t=1,r,i){super(),this.strength=t,this.radius=r,this.threshold=i,this.resolution=e===void 0?new g(256,256):new g(e.x,e.y),this.clearColor=new D(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let o=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);this.renderTargetBright=new u(o,s,{type:a,depthBuffer:!1}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new u(o,s,{type:a,depthBuffer:!1});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new u(o,s,{type:a,depthBuffer:!1});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),o=Math.round(o/2),s=Math.round(s/2)}let l=pe;this.highPassUniforms=c.clone(l.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new m({uniforms:this.highPassUniforms,vertexShader:l.vertexShader,fragmentShader:l.fragmentShader}),this.separableBlurMaterials=[];let d=[6,10,14,18,22];o=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(d[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new g(1/o,1/s),o=Math.round(o/2),s=Math.round(s/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let f=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=f,this.bloomTintColors=[new _(1,1,1),new _(1,1,1),new _(1,1,1),new _(1,1,1),new _(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=c.clone(b.uniforms),this.blendMaterial=new m({uniforms:this.copyUniforms,vertexShader:b.vertexShader,fragmentShader:b.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new D,this._oldClearAlpha=1,this._basic=new n,this._fsQuad=new E(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new g(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);let r=[],i=[];for(let n=1;n<e;n+=2){let a=t[n],o=n+1<e?t[n+1]:0,s=a+o;r.push((n*a+(n+1)*o)/s),i.push(s)}return new m({defines:{KERNEL_PAIRS:r.length},uniforms:{colorTexture:{value:null},invSize:{value:new g(.5,.5)},direction:{value:new g(.5,.5)},centerWeight:{value:t[0]},gaussianOffsets:{value:r},gaussianWeights:{value:i}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float centerWeight;
				uniform float gaussianOffsets[KERNEL_PAIRS];
				uniform float gaussianWeights[KERNEL_PAIRS];

				void main() {

					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * centerWeight;

					for ( int i = 0; i < KERNEL_PAIRS; i ++ ) {

						vec2 uvOffset = direction * invSize * gaussianOffsets[ i ];
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * gaussianWeights[ i ];

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new m({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};k.BlurDirectionX=new g(1,0),k.BlurDirectionY=new g(0,1);var A=60,j=e=>new D(e),me=e=>Math.min(1,Math.max(0,e)),M=(e,t,n)=>{let r=me((n-e)/(t-e));return r*r*(3-2*r)},N=e=>e<.5?4*e*e*e:1-(-2*e+2)**3/2;function he(e){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}var P=52,ge=1.7;function F(e,t,n=[]){let c=t,b=new d,E=new ne(50,1,.5,4e3),D={uZenith:{value:j(`#01070a`)},uHorizon:{value:j(`#123430`)},uMoon:{value:j(`#f4eedc`)},uGold:{value:j(`#d4b36e`)},uMoonDir:{value:new _(.6,.3,-1).normalize()},uReveal:{value:0},uInside:{value:0},uTime:{value:0}},O=new T(new fe(1800,48,24),new m({uniforms:D,vertexShader:ee,fragmentShader:ue,side:1,depthWrite:!1}));O.renderOrder=-2,b.add(O);let de=e=>{let t=he(1077),n=new Float32Array(e*3),r=new Float32Array(e),a=new Float32Array(e),o=new Float32Array(e*3),s=j(`#f6e6c0`),c=j(`#cfe3e0`);for(let i=0;i<e;i++){let e=t(),l=t(),u=2*Math.PI*e,d=.02+.98*l**.8,f=Math.sqrt(1-d*d);n.set([Math.cos(u)*f*1500,d*1500,Math.sin(u)*f*1500],i*3);let p=t()**3;r[i]=1.2+p*3.4,a[i]=t();let m=s.clone().lerp(c,t()).multiplyScalar(.35+p*1.4);o.set([m.r,m.g,m.b],i*3)}let l=new i;return l.setAttribute(`position`,new h(n,3)),l.setAttribute(`aSize`,new h(r,1)),l.setAttribute(`aPhase`,new h(a,1)),l.setAttribute(`aTint`,new h(o,3)),l},pe=new m({uniforms:{uTime:D.uTime,uDpr:{value:1}},vertexShader:se,fragmentShader:S,blending:2,depthWrite:!1,transparent:!0}),F=new p(de(c===`full`?2600:1300),pe);F.renderOrder=-1,b.add(F);let I=c===`full`?220:110,L=new f(1800,1800,I,I);L.rotateX(-Math.PI/2);let _e=new T(L,new m({uniforms:{...D,uDeep:{value:j(`#03100e`)},uGlint:{value:j(`#fff2cf`)},uWaves:{value:[new s(1,.35,.16,38),new s(.6,1,.12,22),new s(-.4,1,.1,13),new s(1,-.7,.08,7)]}},vertexShader:re,fragmentShader:x}));b.add(_e);let ve=new i;ve.setAttribute(`position`,new h(new Float32Array([130,1.6,-230]),3));let ye=new m({uniforms:{uColor:{value:j(`#ffcf8a`)},uTime:D.uTime,uDpr:{value:1}},vertexShader:`uniform float uTime, uDpr; void main(){ vec3 p = position; p.y += sin(uTime * 0.9) * 0.25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 14.0 * uDpr; gl_Position = projectionMatrix * mv; }`,fragmentShader:y,blending:2,depthWrite:!1,transparent:!0}),be=new p(ve,ye);b.add(be);let R=Array.from({length:8},()=>new s(0,0,0,-1)),z={uTime:D.uTime,uReveal:D.uReveal,uInside:D.uInside,uNear:{value:0},uBreath:{value:1.6},uRipples:{value:R},uScene:{value:null},uResolution:{value:new g(1,1)},uRefract:{value:0},uGold:D.uGold,uTeal:{value:j(`#5d9f94`)},uVeil:{value:j(`#f1e2b4`)}},xe=new fe(A,c===`full`?160:96,c===`full`?80:48,0,Math.PI*2,0,Math.PI/2),Se=e=>new m({uniforms:z,vertexShader:le,fragmentShader:oe,defines:e?{NEAR_SIDE:``}:{},transparent:!0,depthWrite:!1,side:+!e}),B=new T(xe,Se(!1)),V=new T(xe,Se(!0));B.renderOrder=2,V.renderOrder=3,b.add(B,V);let H={uMap:{value:null},uInside:D.uInside,uReady:{value:0},uGold:D.uGold,uNight:{value:j(`#03100e`)}},Ce=new f(P,P);Ce.rotateX(-Math.PI/2);let U=new T(Ce,new m({uniforms:H,vertexShader:ce,fragmentShader:ae,transparent:!0,depthWrite:!1}));U.position.y=ge,U.renderOrder=1,b.add(U);let we=!1;new r().load(`assets/nautical-chart-1254.webp`,t=>{we?t.dispose():(t.colorSpace=l,t.anisotropy=Math.min(8,e.capabilities.getMaxAnisotropy()),H.uMap.value=t,H.uReady.value=1)});let Te=n.map(e=>new _((e.u/100-.5)*P,ge,(e.v/100-.5)*P)),W=new _,G=null,K=new te(e);K.addPass(new C(b,E));let q=new k(new g(256,256),.42,.55,.88);K.addPass(q),K.addPass(new ie);let J=new v(w);K.addPass(J);let Ee=()=>{let e=c===`full`;q.enabled=e,e&&!G&&(G=new u(1,1,{type:a,depthBuffer:!0})),!e&&G&&(G.dispose(),G=null),z.uScene.value=G?.texture??null,J.uniforms.uGrain.value=e?.035:.02};Ee();let De=new o,Y=new g,X=0,Oe=0,Z=null,ke=e.domElement,Ae=e=>{if(D.uReveal.value<.35||e.pointerType===`touch`)return;let t=ke.getBoundingClientRect();if(!t.width)return;Y.set((e.clientX-t.left)/t.width*2-1,-((e.clientY-t.top)/t.height)*2+1),je.set(Y.x,Y.y);let n=D.uTime.value;if(n-Oe<.14)return;De.setFromCamera(Y,E);let r=De.intersectObject(D.uInside.value>.5?B:V,!1)[0];if(!r)return;let i=V.worldToLocal(r.point.clone());Z&&Z.distanceTo(i)<6||(Z=i,Oe=n,R[X].set(i.x,i.y,i.z,n),X=(X+1)%R.length)},je=new g;addEventListener(`pointermove`,Ae,{passive:!0});let Me=1,Ne=1,Q=0,$=0,Pe=!0,Fe=new _,Ie=new _,Le=new _,Re=new _,ze=Math.PI/180,Be=0,Ve=(e,t)=>{let n=Me/Ne,r=n<1,i=n<1.25?Math.min(1.35,1.25/n):1,a=r?70:46,o=N(M(0,.2,e)),s=N(M(.2,.45,e)),l=N(M(.45,.7,e)),u=N(M(.7,.93,e)),d=(158-8*o-16*s)*i,f=3.4+1.2*s,p=N(M(.45,.56,e)),m=M(.56,.65,e),h=N(M(.65,.7,e)),g=d+(70-d)*p+-18*m+-28*h,v=f+(7.5-f)*p,y=r?new _(0,53,16):new _(0,51,22),b=Math.sin(t*.21)*.35*(1-u);Fe.set(b+je.x*(c===`full`?1.2:0)*(1-l),v+(y.y-v)*u+Math.sin(t*.33)*.12+je.y*.4*(1-l),g+(y.z-g)*u),Ie.set(0,15+3*s,0),Le.set(0,8,-80),Re.set(0,0,r?0:-4),Ie.lerp(Le,p).lerp(Re,u);let x=Fe.length(),ee=Math.hypot(d,f),S=2*Math.atan(Math.tan(a*ze/2)*Math.min(1,x/ee))/ze,te=M(63,51,x)*l,C=S+((r?82:70)-S)*N(te);C+=((r?64:54)-C)*u,E.fov=C,E.aspect=n,E.position.copy(Fe),E.lookAt(Ie),E.updateProjectionMatrix(),D.uReveal.value=M(.22,.42,e),D.uInside.value=M(61,54,x);let w=Math.exp(-(((x-A)/7)**2));z.uNear.value=Math.exp(-(((x-A)/16)**2))*l,z.uRefract.value=c===`full`?D.uReveal.value*(1+5*w)*(1-D.uInside.value):0,J.uniforms.uCross.value=w*M(.45,.55,e)*(1-M(.72,.8,e)),Be=M(.8,.88,e)*(1-M(.95,.99,e))},He=()=>{if(n.length)for(let e=0;e<n.length;e++){let t=n[e].el;if(Be<.01){t.hasAttribute(`style`)&&t.removeAttribute(`style`);continue}W.copy(Te[e]).project(E);let r=(W.x*.5+.5)*Me,i=(-W.y*.5+.5)*Ne;t.style.transform=`translate(${r.toFixed(1)}px, ${i.toFixed(1)}px) translate(-50%, -50%)`,t.style.opacity=String(Be.toFixed(3))}};return{setProgress(e,t){Q=me(e),t&&($=Q)},resize(e,t,n){Me=e,Ne=t,K.setPixelRatio(n),K.setSize(e,t),q.resolution.set(e*n*.5,t*n*.5),pe.uniforms.uDpr.value=n,ye.uniforms.uDpr.value=n,z.uResolution.value.set(e*n,t*n),G?.setSize(Math.max(1,Math.round(e*n*.5)),Math.max(1,Math.round(t*n*.5)))},frame(t,n){e.setClearColor(463119,1),$=Pe?Q:$+(Q-$)*(1-Math.exp(-t*7)),Pe=!1,D.uTime.value=n,J.uniforms.uTime.value=n,Ve($,n),O.position.copy(E.position);let r=D.uReveal.value>.001;G&&r&&D.uInside.value<1&&(V.visible=B.visible=U.visible=!1,e.setRenderTarget(G),e.render(b,E),e.setRenderTarget(null)),V.visible=B.visible=r,U.visible=D.uInside.value>.001,K.render(t),He()},setTier(e){return c=e,c!==`static`&&(Ee(),!0)},dispose(){we=!0,removeEventListener(`pointermove`,Ae),H.uMap.value?.dispose(),K.dispose(),G?.dispose(),b.traverse(e=>{let t=e;t.geometry?.dispose();let n=t.material;(Array.isArray(n)?n:n?[n]:[]).forEach(e=>e.dispose())})}}}var I=[[50,50],[29,29],[71,29],[29,71],[71,71]];function L(n){let r=n.main.querySelector(`[data-journey]`),i=r?.querySelector(`.journey-gl`);if(!r||!i)return;e.registerPlugin(t);let a=O(),o=null;if(a.tier===`static`)r.dataset.gl=`off`;else try{let e=[...r.querySelectorAll(`.journey-place`)].map((e,t)=>({el:e,u:I[t]?.[0]??50,v:I[t]?.[1]??50}));o=F(a.renderer,a.tier,e),a.mount(i,o,()=>{r.dataset.gl=`on`}),n.onCleanup(()=>a.unmount())}catch(e){console.warn(`帷幕场景未能启动，保留静态主视觉。`,e),r.dataset.gl=`off`,o=null}let s=e.context(()=>{let t=e.timeline({defaults:{ease:`none`},scrollTrigger:{trigger:r,start:`top top`,end:`bottom bottom`,scrub:!0,onUpdate:e=>o?.setProgress(e.progress*1)}});t.fromTo(`.journey-progress > span`,{scaleX:0},{scaleX:1,duration:1},0),t.to([`.journey-stage > .hero-copy`,`.journey-stage > .hero-caption`],{autoAlpha:0,y:-36,duration:.06,ease:`power1.in`},.13),t.to(`.journey-stage > .dome`,{opacity:0,duration:.14},.24),t.fromTo(`.journey-act-2 .journey-line`,{opacity:0,y:26},{opacity:1,y:0,duration:.05,stagger:.025,ease:`power2.out`},.24),t.to(`.journey-act-2 .journey-line`,{opacity:0,y:-26,duration:.035,stagger:.01,ease:`power1.in`},.405),t.fromTo(`.journey-act-4 > *`,{opacity:0,y:24},{opacity:1,y:0,duration:.05,stagger:.02,ease:`power2.out`},.82),t.to(`.journey-act-4 > *`,{opacity:0,y:-18,duration:.03,ease:`power1.in`},.955),t.to(`.journey-gl`,{opacity:0,duration:.05},.95),t.set({},{},1),o?.setProgress((t.scrollTrigger?.progress??0)*1,!0)},n.main);n.onCleanup(()=>s.revert())}export{L as mountJourney};