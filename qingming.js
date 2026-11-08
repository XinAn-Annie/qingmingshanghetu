(function(){
  const loading=document.getElementById('loadingPage');
  const start=document.getElementById('startExperience');
  const nav=document.getElementById('navigation');
  const mark=document.getElementById('chapterMark');
  const scenes=[...document.querySelectorAll('.scene')];
  const modal=document.getElementById('detailModal');
  const modalText=document.getElementById('modalText');
  const modalTitle=document.getElementById('modalTitle');
  const modalHint=document.getElementById('modalHint');
  const knowledge={
    tools:{title:'劳动工具',text:'扁担、担绳和篮筐是北宋流动商贩与劳动者常用的运输工具，短距离搬运常以人力完成。'},
    tea:{title:'茶文化',text:'宋代茶坊兼具饮茶、歇脚、交谈和交易功能，是城市日常生活的重要公共空间。'},
    water:{title:'水利交通',text:'汴河连接船运、桥梁和城市道路，船只过桥时需要通过篙、舵和桅杆协同调整方向。'},
    coin:{title:'钱币交易',text:'北宋日常小额交易主要使用铜钱，摊贩通过货物交换完成即时买卖。'},
    night:{title:'夜生活',text:'酒旗和酒楼构成汴京夜间商业的视觉标志。《东京梦华录》记载，京师酒店常在门首设置彩楼欢门。'}
  };
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  let started=false,lastY=0,targetY=0,smoothY=0,raf=0;
  let scene1AutoStarted=false,scene1AutoRunning=false,scene1AutoProgress=0,scene1AutoStartTime=0;
  let scene1PeopleProgress=0,scene1PeopleMotionRunning=false,scene1PeopleStartTime=0;
  let scene2AutoStarted=false,scene2AutoRunning=false,scene2AutoProgress=0,scene2AutoStartTime=0;
  let scene3ShipProgress=0,scene3ShipSpeed=.000018,scene3ShipRunning=false,scene3ShipDragging=false,scene3ShipLastX=0,scene3Transition=0;
  const beatNames=[['进入','靠近','停步','继续'],['河岸','开摊','热茶','上路'],['桥洞','船头','桅杆','通过'],['人潮','铺布','交易','借过'],['酒旗','街门','担空','入城']];
  const beatCopy=[
    [['先看见城门','脚下的土路','担子不能颠','往河岸走'],['先看见河岸','摊布铺开','热茶入口','扎绳上路'],['桥洞在前','船头进来','桅杆贴顶','船身通过'],['人潮复动','摊布铺开','一枚钱落下','侧身借过'],['酒旗招展','街门渐近','担子渐空','仍向城内']]
  ];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function resetInitialPosition(){
    const initialTop=scenes[0]?.offsetTop||0;
    window.scrollTo(0,initialTop);
    lastY=targetY=smoothY=window.scrollY;
  }
  // Always reopen at the first scene rather than inheriting the browser's
  // previous scroll position after refresh or bfcache restoration.
  resetInitialPosition();
  window.addEventListener('pageshow',resetInitialPosition);
  function sceneProgress(el,y){const range=Math.max(1,el.offsetHeight-innerHeight);return clamp((y-el.offsetTop)/range,0,1)}
  function easeInOut(t){return t*t*(3-2*t)}
  function update(y=scrollY){
    if(!started)return;
    let active=0;
    scenes.forEach((scene,i)=>{
      const baseProgress=sceneProgress(scene,y);
      // Only the opening handoff is automatic; later layer changes follow
      // the user's scroll position.
      const p=i===0&&scene1AutoStarted
        ? Math.max(baseProgress,scene1AutoProgress*.25)
        : i===1&&scene2AutoStarted
          ? Math.max(baseProgress,scene2AutoProgress)
          : baseProgress;
      if(i===0 && baseProgress>=.4 && !scene1PeopleMotionRunning && scene1PeopleProgress<1){
        scene1PeopleMotionRunning=true;
        scene1PeopleStartTime=performance.now();
        requestAnimationFrame(animateScene1);
      }
      if(i===2 && baseProgress>.02 && !scene3ShipRunning && scene3ShipProgress<1){
        scene3ShipRunning=true;
        requestAnimationFrame(animateScene3Ship);
      }
      if(y+innerHeight*.5>=scene.offsetTop) active=i;
      const stage=scene.querySelector('.stage');
      const focusX=parseFloat(scene.dataset.focusX||'50')/100;
      const focusY=parseFloat(scene.dataset.focusY||'50')/100;
      const px=parseFloat(getComputedStyle(stage).getPropertyValue('--pointer-x'))||0;
      const py=parseFloat(getComputedStyle(stage).getPropertyValue('--pointer-y'))||0;
      const beat=Math.min(3,Math.floor(p*4)); scene.dataset.beat=beat;
      const state=scene.querySelector('.scene-state'); if(state) state.textContent=beatNames[i][beat]+' · '+String(Math.round(p*100)).padStart(2,'0')+'%';
      const copy=scene.querySelector('.scene-copy'); if(copy){const beatTitle=copy.querySelector('h2'); if(beatTitle) beatTitle.dataset.beatText=beatCopy[0][i][beat]; const caption=scene.querySelector('.beat-caption'); if(caption) caption.textContent=beatCopy[0][i][beat]; copy.style.setProperty('--beat-progress',p.toFixed(3));}
      const hotspot=scene.querySelector('.shoulder-hotspot');
      if(hotspot) hotspot.classList.toggle('is-visible',i===0 && scene1PeopleProgress>=.7);
      const coinHotspot=scene.querySelector('.coin-hotspot');
      if(coinHotspot) coinHotspot.classList.toggle('is-visible',i===3 && p>=.86);
      const flagHotspot=scene.querySelector('.flag-hotspot');
      if(flagHotspot) flagHotspot.classList.toggle('is-visible',i===4 && p>=.8);
      const bridgeHotspot=scene.querySelector('.bridge-hotspot');
      if(bridgeHotspot) bridgeHotspot.classList.toggle('is-visible',i===2 && scene3Transition>=.7);

      // Each scene is a camera move: the source-aligned image starts slightly
      // wider than the viewport and steadily zooms into its focal point.
      const zoom=easeInOut(p);
      const scene3FinalReverse=scene.classList.contains('scene-03') && p>.75;
      let sceneScale=.98 + zoom*.42;
      if(scene3FinalReverse){
        const reverseProgress=easeInOut(clamp((p-.75)/.25,0,1));
        // Scene 3's final bridge-to-wide-view handoff pulls back instead of
        // enlarging, while every earlier handoff keeps the forward push.
        const scaleAtHandoff=.98 + easeInOut(.75)*.42;
        sceneScale=scaleAtHandoff*(1-reverseProgress*.24);
      }
      // Keep each sticky camera fully present at the handoff. The zoom itself
      // carries the eye into the next chapter and avoids a black flash.
      stage.style.opacity='1';
      stage.style.setProperty('--scene-scale',sceneScale.toFixed(4));
      stage.style.setProperty('--scene-focus-x',(focusX*100).toFixed(2)+'%');
      stage.style.setProperty('--scene-focus-y',(focusY*100).toFixed(2)+'%');

      const sceneLayers=[...scene.querySelectorAll('.scene-layer')];
      const layerCount=sceneLayers.length;
      // Build a real spatial stack. Every source remains present at a
      // different Z depth; scrolling moves the camera forward through the
      // stack so the next layer approaches instead of replacing the previous
      // image as a flat slideshow.
      const sequencePos=clamp(p,0,1)*(layerCount-1);
      const layerSpacing=4500;
      const cameraZ=sequencePos*layerSpacing;
      const parallax=(1-zoom)*.22;
      const scene5Exit=scene.classList.contains('scene-05') && p>.85;
      const scene5ExitProgress=scene5Exit?easeInOut(clamp((p-.85)/.15,0,1)):0;
      sceneLayers.forEach((layer,order)=>{
        const scene3Spatial=scene.classList.contains('scene-03');
        if(scene3Spatial && order<2){
          // Layer 2 is the back plane; layer 3 sits in front of it.
          const spatialX=[2,-2][order];
          const spatialY=[3,12][order];
          const spatialZ=[-180,0][order];
          const scene3Fade=scene3Transition>0?1-scene3Transition:1;
          const scene3Shrink=1-scene3Transition*.34;
          layer.style.zIndex=String(3+order);
          layer.style.transform=`translate3d(${spatialX}%,${spatialY}%,${spatialZ.toFixed(1)}px) scale(${(sceneScale*(1-order*.04)*scene3Shrink).toFixed(4)})`;
          layer.style.opacity=scene3Fade.toFixed(3);
          return;
        }
        if(scene3Spatial && order===2){
          const shipX=125-scene3ShipProgress*250;
          const shipScale=sceneScale*.92;
          const fade=scene3Transition>0?1-scene3Transition:1;
          // Keep the ship behind the bridge, trees, and buildings in depth.
          layer.style.zIndex='1';
          layer.style.transform=`translate3d(${shipX.toFixed(3)}%,8%,-540px) scale(${shipScale.toFixed(4)})`;
          layer.style.opacity=clamp(fade,0,1);
          return;
        }
        if(scene3Spatial && order===3){
          // The fifth layer starts only after the first 70% of the fade, then
          // grows into view during the remaining handoff.
          const reveal=clamp((scene3Transition-.7)/.3,0,1);
          const revealScale=.72+reveal*.78;
          layer.style.zIndex='5';
          layer.style.transform=`translate3d(0,0,${(cameraZ-4*layerSpacing).toFixed(1)}px) scale(${(sceneScale*revealScale).toFixed(4)})`;
          layer.style.opacity=clamp(reveal,0,1);
          return;
        }
        const z=cameraZ-order*layerSpacing;
        const distance=Math.abs(order-sequencePos);
        // Keep a short spatial window: the current layer and its neighbor
        // are visible, while farther layers stay behind the camera until the
        // forward movement brings them into the window.
        const visibility=clamp(1-(distance-.92)/.45,0,1);
        const focus=Math.exp(-distance*.9);
        const isFutureLayer=order>sequencePos;
        const nonCurrentFactor=distance<.35?1:(isFutureLayer?.36:.72);
        let opacity=visibility*(.10 + focus*.80)*nonCurrentFactor;
        // Hold scene 5's final layer at full visibility before the exit
        // gesture begins, so the viewer sees the complete layer first.
        if(scene.classList.contains('scene-05') && order===layerCount-1 && p>=.86){
          opacity=1;
        }
        // Scene 1's fifth layer must wait until the fourth-layer people have
        // fully crossed the frame and exited on the right.
        if(scene.classList.contains('scene-01') && order===layerCount-1 && scene1PeopleProgress<.7){
          opacity=0;
        }
        if(scene.classList.contains('scene-01') && order===layerCount-1 && scene1PeopleProgress>=.7){
          opacity=1;
        }
        if(scene.classList.contains('scene-01') && order===3 && scene1PeopleMotionRunning){
          opacity=1;
        }
        const scene5Layer6Scale=scene.classList.contains('scene-05') && order===5?2.5:1;
        const scene5Layer6YOffset=scene.classList.contains('scene-05') && order===5?16:0;
        const scene1LateLayerScale=scene.classList.contains('scene-01')
          ? (order===3 ? .6 : order===4 ? .4 : 1)
          : 1;
        const scene4Layer3Scale=scene.classList.contains('scene-04')&&order===2 ? .4 : 1;
        const scale=sceneScale*(.86 + focus*.14)*scene5Layer6Scale*scene1LateLayerScale*scene4Layer3Scale;
        const depth=.34 + order*.11;
        const stackDelta=order-sequencePos;
        const exitX=scene5Exit && order===layerCount-1?scene5ExitProgress*145:0;
        // Scene 1's people layer (source 4) walks completely out to the right;
        // it no longer depends on pointer movement for its horizontal motion.
        const isScene1PeopleLayer=scene.classList.contains('scene-01')&&order===3;
        const peopleShift=isScene1PeopleLayer
          ? -130 + easeInOut(scene1PeopleProgress)*260
          : 0;
        const pointerX=isScene1PeopleLayer?0:px*parallax*depth;
        let x=pointerX + stackDelta*7 + exitX + peopleShift;
        if(scene.classList.contains('scene-04')&&order===2){
          // Layer 3 starts off-canvas left, crosses below center, then exits
          // right as the next layer approaches.
          const t=clamp((p-.4)/.48,0,1);
          const centerT=clamp(t*2,0,1);
          const exitT=clamp((t-.5)*2,0,1);
          x=-130 + easeInOut(centerT)*130 + easeInOut(exitT)*130;
        }
        let yy=py*parallax*depth + stackDelta*3.4 + scene5Layer6YOffset;
        if(scene.classList.contains('scene-04')&&order===2)yy=18;
        layer.style.transform=`translate3d(${x.toFixed(3)}%,${yy.toFixed(3)}%,${z.toFixed(1)}px) scale(${scale.toFixed(4)})`;
        layer.style.transformOrigin=`${(focusX*100).toFixed(2)}% ${(focusY*100).toFixed(2)}%`;
        const exitOpacity=scene5Exit && order===layerCount-1?1-scene5ExitProgress:1;
        layer.style.opacity=clamp(opacity*exitOpacity,0,1);
      });
      if(scene.classList.contains('scene-03')){const pause=scene.querySelector('.pause-note'); if(pause) pause.style.opacity=clamp((p-.22)*5,0,1)*(p<.88?1:clamp((1-p)*8,0,1));}
    });
    mark.textContent=String(active+1).padStart(2,'0')+' / 05';
    nav.classList.toggle('is-hidden',y>innerHeight*.75&&y>lastY+4); if(y<lastY-4)nav.classList.remove('is-hidden'); lastY=y;
  }
  function render(){raf=0;smoothY=targetY;update(targetY)}
  function requestRender(){targetY=scrollY;smoothY=targetY;update(targetY)}
  function animateScene3Ship(now){
    if(!scene3ShipRunning&&scene3Transition>=1)return;
    if(!animateScene3Ship.last)animateScene3Ship.last=now;
    const dt=Math.min(48,now-animateScene3Ship.last); animateScene3Ship.last=now;
    if(scene3ShipProgress<1){
      scene3ShipProgress=clamp(scene3ShipProgress+scene3ShipSpeed*dt,0,1);
      scene3ShipSpeed=Math.min(.00012,scene3ShipSpeed+dt*.000000004);
      if(scene3ShipProgress>=1)scene3ShipRunning=false;
    }else{
      scene3Transition=clamp(scene3Transition+dt/900,0,1);
    }
    update(scrollY);
    if(scene3ShipRunning||scene3Transition<1)requestAnimationFrame(animateScene3Ship);
    else animateScene3Ship.last=0;
  }
  function animateScene1(now){
    if(!scene1AutoRunning&&!scene1PeopleMotionRunning)return;
    if(!scene1AutoStartTime)scene1AutoStartTime=now;
    const autoProgress=clamp((now-scene1AutoStartTime)/2400,0,1);
    scene1AutoProgress=easeInOut(autoProgress);
    if(scene1PeopleMotionRunning){
      // Half-speed traversal: the original 5.2s motion now takes 10.4s.
      scene1PeopleProgress=easeInOut(clamp((now-scene1PeopleStartTime)/10400,0,1));
      if(scene1PeopleProgress>=1)scene1PeopleMotionRunning=false;
    }
    update(scrollY);
    if(autoProgress<1||scene1PeopleMotionRunning)requestAnimationFrame(animateScene1);
    else scene1AutoRunning=false;
  }
  function animateScene2(now){
    if(!scene2AutoRunning)return;
    if(!scene2AutoStartTime)scene2AutoStartTime=now;
    scene2AutoProgress=easeInOut(clamp((now-scene2AutoStartTime)/5200,0,1));
    update(scrollY);
    if(scene2AutoProgress<1)requestAnimationFrame(animateScene2);
    else scene2AutoRunning=false;
  }
  function begin(){
    if(started)return;
    started=true;
    scene1AutoStarted=true;
    scene1AutoRunning=true;
    document.body.classList.add('is-ready');
    loading.classList.add('is-hidden');
    setTimeout(()=>loading.remove(),900);
    targetY=smoothY=scrollY;
    update();
    requestAnimationFrame(animateScene1);
  }
  start.addEventListener('click',begin);addEventListener('scroll',requestRender,{passive:true});addEventListener('resize',requestRender);
  scenes.forEach((scene,i)=>{
    const stage=scene.querySelector('.stage');
    const extraAssets={
      'layer-mist': scene.querySelector('.layer-mist img')?.getAttribute('src'),
      'layer-ground': scene.querySelector('.layer-ground img')?.getAttribute('src'),
      'layer-ink': scene.querySelector('.layer-ink img')?.getAttribute('src'),
      'layer-focus': scene.querySelector('.layer-focus img')?.getAttribute('src'),
      'layer-foreground': scene.querySelector('.layer-foreground img')?.getAttribute('src')
    };
    const ui=document.createElement('div'); ui.className='interaction-ui';
    ui.innerHTML='<div class="scene-state">'+beatNames[i][0]+' · 00%</div><div class="lens" aria-hidden="true"><span></span><b>局部观察</b></div><div class="beat-caption" aria-live="polite">'+beatCopy[0][i][0]+'</div><div class="scroll-guide" aria-hidden="true"><span class="scroll-guide__mouse"><i></i></span><span class="scroll-guide__arrow">↓</span><span class="scroll-guide__text">下滑继续</span></div>'+(i===0?'<button class="shoulder-hotspot detail-trigger" data-detail-key="tools" type="button" aria-label="查看扁担与担子"><span></span><b>看一眼担子</b></button>':'')+(i===2?'<button class="bridge-hotspot detail-trigger" data-detail-key="water" type="button" aria-label="查看桥洞"><span></span><b>放大桥洞</b></button>':'')+(i===3?'<button class="coin-hotspot detail-trigger" data-detail-key="coin" type="button" aria-label="查看铜钱交易"><span></span><b>看一眼交易</b></button>':'')+(i===4?'<button class="flag-hotspot detail-trigger" data-detail-key="night" type="button" aria-label="查看酒旗与酒楼"><span></span><b>来喝酒</b></button>':'');
    stage.appendChild(ui);
    const subject=scene.querySelector('.layer-subject img'); const lens=ui.querySelector('.lens'); if(subject&&lens) lens.style.setProperty('--lens-image',`url("${subject.getAttribute('src')}")`);
    if(i===2){
      const ship=scene.querySelector('.scene-layer:nth-child(4)');
      if(ship){
        ship.style.pointerEvents='auto';
        ship.addEventListener('pointerdown',e=>{scene3ShipDragging=true;scene3ShipLastX=e.clientX;ship.setPointerCapture?.(e.pointerId)});
        ship.addEventListener('pointermove',e=>{if(!scene3ShipDragging)return;const dx=scene3ShipLastX-e.clientX;scene3ShipLastX=e.clientX;if(dx>0)scene3ShipSpeed=Math.min(.00012,scene3ShipSpeed+dx*.000002)});
        ship.addEventListener('pointerup',()=>{scene3ShipDragging=false});
        ship.addEventListener('pointercancel',()=>{scene3ShipDragging=false});
      }
    }
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;stage.style.setProperty('--pointer-x',(x*2).toFixed(3));stage.style.setProperty('--pointer-y',(y*2).toFixed(3));stage.style.setProperty('--lens-x',(x*100+50).toFixed(2)+'%');stage.style.setProperty('--lens-y',(y*100+50).toFixed(2)+'%')});
    stage.addEventListener('pointerenter',()=>stage.classList.add('is-looking')); stage.addEventListener('pointerleave',()=>stage.classList.remove('is-looking'));
  });
  let teaModalOpen=false,toolsModalOpen=false,coinModalOpen=false,nightModalOpen=false,waterModalOpen=false;
  document.querySelectorAll('.detail-trigger,.tea-hotspot').forEach(btn=>btn.addEventListener('click',()=>{const item=knowledge[btn.dataset.detailKey];if(!item)return;teaModalOpen=btn.dataset.detailKey==='tea';toolsModalOpen=btn.dataset.detailKey==='tools';coinModalOpen=btn.dataset.detailKey==='coin';nightModalOpen=btn.dataset.detailKey==='night';waterModalOpen=btn.dataset.detailKey==='water';modalTitle.textContent=item.title;modalText.textContent=item.text;if(modalHint){modalHint.hidden=!teaModalOpen&&!coinModalOpen&&!nightModalOpen&&!waterModalOpen;modalHint.textContent=coinModalOpen?'下滑进入入城　↓':nightModalOpen?'下滑继续　↓':waterModalOpen?'下滑进入桥头市集　↓':'下滑进入虹桥　↓'}modal.classList.add('is-open');modal.setAttribute('aria-hidden','false')}));
  function close(){teaModalOpen=false;toolsModalOpen=false;coinModalOpen=false;nightModalOpen=false;waterModalOpen=false;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true')}
  function continueFromModal(){if(!teaModalOpen&&!toolsModalOpen&&!coinModalOpen&&!nightModalOpen&&!waterModalOpen)return;const destination=coinModalOpen?'#scene-5':nightModalOpen?'#reading':waterModalOpen?'#scene-4':'#scene-3';close();const target=document.querySelector(destination);if(target){const range=Math.max(1,target.offsetHeight-innerHeight);window.scrollTo({top:target.offsetTop+range*.2,left:0,behavior:'auto'});requestRender()}}
  document.getElementById('modalClose').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});
  modal.addEventListener('wheel',e=>{if(e.deltaY>12)continueFromModal()},{passive:true});
  addEventListener('wheel',e=>{if((teaModalOpen||toolsModalOpen||coinModalOpen||nightModalOpen||waterModalOpen)&&e.deltaY>12)continueFromModal()},{passive:true});
  addEventListener('wheel',e=>{
    if(e.deltaY<=12||teaModalOpen||toolsModalOpen||coinModalOpen||nightModalOpen||waterModalOpen||scene2AutoRunning)return;
    const scene2=scenes[1];
    if(!scene2||scene2AutoStarted)return;
    const p=sceneProgress(scene2,scrollY);
    const scene1Finished=sceneProgress(scenes[0],scrollY)>=.98;
    const scene2Entered=scrollY+innerHeight*.5>=scene2.offsetTop;
    if(scene1Finished&&scene2Entered&&p<=.12){
      e.preventDefault();
      scene2AutoStarted=true;
      scene2AutoRunning=true;
      scene2AutoProgress=0;
      scene2AutoStartTime=0;
      requestAnimationFrame(animateScene2);
    }
  },{passive:false});
  document.querySelector('.return-link').addEventListener('click',e=>{
    e.preventDefault();
    close();
    scene2AutoStarted=false;
    scene2AutoRunning=false;
    scene2AutoProgress=0;
    scene2AutoStartTime=0;
    scene1AutoStarted=false;
    scene1AutoRunning=false;
    scene1AutoProgress=0;
    scene1AutoStartTime=0;
    scene1PeopleProgress=0;
    scene1PeopleMotionRunning=false;
    scene1PeopleStartTime=0;
    const scene1=scenes[0];
    if(scene1){history.replaceState(null,'','#scene-1');window.scrollTo({top:scene1.offsetTop,left:0,behavior:'auto'});requestRender()}
  });
  addEventListener('hashchange',()=>{
    if(location.hash!=='#scene-1')return;
    close();
    scene2AutoStarted=false;scene2AutoRunning=false;scene2AutoProgress=0;scene2AutoStartTime=0;
    scene1AutoStarted=false;scene1AutoRunning=false;scene1AutoProgress=0;scene1AutoStartTime=0;
    scene1PeopleProgress=0;scene1PeopleMotionRunning=false;scene1PeopleStartTime=0;
    const scene1=scenes[0];
    if(scene1){window.scrollTo({top:scene1.offsetTop,left:0,behavior:'auto'});requestRender()}
  });
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:'smooth'})});
  update();
}());
