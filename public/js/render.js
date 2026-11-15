// Превращает содержимое страниц (массивы блоков) в разметку.
(function(){
  let uid=0;
  const playheads=new Map(); // id -> [setStep...]
  const buttons=new Map();
  AUDIO.onChange(cur=>{
    buttons.forEach((b,id)=>{ const on=id===cur; b.setAttribute('aria-pressed',on); b.innerHTML=on?ICON.stop+' Стоп':ICON.play+' '+(b.dataset.label||'Слушать'); });
    if(!cur) playheads.forEach(list=>list.forEach(f=>f(null)));
  });
  const ICON={play:'<svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>',stop:'<svg viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8"/></svg>'};

  function kbd(spec){
    const [win,mac]=spec.split('|');
    const k=s=>'<span class="keys">'+s.split('+').map(x=>'<kbd>'+x.trim()+'</kbd>').join('+')+'</span>';
    return k(win)+(mac?' <span class="mac">(Mac: '+k(mac)+')</span>':'');
  }
  function fmt(s){
    return String(s)
      .replace(/\{\{([A-G][#b]?-?\d)\}\}/g,'<span class="note-name">$1</span>')
      .replace(/\[\[([^\]]+)\]\]/g,(m,x)=>kbd(x));
  }
  function h(tag,cls,html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  function figure(title,cap){
    const f=h('figure','fig'); f.style.margin='22px 0 26px';
    const head=h('div','fig-head'); f.appendChild(head);
    if(title) head.appendChild(h('div','fig-title',fmt(title)));
    return {f,head,addCap(){ if(cap) f.appendChild(h('figcaption','fig-cap',fmt(cap))); }};
  }

  const LAYER_LABEL={drums:'Барабаны',bass:'Бас',sub:'Саб-бас',reese:'Бас (рис)',chord:'Аккорды',pad:'Пэд',keys:'Клавиши',lead:'Мелодия',pluck:'Плак'};

  function loop(spec){
    const id='loop'+(++uid);
    const original=JSON.stringify(spec.layers);
    let layers=JSON.parse(original);
    const {f,head,addCap}=figure(spec.title,spec.cap);
    const tr=h('div','transport'); head.appendChild(tr);
    const play=h('button','btn play'); play.dataset.label=spec.playLabel||'Слушать'; play.innerHTML=ICON.play+' '+play.dataset.label; play.setAttribute('aria-pressed','false');
    tr.appendChild(play);
    tr.appendChild(h('span','bpm',(spec.bpm||120)+' BPM'+(spec.swing?' · свинг '+Math.round(50+spec.swing*25)+'%':'')+' · '+(spec.bars||1)+' такт'+((spec.bars||1)===1?'':((spec.bars||1)<5?'а':'ов'))));
    const hasDrums=layers.some(l=>l.type==='drums');
    if(hasDrums && spec.editable!==false){ const rs=h('button','btn','Вернуть как было'); tr.appendChild(rs); rs.addEventListener('click',()=>{ layers=JSON.parse(original); draw(); if(AUDIO.current()===id) start(); }); }
    buttons.set(id,play);
    const body=h('div'); f.appendChild(body);
    let steppers=[];
    function draw(){
      body.innerHTML=''; steppers=[];
      layers.forEach(L=>{
        if(L.hidden) return;
        if(layers.length>1){ const lab=h('div','legend'); lab.style.margin='10px 0 4px'; lab.innerHTML=`<span><i style="background:${L.type==='drums'?'var(--kick)':'var(--'+({sub:'bass',reese:'bass',pad:'chord',keys:'chord',pluck:'lead'}[L.voice]||L.voice)+')'}"></i>${L.label||LAYER_LABEL[L.type==='drums'?'drums':L.voice]}</span>`; body.appendChild(lab); }
        const box=h('div','scroll'); body.appendChild(box);
        let g;
        if(L.type==='drums') g=DRAW.drumGrid(L.rows,{bars:spec.bars,editable:spec.editable,onChange:()=>{ if(AUDIO.current()===id) start(); }});
        else g=DRAW.pianoRoll(L.notes,{bars:spec.bars,color:L.voice,voice:L.voice,lo:L.lo,hi:L.hi,cw:L.cw});
        box.appendChild(g.el); steppers.push(g.setStep);
      });
      playheads.set(id,steppers);
    }
    function start(){ AUDIO.play(id,()=>({bpm:spec.bpm,bars:spec.bars,swing:spec.swing,layers}),st=>steppers.forEach(fn=>fn(st))); }
    play.addEventListener('click',()=>{ if(AUDIO.current()===id) AUDIO.stop(); else start(); });
    draw(); addCap();
    if(hasDrums && spec.editable!==false){ const hint=h('div','fig-cap','Клетки можно нажимать: добавляй и убирай удары прямо во время игры. Название слева — послушать звук.'); f.appendChild(hint); }
    return f;
  }

  function render(blocks,root){
    blocks.forEach(b=>{
      if(typeof b==='string'){ root.appendChild(h('p','text',fmt(b))); return; }
      if(b.h2){ const e=h('h2',null,fmt(b.h2)); if(b.id) e.id=b.id; root.appendChild(e); return; }
      if(b.h3){ root.appendChild(h('h3',null,fmt(b.h3))); return; }
      if(b.lead){ root.appendChild(h('p','lead',fmt(b.lead))); return; }
      if(b.list){ const u=h('ul','list text'); b.list.forEach(x=>u.appendChild(h('li',null,fmt(x)))); root.appendChild(u); return; }
      if(b.steps){ const o=h('ol','steps'); b.steps.forEach(x=>{ const li=h('li'); const d=h('div'); if(typeof x==='string') d.innerHTML=fmt(x); else render(Array.isArray(x)?x:[x],d); li.appendChild(d); o.appendChild(li); }); root.appendChild(o); return; }
      if(b.aside||b.warn){ const a=h('div','aside'+(b.warn?' warn':''),(b.title?'<b>'+b.title+'</b>':'')+fmt(b.aside||b.warn)); root.appendChild(a); return; }
      if(b.table){ const w=h('div','scroll'); const t=h('table','t'); t.innerHTML='<thead><tr>'+b.table.head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+b.table.rows.map(r=>'<tr>'+r.map(c=>'<td>'+fmt(c)+'</td>').join('')+'</tr>').join('')+'</tbody>'; w.appendChild(t); root.appendChild(w); return; }
      if(b.task){ const t=h('section','task'); const hd=h('div','task-head'); hd.appendChild(h('span','task-n',b.task.n||'Практика')); hd.appendChild(h('h3',null,fmt(b.task.title))); t.appendChild(hd); const bd=h('div','body'); render(b.task.body||[],bd); t.appendChild(bd); root.appendChild(t); return; }
      if(b.loop){ root.appendChild(loop(b.loop)); return; }
      if(b.drums){ root.appendChild(loop({title:b.drums.title,cap:b.drums.cap,bpm:b.drums.bpm,bars:b.drums.bars,swing:b.drums.swing,editable:b.drums.editable,layers:[{type:'drums',rows:b.drums.rows}]})); return; }
      if(b.roll){ root.appendChild(loop({title:b.roll.title,cap:b.roll.cap,bpm:b.roll.bpm,bars:b.roll.bars,layers:[{type:'notes',voice:b.roll.voice||'keys',notes:b.roll.notes,lo:b.roll.lo,hi:b.roll.hi}]})); return; }
      if(b.keys){ const {f,head,addCap}=figure(b.keys.title,b.keys.cap);
        if(b.keys.chord){ const btn=h('button','btn play',ICON.play+' Сыграть вместе'); btn.addEventListener('click',()=>AUDIO.previewChord(Object.keys(b.keys.marks),b.keys.voice)); head.appendChild(btn); }
        const box=h('div','scroll'); box.appendChild(DRAW.keyboard(b.keys).el); f.appendChild(box); addCap(); root.appendChild(f); return; }
      if(b.device){ const {f,addCap}=figure(b.device.title,b.device.cap); const box=h('div','scroll'); box.appendChild(DRAW.device(b.device).el); f.appendChild(box); addCap(); root.appendChild(f); return; }
      if(b.minilab){ const {f,addCap}=figure(b.minilab.title,b.minilab.cap); const box=h('div','scroll'); box.appendChild(DRAW.minilab(b.minilab).el); f.appendChild(box); addCap(); root.appendChild(f); return; }
      if(b.ableton){ const {f,addCap}=figure(b.ableton.title,b.ableton.cap); const box=h('div','scroll'); box.appendChild(DRAW.ableton(b.ableton).el); f.appendChild(box); addCap(); root.appendChild(f); return; }
      if(b.chords){ // ряд аккордов: каждый — мини-клавиатура с кнопкой
        const {f,addCap}=figure(b.chords.title,b.chords.cap); const row=h('div'); row.style.cssText='display:flex;flex-wrap:wrap;gap:14px';
        b.chords.items.forEach(c=>{ const cell=h('div'); cell.style.minWidth='0'; const top=h('div'); top.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:6px';
          const btn=h('button','btn',ICON.play+' '+c.name); btn.addEventListener('click',()=>AUDIO.previewChord(c.notes,b.chords.voice)); top.appendChild(btn);
          if(c.sub) top.appendChild(h('span','bpm',c.sub)); cell.appendChild(top);
          const marks={}; c.notes.forEach((n,i)=>marks[n]=c.fingers?c.fingers[i]:true);
          const box=h('div','scroll'); box.appendChild(DRAW.keyboard({from:b.chords.from||'A2',to:b.chords.to||'E4',marks,ww:20,wh:86,names:false,voice:b.chords.voice}).el); cell.appendChild(box); row.appendChild(cell); });
        f.appendChild(row); addCap(); root.appendChild(f); return; }
      for(const k in EXTRA){ if(b[k]){ root.appendChild(EXTRA[k](b[k])); return; } }
      if(b.cards){ const g=h('div','cards'); b.cards.forEach(c=>g.appendChild(c)); root.appendChild(g); return; }
      if(b.el){ root.appendChild(b.el); return; }
      if(b.html){ const d=h('div',b.cls||null,b.html); root.appendChild(d); return; }
      if(b.soon){ root.appendChild(h('div','soonbox','<b>Пишется.</b> '+fmt(b.soon))); return; }
    });
  }
  const EXTRA={};
  window.RENDER={render,fmt,h,loop,ICON,figure,EXTRA,buttons};

  // Оглавление книги. Каждый файл содержимого добавляет свои страницы через BOOK.add.
  const SECTIONS=[
    {id:'path',title:'Путь: от лупа до трека'},
    {id:'genres',title:'Жанры'},
    {id:'ableton',title:'Ableton Live'},
    {id:'minilab',title:'Arturia MiniLab 3'},
    {id:'zoom',title:'Zoom H1essential'},
    {id:'theory',title:'Музыкальная грамотность'}
  ];
  const pages={}, order=[];
  window.BOOK={SECTIONS,pages,order,
    add(section,p){ p.section=section; pages[p.id]=p; order.push(p.id); }};
})();
