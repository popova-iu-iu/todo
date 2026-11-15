// Звуковой движок. Названия нот — как в Ableton: C3 = средняя «до» (MIDI 60).
(function(){
  const PC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const RU = {C:'до',D:'ре',E:'ми',F:'фа',G:'соль',A:'ля',B:'си'};
  function midi(n){
    if(typeof n==='number') return n;
    const m=/^([A-G])(#|b)?(-?\d)$/.exec(n); if(!m) throw new Error('note '+n);
    return (parseInt(m[3],10)+2)*12 + PC[m[1]] + (m[2]==='#'?1:m[2]==='b'?-1:0);
  }
  function name(m){ return NAMES[m%12] + (Math.floor(m/12)-2); }
  function ru(m){ const n=NAMES[m%12]; return RU[n[0]] + (n.length>1?'♯':''); }
  window.NOTE={midi,name,ru,isBlack:m=>[1,3,6,8,10].includes(m%12)};

  let inst=null, part=null, tick=null, current=null, ready=false;
  const listeners=new Set(); const stopHooks=new Set();

  function build(){
    if(inst) return inst;
    const T=window.Tone;
    const master=new T.Limiter(-1).toDestination();
    const rev=new T.Reverb({decay:2.2,wet:1}); rev.connect(master);
    const revSend=new T.Gain(0.25).connect(rev);
    const kick=new T.MembraneSynth({pitchDecay:0.045,octaves:6,oscillator:{type:'sine'},envelope:{attack:0.001,decay:0.42,sustain:0,release:0.05}}).connect(master); kick.volume.value=-2;
    const snF=new T.Filter(1400,'highpass').connect(master); snF.connect(revSend);
    const snare=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.17,sustain:0}}).connect(snF); snare.volume.value=-8;
    const snBody=new T.MembraneSynth({pitchDecay:0.02,octaves:2,envelope:{attack:0.001,decay:0.12,sustain:0}}).connect(master); snBody.volume.value=-14;
    const clF=new T.Filter({frequency:1600,type:'bandpass',Q:1.2}).connect(master); clF.connect(revSend);
    const clap=new T.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.004,decay:0.14,sustain:0}}).connect(clF); clap.volume.value=-4;
    const hF=new T.Filter(7500,'highpass').connect(master);
    const hat=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.045,sustain:0}}).connect(hF); hat.volume.value=-15;
    const ohat=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.32,sustain:0}}).connect(hF); ohat.volume.value=-18;
    const rim=new T.MembraneSynth({pitchDecay:0.008,octaves:1.5,envelope:{attack:0.001,decay:0.06,sustain:0}}).connect(master); rim.volume.value=-12;
    const tom=new T.MembraneSynth({pitchDecay:0.06,octaves:2.5,envelope:{attack:0.001,decay:0.3,sustain:0}}).connect(master); tom.volume.value=-8;
    const shF=new T.Filter(5000,'bandpass').connect(master);
    const shaker=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:0.01,decay:0.06,sustain:0}}).connect(shF); shaker.volume.value=-16;
    const crF=new T.Filter(5000,'highpass').connect(master); crF.connect(revSend);
    const crash=new T.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:1.4,sustain:0}}).connect(crF); crash.volume.value=-20;

    const bassF=new T.Filter(2500,'lowpass').connect(master);
    const bass=new T.MonoSynth({oscillator:{type:'sawtooth'},filter:{Q:1.5,type:'lowpass',rolloff:-24},
      envelope:{attack:0.004,decay:0.25,sustain:0.55,release:0.08},
      filterEnvelope:{attack:0.004,decay:0.22,sustain:0.25,release:0.1,baseFrequency:110,octaves:3.2}}).connect(bassF); bass.volume.value=-9;
    const sub=new T.MonoSynth({oscillator:{type:'sine'},filter:{type:'lowpass',frequency:400},envelope:{attack:0.005,decay:0.1,sustain:0.9,release:0.08},
      filterEnvelope:{baseFrequency:300,octaves:0}}).connect(master); sub.volume.value=-5;
    const reese=new T.MonoSynth({oscillator:{type:'fatsawtooth',count:3,spread:35},filter:{Q:1,type:'lowpass'},
      envelope:{attack:0.01,decay:0.3,sustain:0.8,release:0.1},filterEnvelope:{attack:0.01,decay:0.4,sustain:0.6,baseFrequency:180,octaves:2}}).connect(master); reese.volume.value=-14;
    const chF=new T.Filter(2200,'lowpass').connect(master); chF.connect(revSend);
    const chord=new T.PolySynth(T.Synth,{oscillator:{type:'fatsawtooth',count:3,spread:18},envelope:{attack:0.03,decay:0.3,sustain:0.6,release:0.5}}).connect(chF); chord.volume.value=-21;
    const pad=new T.PolySynth(T.Synth,{oscillator:{type:'fatsawtooth',count:3,spread:30},envelope:{attack:0.6,decay:0.5,sustain:0.8,release:1.8}}).connect(chF); pad.volume.value=-24;
    const keysF=new T.Filter(3000,'lowpass').connect(master); keysF.connect(revSend);
    const keys=new T.PolySynth(T.Synth,{oscillator:{type:'triangle'},envelope:{attack:0.005,decay:0.6,sustain:0.25,release:0.8}}).connect(keysF); keys.volume.value=-12;
    const leadF=new T.Filter(3500,'lowpass').connect(master); leadF.connect(revSend);
    const lead=new T.Synth({oscillator:{type:'square'},envelope:{attack:0.005,decay:0.2,sustain:0.4,release:0.25}}).connect(leadF); lead.volume.value=-17;
    const pluck=new T.PolySynth(T.Synth,{oscillator:{type:'sawtooth'},envelope:{attack:0.002,decay:0.18,sustain:0,release:0.15}}).connect(leadF); pluck.volume.value=-16;

    const drums={
      kick:(t,v)=>kick.triggerAttackRelease('C1','8n',t,v),
      snare:(t,v)=>{snare.triggerAttackRelease('16n',t,v); snBody.triggerAttackRelease('G2','16n',t,v);},
      clap:(t,v)=>{clap.triggerAttackRelease('16n',t,v*.8); clap.triggerAttackRelease('16n',t+0.012,v*.7); clap.triggerAttackRelease('16n',t+0.024,v);},
      hat:(t,v)=>hat.triggerAttackRelease('32n',t,v),
      ohat:(t,v)=>ohat.triggerAttackRelease('8n',t,v),
      rim:(t,v)=>rim.triggerAttackRelease('A4','32n',t,v),
      tom:(t,v)=>tom.triggerAttackRelease('A2','8n',t,v),
      shaker:(t,v)=>shaker.triggerAttackRelease('32n',t,v),
      crash:(t,v)=>crash.triggerAttackRelease('2n',t,v)
    };
    const synths={bass,sub,reese,chord,pad,keys,lead,pluck};
    inst={drums,synths};
    return inst;
  }

  async function start(){ await Tone.start(); build(); ready=true; }
  function hz(m){ return Tone.Frequency(m,'midi').toFrequency(); }

  async function previewNote(n,voice){
    await start(); const s=inst.synths[voice||'keys']; const m=midi(n);
    if(s.triggerAttackRelease) s.triggerAttackRelease(hz(m),'8n',undefined,0.8);
  }
  async function previewChord(ns,voice){
    await start(); const s=inst.synths[voice||'keys'];
    s.triggerAttackRelease(ns.map(n=>hz(midi(n))),'2n',undefined,0.7);
  }
  async function previewDrum(k){ await start(); inst.drums[k] && inst.drums[k](Tone.now()+0.01,0.9); }

  // song = {bpm, bars, swing, layers:[{type:'drums', rows:[{sound, hits:[step...], vel:{step:v}}]}, {type:'notes', voice, notes:[[note,start,len,vel?]]}]}
  async function play(id, getSong, onStep){
    await start();
    stop();
    const song=getSong();
    const T=Tone, PPQ=T.Transport.PPQ, S=PPQ/4;
    T.Transport.bpm.value=song.bpm||120;
    T.Transport.swing=song.swing||0; T.Transport.swingSubdivision='16n';
    const total=(song.bars||1)*16;
    const events=[];
    song.layers.forEach(L=>{
      if(L.mute) return;
      if(L.type==='drums'){
        L.rows.forEach(r=>{ if(r.mute) return; r.hits.forEach(s=>{ events.push({time:(s*S)+'i',kind:'d',sound:r.sound,fn:r.fn,vel:(r.vel&&r.vel[s])||r.v||0.9}); }); });
      } else {
        const groups={};
        L.notes.forEach(n=>{ const k=n[1]+'_'+n[2]; (groups[k]=groups[k]||{start:n[1],len:n[2],ms:[],vel:n[3]||0.8}).ms.push(midi(n[0])); });
        Object.values(groups).forEach(g=>events.push({time:(g.start*S)+'i',kind:'n',voice:L.voice,obj:L.obj,ms:g.ms,dur:(g.len*S)+'i',vel:g.vel}));
      }
    });
    part=new T.Part((time,e)=>{
      if(e.kind==='d'){ if(e.fn) e.fn(time,e.vel); else inst.drums[e.sound] && inst.drums[e.sound](time,e.vel); }
      else { const s=e.obj||inst.synths[e.voice]; if(!s) return;
        if(e.ms.length>1 || s instanceof T.PolySynth) s.triggerAttackRelease(e.ms.map(hz),e.dur,time,e.vel);
        else s.triggerAttackRelease(hz(e.ms[0]),e.dur,time,e.vel); }
    },events);
    part.loop=true; part.loopEnd=(total*S)+'i'; part.start(0);
    tick=T.Transport.scheduleRepeat(time=>{
      const st=Math.floor(T.Transport.ticks/S)%total;
      T.Draw.schedule(()=>{ onStep && onStep(st); },time);
    },'16n');
    current=id; T.Transport.start('+0.05');
    listeners.forEach(f=>f(current));
  }
  function stop(){
    if(!window.Tone) return;
    Tone.Transport.stop(); Tone.Transport.cancel();
    if(part){ part.dispose(); part=null; }
    if(inst){ Object.values(inst.synths).forEach(s=>{ try{ s.releaseAll ? s.releaseAll() : s.triggerRelease(); }catch(e){} }); }
    stopHooks.forEach(f=>{ try{f();}catch(e){} });
    const was=current; current=null; tick=null;
    if(was) listeners.forEach(f=>f(null));
  }
  // звук уже включён (на iPhone — только после первого касания)
  const running=()=>!!window.Tone && Tone.getContext().state==='running';
  window.AUDIO={start,running,hz,onStop:f=>stopHooks.add(f),play,stop,previewNote,previewChord,previewDrum,onChange:f=>listeners.add(f),current:()=>current,midi};
})();
