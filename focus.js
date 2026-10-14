// Focus timer and statistics (local to this browser)
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const CONFIG = 'mySpaceFocusSettings', HISTORY = 'mySpaceFocusHistory';
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function store(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { $('focus-feedback').textContent = 'Could not save data in this browser.'; return false; } }
  const ranges = {focus:[1,180],short:[1,60],long:[1,90]};
  const defaults = {focus:25, short:5, long:15};
  const loaded = read(CONFIG,{});
  let settings = {...defaults};
  for(const key of Object.keys(defaults)) if(Number.isInteger(loaded?.[key]) && loaded[key] >= ranges[key][0] && loaded[key] <= ranges[key][1]) settings[key]=loaded[key];
  let history = read(HISTORY,[]);
  if(!Array.isArray(history)) history=[];
  history=history.filter(x=>x && Number.isFinite(x.minutes) && x.minutes>0 && typeof x.completedAt==='string' && !Number.isNaN(Date.parse(x.completedAt)));
  let mode='focus', remaining=settings.focus*60, running=false, deadline=null, interval=null;
  const ring=$('timer-progress'), circumference=2*Math.PI*132;
  ring.style.strokeDasharray=String(circumference);
  const labels={focus:'FOCUS SESSION',short:'SHORT BREAK',long:'LONG BREAK'};
  function fmt(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function draw(){let ratio=Math.max(0,Math.min(1,remaining/(settings[mode]*60)));ring.style.strokeDashoffset=String(circumference*(1-ratio));$('timer-display').textContent=fmt(remaining);$('timer-label').textContent=labels[mode];$('timer-start').textContent=running?'Pause':'Start';document.title=`${fmt(remaining)} | Focus Mode - My Space`;document.querySelectorAll('[data-mode]').forEach(b=>{let active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function stats(){const today=dayKey(new Date());$('focus-sessions').textContent=history.length;$('focus-total').textContent=`${Math.round(history.reduce((a,x)=>a+x.minutes,0))} min`;$('focus-today').textContent=history.filter(x=>dayKey(new Date(x.completedAt))===today).length;}
  function halt(){if(interval!==null){clearInterval(interval);interval=null;}}
  function pause(){if(!running)return;remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));running=false;deadline=null;halt();$('timer-status').textContent='Paused';draw();}
  function finish(){halt();running=false;deadline=null;remaining=0;if(mode==='focus'){const updated=[...history,{completedAt:new Date().toISOString(),minutes:settings.focus}];if(store(HISTORY,updated)){history=updated;window.dispatchEvent(new CustomEvent('myspace:notify',{detail:{message:'Focus session completed! '+settings.focus+' minutes logged.',type:'success',duration:6500}}));}$('timer-status').textContent='Focus session completed! 🎉';}else $('timer-status').textContent='Break completed!';draw();stats();}
  function tick(){if(!running)return;remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(remaining===0){finish();return;}draw();}
  function toggle(){if(running){pause();return;}if(remaining===0)remaining=settings[mode]*60;deadline=Date.now()+remaining*1000;running=true;$('timer-status').textContent=mode==='focus'?'Stay focused...':'Take a break';halt();interval=setInterval(tick,250);tick();}
  function reset(){running=false;deadline=null;halt();remaining=settings[mode]*60;$('timer-status').textContent='Ready to begin';draw();}
  $('timer-start').addEventListener('click',toggle);$('timer-reset').addEventListener('click',reset);
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;reset();}));
  $('focus-duration').value=settings.focus;$('short-duration').value=settings.short;$('long-duration').value=settings.long;
  $('focus-settings-form').addEventListener('submit',e=>{e.preventDefault();let next={focus:Number($('focus-duration').value),short:Number($('short-duration').value),long:Number($('long-duration').value)};if(Object.keys(next).some(k=>!Number.isInteger(next[k])||next[k]<ranges[k][0]||next[k]>ranges[k][1])){$('focus-feedback').textContent='Please enter valid timer durations.';return;}if(store(CONFIG,next)){settings=next;reset();$('focus-feedback').textContent='Settings saved successfully.';}});
  window.addEventListener('pagehide',pause);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  window.addEventListener('storage',e=>{if(e.key===HISTORY){let next=read(HISTORY,[]);if(Array.isArray(next)){history=next;stats();}}});
  draw();stats();
})();
