// Интерактивные лаборатории: синтезатор с ручками, лаборатория эффектов и схемы (аранжировка, частоты, волны, огибающие).
(function(){
const {h,EXTRA,ICON,figure,buttons}=RENDER; const D=DRAW;
let uid=0;

function slider(label,min,max,step,val,fmt,onInput,log){
  const id='c'+(++uid);
  const w=h('div','ctl'); const top=h('div','ctl-top'); const l=h('label',null,label); l.htmlFor=id; const v=h('span','ctl-v');
  top.appendChild(l); top.appendChild(v); w.appendChild(top);
  const inp=document.createElement('input'); inp.type='range'; inp.id=id; inp.min=0; inp.max=1000; inp.step=1;
  const toPos=x=>log? Math.round(1000*Math.log(x/min)/Math.log(max/min)) : Math.round(1000*(x-min)/(max-min));
  const fromPos=p=>{ let x=log? min*Math.pow(max/min,p/1000) : min+(max-min)*p/1000; if(step) x=Math.round(x/step)*step; return x; };
  inp.value=toPos(val); v.textContent=fmt(val);
  inp.addEventListener('input',()=>{ const x=fromPos(+inp.value); v.textContent=fmt(x); onInput(x); });
  w.appendChild(inp);
  return {el:w,set(x){ inp.value=toPos(x); v.textContent=fmt(x); }};
}
function seg(label,options,val,onPick){
  const w=h('div','ctl'); w.appendChild(h('div','ctl-top','<label>'+label+'</label>'));
  const row=h('div','seg'); const bs=[];
  options.forEach(([k,t])=>{ const b=h('button',null,t); b.type='button'; b.setAttribute('aria-pressed',k===val); b.addEventListener('click',()=>{ bs.forEach(x=>x.setAttribute('aria-pressed',x===b)); onPick(k); }); bs.push(b); row.appendChild(b); });
  w.appendChild(row);
  return {el:w,set(k){ bs.forEach((b,i)=>b.setAttribute('aria-pressed',options[i][0]===k)); }};
}
const fHz=x=>x>=1000?(x/1000).toFixed(x>=10000?0:1)+' kHz':Math.round(x)+' Hz';
const fMs=x=>x>=1?x.toFixed(2)+' s':Math.round(x*1000)+' ms';
const fPct=x=>Math.round(x*100)+' %';

// ——— огибающая ADSR (рисунок)
function adsrSvg(p,w,hgt){
  w=w||300; hgt=hgt||110; const s=D.svg(w,hgt); s.style.maxWidth='100%';
  const total=p.A+p.D+0.6+p.R; const X=t=>8+(w-16)*t/total, Y=v=>hgt-18-(hgt-34)*v;
  const pts=[[0,0],[p.A,1],[p.A+p.D,p.S],[p.A+p.D+0.6,p.S],[total,0]];
  D.el('path',{d:'M'+pts.map(q=>X(q[0])+' '+Y(q[1])).join(' L '),fill:'none',stroke:'var(--accent)','stroke-width':2.5,'stroke-linejoin':'round'},s);
  D.el('line',{x1:8,y1:hgt-18,x2:w-8,y2:hgt-18,stroke:'var(--grid-strong)'},s);
  [['A',p.A/2],['D',p.A+p.D/2],['S',p.A+p.D+0.3],['R',p.A+p.D+0.6+p.R/2]].forEach(([t,x])=>D.el('text',{x:X(x),y:hgt-4,'text-anchor':'middle',class:'svg-muted'},s,t));
  D.el('text',{x:X(p.A+p.D+0.3),y:Y(1)+4,'text-anchor':'middle',class:'svg-muted'},s,'клавиша нажата');
  return s;
}

// ——— пресеты синтезатора
const PRESETS={
  'Простой бас':{wave:'sawtooth',mode:'mono',cutoff:420,res:2,env:2.5,fD:.25,fS:.3,A:.003,D:.3,S:.6,R:.06,lfoRate:2,lfo:0,pat:'bass'},
  'Саб-бас':{wave:'sine',mode:'mono',cutoff:400,res:.5,env:0,fD:.2,fS:1,A:.005,D:.2,S:.9,R:.08,lfoRate:2,lfo:0,pat:'sub'},
  'Акид-бас':{wave:'sawtooth',mode:'mono',cutoff:260,res:14,env:4,fD:.16,fS:.05,A:.002,D:.2,S:.4,R:.05,lfoRate:2,lfo:0,pat:'acid'},
  'Вобл-бас':{wave:'fatsawtooth',mode:'mono',cutoff:180,res:7,env:0,fD:.2,fS:1,A:.01,D:.2,S:1,R:.1,lfoRate:3,lfo:.8,pat:'wobble'},
  'Пэд':{wave:'fatsawtooth',mode:'poly',cutoff:1100,res:1,env:1.2,fD:1.2,fS:.6,A:.9,D:1,S:.8,R:2,lfoRate:.3,lfo:.15,pat:'pad'},
  'Плак':{wave:'sawtooth',mode:'poly',cutoff:500,res:3,env:4,fD:.12,fS:0,A:.001,D:.35,S:0,R:.25,lfoRate:2,lfo:0,pat:'arp'},
  'Стаб':{wave:'square',mode:'poly',cutoff:1400,res:4,env:3,fD:.1,fS:.1,A:.001,D:.18,S:0,R:.12,lfoRate:2,lfo:0,pat:'stab'},
  'Супер-сау':{wave:'fatsawtooth',mode:'poly',cutoff:5000,res:1,env:1,fD:.4,fS:.8,A:.02,D:.3,S:.8,R:.4,lfoRate:2,lfo:0,pat:'chords'},
  'Лид':{wave:'square',mode:'mono',cutoff:2800,res:2,env:1.5,fD:.3,fS:.6,A:.01,D:.2,S:.7,R:.2,lfoRate:5,lfo:.05,pat:'lead'}
};
const off=[2,6,10,14];
const PATS={
  bass:{bars:2,bpm:124,notes:[...off.map(s=>['A1',s,2]),...off.map(s=>['F1',s+16,2])]},
  sub:{bars:2,bpm:140,notes:[['A0',0,10],['A0',10,6],['C1',16,8],['G0',24,8]]},
  acid:{bars:2,bpm:128,notes:[['A1',0,1],['A1',2,1],['A2',3,1],['A1',5,1],['C2',6,2],['A1',8,1],['G1',10,1],['A2',11,1],['A1',13,1],['E2',14,2],['A1',16,1],['A2',18,1],['A1',19,1],['C2',21,1],['D2',22,2],['A1',24,1],['G2',26,1],['A1',28,1],['E2',30,2]]},
  wobble:{bars:2,bpm:140,notes:[['A1',0,8],['A1',8,8],['C2',16,8],['G1',24,8]]},
  pad:{bars:2,bpm:90,notes:[['A2',0,16],['C3',0,16],['E3',0,16],['B3',0,16],['F2',16,16],['A2',16,16],['C3',16,16],['E3',16,16]]},
  arp:{bars:2,bpm:124,notes:(()=>{ const o=[]; [['A3','C4','E4','A4'],['F3','A3','C4','F4']].forEach((c,b)=>{ for(let i=0;i<16;i++) o.push([c[[0,1,2,3,2,1,0,2][i%8]],b*16+i,1]); }); return o; })()},
  stab:{bars:2,bpm:124,notes:(()=>{ const o=[]; [['A3','C4','E4'],['G3','B3','D4']].forEach((c,b)=>[2,6,10,14].forEach(s=>c.forEach(n=>o.push([n,b*16+s,1])))); return o; })()},
  chords:{bars:2,bpm:138,notes:[['A3',0,14],['C4',0,14],['E4',0,14],['F3',16,14],['A3',16,14],['C4',16,14]]},
  lead:{bars:2,bpm:120,notes:[['E4',0,2],['E4',2,2],['D4',4,2],['C4',6,4],['A3',12,4],['C4',16,2],['D4',18,2],['E4',20,4],['G4',24,2],['E4',26,6]]}
};

function synthLab(spec){
  const id='synth'+(++uid);
  const {f,head,addCap}=figure(spec.title||'Синтезатор','');
  let P=Object.assign({},PRESETS[spec.preset||'Простой бас']);
  let built=null;
  function build(){
    if(built) return built;
    const T=Tone;
    const out=new T.Gain(0.8).toDestination();
    const rev=new T.Reverb({decay:2.5,wet:0.18}).connect(out);
    const lfoF=new T.Filter({frequency:20000,type:'lowpass',Q:1}).connect(rev);
    const lfo=new T.LFO({frequency:2,min:200,max:4000});
    const opts=()=>({oscillator:P.wave.startsWith('fat')?{type:P.wave,count:3,spread:30}:{type:P.wave},filter:{Q:P.res,type:'lowpass',rolloff:-24},
      envelope:{attack:P.A,decay:P.D,sustain:P.S,release:P.R},filterEnvelope:{attack:Math.min(P.A,0.5),decay:P.fD,sustain:P.fS,release:P.R,baseFrequency:P.lfo>0?12000:P.cutoff,octaves:P.env}});
    const mono=new T.MonoSynth(opts()).connect(lfoF); mono.volume.value=-10;
    const poly=new T.PolySynth(T.MonoSynth,opts()).connect(lfoF); poly.volume.value=-18; poly.maxPolyphony=8;
    built={mono,poly,lfo,lfoF,apply(){
      const o=opts(); mono.set(o); poly.set(o);
      mono.volume.value=P.wave==='sine'?-4:-11; poly.volume.value=P.wave.startsWith('fat')?-22:-18;
      if(P.lfo>0){ lfo.frequency.value=P.lfoRate; lfo.min=P.cutoff; lfo.max=Math.min(18000,P.cutoff*(1+P.lfo*24)); if(lfo.state!=='started'){ lfo.connect(lfoF.frequency); lfo.start(); } lfoF.Q.value=Math.max(1,P.res*0.7); }
      else { if(lfo.state==='started'){ lfo.stop(); lfo.disconnect(); } lfoF.frequency.value=20000; lfoF.Q.value=1; }
    },voice(){ return P.mode==='mono'?mono:poly; }};
    built.apply();
    return built;
  }
  function apply(){ if(built) built.apply(); drawEnv(); }
  // транспорт
  const tr=h('div','transport'); head.appendChild(tr);
  const play=h('button','btn play',ICON.play+' Фраза'); play.dataset.label='Фраза'; play.setAttribute('aria-pressed','false'); tr.appendChild(play); buttons.set(id,play);
  play.addEventListener('click',async()=>{ if(AUDIO.current()===id){ AUDIO.stop(); return; } await AUDIO.start(); const b=build();
    const pat=PATS[P.pat]||PATS.bass; AUDIO.play(id,()=>({bpm:pat.bpm,bars:pat.bars,layers:[{type:'notes',obj:b.voice(),notes:pat.notes}].concat(spec.drums===false?[]:[{type:'drums',rows:[{sound:'kick',hits:P.pat==='pad'?[]:[0,4,8,12,16,20,24,28]},{sound:'hat',hits:P.pat==='pad'?[]:[2,6,10,14,18,22,26,30],v:.5}]}])})); });
  AUDIO.onStop(()=>{ if(built){ built.mono.triggerRelease(); built.poly.releaseAll(); } });
  // пресеты
  const pr=h('div','seg presets'); const presetBtns=[];
  Object.keys(PRESETS).forEach(name=>{ const b=h('button',null,name); b.type='button'; b.setAttribute('aria-pressed',name===(spec.preset||'Простой бас'));
    b.addEventListener('click',()=>{ P=Object.assign({},PRESETS[name]); presetBtns.forEach(x=>x.setAttribute('aria-pressed',x===b)); syncCtl(); apply(); if(AUDIO.current()===id) play.click(),play.click(); }); presetBtns.push(b); pr.appendChild(b); });
  const prWrap=h('div'); prWrap.appendChild(h('div','eyebrow','Звуки-рецепты')); prWrap.appendChild(pr); f.appendChild(prWrap);
  // панель
  const panel=h('div','synth'); f.appendChild(panel);
  const col=(title,num)=>{ const c=h('div','synth-col'); c.appendChild(h('div','synth-h',(num?'<span class="note-name" style="background:var(--mark);color:#fff">'+num+'</span> ':'')+title)); panel.appendChild(c); return c; };
  const c1=col('Осциллятор','1'), c2=col('Фильтр','2'), c3=col('Громкость: ADSR','3'), c4=col('LFO → фильтр','4');
  const ctl={};
  ctl.wave=seg('Форма волны',[['sine','Синус'],['triangle','Треуг.'],['sawtooth','Пила'],['square','Квадрат'],['fatsawtooth','Пила ×3']],P.wave,k=>{P.wave=k;apply();}); c1.appendChild(ctl.wave.el);
  ctl.mode=seg('Голоса',[['mono','Mono'],['poly','Poly']],P.mode,k=>{P.mode=k;apply();}); c1.appendChild(ctl.mode.el);
  ctl.cutoff=slider('Частота (Freq)',40,15000,0,P.cutoff,fHz,x=>{P.cutoff=x;apply();},true); c2.appendChild(ctl.cutoff.el);
  ctl.res=slider('Резонанс (Res)',0.3,18,0.1,P.res,x=>x.toFixed(1),x=>{P.res=x;apply();}); c2.appendChild(ctl.res.el);
  ctl.env=slider('Огибающая → фильтр',0,6,0.1,P.env,x=>x.toFixed(1)+' окт.',x=>{P.env=x;apply();}); c2.appendChild(ctl.env.el);
  ctl.fD=slider('Её спад (Decay)',0.02,2,0.01,P.fD,fMs,x=>{P.fD=x;apply();},true); c2.appendChild(ctl.fD.el);
  ctl.A=slider('Attack',0.001,2,0.001,P.A,fMs,x=>{P.A=x;apply();},true); c3.appendChild(ctl.A.el);
  ctl.D=slider('Decay',0.02,3,0.01,P.D,fMs,x=>{P.D=x;apply();},true); c3.appendChild(ctl.D.el);
  ctl.S=slider('Sustain',0,1,0.01,P.S,fPct,x=>{P.S=x;apply();}); c3.appendChild(ctl.S.el);
  ctl.R=slider('Release',0.01,4,0.01,P.R,fMs,x=>{P.R=x;apply();},true); c3.appendChild(ctl.R.el);
  const envBox=h('div'); c3.appendChild(envBox);
  ctl.lfoRate=slider('Скорость (Rate)',0.1,12,0.05,P.lfoRate,x=>x.toFixed(2)+' Hz',x=>{P.lfoRate=x;apply();},true); c4.appendChild(ctl.lfoRate.el);
  ctl.lfo=slider('Глубина (Amount)',0,1,0.01,P.lfo,fPct,x=>{P.lfo=x;apply();}); c4.appendChild(ctl.lfo.el);
  c4.appendChild(h('div','fig-cap','LFO качает частоту фильтра вверх-вниз. С глубиной 0 он выключен.'));
  function drawEnv(){ envBox.innerHTML=''; envBox.appendChild(adsrSvg(P,260,90)); }
  function syncCtl(){ ['cutoff','res','env','fD','A','D','S','R','lfoRate','lfo'].forEach(k=>ctl[k].set(P[k])); ctl.wave.set(P.wave); ctl.mode.set(P.mode); }
  drawEnv();
  // клавиатура
  const kb=h('div','scroll'); f.appendChild(kb);
  const from=NOTE.midi(spec.from||'C2'), to=NOTE.midi(spec.to||'C4');
  const whites=[]; for(let m=from;m<=to;m++) if(!NOTE.isBlack(m)) whites.push(m);
  const ww=34,wh=120; const s=D.svg(whites.length*ww+2,wh+4); kb.appendChild(s);
  const xOf={}; whites.forEach((m,i)=>xOf[m]=1+i*ww);
  const keyEls={};
  async function down(m){ await AUDIO.start(); const b=build(); b.voice().triggerAttack(AUDIO.hz(m),undefined,0.8); keyEls[m]&&keyEls[m].classList.add('kb-on'); }
  function up(m){ if(!built) return; const v=built.voice(); if(v===built.poly) v.triggerRelease(AUDIO.hz(m)); else v.triggerRelease(); keyEls[m]&&keyEls[m].classList.remove('kb-on'); }
  const bindKey=(r,m)=>{ r.addEventListener('pointerdown',e=>{ e.preventDefault(); down(m); }); r.addEventListener('pointerup',()=>up(m)); r.addEventListener('pointerleave',e=>{ if(e.buttons) up(m); }); keyEls[m]=r; };
  whites.forEach(m=>{ const r=D.el('rect',{x:xOf[m],y:2,width:ww,height:wh,rx:3,class:'kb-w'},s); bindKey(r,m); if(m%12===0) D.el('text',{x:xOf[m]+ww/2,y:wh-6,'text-anchor':'middle',class:'kb-name'},s,NOTE.name(m)); });
  for(let m=from;m<=to;m++){ if(!NOTE.isBlack(m)) continue; const r=D.el('rect',{x:xOf[m-1]+ww-11,y:2,width:22,height:74,rx:2,class:'kb-b'},s); bindKey(r,m); }
  // клавиатура компьютера
  const map={a:0,w:1,s:2,e:3,d:4,f:5,t:6,g:7,y:8,h:9,u:10,j:11,k:12,o:13,l:14,p:15};
  let focusIn=false; f.addEventListener('pointerenter',()=>focusIn=true); f.addEventListener('pointerleave',()=>focusIn=false);
  const held=new Set();
  document.addEventListener('keydown',e=>{ if(!focusIn||e.repeat||e.target.tagName==='INPUT') return; const k=map[e.key.toLowerCase()]; if(k==null) return; const m=NOTE.midi(spec.keyBase||'C3')+k; held.add(m); down(m); });
  document.addEventListener('keyup',e=>{ const k=map[e.key.toLowerCase()]; if(k==null) return; const m=NOTE.midi(spec.keyBase||'C3')+k; if(held.has(m)){ held.delete(m); up(m); } });
  f.appendChild(h('figcaption','fig-cap','Держи клавишу дольше — услышишь Sustain, отпусти — Release. Когда мышь над синтезатором, можно играть и клавишами компьютера: ряд A S D F G H J K — белые клавиши от {{C3}}, W E T Y U — чёрные. '+(spec.cap||'')));
  f.querySelector('figcaption').innerHTML=RENDER.fmt(f.querySelector('figcaption').innerHTML);
  return f;
}

// ——— лаборатория эффектов
function fxLab(spec){
  const id='fx'+(++uid); const show=new Set(spec.fx||['eq','comp','sat','reverb','delay','sidechain','sweep']);
  const {f,head}=figure(spec.title||'Лаборатория эффектов','');
  const st={eq:{on:false,lo:20,hi:20000},comp:{on:false,th:-24,ratio:6},sat:{on:false,amt:.5},reverb:{on:false,send:.5},delay:{on:false,send:.4},sidechain:{on:false,depth:.8,rel:.18},sweep:{on:false}};
  Object.assign(st,spec.init||{});
  let G=null;
  function build(){
    if(G) return G; const T=Tone;
    const out=new T.Gain(0.85).toDestination();
    const lim=new T.Limiter(-1).connect(out);
    const sat=new T.Distortion({distortion:0,wet:0}).connect(lim);
    const hp=new T.Filter({frequency:20,type:'highpass',rolloff:-24}).connect(sat);
    const lp=new T.Filter({frequency:20000,type:'lowpass',rolloff:-24,Q:1}).connect(hp);
    const rev=new T.Reverb({decay:2.8,wet:1}).connect(lp); const revSend=new T.Gain(0).connect(rev);
    const dly=new T.FeedbackDelay({delayTime:'8n.',feedback:0.38,wet:1}).connect(lp); const dlySend=new T.Gain(0).connect(dly);
    const comp=new T.Compressor({threshold:0,ratio:1,attack:0.005,release:0.12}); const mk=new T.Gain(1); comp.connect(mk); mk.connect(lp);
    const drumBus=new T.Gain(1).connect(comp);
    const duck=new T.Gain(1).connect(lp); duck.connect(revSend); duck.connect(dlySend);
    const kick=new T.MembraneSynth({pitchDecay:0.045,octaves:6,envelope:{attack:0.001,decay:0.4,sustain:0}}).connect(drumBus);
    const snF=new T.Filter(1500,'bandpass').connect(drumBus); snF.connect(revSend);
    const clap=new T.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.003,decay:0.15,sustain:0}}).connect(snF); clap.volume.value=0;
    const hF=new T.Filter(7000,'highpass').connect(drumBus); hF.connect(dlySend);
    const hat=new T.NoiseSynth({envelope:{attack:0.001,decay:0.05,sustain:0}}).connect(hF); hat.volume.value=-12;
    const bass=new T.MonoSynth({oscillator:{type:'sawtooth'},filter:{Q:1.5},envelope:{attack:0.004,decay:0.3,sustain:0.8,release:0.1},filterEnvelope:{baseFrequency:120,octaves:2.5,decay:0.3,sustain:0.4}}).connect(duck); bass.volume.value=-10;
    const chords=new T.PolySynth(T.Synth,{oscillator:{type:'fatsawtooth',count:3,spread:20},envelope:{attack:0.05,decay:0.4,sustain:0.7,release:0.6}}); chords.volume.value=-22;
    const chF=new T.Filter(2500,'lowpass').connect(duck); chords.connect(chF);
    const sweep=new T.LFO({frequency:0.25,min:250,max:16000,type:'sine'});
    G={out,sat,hp,lp,revSend,dlySend,comp,mk,duck,kick,clap,hat,bass,chords,sweep};
    applyAll(); return G;
  }
  function applyAll(){ if(!G) return;
    G.hp.frequency.value=st.eq.on?st.eq.lo:20; if(!st.sweep.on) G.lp.frequency.value=st.eq.on?st.eq.hi:20000;
    G.comp.threshold.value=st.comp.on?st.comp.th:0; G.comp.ratio.value=st.comp.on?st.comp.ratio:1; G.mk.gain.value=st.comp.on?Tone.dbToGain(-st.comp.th*(1-1/st.comp.ratio)*0.5):1;
    G.sat.distortion=st.sat.on?st.sat.amt:0; G.sat.wet.value=st.sat.on?1:0;
    G.revSend.gain.value=st.reverb.on?st.reverb.send:0; G.dlySend.gain.value=st.delay.on?st.delay.send:0;
    if(st.sweep.on){ if(G.sweep.state!=='started'){ G.sweep.frequency.value=Tone.Transport.bpm.value/60/8; G.sweep.connect(G.lp.frequency); G.sweep.start(); } }
    else if(G.sweep.state==='started'){ G.sweep.stop(); G.sweep.disconnect(); G.lp.frequency.value=st.eq.on?st.eq.hi:20000; }
  }
  const tr=h('div','transport'); head.appendChild(tr);
  const play=h('button','btn play',ICON.play+' Слушать'); play.dataset.label='Слушать'; play.setAttribute('aria-pressed','false'); tr.appendChild(play); buttons.set(id,play);
  tr.appendChild(h('span','bpm','124 BPM · 2 такта'));
  const off=[2,6,10,14], four=[0,4,8,12];
  play.addEventListener('click',async()=>{ if(AUDIO.current()===id){ AUDIO.stop(); return; } await AUDIO.start(); const g=build();
    const kickFn=(t,v)=>{ g.kick.triggerAttackRelease('C1','8n',t,v); if(st.sidechain.on){ g.duck.gain.cancelScheduledValues(t); g.duck.gain.setValueAtTime(1-st.sidechain.depth,t); g.duck.gain.linearRampToValueAtTime(1,t+st.sidechain.rel); } else g.duck.gain.setValueAtTime(1,t); };
    AUDIO.play(id,()=>({bpm:124,bars:2,layers:[
      {type:'drums',rows:[{sound:'kick',fn:kickFn,hits:[...four,...four.map(s=>s+16)]},{sound:'clap',fn:(t,v)=>g.clap.triggerAttackRelease('16n',t,v),hits:[4,12,20,28]},{sound:'hat',fn:(t,v)=>g.hat.triggerAttackRelease('32n',t,v),hits:[...off,...off.map(s=>s+16)]}]},
      {type:'notes',obj:g.bass,notes:[...off.map(s=>['A1',s,2]),...off.map(s=>['F1',s+16,2])]},
      {type:'notes',obj:g.chords,notes:[['A3',0,15],['C4',0,15],['E4',0,15],['A3',16,15],['C4',16,15],['F4',16,15]]}]})); applyAll(); });
  AUDIO.onStop(()=>{ if(G){ G.bass.triggerRelease(); G.chords.releaseAll(); G.duck.gain.cancelScheduledValues(0); G.duck.gain.value=1; } });
  const grid=h('div','fxgrid'); f.appendChild(grid);
  const box=(key,title,desc,ctrls)=>{ if(!show.has(key)) return; const b=h('div','fx'); const top=h('label','fx-top');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='fx'+(++uid); cb.checked=st[key].on; cb.addEventListener('change',()=>{ st[key].on=cb.checked; b.classList.toggle('on',cb.checked); applyAll(); });
    top.appendChild(cb); top.appendChild(h('span',null,'<b>'+title+'</b>')); b.appendChild(top); b.appendChild(h('div','fx-d',desc)); (ctrls||[]).forEach(c=>b.appendChild(c.el)); b.classList.toggle('on',st[key].on); grid.appendChild(b); };
  box('eq','EQ: срез низа и верха','Убирает лишнее снизу и сверху. Срежь низ до 300 Hz — пропадёт вес. Срежь верх до 2 kHz — станет глухо, как за стеной.',[
    slider('Срез низа (Low Cut)',20,1000,0,st.eq.lo,fHz,x=>{st.eq.lo=x;applyAll();},true),slider('Срез верха (High Cut)',500,20000,0,st.eq.hi,fHz,x=>{st.eq.hi=x;applyAll();},true)]);
  box('comp','Компрессор на барабанах','Сжимает громкие удары и подтягивает тихие. Барабаны становятся плотнее и ровнее, хвосты хэтов и хлопка слышнее.',[
    slider('Порог (Threshold)',-50,0,1,st.comp.th,x=>Math.round(x)+' dB',x=>{st.comp.th=x;applyAll();}),slider('Сила (Ratio)',1,20,0.5,st.comp.ratio,x=>x.toFixed(1)+' : 1',x=>{st.comp.ratio=x;applyAll();})]);
  box('sat','Сатурация','Мягкое искажение. Добавляет плотность и тепло, на большом значении — грязь и рык.',[slider('Сила (Drive)',0,1,0.01,st.sat.amt,fPct,x=>{st.sat.amt=x;applyAll();})]);
  box('reverb','Реверберация','Пространство: звук будто в комнате или зале. Посылается на аккорды и хлопок.',[slider('Посыл (Send)',0,1,0.01,st.reverb.send,fPct,x=>{st.reverb.send=x;applyAll();})]);
  box('delay','Дилей','Эхо в ритм трека: повторяет звук через точку восьмой. Посылается на аккорды и хэты.',[slider('Посыл (Send)',0,1,0.01,st.delay.send,fPct,x=>{st.delay.send=x;applyAll();})]);
  box('sidechain','Sidechain от бочки','Бас и аккорды становятся тише в момент удара бочки и сразу возвращаются. Появляется «дыхание» и место для бочки.',[
    slider('Глубина',0,1,0.01,st.sidechain.depth,fPct,x=>{st.sidechain.depth=x;}),slider('Возврат (Release)',0.04,0.45,0.01,st.sidechain.rel,fMs,x=>{st.sidechain.rel=x;},true)]);
  box('sweep','Автоматизация фильтра','Фильтр сам открывается и закрывается за 4 такта — так звучат нарастания и переходы.',[]);
  f.appendChild(h('figcaption','fig-cap','Включай и выключай эффекты галочками во время игры — так лучше всего слышно, что каждый делает. '+(spec.cap||'')));
  return f;
}

// ——— схема аранжировки: секции × дорожки + кривая энергии
function arrangement(spec){
  const {f,addCap}=figure(spec.title,spec.cap);
  const tracks=spec.tracks, secs=spec.sections; const totalBars=secs.reduce((a,s)=>a+s[1],0);
  const lw=110, bw=Math.max(4,Math.min(12,Math.floor(760/totalBars))), top=70, rh=22;
  const W=lw+totalBars*bw+10, H=top+tracks.length*rh+10;
  const s=D.svg(W,H);
  const colors=['var(--kick)','var(--bass)','var(--chord)','var(--lead)','var(--hat)','var(--perc)','var(--snare)','var(--note)'];
  let x=lw; const pts=[];
  secs.forEach(([name,bars,on,energy])=>{ const w=bars*bw;
    D.el('rect',{x,y:top-26,width:w-1,height:20,rx:3,class:'ab-zone-d'},s);
    D.el('text',{x:x+4,y:top-12,class:'svg-text',style:'font-size:10px'},s,(w>50?name:name.slice(0,3))+(w>80?' · '+bars:''));
    tracks.forEach((t,i)=>{ if(on.includes(i)) D.el('rect',{x:x+1,y:top+i*rh+3,width:w-3,height:rh-6,rx:3,fill:colors[i%colors.length],'fill-opacity':0.7},s); });
    pts.push([x,energy],[x+w,energy]); x+=w; });
  tracks.forEach((t,i)=>D.el('text',{x:4,y:top+i*rh+15,class:'svg-label'},s,t));
  D.el('text',{x:4,y:22,class:'svg-muted'},s,'энергия');
  D.el('path',{d:'M'+pts.map(p=>p[0]+' '+(40-p[1]*30)).join(' L '),fill:'none',stroke:'var(--mark)','stroke-width':2},s);
  let bx=lw; for(let b=0;b<=totalBars;b+=8){ D.el('text',{x:lw+b*bw,y:H-0,class:'svg-muted',style:'font-size:9px'},s,''); }
  const box=h('div','scroll'); box.appendChild(s); f.appendChild(box); addCap(); return f;
}

// ——— частоты инструментов
function freqChart(spec){
  const {f,addCap}=figure(spec.title||'Где звучат инструменты',spec.cap);
  const items=spec.items; const lw=150, W=900, top=26, rh=24, H=top+items.length*rh+24;
  const s=D.svg(W,H); s.setAttribute('width','100%'); s.removeAttribute('height'); s.style.height='auto'; s.style.minWidth='620px';
  const X=hz=>lw+(W-lw-20)*Math.log(hz/20)/Math.log(1000);
  [[20,'20'],[60,'60'],[100,'100'],[250,'250'],[500,'500'],[1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k'],[20000,'20k Hz']].forEach(([hz,l])=>{ D.el('line',{x1:X(hz),y1:top-6,x2:X(hz),y2:H-20,class:'pr-line'},s); D.el('text',{x:X(hz),y:H-6,'text-anchor':'middle',class:'svg-muted'},s,l); });
  [['саб',20,60],['низ',60,250],['низ-середина',250,500],['середина',500,2000],['верх-середина',2000,6000],['воздух',6000,20000]].forEach(([n,a,b])=>D.el('text',{x:(X(a)+X(b))/2,y:14,'text-anchor':'middle',class:'svg-muted'},s,n));
  const colors=['var(--kick)','var(--bass)','var(--snare)','var(--hat)','var(--chord)','var(--lead)','var(--perc)','var(--note)'];
  items.forEach(([name,lo,hi,core],i)=>{ const y=top+i*rh;
    D.el('text',{x:4,y:y+15,class:'svg-label'},s,name);
    D.el('rect',{x:X(lo),y:y+5,width:X(hi)-X(lo),height:rh-10,rx:4,fill:colors[i%colors.length],'fill-opacity':0.3},s);
    if(core) D.el('rect',{x:X(core[0]),y:y+5,width:X(core[1])-X(core[0]),height:rh-10,rx:4,fill:colors[i%colors.length],'fill-opacity':0.85},s); });
  const box=h('div','scroll'); box.appendChild(s); f.appendChild(box); addCap(); return f;
}

// ——— формы волн, каждую можно послушать
function waves(spec){
  const {f,addCap}=figure(spec.title||'Формы волн',spec.cap);
  const row=h('div'); row.style.cssText='display:flex;flex-wrap:wrap;gap:14px';
  const shapes={sine:'Синус',triangle:'Треугольник',sawtooth:'Пила',square:'Квадрат'};
  let osc=null;
  Object.keys(shapes).forEach(k=>{ const c=h('div'); const s=D.svg(150,70);
    let d=''; for(let i=0;i<=140;i++){ const t=(i/70)%1; let y; if(k==='sine') y=Math.sin(t*2*Math.PI); else if(k==='triangle') y=t<.25?4*t:t<.75?2-4*t:4*t-4; else if(k==='sawtooth') y=1-2*t; else y=t<.5?1:-1; d+=(i?'L':'M')+(5+i)+' '+(35-y*26); }
    D.el('line',{x1:5,y1:35,x2:145,y2:35,stroke:'var(--grid-strong)'},s); D.el('path',{d,fill:'none',stroke:'var(--accent)','stroke-width':2.5},s);
    const b=h('button','btn',ICON.play+' '+shapes[k]); b.addEventListener('pointerdown',async()=>{ await AUDIO.start(); if(osc){osc.stop();osc.dispose();} osc=new Tone.Oscillator({frequency:spec.hz||110,type:k,volume:k==='sine'||k==='triangle'?-8:-18}).toDestination().start(); });
    const stopIt=()=>{ if(osc){ osc.stop(); osc.dispose(); osc=null; } }; b.addEventListener('pointerup',stopIt); b.addEventListener('pointerleave',stopIt);
    c.appendChild(s); c.appendChild(b); row.appendChild(c); });
  f.appendChild(row); f.appendChild(h('div','fig-cap','Нажми и держи кнопку — звучит, пока держишь.')); addCap(); return f;
}

// ——— огибающая (статичный рисунок)
function env(spec){ const {f,addCap}=figure(spec.title,spec.cap); const box=h('div','scroll'); box.appendChild(adsrSvg(spec,520,150)); f.appendChild(box); addCap(); return f; }

// ——— линия автоматизации под клипом
function auto(spec){
  const {f,addCap}=figure(spec.title,spec.cap); const W=760,H=120; const s=D.svg(W,H); s.setAttribute('width','100%'); s.removeAttribute('height'); s.style.height='auto'; s.style.minWidth='520px';
  const bars=spec.bars||8; for(let b=0;b<=bars;b++){ D.el('line',{x1:20+b*(W-40)/bars,y1:10,x2:20+b*(W-40)/bars,y2:H-20,class:b%4?'pr-beat':'pr-bar'},s); D.el('text',{x:24+b*(W-40)/bars,y:H-6,class:'svg-muted'},s,b<bars?String(b+1):''); }
  D.el('rect',{x:20,y:10,width:W-40,height:H-30,fill:'none',stroke:'var(--grid-strong)'},s);
  const P=spec.points.map(([x,y])=>[20+x*(W-40),10+(1-y)*(H-30)]);
  D.el('path',{d:'M'+P.map(p=>p.join(' ')).join(' L '),fill:'none',stroke:'var(--mark)','stroke-width':2.5},s);
  P.forEach(p=>D.el('circle',{cx:p[0],cy:p[1],r:4,fill:'var(--mark)'},s));
  D.el('text',{x:26,y:24,class:'svg-text'},s,spec.label||'');
  const box=h('div','scroll'); box.appendChild(s); f.appendChild(box); addCap(); return f;
}

Object.assign(EXTRA,{synth:synthLab,fx:fxLab,arr:arrangement,freq:freqChart,waves,env,auto});
window.LABS={PRESETS};
})();
