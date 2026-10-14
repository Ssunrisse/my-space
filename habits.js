// My Space 3.3 — Habits (stored locally, included in Backup & Restore)
(() => {
  'use strict';
  const KEY = 'mySpaceHabitsV1';
  const $ = id => document.getElementById(id);
  const allowedIcons = ['📚','💻','💪','💧','🧘','✍️','🌱'];
  const allowedColors = ['violet','rose','teal','amber'];
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseDay = key => { const [y,m,d] = key.split('-').map(Number);return new Date(y,m-1,d,12); };
  const todayKey = () => dateKey(new Date());
  const daysBetween = (a,b) => Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
  const sameDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDay(s)) === s;
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(h => h && typeof h.id==='string' && typeof h.name==='string' && typeof h.createdAt==='string' && h.dates && typeof h.dates==='object' && !Array.isArray(h.dates))
        .map(h => ({id:h.id,name:h.name.slice(0,70),icon:allowedIcons.includes(h.icon)?h.icon:'🌱',color:allowedColors.includes(h.color)?h.color:'violet',createdAt:sameDate(h.createdAt)?h.createdAt:todayKey(),dates:Object.fromEntries(Object.entries(h.dates).filter(([day,v]) => sameDate(day) && v===true))}));
    } catch { return []; }
  }
  let habits = load();
  let calendarMonth = new Date(); calendarMonth.setDate(1);
  let editing = null;
  const notice = message => { $('habits-message').textContent=message; };
  function save(next) {
    try { localStorage.setItem(KEY,JSON.stringify(next));habits=next;render();return true; }
    catch { notice('Could not save habits. Check browser storage.');return false; }
  }
  function isScheduled(h, day) { return day >= h.createdAt; }
  function checked(h, day) { return h.dates[day]===true; }
  function streak(h) {
    const now=parseDay(todayKey());
    let start = checked(h,todayKey()) ? now : new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,12);
    let result=0;
    while (dateKey(start)>=h.createdAt && checked(h,dateKey(start))) {result++;start.setDate(start.getDate()-1);}
    return result;
  }
  function bestStreak(h) {
    const entries=Object.keys(h.dates).filter(day=>day>=h.createdAt && day<=todayKey()).sort();
    let best=0,current=0,last=null;
    for(const day of entries){current=last && daysBetween(parseDay(last),parseDay(day))===1?current+1:1;best=Math.max(best,current);last=day;}
    return best;
  }
  function currentStats() {
    const now=todayKey();
    const active=habits.filter(h=>isScheduled(h,now));
    const done=active.filter(h=>checked(h,now)).length;
    $('metric-active').textContent=active.length;
    $('metric-today').textContent=done;
    $('metric-progress').textContent=active.length?Math.round(done/active.length*100)+'%':'0%';
    $('metric-streak').textContent=Math.max(0,...habits.map(bestStreak))+' days';
    $('today-count').textContent=`${done} / ${active.length}`;
    $('today-date').textContent=new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
  }
  function element(tag,className,text) {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
  function renderList(){
    const root=$('habits-list');root.replaceChildren();
    const now=todayKey();const active=habits.filter(h=>isScheduled(h,now));
    $('habits-empty').hidden=active.length>0;
    for(const h of active){
      const done=checked(h,now);
      const row=element('div','habit-row'+(done?' done':''));
      const emoji=element('span','habit-symbol',h.icon);emoji.setAttribute('aria-hidden','true');
      const info=element('div','habit-info');info.append(element('strong','',h.name),element('small','',`🔥 ${streak(h)} day streak · Best ${bestStreak(h)} days`));
      const actions=element('div','habit-actions');
      const toggle=element('button','habit-check'+(done?' done':''),done?'✓ Done':'+ Complete');toggle.type='button';toggle.setAttribute('aria-pressed',String(done));toggle.setAttribute('aria-label',(done?'Unmark ':'Complete ')+h.name+' today');
      toggle.addEventListener('click',()=> {const next=habits.map(x=>x.id===h.id?{...x,dates:{...x.dates}}:x);const target=next.find(x=>x.id===h.id);const completing=!target.dates[now];if(!completing)delete target.dates[now];else target.dates[now]=true;if(save(next))window.dispatchEvent(new CustomEvent('myspace:notify',{detail:{message:completing?'Habit completed for today!':'Habit marked as incomplete.',type:completing?'success':'info'}}));});
      const edit=element('button','habit-edit','Edit');edit.type='button';edit.setAttribute('aria-label','Edit '+h.name);edit.addEventListener('click',()=>openDialog(h));
      const del=element('button','habit-delete','Delete');del.type='button';del.setAttribute('aria-label','Delete '+h.name);del.addEventListener('click',()=>{if(window.confirm(`Delete “${h.name}” and all its completion history?`)) save(habits.filter(x=>x.id!==h.id));});
      actions.append(toggle,edit,del);row.append(emoji,info,actions);root.append(row);
    }
  }
  function renderCalendar(){
    const root=$('habits-calendar');root.replaceChildren();
    const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
    $('month-label').textContent=new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(calendarMonth);
    const offset=(new Date(year,month,1).getDay()+6)%7;
    for(let i=0;i<offset;i++) root.append(element('span','day-spacer'));
    const count=new Date(year,month+1,0).getDate();
    for(let day=1;day<=count;day++){
      const key=dateKey(new Date(year,month,day));
      const eligible=habits.filter(h=>isScheduled(h,key));
      const completed=eligible.filter(h=>checked(h,key)).length;
      const ratio=eligible.length?completed/eligible.length:0;
      const level=ratio===0?0:ratio<.5?1:ratio<1?2:3;
      const button=element('button',`calendar-cell level-${level}${key===todayKey()?' today':''}`,String(day));button.type='button';
      button.setAttribute('aria-label',`${key}: ${completed} of ${eligible.length} habits completed`);
      button.addEventListener('click',()=>{$('calendar-detail').textContent=`${new Intl.DateTimeFormat('en',{month:'long',day:'numeric',year:'numeric'}).format(parseDay(key))}: ${completed} / ${eligible.length} habits completed.`;});
      root.append(button);
    }
  }
  function render(){currentStats();renderList();renderCalendar();}
  function openDialog(h=null){editing=h?.id??null;$('habit-dialog-title').textContent=h?'Edit Habit':'New Habit';$('habit-name').value=h?.name??'';$('habit-icon').value=h?.icon??'📚';$('habit-color').value=h?.color??'violet';$('habit-form-error').textContent='';$('habit-dialog').showModal();$('habit-name').focus();}
  $('new-habit').addEventListener('click',()=>openDialog());
  $('habit-cancel').addEventListener('click',()=>$('habit-dialog').close());
  $('habit-form').addEventListener('submit',event=>{
    event.preventDefault();const name=$('habit-name').value.trim();
    if(!name){$('habit-form-error').textContent='Enter a habit name.';return;}
    const icon=$('habit-icon').value,color=$('habit-color').value;
    if(!allowedIcons.includes(icon)||!allowedColors.includes(color))return;
    let next;
    if(editing)next=habits.map(h=>h.id===editing?{...h,name,icon,color}:h);
    else next=[...habits,{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,icon,color,createdAt:todayKey(),dates:{}}];
    if(save(next)){$('habit-dialog').close();notice(editing?'Habit updated.':'Habit created.');}
  });
  $('month-prev').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar();});
  $('month-next').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar();});
  window.addEventListener('storage',event=>{if(event.key===KEY){habits=load();render();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  render();
})();
