/* My Space 2.6 — shared task data and UI, compatible with calendar and statistics */
(() => {
  'use strict';
  const KEY = 'mySpaceUnifiedTasks';
  const LEGACY_TASKS = 'misTareas';
  const LEGACY_CALENDAR = 'mySpaceCalendarTasks';
  const $ = id => document.getElementById(id);
  const CATEGORIES = ['Personal','Study','Work','Health','Other'];
  const PRIORITIES = ['high','medium','low'];
  const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const json = (k,fallback) => { try { const value = localStorage.getItem(k); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  const keyOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && (() => { const [y,m,d]=s.split('-').map(Number); const x=new Date(y,m-1,d,12); return x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d; })();
  const normalized = t => ({
    id: typeof t.id === 'string' ? t.id : makeId(),
    text: String(t.text ?? t.texto ?? '').trim().slice(0,160),
    date: validDate(t.date) ? t.date : null,
    completed: t.completed === true || t.completada === true,
    priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
    category: CATEGORIES.includes(t.category) ? t.category : 'Personal',
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
    completedAt: typeof t.completedAt === 'string' ? t.completedAt : null
  });
  function load() {
    const existing = json(KEY,null);
    if (Array.isArray(existing)) return existing.map(normalized).filter(t=>t.text);
    const migrated=[];
    const old=json(LEGACY_TASKS,[]);
    if(Array.isArray(old)) old.forEach(t=>{ if(t && typeof t.texto==='string' && t.texto.trim()) migrated.push(normalized(t)); });
    const calendar=json(LEGACY_CALENDAR,{});
    if(calendar && typeof calendar==='object' && !Array.isArray(calendar)) {
      for(const [date, list] of Object.entries(calendar)) {
        if(!validDate(date) || !Array.isArray(list)) continue;
        list.forEach(t => { if(t && typeof t.text==='string' && t.text.trim()) migrated.push(normalized({...t,date})); });
      }
    }
    try { localStorage.setItem(KEY,JSON.stringify(migrated)); } catch(e) { console.warn('Migration not saved',e); }
    return migrated;
  }
  let tasks = load();
  const save = next => {
    try { localStorage.setItem(KEY,JSON.stringify(next)); tasks=next; refresh(); return true; }
    catch(e) { console.error(e); alert('Could not save tasks. Check browser storage.'); return false; }
  };
  const add = (text,date=null,priority='medium',category='Personal') => {
    text=String(text).trim().slice(0,160);
    if(!text) return false;
    const ok=save([...tasks,normalized({id:makeId(),text,date,priority,category,completed:false,createdAt:new Date().toISOString()})]);
    if(ok) window.dispatchEvent(new CustomEvent('myspace:notify',{detail:{message:'Task added successfully.',type:'success'}}));
    return ok;
  };
  const patch = (id,changes) => save(tasks.map(t=>t.id===id?normalized({...t,...changes}):t));
  const remove = id => save(tasks.filter(t=>t.id!==id));
  const toggle = (id,completed) => {
    const ok=patch(id,{completed,completedAt:completed?new Date().toISOString():null});
    if(ok) window.dispatchEvent(new CustomEvent('myspace:notify',{detail:{message:completed?'Task completed. Great work!':'Task marked as pending.',type:completed?'success':'info'}}));
    return ok;
  };
  const dateLabel = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'No due date';

  // TASKS PAGE
  const taskList=$('lista-tareas'), taskForm=$('formulario-tarea');
  const inputs={text:$('nueva-tarea'),date:$('fecha-tarea'),priority:$('prioridad-tarea'),category:$('categoria-tarea')};
  const filters={search:$('buscar-tareas'),status:$('filtrar-estado'),priority:$('filtrar-prioridad'),category:$('filtrar-categoria'),sort:$('ordenar-tareas')};
  const priorityRank={high:0,medium:1,low:2};
  function makeButton(label,cls,handler) { const b=document.createElement('button'); b.type='button'; b.className=cls; b.textContent=label; b.addEventListener('click',handler); return b; }
  function startEdit(li,task) {
    const form=document.createElement('form'); form.className='task-edit-form';
    const text=document.createElement('input'); text.type='text'; text.value=task.text; text.maxLength=160; text.required=true; text.setAttribute('aria-label','Task name');
    const date=document.createElement('input'); date.type='date'; date.value=task.date||''; date.setAttribute('aria-label','Due date');
    const priority=document.createElement('select'); priority.setAttribute('aria-label','Priority');
    PRIORITIES.forEach(v=>{ const o=new Option(v[0].toUpperCase()+v.slice(1),v); priority.add(o); }); priority.value=task.priority;
    const category=document.createElement('select'); category.setAttribute('aria-label','Category');
    CATEGORIES.forEach(v=>category.add(new Option(v,v))); category.value=task.category;
    const saveButton=document.createElement('button'); saveButton.type='submit'; saveButton.textContent='Save';
    form.append(text,date,priority,category,saveButton,makeButton('Cancel','cancel-edit',renderAll));
    form.addEventListener('submit',e=>{ e.preventDefault(); const clean=text.value.trim(); if(!clean) return; patch(task.id,{text:clean,date:date.value||null,priority:priority.value,category:category.value}); });
    li.replaceChildren(form); text.focus();
  }
  function taskRow(task) {
    const li=document.createElement('li'); li.className='task-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=task.completed;check.setAttribute('aria-label',`Complete ${task.text}`);
    check.addEventListener('change',()=>toggle(task.id,check.checked));
    const details=document.createElement('div');details.className='task-details';
    const name=document.createElement('span');name.className=`task-name${task.completed?' done':''}`;name.textContent=task.text;
    const meta=document.createElement('div');meta.className='task-metadata';
    const tags=[[task.priority.toUpperCase(),`priority-${task.priority}`],[task.category,''],[dateLabel(task.date),task.date && !task.completed && task.date<keyOf(new Date())?'overdue':'']];
    tags.forEach(([label,cls])=>{const span=document.createElement('span');span.className=`task-tag ${cls}`;span.textContent=label;meta.append(span);});
    details.append(name,meta);
    const actions=document.createElement('div');actions.className='task-actions';
    actions.append(makeButton('Edit','task-edit',()=>startEdit(li,task)),makeButton('Delete','task-delete',()=>remove(task.id)));
    li.append(check,details,actions);return li;
  }
  function renderAll() {
    if(!taskList)return;
    const today=keyOf(new Date()); const s=(filters.search?.value||'').toLowerCase().trim();
    const status=filters.status?.value||'all',priority=filters.priority?.value||'all',category=filters.category?.value||'all',sort=filters.sort?.value||'date';
    const shown=tasks.filter(t=>(!s||t.text.toLowerCase().includes(s)) && (priority==='all'||t.priority===priority) && (category==='all'||t.category===category) && (status==='all'||(status==='completed'&&t.completed)||(status==='pending'&&!t.completed)||(status==='overdue'&&!t.completed&&t.date&&t.date<today)));
    shown.sort((a,b)=> sort==='priority'?priorityRank[a.priority]-priorityRank[b.priority]:sort==='created'?b.createdAt.localeCompare(a.createdAt):(a.date===null?1:b.date===null?-1:a.date.localeCompare(b.date)));
    taskList.replaceChildren(...shown.map(taskRow));
    const completed=tasks.filter(t=>t.completed).length;
    if($('contador-tareas')) $('contador-tareas').textContent=`${completed} of ${tasks.length} completed`;
    if($('visible-count')) $('visible-count').textContent=`${shown.length} task${shown.length===1?'':'s'} shown`;
    if($('sin-tareas')) $('sin-tareas').hidden=shown.length!==0;
  }
  if(taskForm)taskForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(add(inputs.text.value,inputs.date?.value||null,inputs.priority?.value||'medium',inputs.category?.value||'Personal')) {inputs.text.value=''; inputs.text.focus();}
  });
  Object.values(filters).forEach(el=>{if(el)el.addEventListener(el.tagName==='INPUT'?'input':'change',renderAll);});
  $('clear-task-filters')?.addEventListener('click',()=>{Object.entries(filters).forEach(([k,el])=>{if(el)el.value=k==='search'?'':k==='sort'?'date':'all';});renderAll();});

  // DASHBOARD — SAME SHARED DATA
  const grid=$('calendar-days'), monthTitle=$('calendar-month'),plannerList=$('scheduled-tasks');
  let selected=new Date();selected.setHours(12,0,0,0);
  let year=selected.getFullYear(),month=selected.getMonth();
  function renderCalendar() {
    if(!grid||!monthTitle)return;
    grid.replaceChildren();
    const first=new Date(year,month,1,12),count=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
    monthTitle.textContent=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    for(let i=0;i<offset;i++){const cell=document.createElement('div');cell.className='calendar-empty';grid.append(cell);}
    for(let day=1;day<=count;day++){
      const d=new Date(year,month,day,12),k=keyOf(d),button=document.createElement('button');
      button.type='button';button.className='calendar-day';button.textContent=day;
      button.setAttribute('aria-label',d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}));
      if(k===keyOf(new Date()))button.classList.add('today');
      if(k===keyOf(selected))button.classList.add('selected');
      button.setAttribute('aria-pressed',String(k===keyOf(selected)));
      if(tasks.some(t=>t.date===k))button.classList.add('has-tasks');
      button.addEventListener('click',()=>{selected=d;refresh();});grid.append(button);
    }
    const trailing=(7-(offset+count)%7)%7;
    for(let i=0;i<trailing;i++){const cell=document.createElement('div');cell.className='calendar-empty';grid.append(cell);}
  }
  function renderDay() {
    if(!plannerList)return;
    const list=tasks.filter(t=>t.date===keyOf(selected));plannerList.replaceChildren();
    if($('selected-date-title'))$('selected-date-title').textContent=selected.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    if($('day-task-count'))$('day-task-count').textContent=`${list.length} task${list.length===1?'':'s'}`;
    if($('empty-tasks'))$('empty-tasks').hidden=list.length>0;
    list.forEach(t=>{
      const li=document.createElement('li');li.className='scheduled-task';
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=t.completed;cb.setAttribute('aria-label',`Complete ${t.text}`);cb.addEventListener('change',()=>toggle(t.id,cb.checked));
      const body=document.createElement('div');body.className='task-content';
      const span=document.createElement('span');span.textContent=t.text;if(t.completed)span.classList.add('done');body.append(span);
      li.append(cb,body,makeButton('Delete','delete-task',()=>remove(t.id)));plannerList.append(li);
    });
  }
  function moveMonth(offset){const d=new Date(year,month+offset,1,12);year=d.getFullYear();month=d.getMonth();selected=d;refresh();}
  $('previous-month')?.addEventListener('click',()=>moveMonth(-1));
  $('next-month')?.addEventListener('click',()=>moveMonth(1));
  $('calendar-today')?.addEventListener('click',()=>{selected=new Date();selected.setHours(12,0,0,0);year=selected.getFullYear();month=selected.getMonth();refresh();});
  $('calendar-task-form')?.addEventListener('submit',e=>{e.preventDefault();const field=$('calendar-task-input');if(add(field.value,keyOf(selected))){field.value='';field.focus();}});
  function refresh(){renderAll();renderCalendar();renderDay();}
  window.addEventListener('storage',e=>{if(e.key===KEY){tasks=load();refresh();}});
  window.addEventListener('pageshow',()=>{tasks=load();refresh();});
  if(grid)setInterval(renderCalendar,60000);
  refresh();
})();
