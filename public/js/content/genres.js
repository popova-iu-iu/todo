(function(){
const R=(sound,hits,vel)=>({sound,hits,vel});
const rep=(arr,bars)=>{ const o=[]; for(let b=0;b<bars;b++) arr.forEach(s=>o.push(s+b*16)); return o; };
const four=[0,4,8,12], two4=[4,12], off=[2,6,10,14], all8=[0,2,4,6,8,10,12,14], all16=[...Array(16).keys()];
const acc=(steps,s,w)=>{ const v={}; steps.forEach(x=>v[x]=(x%4===0?s:x%2===0?(s+w)/2:w)); return v; };
const repV=(v,bars)=>{ const o={}; for(let b=0;b<bars;b++) for(const k in v) o[+k+b*16]=v[k]; return o; };
const chordsAt=(list,steps,len)=>{ const o=[]; list.forEach((c,b)=>steps.forEach(s=>c.forEach(n=>o.push([n,b*16+s,len])))); return o; };
const N=(voice,notes)=>({type:'notes',voice,notes});
const D=rows=>({type:'drums',rows});

const G=[
 {id:'house',name:'House',bpm:'120–128',year:'Чикаго, 1980-е',
  rhythm:'Четыре в пол, хлопок на 2 и 4, открытый хэт на «и».',bass:'Короткий, между бочками, часто октавами.',sounds:'Пианино и органные аккорды, вокальные кусочки, стабы.',mood:'Тёплый, танцевальный, радостный.',
  listen:'Frankie Knuckles, Larry Heard, Masters at Work, Daft Punk (ранний), Disclosure',
  song:{bpm:124,bars:2,layers:[D([R('kick',rep(four,2)),R('clap',rep(two4,2)),R('ohat',rep(off,2)),R('hat',rep([1,3,5,7,9,11,13,15],2),repV({1:.35,3:.45,5:.35,7:.45,9:.35,11:.45,13:.35,15:.45},2))]),
    N('bass',[['A1',2,1],['A2',3,1],['A1',6,1],['A1',10,1],['A2',11,1],['A1',14,1],['G1',18,1],['G2',19,1],['G1',22,1],['G1',26,1],['G2',27,1],['G1',30,1]]),
    N('keys',chordsAt([['A3','C4','E4','G4'],['G3','B3','D4','F#4']],[0,3,6,10],2))]}},
 {id:'deep',name:'Deep house',bpm:'118–124',year:'Чикаго и Нью-Йорк, конец 1980-х',
  rhythm:'Как house, но мягче и со свингом, много римшотов и шейкеров.',bass:'Круглый, тёплый, неспешный.',sounds:'Длинные джазовые аккорды (с седьмой нотой), электропиано, тёплые пэды.',mood:'Ночной, мечтательный, расслабленный.',
  listen:'Larry Heard (Mr. Fingers), Kerri Chandler, Moodymann, Fred again.. (мягкие треки)',
  song:{bpm:120,bars:2,swing:0.35,layers:[D([R('kick',rep(four,2)),R('clap',rep(two4,2),{4:.7,12:.7,20:.7,28:.7}),R('rim',rep([3,7,14],2),repV({3:.5,7:.4,14:.5},2)),R('shaker',rep(all16,2),repV(acc(all16,.5,.25),2))]),
    N('sub',[['A1',0,3],['A1',6,2],['C2',10,3],['D2',16,3],['D2',22,2],['E2',26,4]]),
    N('pad',[['A3',0,16],['C4',0,16],['E4',0,16],['G4',0,16],['A3',16,16],['C4',16,16],['D4',16,16],['F4',16,16]])]}},
 {id:'techno',name:'Techno',bpm:'125–140',year:'Детройт, 1980-е; Берлин, 1990-е',
  rhythm:'Четыре в пол, мало элементов, повтор и постепенные изменения.',bass:'Катящийся или гулкий «рамбл» под бочкой.',sounds:'Металлические перкуссии, шумы, синтезаторные петли, почти без аккордов.',mood:'Гипнотический, тёмный, машинный.',
  listen:'Jeff Mills, Juan Atkins, Robert Hood, Richie Hawtin, Charlotte de Witte, Amelie Lens',
  song:{bpm:132,bars:2,layers:[D([R('kick',rep(four,2)),R('hat',rep(off,2)),R('clap',[12,28],{12:.6,28:.6}),R('shaker',rep(all16,2),repV(acc(all16,.6,.3),2)),R('rim',[3,11,19,22,27],{3:.5,11:.5,19:.5,22:.4,27:.5})]),
    N('bass',[...[1,2,3,5,6,7,9,10,11,13,14,15].map(s=>['A1',s,1]),...[1,2,3,5,6,7,9,10,11,13,14,15].map(s=>['A1',s+16,1])])]}},
 {id:'trance',name:'Trance',bpm:'130–140',year:'Германия и Нидерланды, 1990-е',
  rhythm:'Четыре в пол, длинные подъёмы и брейки по полминуты.',bass:'Три шестнадцатые после каждой бочки — «галоп».',sounds:'Широкие пилообразные аккорды (супер-сау), арпеджио, эпичные мелодии.',mood:'Эйфорический, возвышенный.',
  listen:'Paul van Dyk, Armin van Buuren, Above & Beyond, ATB',
  song:{bpm:138,bars:2,layers:[D([R('kick',rep(four,2)),R('ohat',rep(off,2)),R('clap',rep(two4,2))]),
    N('bass',[...[1,2,3,5,6,7,9,10,11,13,14,15].map(s=>['A1',s,1]),...[1,2,3,5,6,7,9,10,11,13,14,15].map(s=>['F1',s+16,1])]),
    N('pluck',(()=>{ const o=[]; [['A3','C4','E4','A4'],['F3','A3','C4','F4']].forEach((c,b)=>{ for(let i=0;i<16;i++) o.push([c[[0,1,2,3,2,1][i%6]],b*16+i,1]); }); return o; })())]}},
 {id:'dnb',name:'Drum & bass',bpm:'170–176',year:'Великобритания, 1990-е (из джангла)',
  rhythm:'Быстрый брейкбит: бочка на 1 и между 3 и 4 долей, малый на 2 и 4.',bass:'Огромный: гудящий «рис» (Reese) или чистый саб.',sounds:'Нарезанные брейки, атмосферные пэды, резкие эффекты.',mood:'Энергичный, стремительный, от мрачного до светлого.',
  listen:'Goldie, Roni Size, LTJ Bukem, Pendulum, Noisia, Netsky',
  song:{bpm:174,bars:2,layers:[D([R('kick',[0,10,16,26]),R('snare',rep(two4,2)),R('hat',rep(all8,2),repV({0:.8,2:.5,4:.8,6:.5,8:.8,10:.5,12:.8,14:.5},2)),R('ohat',[30],{30:.5})]),
    N('reese',[['A1',0,10],['C2',10,6],['G1',16,10],['F1',26,6]])]}},
 {id:'dubstep',name:'Dubstep',bpm:'140 (ощущается как 70)',year:'Южный Лондон, 2000-е',
  rhythm:'Половинный: малый один раз за такт, на третью долю.',bass:'Главный герой: саб и «воблы» — бас, который рычит и качается.',sounds:'Пустота, эхо, тяжёлый саб; позже — агрессивные синтезаторы.',mood:'Тяжёлый, тёмный, качающий.',
  listen:'Skream, Benga, Burial, Mala, Skrillex (американская, громкая ветка)',
  song:{bpm:140,bars:2,layers:[D([R('kick',[0,22]),R('snare',[8,24]),R('hat',rep([2,6,10,14],2),repV({2:.5,6:.5,10:.5,14:.5},2)),R('rim',[13],{13:.5})]),
    N('reese',[['A1',0,3],['A1',3,3],['A1',6,2],['C2',12,4],['G1',16,6],['F1',22,2],['E1',26,6]])]}},
 {id:'trap',name:'Trap',bpm:'130–150 (ощущается вдвое медленнее)',year:'Атланта, 2000-е',
  rhythm:'Половинный: хлопок на 3 долю, хэты частые, с ускорениями.',bass:'808: длинный саб, который тянется и скользит между нотами.',sounds:'Колокольчики, тёмные мелодии, вокальные выкрики.',mood:'Мрачный, дерзкий.',
  listen:'Metro Boomin, Mike Will Made-It, RL Grime, Baauer',
  song:{bpm:140,bars:2,layers:[D([R('kick',[0,10,16,19,28]),R('clap',[8,24]),R('hat',[0,2,4,6,8,10,12,13,14,15,16,18,20,22,24,26,28,29,30,31],{13:.6,15:.6,29:.6,31:.6}),R('ohat',[14],{14:.4})]),
    N('sub',[['A1',0,10],['A1',10,6],['C2',16,3],['G1',19,9],['E1',28,4]]),N('lead',[['E4',0,2],['C4',4,2],['A3',8,4],['B3',16,2],['C4',20,2],['A3',24,6]])]}},
 {id:'boombap',name:'Hip-hop (boom bap)',bpm:'85–95',year:'Нью-Йорк, конец 1980-х — 1990-е',
  rhythm:'Бочка «бум», малый «бэп» на 2 и 4, сильный свинг.',bass:'Короткий, с бочкой.',sounds:'Сэмплы старых пластинок: джаз, соул, фанк.',mood:'Расслабленный, качающий, уличный.',
  listen:'DJ Premier, Pete Rock, J Dilla, Madlib',
  song:{bpm:90,bars:2,swing:0.4,layers:[D([R('kick',[0,7,10,16,23,25]),R('snare',rep(two4,2)),R('hat',rep(all8,2),repV({0:.8,2:.5,4:.8,6:.5,8:.8,10:.5,12:.8,14:.5},2))]),
    N('bass',[['A1',0,4],['A1',7,2],['C2',10,4],['D2',16,4],['D2',23,2],['E2',25,5]]),N('keys',chordsAt([['A3','C4','E4','G4'],['D4','F4','A4','C5']],[0,6],4))]}},
 {id:'lofi',name:'Lo-fi hip-hop',bpm:'70–90',year:'Интернет, 2010-е',
  rhythm:'Ленивый хип-хоп бит с сильным свингом, мягкие удары.',bass:'Мягкий, тихий, круглый.',sounds:'Электропиано и джазовые аккорды, треск пластинки, шум, приглушённый звук.',mood:'Уютный, ностальгичный, спокойный.',
  listen:'Nujabes, J Dilla, Jinsang, плейлисты Lofi Girl',
  song:{bpm:80,bars:2,swing:0.55,layers:[D([R('kick',[0,10,16,25,26]),R('snare',rep(two4,2),repV({4:.7,12:.7},2)),R('hat',rep(all8,2),repV({0:.5,2:.35,4:.5,6:.35,8:.5,10:.35,12:.5,14:.35},2))]),
    N('sub',[['D2',0,8],['A1',8,8],['G1',16,8],['C2',24,8]]),N('keys',chordsAt([['F3','A3','C4','E4'],['E3','G3','B3','D4']],[0,7],6))]}},
 {id:'ambient',name:'Ambient',bpm:'любой или без ритма',year:'Брайан Ино, 1970-е',
  rhythm:'Часто без барабанов вовсе.',bass:'Тихий гул или его нет.',sounds:'Длинные пэды, текстуры, полевые записи, много реверберации.',mood:'Пространство, покой, созерцание.',
  listen:'Brian Eno, Aphex Twin (Selected Ambient Works), Stars of the Lid, Hiroshi Yoshimura',
  song:{bpm:70,bars:2,layers:[N('pad',[['A2',0,32],['E3',0,16],['C4',0,16],['B3',0,16],['D3',16,16],['A3',16,16],['F4',16,16]]),N('keys',[['E5',2,4],['B4',10,4],['C5',20,6],['A4',28,4]])]}},
 {id:'synthwave',name:'Synthwave',bpm:'80–118',year:'Интернет, 2000–2010-е, звук 1980-х',
  rhythm:'Простой: бочка на 1 и 3, мощный малый с реверберацией на 2 и 4.',bass:'Восьмые, ровно, часто октавами.',sounds:'Аналоговые синтезаторы 80-х, яркие лиды, пэды.',mood:'Ностальгия, ночной город, кино 80-х.',
  listen:'Kavinsky, The Midnight, FM-84, Perturbator (тёмная ветка)',
  song:{bpm:100,bars:2,layers:[D([R('kick',[0,8,16,24]),R('snare',rep(two4,2)),R('hat',rep(all8,2),repV({0:.6,2:.4,4:.6,6:.4,8:.6,10:.4,12:.6,14:.4},2))]),
    N('bass',[...all8.map(s=>['A1',s,2]),...all8.map(s=>['F1',s+16,2])]),N('pad',[['A3',0,16],['C4',0,16],['E4',0,16],['A3',16,16],['C4',16,16],['F4',16,16]])]}},
 {id:'garage',name:'UK garage (2-step)',bpm:'130–135',year:'Лондон, 1990-е',
  rhythm:'Бочка пропускает удары, малый на 2 и 4, хэты сильно со свингом — ритм «перескакивает».',bass:'Пружинистый, с паузами.',sounds:'Нарезанный и ускоренный вокал, органные аккорды.',mood:'Лёгкий, игривый, пружинящий.',
  listen:'MJ Cole, Artful Dodger, Todd Edwards, Sammy Virji',
  song:{bpm:132,bars:2,swing:0.5,layers:[D([R('kick',[0,10,16,27]),R('snare',rep(two4,2)),R('hat',rep([2,3,6,7,10,11,14,15],2),repV({2:.7,3:.4,6:.7,7:.4,10:.7,11:.4,14:.7,15:.4},2)),R('rim',[7,23],{7:.5,23:.5})]),
    N('bass',[['A1',0,2],['A1',3,1],['C2',6,2],['A1',10,2],['G1',13,2],['F1',16,2],['F1',19,1],['A1',22,2],['G1',27,3]]),N('keys',chordsAt([['A3','C4','E4','G4'],['F3','A3','C4','E4']],[3,8],2))]}},
 {id:'breaks',name:'Breakbeat',bpm:'120–140',year:'Великобритания, 1990-е',
  rhythm:'Ломаный бит из нарезанных записей живых барабанов.',bass:'Мощный, часто синтезаторный.',sounds:'Брейки, сирены, резкие синтезаторы, гитарные куски.',mood:'Драйвовый, рок-н-ролльный.',
  listen:'The Chemical Brothers, The Prodigy, Fatboy Slim, The Crystal Method',
  song:{bpm:130,bars:2,layers:[D([R('kick',[0,6,10,16,22,25]),R('snare',[4,12,15,20,28],{15:.6}),R('hat',rep(all8,2)),R('ohat',[14,30],{14:.6,30:.6})]),
    N('bass',[['A1',0,3],['A1',6,2],['C2',10,3],['A1',14,2],['G1',16,3],['G1',22,2],['E1',25,5]])]}}
];
const byId={}; G.forEach(g=>byId[g.id]=g);

// одна кнопка «Слушать» для карточки
const btns=new Map();
AUDIO.onChange(cur=>btns.forEach((b,id)=>{ const on=cur===id; b.setAttribute('aria-pressed',on); b.innerHTML=(on?RENDER.ICON.stop+' Стоп':RENDER.ICON.play+' Слушать'); }));
function playBtn(g){ const b=RENDER.h('button','btn play',RENDER.ICON.play+' Слушать'); b.setAttribute('aria-pressed','false'); const id='g-'+g.id; btns.set(id,b);
  b.addEventListener('click',()=>{ if(AUDIO.current()===id) AUDIO.stop(); else AUDIO.play(id,()=>g.song); }); return b; }

function card(g){
  const c=RENDER.h('article','card'); c.id='g-'+g.id;
  c.innerHTML=`<h3>${g.name}</h3><div class="bpmtag">${g.bpm} BPM · ${g.year}</div>
  <dl><dt>Ритм</dt><dd>${g.rhythm}</dd><dt>Бас</dt><dd>${g.bass}</dd><dt>Звуки</dt><dd>${g.sounds}</dd><dt>Настроение</dt><dd>${g.mood}</dd><dt>Слушать</dt><dd>${g.listen}</dd></dl>`;
  const tr=RENDER.h('div','transport'); tr.appendChild(playBtn(g));
  const more=RENDER.h('a',null,'Рисунок и разбор →'); more.href='#genre-'+g.id; tr.appendChild(more);
  c.appendChild(tr); return c;
}

function map(){
  const D=window.DRAW; const W=900,H=420; const s=D.svg(W,H); s.setAttribute('width','100%'); s.removeAttribute('height'); s.style.height='auto'; s.style.minWidth='680px';
  const nodes={
    disco:[150,36,'Диско и фанк','1970-е'],synth:[420,36,'Синти-поп и электро','1980-е'],hiphop:[680,36,'Хип-хоп','1970–80-е'],
    house:[70,140,'House','g'],techno:[260,140,'Techno','g'],breaks:[440,140,'Breakbeat','g'],boombap:[640,140,'Boom bap','g'],ambient:[830,140,'Ambient','g'],
    deep:[70,250,'Deep house','g'],trance:[230,250,'Trance','g'],garage:[380,250,'UK garage','g'],dnb:[530,250,'Drum & bass','g'],trap:[680,250,'Trap','g'],lofi:[830,250,'Lo-fi','g'],
    synthwave:[160,360,'Synthwave','g'],dubstep:[460,360,'Dubstep','g']
  };
  const edges=[['disco','house'],['synth','house'],['synth','techno'],['disco','breaks'],['hiphop','breaks'],['hiphop','boombap'],['house','deep'],['techno','trance'],['house','garage'],['breaks','dnb'],['garage','dubstep'],['dnb','dubstep'],['boombap','trap'],['boombap','lofi'],['ambient','lofi'],['synth','synthwave']];
  const idMap={breaks:'breaks',boombap:'boombap'};
  edges.forEach(([a,b])=>{ const A=nodes[a],B=nodes[b]; D.el('path',{d:`M ${A[0]} ${A[1]+16} C ${A[0]} ${(A[1]+B[1])/2}, ${B[0]} ${(A[1]+B[1])/2}, ${B[0]} ${B[1]-16}`,class:'map-edge'},s); });
  for(const k in nodes){ const [x,y,label,kind]=nodes[k]; const w=Math.max(96,label.length*8.4+20);
    const g=D.el(kind==='g'?'a':'g',kind==='g'?{href:'#genre-'+(idMap[k]||k)}:{},s);
    D.el('rect',{x:x-w/2,y:y-16,width:w,height:32,rx:16,class:'map-node'+(kind==='g'?'':' root')},g);
    D.el('text',{x,y:y+(kind==='g'?4:0),'text-anchor':'middle',class:'svg-label',style:kind==='g'?'font-weight:600':''},g,label);
    if(kind!=='g') D.el('text',{x,y:y+11,'text-anchor':'middle',class:'svg-muted'},g,kind); }
  return s;
}

const PAIRS=[
  ['house','techno','House тёплый и «человеческий»: аккорды, вокал, хлопок, хэт на «и». Techno холодное и минимальное: почти нет аккордов, бас катится шестнадцатыми, всё держится на повторе и мелких изменениях.'],
  ['house','deep','Deep house медленнее и мягче, со свингом. Вместо коротких стабов — длинные джазовые аккорды, вместо хлопка — тихий римшот и шейкер.'],
  ['techno','trance','Оба — четыре в пол. Trance быстрее, бас «галопом» после каждой бочки, и главное — эпичные мелодии и аккорды. Techno обходится без них.'],
  ['dnb','dubstep','Оба выросли в Лондоне и держатся на басе. DnB — 174 BPM и малый дважды за такт: ощущение бега. Dubstep — 140 BPM и малый один раз за такт, на третью долю: ощущение тяжёлого медленного шага.'],
  ['boombap','trap','Boom bap — живой свинг, сэмплы пластинок, малый на 2 и 4. Trap — малый на 3, частые хэты с ускорениями и длинный 808-бас, который скользит.'],
  ['house','garage','Темп похожий, но в 2-step бочка пропускает удары, а хэты сильно со свингом. Ритм как будто перескакивает с ноги на ногу.']
];

BOOK.add('genres',{id:'genres',n:'',short:'Карта жанров',title:'Жанры: научиться различать',blocks:()=>{
  const cards=G.map(card);
  return [
    {lead:'Жанры различаются прежде всего темпом и ритмом барабанов, потом басом, потом звуками. Если научиться слышать эти три вещи, почти любой трек можно отнести к семье. Включай примеры и сравнивай.'},
    {h2:'Как отличать на слух'},
    {steps:['<b>Темп.</b> Посчитай доли: медленно (70–100) — хип-хоп, lo-fi; средне (118–130) — house и его родня; быстро (130–140) — techno, trance, garage; очень быстро (170+) — drum & bass.',
      '<b>Бочка.</b> Бьёт на каждую долю — семья house и techno. Ломаная, с пропусками — breakbeat, DnB, hip-hop, garage.',
      '<b>Где малый.</b> На 2 и 4 — большинство жанров. Один раз за такт, на 3 — dubstep и trap: трек кажется вдвое медленнее.',
      '<b>Бас.</b> Короткий между бочками, катящийся, длинный скользящий 808 или рычащий — у каждого жанра свой.',
      '<b>Звуки и настроение.</b> Аккорды пианино, тёмные шумы, супер-пилы, пластиночный треск — последняя подсказка.']},
    {h2:'Карта жанров'},
    'Жанры выросли друг из друга. Серые овалы — истоки, остальные можно нажать.',
    {el:(()=>{ const f=RENDER.h('figure','fig'); const box=RENDER.h('div','scroll'); box.appendChild(map()); f.appendChild(box); f.appendChild(RENDER.h('figcaption','fig-cap','Упрощённая схема: на деле жанры смешиваются постоянно, а у каждого есть десятки поджанров.')); return f; })()},
    {h2:'Тринадцать жанров'},
    {cards},
    {h2:'Сравнения похожих жанров'},
    'Здесь пары, которые легко спутать. Включай по очереди и смотри на рисунки: разница видна даже глазами.',
    ...PAIRS.flatMap(([a,b,txt])=>[
      {h3:byId[a].name+' и '+byId[b].name},txt,
      {loop:Object.assign({title:byId[a].name+' · '+byId[a].bpm+' BPM',editable:false},byId[a].song)},
      {loop:Object.assign({title:byId[b].name+' · '+byId[b].bpm+' BPM',editable:false},byId[b].song)}
    ]),
    {h2:'Как слушать дальше'},
    {list:['Возьми одного артиста из списка «Слушать» и включи несколько его треков подряд. Считай доли, ищи бочку и малый, угадывай темп.','В Ableton можно узнать темп любого трека: перетащи аудиофайл на дорожку — Live сам определит BPM при включённом Warp.','Слушай в наушниках или на колонках с хорошим низом: в басе прячется половина жанра.']},
    'На странице каждого жанра — рисунок, разбор и трек по шагам с картой частей.'
  ];
}});

G.forEach(g=>BOOK.add('genres',{id:'genre-'+g.id,short:g.name,title:g.name,blocks:[
  {lead:g.mood+' '+g.bpm+' BPM. '+g.year+'.'},
  {loop:Object.assign({title:'Типичный рисунок · попробуй поменять барабаны'},g.song)},
  {table:{head:['Что','Как в этом жанре'],rows:[['Темп',g.bpm+' BPM'],['Ритм',g.rhythm],['Бас',g.bass],['Звуки',g.sounds],['Настроение',g.mood],['Кого слушать',g.listen]]}},
  ...(()=>{ const t=(window.GENRE_TRACK||{})[g.id]; if(!t) return [];
    return [{h2:'Трек по шагам'},'Тональность: '+t.key+'. Барабаны и бас — как в рисунке выше; дальше по шагам и по карте.',
      {steps:t.steps},
      {arr:{title:'Карта трека',tracks:t.tracks,sections:t.sections,cap:'Строки — партии, полосы — где они звучат, красная линия — энергия. Длины частей в тактах.'}},
      {h3:'Что почитать в пути'},
      {list:['<a href="#path-1">Барабаны</a> · <a href="#path-2">Бас</a> · <a href="#path-3">Аккорды и мелодия</a>','<a href="#path-4">Звуки в Drift</a> · <a href="#path-6">Обработка и sidechain</a>','<a href="#path-8">Аранжировка</a> · <a href="#path-11">Трек по референсу</a>']}]; })()
]}));
})();
