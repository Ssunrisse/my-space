/* My Space — Ambient Studio (procedural audio, no external downloads) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const TYPES = {
    rain: {name:'🌧️ Rain',filter:'highpass',freq:650,level:.18,defaultVolume:35},
    thunder:{name:'⛈️ Thunder',filter:'lowpass',freq:110,level:.34,defaultVolume:25,lfo:.075,depth:.46},
    wind:{name:'🍃 Wind',filter:'lowpass',freq:340,level:.34,defaultVolume:35,lfo:.17,depth:.55},
    noise:{name:'📻 White Noise',filter:'allpass',freq:1000,level:.12,defaultVolume:22},
    waves:{name:'🌊 Ocean Waves',filter:'lowpass',freq:900,level:.24,defaultVolume:40,lfo:.10,depth:.8},
    fire:{name:'🔥 Fireplace',filter:'highpass',freq:1500,level:.16,defaultVolume:35,lfo:3.1,depth:.4},
    cafe:{name:'☕ Café Hum',filter:'bandpass',freq:500,level:.21,defaultVolume:30,lfo:.21,depth:.18},
    brown:{name:'🌙 Deep Noise',filter:'lowpass',freq:170,level:.38,defaultVolume:35}
  };
  const PRESETS = {
    rainy:{rain:55,thunder:18,wind:14},
    cozy:{rain:18,fire:32,cafe:24},
    forest:{wind:34,waves:24,rain:12},
    deep:{brown:45,noise:12}
  };
  const KEY = 'mySpaceAmbientStudioV2';
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  const grid=$('ambient-sounds'), status=$('ambient-status'), savedRoot=$('ambient-saved');
  if (!grid || !status || !savedRoot) return;
  let ctx=null, buffer=null, mixBus=null;
  const active=new Map();
  const volumes=Object.fromEntries(Object.entries(TYPES).map(([id,x])=>[id,x.defaultVolume]));
  let master=70, muted=false, currentPreset='', saved=[];
  let requestSerial=0;

  function readSettings(){
    try {
      const data=JSON.parse(localStorage.getItem(KEY));
      if(!data || typeof data!=='object') return;
      if(Number.isFinite(data.master)) master=clamp(data.master);
      if(typeof data.muted==='boolean') muted=data.muted;
      if(data.volumes && typeof data.volumes==='object') for(const id of Object.keys(TYPES))
        if(Number.isFinite(data.volumes[id])) volumes[id]=clamp(data.volumes[id]);
      if(Array.isArray(data.saved)) saved=data.saved.filter(x=>validMix(x)).slice(0,30);
    } catch { /* Default configuration */ }
  }
  function clamp(value){return Math.max(0,Math.min(100,Math.round(value)));}
  function validMix(x){return x && typeof x.name==='string' && x.name.length<=40 && x.name.trim() && x.volumes && typeof x.volumes==='object' && Array.isArray(x.enabled) && x.enabled.every(id=>Object.hasOwn(TYPES,id)) && Object.values(x.volumes).every(v=>Number.isFinite(v)&&v>=0&&v<=100);}
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify({master,muted,volumes,saved}));}
    catch{status.textContent='Your browser could not save this mix.';}
  }
  function makeNoise(){
    const b=ctx.createBuffer(1,ctx.sampleRate*5,ctx.sampleRate), arr=b.getChannelData(0);
    for(let i=0;i<arr.length;i++) arr[i]=Math.random()*2-1;
    return b;
  }
  async function initAudio(){
    if(!AudioCtor) throw new Error('Web Audio is not supported.');
    if(!ctx || ctx.state==='closed'){
      ctx=new AudioCtor();buffer=makeNoise();mixBus=ctx.createGain();mixBus.connect(ctx.destination);
      updateMaster();
    }
    if(ctx.state==='suspended') await ctx.resume();
  }
  function updateMaster(){
    if(!ctx || !mixBus) return;
    mixBus.gain.setTargetAtTime(muted?0:(master/100),ctx.currentTime,.06);
  }
  function spawn(type){
    const cfg=TYPES[type];
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
    const filter=ctx.createBiquadFilter();filter.type=cfg.filter;filter.frequency.value=cfg.freq;
    const amp=ctx.createGain();amp.gain.value=0;
    source.connect(filter);filter.connect(amp);amp.connect(mixBus);
    let oscillator=null,depth=null;
    if(cfg.lfo){
      oscillator=ctx.createOscillator();oscillator.type='sine';oscillator.frequency.value=cfg.lfo;
      depth=ctx.createGain();depth.gain.value=0;oscillator.connect(depth);depth.connect(amp.gain);
      oscillator.start();
    }
    source.start();
    return {source,filter,amp,oscillator,depth};
  }
  function setSoundVolume(type){
    const s=active.get(type);if(!s||!ctx)return;
    const cfg=TYPES[type],v=cfg.level*(volumes[type]/100);
    const d=cfg.depth || 0;
    s.amp.gain.setTargetAtTime(v*(1-d/2),ctx.currentTime,.04);
    if(s.depth)s.depth.gain.setTargetAtTime(v*d/2,ctx.currentTime,.04);
  }
  function stop(type){
    const s=active.get(type);if(!s)return;
    try{s.source.stop();s.oscillator?.stop();}catch{}
    s.source.disconnect();s.filter.disconnect();s.amp.disconnect();
    s.oscillator?.disconnect();s.depth?.disconnect();active.delete(type);
  }
  function stopAll(){ requestSerial++;for(const type of [...active.keys()])stop(type);currentPreset='';draw(); }
  async function start(type, serial){
    await initAudio();
    if(serial!==requestSerial||active.has(type)) return;
    active.set(type,spawn(type));setSoundVolume(type);
  }
  async function toggle(type){
    if(!Object.hasOwn(TYPES,type))return;
    currentPreset='';
    if(active.has(type)){stop(type);draw();return;}
    const serial=++requestSerial;
    try{await start(type,serial);}catch(err){console.error(err);status.textContent='Unable to play audio. Check your browser audio settings.';return;}
    draw();
  }
  async function applyMix(mix,preset=''){
    requestSerial++;
    const serial=requestSerial;
    for(const type of [...active.keys()])stop(type);
    for(const type of Object.keys(TYPES)){
      if(Number.isFinite(mix.volumes?.[type]))volumes[type]=clamp(mix.volumes[type]);
    }
    currentPreset=preset;
    const enabled=mix.enabled.filter(id=>Object.hasOwn(TYPES,id));
    try{
      if(enabled.length)await initAudio();
      if(serial!==requestSerial)return;
      for(const type of enabled){active.set(type,spawn(type));setSoundVolume(type);}
    }catch(err){console.error(err);status.textContent='Audio could not start.';}
    draw();persist();
  }
  function draw(){
    document.querySelectorAll('[data-sound]').forEach(button=>{
      const on=active.has(button.dataset.sound);
      button.textContent=on?'Stop':'Play';button.classList.toggle('playing',on);
      button.setAttribute('aria-pressed',String(on));
    });
    document.querySelectorAll('[data-volume]').forEach(slider=>{
      const type=slider.dataset.volume;slider.value=String(volumes[type]);
      const output=$('level-'+type);if(output)output.textContent=volumes[type]+'%';
    });
    document.querySelectorAll('[data-preset]').forEach(button=>button.classList.toggle('active',button.dataset.preset===currentPreset));
    $('ambient-master-volume').value=String(master);$('ambient-master-value').textContent=master+'%';
    $('ambient-mute').textContent=muted?'Unmute':'Mute';
    $('ambient-mute').setAttribute('aria-pressed',String(muted));
    const n=active.size;
    status.textContent=n?`${n} ambient sound${n===1?'':'s'} playing${muted?' (muted)':''}.`:'All sounds are stopped.';
  }
  function renderSaved(){
    savedRoot.replaceChildren();
    if(!saved.length){const p=document.createElement('p');p.className='ambient-empty';p.textContent='No saved mixes yet.';savedRoot.append(p);return;}
    for(const item of saved){
      const row=document.createElement('div');row.className='ambient-saved-row';
      const name=document.createElement('span');name.textContent=item.name;
      const actions=document.createElement('div');actions.className='ambient-saved-actions';
      const play=document.createElement('button');play.type='button';play.textContent='Load';play.addEventListener('click',()=>applyMix(item));
      const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+item.name);
      remove.addEventListener('click',()=>{saved=saved.filter(x=>x.id!==item.id);persist();renderSaved();});
      actions.append(play,remove);row.append(name,actions);savedRoot.append(row);
    }
  }
  function setupUI(){
    for(const [id,cfg] of Object.entries(TYPES)){
      const item=document.createElement('div');item.className='sound-item';
      const meta=document.createElement('div');meta.className='sound-meta';
      const label=document.createElement('label');label.textContent=cfg.name;label.htmlFor='ambient-'+id;
      const output=document.createElement('output');output.id='level-'+id;output.textContent=volumes[id]+'%';
      meta.append(label,output);
      const controls=document.createElement('div');controls.className='sound-controls';
      const button=document.createElement('button');button.type='button';button.dataset.sound=id;button.setAttribute('aria-pressed','false');button.textContent='Play';
      button.addEventListener('click',()=>toggle(id));
      const range=document.createElement('input');range.id='ambient-'+id;range.dataset.volume=id;range.type='range';range.min='0';range.max='100';range.value=String(volumes[id]);range.setAttribute('aria-label',cfg.name+' volume');
      range.addEventListener('input',()=>{volumes[id]=clamp(Number(range.value));currentPreset='';setSoundVolume(id);draw();persist();});
      controls.append(button,range);item.append(meta,controls);grid.append(item);
    }
  }
  readSettings();setupUI();
  $('stop-all-sounds').addEventListener('click',stopAll);
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.preset,levels=PRESETS[id];
    if(!levels)return;
    applyMix({volumes:Object.fromEntries(Object.keys(TYPES).map(type=>[type,levels[type]??volumes[type]])),enabled:Object.keys(levels)},id);
  }));
  $('ambient-master-volume').addEventListener('input',event=>{master=clamp(Number(event.target.value));updateMaster();draw();persist();});
  $('ambient-mute').addEventListener('click',()=>{muted=!muted;updateMaster();draw();persist();});
  $('ambient-save-form').addEventListener('submit',event=>{
    event.preventDefault();const input=$('ambient-scene-name'),name=input.value.trim();
    if(!name||name.length>40)return;
    const item={id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random(),name,volumes:{...volumes},enabled:[...active.keys()]};
    if(saved.length>=30){status.textContent='Maximum 30 saved mixes. Delete one to add another.';return;}
    saved.unshift(item);persist();renderSaved();input.value='';status.textContent=`Saved: ${name}`;
  });
  window.addEventListener('pagehide',()=>{stopAll();if(ctx&&ctx.state!=='closed')ctx.close().catch(()=>{});});
  window.addEventListener('storage',event=>{if(event.key===KEY){/* Keep active playback unchanged; refresh saved scenes only */
    try{const remote=JSON.parse(event.newValue);if(Array.isArray(remote?.saved)){saved=remote.saved.filter(validMix).slice(0,30);renderSaved();}}catch{}
  }});
  renderSaved();draw();
})();
