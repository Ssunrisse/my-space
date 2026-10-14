/* My Space — Personal dashboard widgets. No task data is modified here. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const grid = $('personalized-grid');
  if (!grid) return;
  const STORAGE_KEY = 'mySpaceDashboardLayoutV1';
  const TASKS_KEY = 'mySpaceUnifiedTasks';
  const FOCUS_KEY = 'mySpaceFocusHistory';
  const originals = [...grid.querySelectorAll('[data-widget]')];
  const defaultIds = originals.map(w => w.dataset.widget);
  const controls = $('widget-visibility-controls');
  const panel = $('dashboard-customizer');
  const customizeButton = $('customize-dashboard');
  const readJSON = (key, fallback) => { try {const value=localStorage.getItem(key);return value === null?fallback:JSON.parse(value);}catch{return fallback;} };
  const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function validLayout(value){
    const ids = Array.isArray(value?.order) ? value.order.filter(v => defaultIds.includes(v)) : [];
    const order = [...new Set([...ids,...defaultIds])];
    const hidden = Array.isArray(value?.hidden) ? value.hidden.filter(v => defaultIds.includes(v)) : [];
    return {order,hidden};
  }
  let layout = validLayout(readJSON(STORAGE_KEY,{}));
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(layout));}catch(e){console.warn('Dashboard layout could not be saved',e);}}
  function renderLayout(){
    const lookup = new Map(originals.map(w=>[w.dataset.widget,w]));
    layout.order.forEach(id=>grid.append(lookup.get(id)));
    originals.forEach(widget => widget.hidden = layout.hidden.includes(widget.dataset.widget));
    controls.replaceChildren();
    originals.forEach(widget=>{
      const label=document.createElement('label');
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!layout.hidden.includes(widget.dataset.widget);
      checkbox.addEventListener('change',()=>{layout.hidden=checkbox.checked?layout.hidden.filter(id=>id!==widget.dataset.widget):[...layout.hidden,widget.dataset.widget];persist();renderLayout();});
      label.append(checkbox,document.createTextNode(widget.dataset.widgetTitle||widget.dataset.widget));controls.append(label);
    });
  }

  // Drag only from the handle, leaving widget controls usable.
  let dragging = null;

  function saveOrder() {
    layout.order = [...grid.querySelectorAll(':scope > [data-widget]')]
      .map(widget => widget.dataset.widget);
    persist();
  }

  originals.forEach(widget => {
    const handle = document.createElement('div');
    handle.className = 'widget-drag-handle';
    handle.draggable = true;
    handle.tabIndex = 0;
    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', `Drag to reorder ${widget.dataset.widgetTitle || widget.dataset.widget}. Alt + Up or Down to move with keyboard.`);
    handle.title = 'Drag to move • Alt + ↑ / ↓ for keyboard';
    handle.textContent = '⠿  Drag to move';
    widget.prepend(handle);

    handle.addEventListener('dragstart', event => {
      dragging = widget;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', widget.dataset.widget);
      widget.classList.add('widget-dragging');
    });

    handle.addEventListener('dragend', () => {
      if (dragging) dragging.classList.remove('widget-dragging');
      dragging = null;
      renderLayout();
    });

    handle.addEventListener('keydown', event => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const visible = [...grid.querySelectorAll(':scope > [data-widget]:not([hidden])')];
      const index = visible.indexOf(widget);
      const next = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (next < 0 || next >= visible.length) return;
      const neighbor = visible[next];
      grid.insertBefore(widget, next < index ? neighbor : neighbor.nextSibling);
      saveOrder();
      handle.focus();
    });
  });

  grid.addEventListener('dragover', event => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('[data-widget]');
    if (!target || target === dragging || target.hidden || !grid.contains(target)) return;
    const rect = target.getBoundingClientRect();
    const sourceRect = dragging.getBoundingClientRect();
    const sameRow = Math.abs(sourceRect.top - rect.top) < Math.min(sourceRect.height, rect.height) / 2;
    const after = sameRow ? event.clientX > rect.left + rect.width / 2 : event.clientY > rect.top + rect.height / 2;
    grid.insertBefore(dragging, after ? target.nextSibling : target);
  });

  grid.addEventListener('drop', event => {
    if (!dragging) return;
    event.preventDefault();
    dragging.classList.remove('widget-dragging');
    saveOrder();
    dragging = null;
  });

  customizeButton.addEventListener('click',()=>{panel.hidden=!panel.hidden;customizeButton.setAttribute('aria-expanded',String(!panel.hidden));});
  $('reset-dashboard').addEventListener('click',()=>{layout={order:[...defaultIds],hidden:[]};persist();renderLayout();});
  function renderData(){
    const rawTasks=readJSON(TASKS_KEY,[]);
    const tasks=Array.isArray(rawTasks)?rawTasks.filter(t=>t&&typeof t.text==='string'):[];
    const today=localDateKey(new Date());
    const completed=tasks.filter(t=>t.completed===true).length;
    const overdue=tasks.filter(t=>!t.completed&&typeof t.date==='string'&&t.date<today).length;
    const numbers={total:tasks.length,completed,pending:tasks.length-completed,overdue};
    for(const [k,value] of Object.entries(numbers)) $(`dash-stat-${k}`).textContent=value;
    const rate=tasks.length?Math.round(completed/tasks.length*100):0;
    $('dash-progress-fill').style.width=rate+'%';$('dash-completion-label').textContent=`${rate}% complete (${completed} of ${tasks.length})`;
    document.querySelector('.overview-progress').setAttribute('aria-valuenow',String(rate));
    const todayTasks=tasks.filter(t=>t.date===today).sort((a,b)=>({high:0,medium:1,low:2}[a.priority]??1)-({high:0,medium:1,low:2}[b.priority]??1));
    const list=$('today-tasks-list');list.replaceChildren();
    $('today-tasks-empty').hidden=todayTasks.length!==0;
    todayTasks.forEach(t=>{const li=document.createElement('li');const name=document.createElement('span');name.className='overview-task-name'+(t.completed?' done':'');name.textContent=(t.completed?'✓ ':'○ ')+t.text;const priority=document.createElement('span');priority.className='overview-priority '+(t.priority||'medium');priority.textContent=(t.priority||'medium').toUpperCase();li.append(name,priority);list.append(li);});
    const rawFocus=readJSON(FOCUS_KEY,[]);const sessions=Array.isArray(rawFocus)?rawFocus.filter(r=>r&&typeof r.completedAt==='string'&&Number.isFinite(Number(r.minutes))&&Number(r.minutes)>0):[];
    $('dash-focus-minutes').textContent=Math.round(sessions.reduce((sum,r)=>sum+Number(r.minutes),0));
    $('dash-focus-today').textContent=sessions.filter(r=>{const date=new Date(r.completedAt);return !Number.isNaN(date.getTime())&&localDateKey(date)===today;}).length;
  }
  renderLayout();renderData();
  window.addEventListener('pageshow',renderData);
  window.addEventListener('storage',e=>{if(e.key===TASKS_KEY||e.key===FOCUS_KEY)renderData();if(e.key===STORAGE_KEY){layout=validLayout(readJSON(STORAGE_KEY,{}));renderLayout();}});
  document.addEventListener('click',()=>queueMicrotask(renderData));
  document.addEventListener('submit',()=>setTimeout(renderData,0));
  document.addEventListener('change',()=>queueMicrotask(renderData));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderData();});
  setInterval(renderData,30000);
})();
