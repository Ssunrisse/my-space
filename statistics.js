/* My Space 3.4 — Unified Statistics. Read-only: never rewrites user data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEYS = {tasks:'mySpaceUnifiedTasks', habits:'mySpaceHabitsV1', focus:'mySpaceFocusHistory'};
  const read = (key) => {try {const value=JSON.parse(localStorage.getItem(key) || '[]');return Array.isArray(value)?value:[];}catch{return [];}};
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const isValidDay = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && (()=>{const [y,m,d]=s.split('-').map(Number), x=new Date(y,m-1,d,12);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d;})();
  const startOfDay = date => new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
  const offsetDay = (date, offset) => {const d=startOfDay(date);d.setDate(d.getDate()+offset);return d;};
  const numeric = value => Number.isFinite(value)&&value>0 ? value : 0;
  const formatMinutes = n => `${Math.round(n)} min`;
  function renderBars(containerId, entries, options={}) {
    const root=$(containerId);root.replaceChildren();
    const peak = Math.max(options.max || 0,...entries.map(e => e.value ?? 0),1);
    const formatter = options.format || (n=>String(n));
    for(const entry of entries) {
      const slot=document.createElement('div');slot.className='stats-bar-slot'+(entry.value===null?' no-data':'');
      const label=document.createElement('span');label.className='stats-bar-label';label.textContent=entry.label;
      const value=document.createElement('span');value.className='stats-bar-value';value.textContent=entry.value===null?'—':formatter(entry.value);
      const track=document.createElement('div');track.className='stats-bar-track';
      const fill=document.createElement('div');fill.className='stats-bar-fill';fill.style.height=`${Math.min(100,Math.max(0,(entry.value||0)/peak*100))}%`;
      track.append(fill);slot.append(value,track,label);slot.title=entry.value===null?`${entry.fullDate}: no scheduled habits`:`${entry.fullDate}: ${value.textContent}`;root.append(slot);
    }
  }
  function bestHabitStreak(h, today) {
    const checked=Object.keys(h.dates||{}).filter(k=>isValidDay(k)&&h.dates[k]===true&&k>=h.createdAt&&k<=today).sort();
    let best=0,current=0,previous=null;
    for(const key of checked){
      const previousDay=previous?offsetDay(new Date(Number(previous.slice(0,4)),Number(previous.slice(5,7))-1,Number(previous.slice(8,10)),12),1):null;
      current=previousDay&&dayKey(previousDay)===key?current+1:1;
      best=Math.max(best,current);previous=key;
    }
    return best;
  }
  function refresh() {
    const now=new Date(), today=dayKey(now);
    const tasks=read(KEYS.tasks).filter(t=>t&&typeof t.text==='string'&&t.text.trim());
    const habits=read(KEYS.habits).filter(h=>h&&typeof h.name==='string'&&isValidDay(h.createdAt)&&h.dates&&typeof h.dates==='object'&&!Array.isArray(h.dates));
    const sessions=read(KEYS.focus).filter(r=>r&&typeof r.completedAt==='string'&&!Number.isNaN(new Date(r.completedAt).getTime())&&numeric(r.minutes));
    const done=tasks.filter(t=>t.completed===true).length;
    const overdue=tasks.filter(t=>t.completed!==true&&isValidDay(t.date)&&t.date<today).length;
    const rate=tasks.length?Math.round(done/tasks.length*100):0;
    $('stat-task-rate').textContent=rate+'%';$('stat-task-detail').textContent=`${done} of ${tasks.length} completed`;
    $('stat-total').textContent=tasks.length;$('stat-completed').textContent=done;$('stat-pending').textContent=tasks.length-done;$('stat-overdue').textContent=overdue;
    $('task-progress-fill').style.width=rate+'%';$('task-progress').setAttribute('aria-valuenow',String(rate));
    const todayHabits=habits.filter(h=>h.createdAt<=today);
    const habitDone=todayHabits.filter(h=>h.dates[today]===true).length;
    const habitRate=todayHabits.length?Math.round(habitDone/todayHabits.length*100):0;
    $('stat-habit-rate').textContent=habitRate+'%';$('stat-habit-detail').textContent=`${habitDone} of ${todayHabits.length} habits`;
    $('stat-streak').textContent=Math.max(0,...habits.map(h=>bestHabitStreak(h,today)))+' days';
    const weekStart=offsetDay(now,-((now.getDay()+6)%7));const weekKey=dayKey(weekStart);
    const totalFocus=sessions.reduce((sum,r)=>sum+r.minutes,0);
    const todayFocus=sessions.filter(r=>dayKey(new Date(r.completedAt))===today).reduce((sum,r)=>sum+r.minutes,0);
    const weekFocus=sessions.filter(r=>dayKey(new Date(r.completedAt))>=weekKey).reduce((sum,r)=>sum+r.minutes,0);
    $('stat-focus-time').textContent=formatMinutes(totalFocus);
    $('stat-focus-sessions').textContent=`${sessions.length} completed sessions`;
    $('stat-focus-count').textContent=sessions.length;
    $('stat-focus-today').textContent=formatMinutes(todayFocus);
    $('stat-focus-week').textContent=formatMinutes(weekFocus);
    $('stat-focus-average').textContent=formatMinutes(sessions.length?totalFocus/sessions.length:0);
    const last7=Array.from({length:7},(_,i)=>offsetDay(now,i-6));
    const next7=Array.from({length:7},(_,i)=>offsetDay(now,i));
    const label = date => new Intl.DateTimeFormat('en',{weekday:'short'}).format(date);
    const fullDate = date => new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(date);
    renderBars('focus-chart',last7.map(date=>({label:label(date),fullDate:fullDate(date),value:sessions.filter(s=>dayKey(new Date(s.completedAt))===dayKey(date)).reduce((sum,s)=>sum+s.minutes,0)})),{format:formatMinutes});
    renderBars('habits-chart',last7.map(date=>{const day=dayKey(date);const eligible=habits.filter(h=>h.createdAt<=day);const marked=eligible.filter(h=>h.dates[day]===true).length;return {label:label(date),fullDate:fullDate(date),value:eligible.length?Math.round(marked/eligible.length*100):null};}),{max:100,format:n=>n+'%'});
    renderBars('tasks-chart',next7.map(date=>({label:label(date),fullDate:fullDate(date),value:tasks.filter(t=>t.date===dayKey(date)).length})),{format:n=>`${n} tasks`});
    $('stats-updated').textContent='Updated '+new Intl.DateTimeFormat('en',{hour:'2-digit',minute:'2-digit'}).format(now);
  }
  refresh();
  window.addEventListener('pageshow',refresh);
  window.addEventListener('storage',event=>{if(Object.values(KEYS).includes(event.key))refresh();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  setInterval(()=>{if(!document.hidden)refresh();},30000);
})();
