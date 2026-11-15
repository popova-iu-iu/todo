(function(){
  const {SECTIONS,pages}=BOOK;
  const side=document.getElementById('side'), main=document.getElementById('main'), menuBtn=document.getElementById('menuBtn');
  const bySec={}; SECTIONS.forEach(s=>bySec[s.id]=[]);
  BOOK.order.forEach(id=>{ const p=pages[id]; if(bySec[p.section]) bySec[p.section].push(p); });
  const linear=[pages.home].concat(...SECTIONS.map(s=>bySec[s.id]));

  function nav(){
    let html='<a class="brand" href="#home">Электронная музыка с нуля<small>Ableton Live · MiniLab 3 · Zoom H1essential</small></a>';
    SECTIONS.forEach(s=>{
      const list=bySec[s.id]; if(!list.length) return;
      html+=`<div class="nav-sec"><a href="#${list[0].id}">${s.title}</a><ol>`+
        list.map(p=>`<li><a href="#${p.id}" data-id="${p.id}" class="${p.soon?'soon':''}"><span class="n">${p.n||''}</span><span>${p.short||p.title}</span></a></li>`).join('')+'</ol></div>';
    });
    side.innerHTML=html;
  }
  function show(){
    let id=(location.hash||'#home').slice(1); if(!pages[id]) id='home';
    const p=pages[id];
    AUDIO.stop();
    const page=document.createElement('div'); page.className='page';
    const sec=SECTIONS.find(s=>s.id===p.section);
    if(p.id!=='home'){ const eb=RENDER.h('div','eyebrow',(sec?sec.title:'')+(p.n?' · '+p.n:'')); page.appendChild(eb); }
    page.appendChild(RENDER.h('h1',null,p.title));
    try{ RENDER.render(typeof p.blocks==='function'?p.blocks():p.blocks,page); }catch(e){ console.error(e); page.appendChild(RENDER.h('p',null,'Не получилось нарисовать эту страницу: '+e.message)); }
    const i=linear.indexOf(p); const prev=linear[i-1], next=linear[i+1];
    const pg=RENDER.h('nav','pager');
    pg.innerHTML=(prev?`<a href="#${prev.id}"><small>Назад</small>${prev.title}</a>`:'<span></span>')+(next?`<a href="#${next.id}" style="text-align:right"><small>Дальше</small>${next.title}</a>`:'');
    page.appendChild(pg);
    main.innerHTML=''; main.appendChild(page);
    side.querySelectorAll('a[data-id]').forEach(a=>a.classList.toggle('on',a.dataset.id===id));
    document.title=(p.id==='home'?'':p.title+' · ')+'Электронная музыка с нуля';
    window.scrollTo(0,0); side.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false');
  }
  menuBtn.addEventListener('click',()=>{ const o=side.classList.toggle('open'); menuBtn.setAttribute('aria-expanded',o); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') side.classList.remove('open'); });
  window.addEventListener('hashchange',show);
  nav(); show();
})();
