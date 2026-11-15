// Библиотека рисунков: пиано-ролл, сетка барабанов, клавиатура, ручки устройств, схема MiniLab 3, схема окна Ableton.
(function(){
  const NS='http://www.w3.org/2000/svg';
  function svg(w,h){ const s=document.createElementNS(NS,'svg'); s.setAttribute('viewBox',`0 0 ${w} ${h}`); s.setAttribute('width',w); s.setAttribute('height',h); s.setAttribute('role','img'); return s; }
  function el(tag,attrs,parent,text){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(text!=null) e.textContent=text; if(parent) parent.appendChild(e); return e; }
  // Телефон: рисунки подстраиваются под ширину экрана, без прокрутки вбок.
  function narrow(){ return window.innerWidth<=900; }
  function avail(){ return Math.max(260,Math.min(document.documentElement.clientWidth,1000)-64); }
  function badge(g,x,y,label,r){ r=r||11; el('circle',{cx:x,cy:y,r,class:'badge-c'},g); el('text',{x,y:y+4,'text-anchor':'middle',class:'badge-t'},g,label); }
  const COLORS={note:'var(--note)',bass:'var(--bass)',sub:'var(--bass)',reese:'var(--bass)',chord:'var(--chord)',pad:'var(--chord)',keys:'var(--chord)',lead:'var(--lead)',pluck:'var(--lead)'};

  // ——— Барабаны: учебный кит. Пэды банка A MiniLab шлют ноты C1–G1, банка B — G#1–D#2.
  const KIT={
    kick:{ru:'Бочка',en:'Kick',note:'C1',c:'var(--kick)'},
    rim:{ru:'Римшот',en:'Rim',note:'C#1',c:'var(--perc)'},
    snare:{ru:'Малый',en:'Snare',note:'D1',c:'var(--snare)'},
    clap:{ru:'Хлопок',en:'Clap',note:'D#1',c:'var(--snare)'},
    tom:{ru:'Том',en:'Tom',note:'F1',c:'var(--perc)'},
    hat:{ru:'Закр. хэт',en:'Closed Hat',note:'F#1',c:'var(--hat)'},
    shaker:{ru:'Шейкер',en:'Shaker',note:'G1',c:'var(--hat)'},
    ohat:{ru:'Откр. хэт',en:'Open Hat',note:'A#1',c:'var(--hat)'},
    crash:{ru:'Тарелка',en:'Crash',note:'C#2',c:'var(--perc)'}
  };
  // Нижние 8 ячеек Drum Rack (C1–G1) играются пэдами 1–8 MiniLab.
  function padOf(note){ const m=NOTE.midi(note); if(m>=36&&m<=43) return String(m-35); return '—'; }

  function drumGrid(rows,o){
    o=o||{}; const steps=(o.bars||1)*16, nar=narrow();
    // на телефоне: узкая колонка названий и по одному такту в строке
    let lw=176, cw=steps<=16?30:steps<=32?20:12, per=steps;
    if(nar){ lw=86; per=Math.min(16,steps); cw=Math.max(12,Math.min(30,Math.floor((avail()-lw-2)/per))); }
    const ch=28, top=22, lines=Math.ceil(steps/per), gap=lines>1?12:0, lineH=top+rows.length*ch+gap;
    const W=lw+per*cw+2, H=lines*lineH-gap+2;
    const cx=i=>lw+(i%per)*cw, ly=i=>Math.floor(i/per)*lineH;
    const s=svg(W,H);
    for(let L=0;L<lines;L++){
      const y0=L*lineH;
      if(lines>1) el('text',{x:0,y:y0+14,class:'svg-text',style:'font-weight:500'},s,'Такт '+(L+1));
      for(let j=0;j<per;j+=4){ const i=L*per+j; const lab=(Math.floor(i/16)+1)+(i%16? '.'+(i%16/4+1):''); el('text',{x:lw+j*cw+3,y:y0+14,class:'svg-muted'},s,lab); }
    }
    const ph=el('rect',{x:lw,y:top,width:cw,height:rows.length*ch,class:'ph',visibility:'hidden'},s);
    for(let L=0;L<lines;L++) rows.forEach((r,ri)=>{
      const k=KIT[r.sound]; const y=L*lineH+top+ri*ch;
      const lab=el('g',{style:'cursor:pointer'},s);
      el('rect',{x:0,y:y+3,width:6,height:ch-6,fill:k.c,rx:2},lab);
      el('text',{x:12,y:y+13,class:'svg-label'},lab,nar?k.ru:k.ru+' · '+k.en);
      el('text',{x:12,y:y+24,class:'svg-muted'},lab,nar?k.note+' · пэд '+padOf(k.note):k.note+'  ·  пэд '+padOf(k.note));
      lab.addEventListener('click',()=>AUDIO.previewDrum(r.sound));
      el('title',{},lab,'Нажми, чтобы услышать');
      for(let j=0;j<per;j++){
        const i=L*per+j;
        const c=el('rect',{x:cx(i)+1,y:y+2,width:cw-2,height:ch-4,rx:3,class:'dg-cell'+(Math.floor(i/4)%2?'':' beat')},s);
        c.dataset.i=i;
        if(o.editable!==false) c.addEventListener('click',()=>{ const at=r.hits.indexOf(i); if(at>=0) r.hits.splice(at,1); else { r.hits.push(i); AUDIO.previewDrum(r.sound);} paint(); o.onChange&&o.onChange(); });
      }
    });
    if(per===steps) for(let b=1;b<(o.bars||1);b++) el('line',{x1:lw+b*16*cw,y1:top-4,x2:lw+b*16*cw,y2:H,class:'pr-bar'},s);
    const hitLayer=el('g',{'pointer-events':'none'},s);
    function paint(){
      hitLayer.innerHTML='';
      rows.forEach((r,ri)=>{ const k=KIT[r.sound];
        r.hits.forEach(i=>{ const y=ly(i)+top+ri*ch; const v=(r.vel&&r.vel[i])||1; el('rect',{x:cx(i)+3,y:y+4,width:cw-6,height:ch-8,rx:3,fill:k.c,'fill-opacity':0.35+0.65*v},hitLayer);
          if(r.vel&&r.vel[i]&&r.vel[i]<1 && cw>=20) el('text',{x:cx(i)+cw/2,y:y+ch/2+4,'text-anchor':'middle',class:'svg-muted',style:'fill:var(--ink)'},hitLayer,Math.round(r.vel[i]*127)); }); });
    }
    paint();
    return {el:s,setStep(st){ if(st==null){ph.setAttribute('visibility','hidden');return;} ph.setAttribute('visibility','visible'); ph.setAttribute('x',cx(st)); ph.setAttribute('y',ly(st)+top); },repaint:paint};
  }

  // ——— Пиано-ролл. notes: [['A1', start16, len16, vel], ...]
  function pianoRoll(notes,o){
    o=o||{}; const bars=o.bars||1, steps=bars*16;
    const ms=notes.map(n=>NOTE.midi(n[0]));
    let lo=o.lo!=null?NOTE.midi(o.lo):Math.min(...ms)-2, hi=o.hi!=null?NOTE.midi(o.hi):Math.max(...ms)+2;
    if(hi-lo<7){ const pad=Math.ceil((7-(hi-lo))/2); lo-=pad; hi+=pad; }
    const nar=narrow();
    const rows=hi-lo+1, rh=o.rowH||18, kw=nar?22:26, lw=kw+(nar?30:40), top=22;
    let cw=o.cw||(bars===1?36:bars===2?22:bars<=4?14:8);
    // на телефоне весь клип помещается в ширину экрана
    if(nar && lw+steps*cw+2>avail()) cw=Math.max(2,(avail()-lw-2)/steps);
    const W=lw+steps*cw+2, H=top+rows*rh+2;
    const s=svg(W,H);
    const color=COLORS[o.color||'note']||o.color;
    for(let i=0;i<steps;i+=4){ if(cw<12 && i%16) continue; const lab=(Math.floor(i/16)+1)+(i%16?'.'+(i%16/4+1):''); el('text',{x:lw+i*cw+3,y:14,class:'svg-muted'},s,lab); }
    for(let m=hi;m>=lo;m--){
      const y=top+(hi-m)*rh, black=NOTE.isBlack(m);
      el('rect',{x:lw,y,width:steps*cw,height:rh,class:black?'pr-row-b':'pr-row-w'},s);
      el('rect',{x:lw-kw,y,width:kw,height:rh,class:black?'pr-key-b':'pr-key-w'},s);
      const used=ms.includes(m);
      if(!black || used) el('text',{x:lw-kw-4,y:y+rh/2+4,'text-anchor':'end',class:used?'svg-text':'svg-muted',style:used?'font-weight:500':''},s,NOTE.name(m));
      el('line',{x1:lw,y1:y,x2:lw+steps*cw,y2:y,class:'pr-line'},s);
      const hit=el('rect',{x:lw-kw,y,width:kw,height:rh,fill:'transparent',style:'cursor:pointer'},s);
      hit.addEventListener('click',()=>AUDIO.previewNote(m,o.voice||'keys'));
    }
    for(let i=0;i<=steps;i++){ el('line',{x1:lw+i*cw,y1:top,x2:lw+i*cw,y2:H,class:i%16===0?'pr-bar':i%4===0?'pr-beat':'pr-line'},s); }
    const ph=el('rect',{x:lw,y:top,width:cw,height:rows*rh,class:'ph',visibility:'hidden'},s);
    notes.forEach(n=>{
      const m=NOTE.midi(n[0]); const x=lw+n[1]*cw+1, y=top+(hi-m)*rh+1, w=n[2]*cw-2;
      const r=el('rect',{x,y,width:w,height:rh-2,fill:color,class:'pr-note','fill-opacity':n[3]?0.4+0.6*n[3]:1,style:'cursor:pointer'},s);
      r.addEventListener('click',()=>AUDIO.previewNote(m,o.voice||'keys'));
      if(w>=28) el('text',{x:x+4,y:y+rh/2+2.5,class:'pr-note-t'},s,NOTE.name(m));
    });
    return {el:s,setStep(st){ if(st==null){ph.setAttribute('visibility','hidden');return;} ph.setAttribute('visibility','visible'); ph.setAttribute('x',lw+st*cw); }};
  }

  // ——— Клавиатура. marks: {'A1':'1', 'C2':true}
  function keyboard(o){
    const a=NOTE.midi(o.from||'C3'), b=NOTE.midi(o.to||'C5');
    const whites=[]; for(let m=a;m<=b;m++) if(!NOTE.isBlack(m)) whites.push(m);
    let ww=o.ww||34, wh=o.wh||128;
    if(narrow() && whites.length*ww+2>avail()){ ww=Math.max(6,Math.floor((avail()-2)/whites.length)); wh=Math.min(wh,Math.round(ww*4)); }
    const bw=Math.round(ww*0.62), bh=Math.round(wh*0.62), showNames=ww>=14;
    const top=o.minilab?26:4;
    const W=whites.length*ww+2, H=top+wh+4+(o.marks?14:0);
    const s=svg(W,H);
    if(o.minilab){ el('rect',{x:0,y:0,width:W,height:H,rx:8,class:'hw-body'},s); el('text',{x:10,y:17,class:'hw-ink'},s,'клавиши MiniLab 3 · сдвигай октаву кнопками Oct− / Oct+'); }
    const marks=o.marks||{}; const markM={}; Object.keys(marks).forEach(k=>markM[NOTE.midi(k)]=marks[k]);
    const xOf={}; whites.forEach((m,i)=>xOf[m]=1+i*ww);
    whites.forEach(m=>{
      const on=markM[m]!=null; const x=xOf[m];
      const r=el('rect',{x,y:top,width:ww,height:wh,rx:3,class:'kb-w'+(on?' kb-on':'')},s);
      r.addEventListener('click',()=>AUDIO.previewNote(m,o.voice||'keys'));
      if(o.names!==false && showNames && (m%12===0 || on)) el('text',{x:x+ww/2,y:top+wh-8,'text-anchor':'middle',class:'kb-name'+(on?' kb-name-on':'')},s,NOTE.name(m));
      if(o.ru && showNames && (on||o.ru==='all')) el('text',{x:x+ww/2,y:top+wh-21,'text-anchor':'middle',class:'kb-name'+(on?' kb-name-on':'')},s,NOTE.ru(m));
    });
    for(let m=a;m<=b;m++){ if(!NOTE.isBlack(m)) continue; const x=xOf[m-1]+ww-bw/2; const on=markM[m]!=null;
      const r=el('rect',{x,y:top,width:bw,height:bh,rx:2,class:'kb-b'+(on?' kb-on':'')},s);
      r.addEventListener('click',()=>AUDIO.previewNote(m,o.voice||'keys'));
      if(on && showNames) el('text',{x:x+bw/2,y:top+bh-6,'text-anchor':'middle',class:'kb-name kb-name-on',style:'font-size:8px'},s,NOTE.name(m)); }
    for(const m in markM){ const v=markM[m]; if(v===true) continue; const mm=+m; const black=NOTE.isBlack(mm);
      const x=black? xOf[mm-1]+ww : xOf[mm]+ww/2; badge(s,x,top+(black?bh+14:wh-40),String(v),10); }
    return {el:s};
  }

  // ——— Устройство Ableton с ручками. sections:[{name, params:[{l, v, p, m}]}]
  function device(o){
    const kw=78, head=26, kh=96, gap=10, rowH=22+kh;
    // разбить секции на куски и разложить по рядам, чтобы ряд помещался в ширину
    const maxW=narrow()?avail():Infinity, perRow=Math.max(1,Math.floor((maxW-2*gap)/kw));
    const pieces=[]; o.sections.forEach(sec=>{ for(let i=0;i<sec.params.length;i+=perRow) pieces.push({name:i?'':sec.name,params:sec.params.slice(i,i+perRow)}); });
    const pos=[]; let x=gap, row=0, W=0;
    pieces.forEach(pc=>{ const w=Math.max(pc.params.length*kw,110); if(x>gap && x+w+gap>maxW){ row++; x=gap; } pos.push({x,w,row}); x+=w+gap; W=Math.max(W,x); });
    const H=head+(row+1)*rowH+8;
    const s=svg(W,H);
    el('rect',{x:0.5,y:0.5,width:W-1,height:H-1,rx:6,class:'dev-bg'},s);
    el('rect',{x:0.5,y:0.5,width:W-1,height:head,rx:6,class:'dev-head'},s);
    el('text',{x:10,y:17,class:'svg-text',style:'font-weight:500'},s,o.name+(o.sub?'  ·  '+o.sub:''));
    pieces.forEach((sec,si)=>{ const P=pos[si], y0=head+P.row*rowH;
      el('text',{x:P.x,y:y0+16,class:'svg-muted',style:'text-transform:uppercase;letter-spacing:.05em'},s,sec.name);
      sec.params.forEach((p,pi)=>{ const cx=P.x+pi*kw+kw/2, cy=y0+22+34, r=20;
        if(p.choice){ el('rect',{x:cx-32,y:cy-14,width:64,height:28,rx:4,class:'knob-cap'},s); el('text',{x:cx,y:cy+4,'text-anchor':'middle',class:'svg-text',style:'font-weight:500'},s,p.v); }
        else {
          const a0=-225, a1=45; const ang=a0+(a1-a0)*(p.p||0);
          const arc=(from,to)=>{ const f=from*Math.PI/180,t=to*Math.PI/180; const R=r+5; const large=(to-from)>180?1:0;
            return `M ${cx+R*Math.cos(f)} ${cy+R*Math.sin(f)} A ${R} ${R} 0 ${large} 1 ${cx+R*Math.cos(t)} ${cy+R*Math.sin(t)}`; };
          el('path',{d:arc(a0,a1),class:'knob-ring'},s);
          if((p.p||0)>0.005) el('path',{d:arc(a0,ang),class:'knob-val'},s);
          el('circle',{cx,cy,r,class:'knob-cap'},s);
          const t=ang*Math.PI/180; el('line',{x1:cx+r*0.25*Math.cos(t),y1:cy+r*0.25*Math.sin(t),x2:cx+r*0.9*Math.cos(t),y2:cy+r*0.9*Math.sin(t),class:'knob-ptr'},s);
          el('text',{x:cx,y:cy+40,'text-anchor':'middle',class:'svg-text',style:'font-weight:500'},s,p.v);
        }
        el('text',{x:cx,y:p.choice?cy+40:cy+54,'text-anchor':'middle',class:'svg-muted'},s,p.l);
        if(p.m) badge(s,cx+24,cy-22,String(p.m),10);
      });
    });
    return {el:s};
  }

  // ——— MiniLab 3: схема (расположение примерное). hl: ['shift','p1'], marks: {shift:'1'}
  function minilab(o){
    o=o||{}; const W=1000, H=o.keys===false?250:400;
    const s=svg(W,H); s.setAttribute('width','100%'); s.removeAttribute('height'); s.style.height='auto'; s.style.maxWidth='1000px'; s.style.minWidth='640px';
    el('rect',{x:1,y:1,width:W-2,height:H-2,rx:14,class:'hw-body'},s);
    const P={}; const hl=new Set(o.hl||[]);
    function part(id,tag,attrs,label,lx,ly){ const e=el(tag,Object.assign({class:attrs.class||'hw-part'},attrs),s); if(hl.has(id)) e.classList.add('hw-hl'); P[id]={x:lx,y:ly}; if(label) el('text',{x:lx,y:ly,'text-anchor':'middle',class:'hw-ink'},s,label); return e; }
    // кнопки
    [['shift','Shift',40,40],['hold','Hold',110,40],['octm','Oct −',40,92],['octp','Oct +',110,92]].forEach(([id,l,x,y])=>{ part(id,'rect',{x:x-28,y:y-14,width:56,height:26,rx:5},null,x,y); el('text',{x,y:y+4,'text-anchor':'middle',class:'hw-ink'},s,l); P[id]={x,y:y-14}; });
    // тач-стрипы
    [['strip1','Pitch',50],['strip2','Mod',100]].forEach(([id,l,x])=>{ part(id,'rect',{x:x-14,y:122,width:28,height:100,rx:6},null,x,0); el('text',{x,y:236,'text-anchor':'middle',class:'hw-ink'},s,l); P[id]={x,y:122}; });
    // экран и главный энкодер
    part('screen','rect',{x:180,y:26,width:150,height:64,rx:4,class:'hw-part'},null,255,26);
    el('text',{x:255,y:62,'text-anchor':'middle',class:'hw-ink',style:'font-size:11px'},s,o.screen||'экран');
    part('enc','circle',{cx:255,cy:160,r:36},null,255,124); el('circle',{cx:255,cy:160,r:22,fill:'none',stroke:'#6a727e'},s);
    el('text',{x:255,y:214,'text-anchor':'middle',class:'hw-ink'},s,'главный энкодер');
    // ручки 1–8
    for(let i=0;i<8;i++){ const x=400+(i%4)*68, y=50+Math.floor(i/4)*68; part('k'+(i+1),'circle',{cx:x,cy:y,r:22},null,x,y-22); el('text',{x,y:y+4,'text-anchor':'middle',class:'hw-ink'},s,String(i+1)); }
    // фейдеры 1–4
    for(let i=0;i<4;i++){ const x=700+i*44; part('f'+(i+1),'rect',{x:x-6,y:22,width:12,height:110,rx:4},null,x,22); el('rect',{x:x-14,y:66,width:28,height:14,rx:3,fill:'#8a929e'},s); el('text',{x,y:146,'text-anchor':'middle',class:'hw-ink'},s,'F'+(i+1)); }
    // пэды 1–8
    for(let i=0;i<8;i++){ const x=380+i*68; part('p'+(i+1),'rect',{x,y:166,width:58,height:58,rx:6,class:'hw-pad'},null,x+29,166); el('text',{x:x+29,y:200,'text-anchor':'middle',class:'hw-ink'},s,(o.padLabels&&o.padLabels[i])||String(i+1)); }
    el('text',{x:920,y:205,'text-anchor':'middle',class:'hw-ink'},s,'пэды');
    if(o.keys!==false){
      const kx=20, ky=262, ww=(W-40)/15, wh=124;
      const marks=o.keyMarks||{};
      for(let i=0;i<15;i++){ const r=el('rect',{x:kx+i*ww,y:ky,width:ww,height:wh,rx:3,class:'kb-w'},s); if(marks['w'+i]) r.classList.add('kb-on'); }
      const bl=[0,1,3,4,5,7,8,10,11,12]; bl.forEach(i=>{ el('rect',{x:kx+(i+1)*ww-ww*0.3,y:ky,width:ww*0.6,height:wh*0.6,rx:2,class:'kb-b'},s); });
      P.keys={x:W/2,y:ky};
      if(hl.has('keys')) el('rect',{x:kx-4,y:ky-4,width:15*ww+8,height:wh+8,rx:5,fill:'none',stroke:'var(--mark)','stroke-width':3},s);
    }
    const marks=o.marks||{}; for(const id in marks){ const p=P[id]; if(p) badge(s,p.x+(id.startsWith('p')?22:id.startsWith('k')?20:30),p.y-2,String(marks[id]),12); }
    if(o.notes) o.notes.forEach(n=>{ el('text',{x:n.x,y:n.y,class:'hw-ink',style:'font-size:12px;fill:var(--note)'},s,n.t); });
    return {el:s};
  }

  // ——— Окно Ableton: схема зон. marks: {browser:'1', tempo:'2', ...}
  function ableton(o){
    o=o||{}; const W=960, H=520; const s=svg(W,H); s.setAttribute('width','100%'); s.removeAttribute('height'); s.style.height='auto'; s.style.maxWidth='960px'; s.style.minWidth='640px';
    const Z={}; const hl=new Set(o.hl||[]);
    function zone(id,x,y,w,h,label,d){ const r=el('rect',{x,y,width:w,height:h,rx:4,class:d?'ab-zone-d':'ab-zone'},s); if(hl.has(id)) r.classList.add('ab-hl'); if(label) el('text',{x:x+8,y:y+16,class:'svg-label',style:'font-weight:600'},s,label); Z[id]={x,y,w,h}; return r; }
    // панель управления
    zone('bar',0,0,W,40,null,true);
    const bar=[['tempo','120.00 BPM',14,110],['metro','●● метроном',134,100],['play','▶ Play',360,70],['stop','■ Stop',436,70],['rec','● Rec',512,70],['sessrec','⊕ Session Rec',588,118],['loop','⟲ Loop',712,70]];
    bar.forEach(([id,l,x,w])=>{ const r=el('rect',{x,y:8,width:w,height:24,rx:4,class:'ab-zone'},s); if(hl.has(id)) r.classList.add('ab-hl'); el('text',{x:x+w/2,y:24,'text-anchor':'middle',class:'svg-text'},s,l); Z[id]={x,y:8,w,h:24}; });
    // браузер
    zone('browser',0,46,190,H-46-170,'Браузер');
    ['Sounds','Drums','Instruments','Audio Effects','MIDI Effects','Grooves','Samples'].forEach((t,i)=>el('text',{x:14,y:46+40+i*22,class:'svg-text',style:hl.has('br-'+t)?'fill:var(--mark);font-weight:600':''},s,t));
    if(o.view==='arrangement'){
      zone('main',196,46,W-196,H-46-170,'Arrangement — дорожки идут слева направо во времени');
      for(let t=0;t<4;t++){ const y=46+30+t*40; el('rect',{x:196,y,width:120,height:34,class:'ab-zone-d'},s); el('text',{x:204,y:y+21,class:'svg-text'},s,(o.tracks&&o.tracks[t])||('Дорожка '+(t+1)));
        if(t<3) el('rect',{x:330+t*40,y:y+4,width:240,height:26,rx:3,fill:['var(--kick)','var(--bass)','var(--chord)'][t],'fill-opacity':0.6},s); }
    } else {
      zone('main',196,46,W-196-110,H-46-170,'Session — колонки-дорожки, ячейки для клипов');
      const names=o.tracks||['1 Drums','2 Bass','3 Chords','4 Lead'];
      names.forEach((n,t)=>{ const x=206+t*150; el('rect',{x,y:72,width:140,height:22,class:'ab-zone-d'},s); el('text',{x:x+6,y:87,class:'svg-text'},s,n);
        for(let c=0;c<5;c++){ const y=100+c*28; const filled=o.clips&&o.clips[t]&&o.clips[t][c]; const r=el('rect',{x,y,width:140,height:24,rx:3,class:'ab-zone'},s);
          if(filled){ r.setAttribute('fill',['var(--kick)','var(--bass)','var(--chord)','var(--lead)'][t%4]); r.setAttribute('fill-opacity','.55'); el('text',{x:x+16,y:y+16,class:'svg-text'},s,'▶ '+filled); }
          else el('text',{x:x+8,y:y+16,class:'svg-muted'},s,'■'); }
        const ar=el('rect',{x:x+8,y:248,width:40,height:20,rx:3,class:'ab-zone'},s); el('text',{x:x+28,y:262,'text-anchor':'middle',class:'svg-muted'},s,'Arm');
        if(hl.has('arm') && t===0) ar.classList.add('ab-hl'); if(t===0) Z.arm={x:x+8,y:248,w:40,h:20};
        el('rect',{x:x+60,y:250,width:70,height:6,rx:3,class:'ab-zone-d'},s); });
      Z.slot={x:206,y:100,w:140,h:24};
      if(hl.has('slot')) el('rect',{x:204,y:98,width:144,height:28,rx:4,fill:'none',stroke:'var(--mark)','stroke-width':2.5},s);
      zone('scenes',W-104,46,104,H-46-170,'Сцены');
      for(let c=0;c<5;c++) el('text',{x:W-90,y:116+c*28,class:'svg-muted'},s,'▶ '+(c+1));
    }
    zone('detail',0,H-164,W,164,o.detail==='clip'?'Окно клипа: пиано-ролл / настройки клипа':'Окно устройств: инструмент и эффекты дорожки',true);
    if(o.detail==='clip'){ el('rect',{x:10,y:H-138,width:150,height:126,class:'ab-zone'},s); el('text',{x:18,y:H-118,class:'svg-text'},s,'Clip / Notes'); el('text',{x:18,y:H-98,class:'svg-muted'},s,'Length: 4.0.0'); Z.cliplen={x:10,y:H-108,w:150,h:20};
      for(let i=0;i<12;i++) el('line',{x1:170,y1:H-140+i*11,x2:W-10,y2:H-140+i*11,class:'pr-line'},s);
      Z.roll={x:170,y:H-140,w:W-180,h:130};
    } else { ['Drum Rack','Drift','EQ Eight'].forEach((n,i)=>{ el('rect',{x:10+i*230,y:H-138,width:220,height:126,rx:4,class:'ab-zone'},s); el('text',{x:18+i*230,y:H-118,class:'svg-text'},s,n); }); }
    const marks=o.marks||{}; for(const id in marks){ const z=Z[id]; if(z) badge(s,z.x+z.w-6,z.y+4,String(marks[id]),12); }
    return {el:s};
  }

  window.DRAW={narrow,avail,drumGrid,pianoRoll,keyboard,device,minilab,ableton,KIT,padOf,svg,el,badge};
})();
