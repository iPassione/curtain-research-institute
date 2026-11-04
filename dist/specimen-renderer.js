/* Original Curtain Institute models. Three.js is distributed under MIT. */
(() => {
  let library;
  const names={wand:'现代短杖',staff:'古式长杖',stone:'封咒蕴法石',spent:'用过的蕴法石',lamp:'日用灯',gate:'传送门'};
  window.CurtainSpecimens={mount(host,kind){
    let stopped=false,dispose=()=>{},view='model';host.classList.remove('model-ready');
    host.innerHTML=`<div class="object-stage"><div class="object-plate-label"><span>THE CURTAIN INSTITUTE</span><b>FORM / ${kind.toUpperCase()}</b></div><div class="object-viewport" role="img" aria-label="${names[kind]}立体形制，可拖动查看"><img class="object-fallback" src="assets/plates/${kind}.svg" alt="${names[kind]}结构图"></div><div class="object-stage-foot"><span>馆藏形制研究</span><span class="object-hint">拖动转动 · 双击复位</span></div></div><div class="object-tools" role="group" aria-label="展品视图"><button type="button" data-display="model" aria-pressed="true">立体形制</button><button type="button" data-display="plate" aria-pressed="false">结构图版</button><button type="button" data-reset aria-label="复位展品视角">复位 ↺</button></div>`;
    const viewport=host.querySelector('.object-viewport'),hint=host.querySelector('.object-hint');
    let reset=()=>{};
    host.querySelectorAll('[data-display]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.display;host.dataset.display=view;viewport.setAttribute('aria-label',names[kind]+(view==='plate'?'结构图版':'立体形制，可拖动查看')); host.querySelectorAll('[data-display]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));hint.textContent=view==='plate'?'正面形制 / 局部绘录':'拖动转动 · 双击复位';}));
    host.querySelector('[data-reset]').addEventListener('click',()=>reset());
    host.dataset.display='model';
    (library ||= import('./vendor/three/three.module.js')).then(T=>{
      if(stopped)return;
      let renderer;
      try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{hint.textContent='结构图版';return;}
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
      viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');host.classList.add('model-ready');
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,100);
      scene.add(new T.HemisphereLight(0xf8efd6,0x233f39,2));
      const key=new T.DirectionalLight(0xffe4b5,4.2);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;scene.add(key);
      const rim=new T.DirectionalLight(0x8fdac7,3);rim.position.set(4,4,-4);scene.add(rim);
      const group=new T.Group();scene.add(group);
      const material=(color,metalness=0,roughness=.6)=>new T.MeshStandardMaterial({color,metalness,roughness});
      const brass=material(0x978257,.66,.43),darkBrass=material(0x5c553e,.65,.5),stone=material(0x959781,.05,.9),stoneDark=material(0x858e7b,.05,.9),wood=material(0x493c2d,.03,.65),leather=material(0x212e28,0,.85);
      // Seeded grain stays stable between objects and camera moves.
      function grain(woodgrain=false){const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d'),im=cx.createImageData(256,256);let seed=317;for(let y=0;y<256;y++)for(let x=0;x<256;x++){seed=(seed*1664525+1013904223)>>>0;const noise=(seed/4294967296)*22;const v=woodgrain?175+30*Math.sin(x*.26+Math.sin(y*.025)*2)+noise:205+noise+12*Math.sin(x*.08)*Math.cos(y*.11);const k=(y*256+x)*4;im.data[k]=im.data[k+1]=im.data[k+2]=v;im.data[k+3]=255;}cx.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
      const mineral=grain(),timber=grain(true);for(const m of [stone,stoneDark]){m.map=mineral;m.bumpMap=mineral;m.bumpScale=.025;}wood.map=timber;wood.bumpMap=timber;wood.bumpScale=.008;
      const glow=new T.MeshStandardMaterial({color:0x7abfaa,emissive:0x369b82,emissiveIntensity:.65,metalness:.35,roughness:.22});
      const add=(geometry,mat,x=0,y=0,z=0,parent=group)=>{const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
      const box=(w,h,d,m,x,y,z,p)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,p);
      const cyl=(r1,r2,h,m,x,y,z,p)=>add(new T.CylinderGeometry(r1,r2,h,48),m,x,y,z,p);
      const torus=(r,t,m,x,y,z,p)=>add(new T.TorusGeometry(r,t,10,72),m,x,y,z,p);
      const line=(points,m=brass,r=.009,p=group)=>{const c=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return add(new T.TubeGeometry(c,32,r,6,false),m,0,0,0,p);};
      const base=(r=1.65)=>{cyl(r,r+.08,.16,material(0x293e34,.15,.7),0,.08,0);cyl(r+.02,r+.02,.018,darkBrass,0,.17,0);};
      if(kind==='gate'){
        box(3.45,.19,1.4,stoneDark,0,.095,0);box(3.12,.13,1.18,stone,0,.255,0);box(2.95,.035,1.05,brass,0,.335,0);
        for(const x of [-1.14,1.14]){box(.62,.25,.82,stoneDark,x,.475,0);box(.54,.16,.74,brass,x,.66,0);for(let j=0;j<6;j++){box(.46,.255,.57,j%2?stone:stoneDark,x,.88+j*.265,0);box(.48,.025,.59,darkBrass,x,1.01+j*.265,0);}box(.57,.14,.72,brass,x,2.47,0);}
        const radius=1.14,cy=2.45;
        for(let i=0;i<13;i++){const a=i*Math.PI/13+.008,b=(i+1)*Math.PI/13-.008,s=new T.Shape();s.absarc(0,0,radius+.25,a,b,false);s.absarc(0,0,radius-.22,b,a,true);s.closePath();const mesh=add(new T.ExtrudeGeometry(s,{depth:.58,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:1,steps:1}),i===6?brass:(i%2?stone:stoneDark),0,cy,-.29);}
        for(const z of [-.32,.32]){const a=add(new T.TorusGeometry(radius,.025,8,80,Math.PI),brass,0,cy,z);for(const x of [-radius,radius])box(.035,1.76,.035,brass,x,1.57,z);}
        for(const x of [-1.14,1.14])for(let j=0;j<5;j++){const y=1+j*.265;box(.11,.045,.018,brass,x,y,.302);box(.022,.10,.018,brass,x,y,.305);}
        const membrane=new T.Shape();membrane.moveTo(-.88,.36);membrane.lineTo(-.88,cy);membrane.absarc(0,cy,.88,Math.PI,0,true);membrane.lineTo(.88,.36);membrane.closePath();
        const veil=add(new T.ShapeGeometry(membrane),new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 p; void main(){float n=sin(p.x*9.+sin(p.y*3.)*2.)*sin(p.y*6.+cos(p.x*5.));float f=pow(max(0.,1.-abs(p.x)/.9),1.2);vec3 c=mix(vec3(.12,.28,.23),vec3(.46,.73,.60),n*.5+.5);gl_FragColor=vec4(c,(.11+.17*(n*.5+.5))*f);}'}),0,0,.02);
        for(let i=0;i<2;i++){const a=.72+i*.08;line([[-a,.65,.04],[-a*.94,1.7,.04],[-a*.8,2.7,.04],[-a*.35,3.19,.04]],new T.MeshBasicMaterial({color:0x8bbfa6,transparent:true,opacity:.25}),.005);}
        const disk=cyl(.24,.27,.06,brass,0,.38,.38);torus(.17,.012,glow,0,.419,.38).rotation.x=-Math.PI/2;
      }else if(kind==='wand'||kind==='staff'){
        base();const p=new T.Group();group.add(p);p.position.set(0,2.05,0);p.rotation.z=kind==='wand'?-.61:-.28;
        const h=kind==='wand'?2.75:3.35;cyl(.035,.095,h,wood,0,0,0,p);cyl(.105,.12,.75,leather,0,-h/2+.4,0,p);
        for(let i=0;i<15;i++){const ring=torus(.11,.009,i%4===0?brass:darkBrass,0,-h/2+.07+i*.045,0,p);ring.rotation.x=Math.PI/2;}
        for(const y of [-h/2,-h/2+.8])cyl(.13,.13,.07,brass,0,y,0,p);
        cyl(.055,.07,.18,brass,0,h/2-.05,0,p);add(new T.OctahedronGeometry(kind==='staff'?.25:.08,0),glow,0,h/2+.1,0,p);
        if(kind==='staff'){for(let i=0;i<4;i++){const a=i*Math.PI/2;line([[Math.cos(a)*.06,h/2-.22,Math.sin(a)*.06],[Math.cos(a)*.30,h/2+.06,Math.sin(a)*.30],[Math.cos(a)*.16,h/2+.43,Math.sin(a)*.16]],brass,.025,p);}cyl(.12,.09,.1,brass,0,h/2-.23,0,p);}
        for(const y of [.57,1.65]){box(.08,.1,.12,darkBrass,0,y,-.12);box(.09,y,.08,darkBrass,0,y/2,-.3);}
      }else if(kind==='stone'||kind==='spent'){
        base();cyl(.95,1.10,.32,stoneDark,0,.34,0);cyl(.99,.99,.04,brass,0,.52,0);
        const geo=new T.IcosahedronGeometry(1.1,0);geo.scale(.88,1.1,.85);const gem=add(geo,kind==='stone'?new T.MeshPhysicalMaterial({color:0x6da892,metalness:.28,roughness:.23,flatShading:true,clearcoat:.8}):material(0x697166,.14,.83),0,1.7,0);gem.rotation.set(.24,.48,.12);
        const edges=new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:kind==='stone'?0xbcd4ad:0x8e9584,transparent:true,opacity:.6}));gem.add(edges);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;line([[Math.cos(a)*.75,.52,Math.sin(a)*.75],[Math.cos(a)*.85,.9,Math.sin(a)*.85],[Math.cos(a)*.72,1.05,Math.sin(a)*.72]],brass,.045);}
        if(kind==='stone'){for(let i=0;i<3;i++)line([[-.55+i*.1,1.35+i*.3,.75],[-.2,1.5+i*.3,.86],[.16,1.38+i*.3,.88],[.45,1.55+i*.3,.74]],glow,.012);}else{line([[-.5,2.4,.42],[-.2,2,.87],[-.33,1.65,.9],[.1,1.4,.9],[.2,1,.6]],material(0x222f29),.02);add(new T.TetrahedronGeometry(.13),stoneDark,.78,.6,.6);add(new T.TetrahedronGeometry(.08),stoneDark,-.6,.57,.7);}
      }else if(kind==='lamp'){
        base();cyl(.67,.8,.14,darkBrass,0,.28,0);cyl(.55,.65,.10,brass,0,.40,0);cyl(.12,.28,.24,brass,0,.55,0);cyl(.065,.085,1.2,brass,0,1.2,0);cyl(.48,.32,.15,darkBrass,0,1.81,0);
        const glass=new T.MeshPhysicalMaterial({color:0xd1cf9a,transparent:true,opacity:.23,roughness:.17,metalness:.08,side:T.DoubleSide,depthWrite:false});cyl(.38,.48,.95,glass,0,2.35,0);
        cyl(.40,.53,.14,brass,0,2.86,0);cyl(.30,.4,.13,darkBrass,0,2.99,0);cyl(.1,.26,.16,brass,0,3.13,0);torus(.19,.026,brass,0,3.38,0);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;line([[.46*Math.cos(a),1.91,.46*Math.sin(a)],[.42*Math.cos(a),2.36,.42*Math.sin(a)],[.36*Math.cos(a),2.82,.36*Math.sin(a)]],brass,.018);}
        const pearl=add(new T.OctahedronGeometry(.20),new T.MeshStandardMaterial({color:0xf2deb0,emissive:0xffce72,emissiveIntensity:2}),0,2.35,0);cyl(.045,.045,.46,brass,0,2.0,0);
        const bulb=new T.PointLight(0xffd692,2,3);bulb.position.set(0,2.3,0);group.add(bulb);
      }
      const floor=add(new T.CircleGeometry(6,96),new T.ShadowMaterial({opacity:.32}),0,-.008,0,scene);floor.rotation.x=-Math.PI/2;
      const orbit={yaw:.35,pitch:.12},target=new T.Vector3(0,kind==='gate'?1.9:1.8,0);let drag=null,frame;
      function draw(){if(stopped)return;const h=viewport.clientHeight,w=viewport.clientWidth;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(Math.sin(orbit.yaw)*8.9,3.5+orbit.pitch*5,Math.cos(orbit.yaw)*8.9);camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);}
      reset=()=>{orbit.yaw=.35;orbit.pitch=.12;draw();};
      const down=e=>{drag={x:e.clientX,y:e.clientY,yaw:orbit.yaw,pitch:orbit.pitch};renderer.domElement.setPointerCapture(e.pointerId);};
      const move=e=>{if(!drag)return;orbit.yaw=drag.yaw+(e.clientX-drag.x)*.009;orbit.pitch=Math.max(-.3,Math.min(.75,drag.pitch+(e.clientY-drag.y)*.004));cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
      const up=()=>drag=null;
      renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('dblclick',reset);
      viewport.tabIndex=0;const keyboard=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')return reset();orbit.yaw+=e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0;orbit.pitch=Math.max(-.3,Math.min(.75,orbit.pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0)));draw();};viewport.addEventListener('keydown',keyboard);
      const observer=new ResizeObserver(draw);observer.observe(viewport);draw();
      dispose=()=>{observer.disconnect();viewport.removeEventListener('keydown',keyboard);cancelAnimationFrame(frame);mineral.dispose();timber.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.forceContextLoss();};
    }).catch(()=>{hint.textContent='结构图版';});
    return ()=>{stopped=true;dispose();};
  }};
})();
