(function(){
  const loading=document.getElementById('loadingPage');
  const start=document.getElementById('startExperience');
  const nav=document.getElementById('navigation');
  const mark=document.getElementById('chapterMark');
  const scenes=[...document.querySelectorAll('.scene')];
  const modal=document.getElementById('detailModal');
  const modalText=document.getElementById('modalText');
  const modalTitle=document.getElementById('modalTitle');
  const knowledge={
    tools:{title:'劳动工具',text:'扁担、担绳和篮筐是北宋流动商贩与劳动者常用的运输工具，短距离搬运常以人力完成。'},
    tea:{title:'茶文化',text:'宋代茶坊兼具饮茶、歇脚、交谈和交易功能，是城市日常生活的重要公共空间。'},
    water:{title:'水利交通',text:'汴河连接船运、桥梁和城市道路，船只过桥时需要通过篙、舵和桅杆协同调整方向。'},
    coin:{title:'钱币交易',text:'北宋日常小额交易主要使用铜钱，摊贩通过货物交换完成即时买卖。'},
    night:{title:'夜生活',text:'酒旗和酒楼构成汴京夜间商业的视觉标志。《东京梦华录》记载，京师酒店常在门首设置彩楼欢门。'}
  };
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  let started=false,lastY=0,targetY=0,smoothY=0,raf=0;
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
      const p=sceneProgress(scene,y);
      if(y+innerHeight*.5>=scene.offsetTop) active=i;
      const stage=scene.querySelector('.stage');
      const focusX=parseFloat(scene.dataset.focusX||'50')/100;
      const focusY=parseFloat(scene.dataset.focusY||'50')/100;
      const px=parseFloat(getComputedStyle(stage).getPropertyValue('--pointer-x'))||0;
      const py=parseFloat(getComputedStyle(stage).getPropertyValue('--pointer-y'))||0;
      const beat=Math.min(3,Math.floor(p*4)); scene.dataset.beat=beat;
      const state=scene.querySelector('.scene-state'); if(state) state.textContent=beatNames[i][beat]+' · '+String(Math.round(p*100)).padStart(2,'0')+'%';
      const copy=scene.querySelector('.scene-copy'); if(copy){const beatTitle=copy.querySelector('h2'); if(beatTitle) beatTitle.dataset.beatText=beatCopy[0][i][beat]; const caption=scene.querySelector('.beat-caption'); if(caption) caption.textContent=beatCopy[0][i][beat]; copy.style.setProperty('--beat-progress',p.toFixed(3));}

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
        const scene5Layer5Scale=scene.classList.contains('scene-05') && order===4?1.25:1;
        const scale=sceneScale*(.86 + focus*.14)*scene5Layer5Scale;
        const depth=.34 + order*.11;
        const stackDelta=order-sequencePos;
        const exitX=scene5Exit && order===layerCount-1?scene5ExitProgress*145:0;
        const x=px*parallax*depth + stackDelta*7 + exitX;
        const yy=py*parallax*depth + stackDelta*3.4;
        layer.style.transform=`translate3d(${x.toFixed(3)}%,${yy.toFixed(3)}%,${z.toFixed(1)}px) scale(${scale.toFixed(4)})`;
        layer.style.transformOrigin=`${(focusX*100).toFixed(2)}% ${(focusY*100).toFixed(2)}%`;
        const exitOpacity=scene5Exit && order===layerCount-1?1-scene5ExitProgress:1;
        layer.style.opacity=clamp(opacity*exitOpacity,0,0.92);
      });
      if(scene.classList.contains('scene-03')){const pause=scene.querySelector('.pause-note'); if(pause) pause.style.opacity=clamp((p-.22)*5,0,1)*(p<.88?1:clamp((1-p)*8,0,1));}
    });
    mark.textContent=String(active+1).padStart(2,'0')+' / 05';
    nav.classList.toggle('is-hidden',y>innerHeight*.75&&y>lastY+4); if(y<lastY-4)nav.classList.remove('is-hidden'); lastY=y;
  }
  function render(){raf=0;smoothY=targetY;update(targetY)}
  function requestRender(){targetY=scrollY;smoothY=targetY;update(targetY)}
  function begin(){if(started)return;started=true;document.body.classList.add('is-ready');loading.classList.add('is-hidden');setTimeout(()=>loading.remove(),900);targetY=smoothY=scrollY;update()}
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
    ui.innerHTML='<div class="scene-state">'+beatNames[i][0]+' · 00%</div><div class="lens" aria-hidden="true"><span></span><b>局部观察</b></div><div class="beat-caption" aria-live="polite">'+beatCopy[0][i][0]+'</div><div class="scroll-cue">SCROLL TO WALK <b>↓</b></div>';
    stage.appendChild(ui);
    const subject=scene.querySelector('.layer-subject img'); const lens=ui.querySelector('.lens'); if(subject&&lens) lens.style.setProperty('--lens-image',`url("${subject.getAttribute('src')}")`);
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;stage.style.setProperty('--pointer-x',(x*2).toFixed(3));stage.style.setProperty('--pointer-y',(y*2).toFixed(3));stage.style.setProperty('--lens-x',(x*100+50).toFixed(2)+'%');stage.style.setProperty('--lens-y',(y*100+50).toFixed(2)+'%')});
    stage.addEventListener('pointerenter',()=>stage.classList.add('is-looking')); stage.addEventListener('pointerleave',()=>stage.classList.remove('is-looking'));
  });
  document.querySelectorAll('.detail-trigger').forEach(btn=>btn.addEventListener('click',()=>{const item=knowledge[btn.dataset.detailKey];if(!item)return;modalTitle.textContent=item.title;modalText.textContent=item.text;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false')}));
  function close(){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true')}
  document.getElementById('modalClose').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:'smooth'})});
  update();
}());
