/* My Space 3.5 — read-only reminders and activity. No existing data is modified. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('activity-upcoming-list')) return;
  const KEYS = ['mySpaceUnifiedTasks', 'mySpaceHabitsV1', 'mySpaceFocusHistory'];
  const get = key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const today = () => dayKey(new Date());
  const dayOffset = days => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return dayKey(d); };
  const item = (name, details) => { const li=document.createElement('li'); const title=document.createElement('span'); title.className='activity-item-name'; title.textContent=name; const note=document.createElement('small'); note.textContent=details; li.append(title,note); return li; };
  const dateLabel = key => key===today() ? 'Today' : key===dayOffset(1) ? 'Tomorrow' : key<today() ? 'Overdue' : new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(new Date(`${key}T12:00:00`));
  const banner = $('activity-alert');
  function render() {
    const now=today();
    const tasks=get(KEYS[0]).filter(t=>t && typeof t.text==='string' && typeof t.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && !t.completed);
    const overdue=tasks.filter(t=>t.date<now).length;
    const dueToday=tasks.filter(t=>t.date===now).length;
    $('activity-overdue-count').textContent=`${overdue} overdue`;
    $('activity-today-count').textContent=`${dueToday} due today`;
    const upcoming=tasks.filter(t=>t.date<=dayOffset(7)).sort((a,b)=>a.date.localeCompare(b.date)||(({high:0,medium:1,low:2}[a.priority]??1)-({high:0,medium:1,low:2}[b.priority]??1))).slice(0,6);
    $('activity-upcoming-list').replaceChildren(...upcoming.map(t=>item(t.text,dateLabel(t.date))));
    $('activity-upcoming-empty').hidden=upcoming.length>0;
    const dismissed=sessionStorage.getItem('mySpaceActivityDismissedOn')===now;
    banner.hidden=localStorage.getItem('mySpaceRemindersEnabled')==='off' || dismissed || (overdue===0 && dueToday===0);
    $('activity-alert-text').textContent=`You have ${overdue} overdue ${overdue===1?'task':'tasks'} and ${dueToday} ${dueToday===1?'task':'tasks'} due today.`;
    const habits=get(KEYS[1]).filter(h=>h&&typeof h.name==='string'&&h.createdAt<=now&&h.dates&&typeof h.dates==='object');
    const done=habits.filter(h=>h.dates[now]===true).length;
    const percent=habits.length?Math.round(100*done/habits.length):0;
    $('activity-habit-count').textContent=`${done} / ${habits.length}`;
    $('activity-habit-fill').style.width=`${percent}%`;
    document.querySelector('.activity-progress').setAttribute('aria-valuenow',String(percent));
    $('activity-habit-list').replaceChildren(...habits.slice(0,5).map(h=>item(`${h.icon||'🌱'} ${h.name}`,h.dates[now]===true?'✓ Done':'Not completed')));
    $('activity-habit-empty').hidden=habits.length>0;
    const focus=get(KEYS[2]).filter(s=>s&&typeof s.completedAt==='string'&&Number.isFinite(Number(s.minutes))&&Number(s.minutes)>0&&!Number.isNaN(new Date(s.completedAt).getTime())).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,5);
    $('activity-focus-list').replaceChildren(...focus.map(s=>item(`${Number(s.minutes)} min focus session`,new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(s.completedAt)))));
    $('activity-focus-empty').hidden=focus.length>0;
  }
  $('activity-alert-dismiss').addEventListener('click',()=>{try{sessionStorage.setItem('mySpaceActivityDismissedOn',today());}catch{}banner.hidden=true;});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  window.addEventListener('pageshow',render);
  window.addEventListener('storage',e=>{if(KEYS.includes(e.key)||e.key==='mySpaceRemindersEnabled')render();});
  document.addEventListener('click',()=>queueMicrotask(render));
  document.addEventListener('submit',()=>setTimeout(render,0));
  setInterval(render,30000);
  render();
})();
