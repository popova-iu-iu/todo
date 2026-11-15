// Телефон: никакой прокрутки вбок.
// — таблицы становятся карточками (подписи колонок — над значениями);
// — большие схемы уменьшаются под экран, а кнопка «Открыть крупно» показывает их на весь экран (повёрнутыми).
(function(){
  const narrow=()=>window.innerWidth<=900;

  function labelTables(root){
    root.querySelectorAll('table.t').forEach(t=>{
      const heads=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());
      t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{ if(heads[i]) td.setAttribute('data-label',heads[i]); }));
    });
  }

  function addZoom(root){
    root.querySelectorAll('.fig svg').forEach(svg=>{
      if(svg.closest('.zoom-done')||svg.parentElement.closest('svg')) return;
      const vb=svg.viewBox&&svg.viewBox.baseVal; if(!vb||!vb.width) return;
      const shown=svg.getBoundingClientRect().width; if(!shown) return;
      if(shown/vb.width>=0.72) return; // и так читается
      const box=svg.parentElement; box.classList.add('zoom-done');
      const b=document.createElement('button'); b.type='button'; b.className='btn zoom-btn';
      b.innerHTML='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg> Открыть крупно';
      b.addEventListener('click',()=>openZoom(svg));
      box.after(b);
    });
  }

  function openZoom(svg){
    const vb=svg.viewBox.baseVal, ratio=vb.width/vb.height;
    const home=svg.parentElement, next=svg.nextSibling, oldCss=svg.getAttribute('style')||'';
    const ov=document.createElement('div'); ov.className='zoomer'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','Схема крупно');
    const close=document.createElement('button'); close.type='button'; close.className='btn zclose'; close.textContent='✕ Закрыть';
    const stage=document.createElement('div'); stage.className='zstage';
    ov.append(stage,close); document.body.appendChild(ov); document.body.style.overflow='hidden';
    const vw=window.innerWidth-24, vh=window.innerHeight-90;
    const rotate=ratio>1.15 && vh>vw;
    let w,hh;
    if(rotate){ w=Math.min(vh,vw*ratio); hh=w/ratio; stage.style.transform='rotate(90deg)'; }
    else { w=Math.min(vw,vh*ratio); hh=w/ratio; }
    stage.style.width=w+'px'; stage.style.height=hh+'px';
    svg.style.cssText='width:'+w+'px;height:'+hh+'px;max-width:none;min-width:0;display:block';
    stage.appendChild(svg);
    function done(){ svg.setAttribute('style',oldCss); home.insertBefore(svg,next); ov.remove(); document.body.style.overflow=''; document.removeEventListener('keydown',esc); window.removeEventListener('hashchange',done); }
    function esc(e){ if(e.key==='Escape') done(); }
    close.addEventListener('click',done); document.addEventListener('keydown',esc); window.addEventListener('hashchange',done);
  }

  function enhance(root){
    labelTables(root);
    if(narrow()) requestAnimationFrame(()=>addZoom(root));
  }
  window.MOBILE={enhance,narrow};
})();
