// My Space — shared navigation + optional UI sounds
(() => {
  'use strict';
  // Load Monochrome styles after existing stylesheets on every page.
  if (!document.querySelector('link[data-myspace-monochrome]')) {
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = 'monochrome.css';
    sheet.dataset.myspaceMonochrome = 'true';
    document.head.appendChild(sheet);
  }
  // Application-wide notifications (loaded on every sidebar page).
  for (const [id, href] of [['myspace-notify-style', 'notifications.css'], ['myspace-notify-script', 'notifications.js']]) {
    if (document.getElementById(id)) continue;
    const node = document.createElement(id.endsWith('style') ? 'link' : 'script');
    node.id = id;
    if (node.tagName === 'LINK') { node.rel = 'stylesheet'; node.href = href; }
    else { node.src = href; node.defer = true; }
    document.head.appendChild(node);
  }
  // Global finishing layer, shared by every page that loads sidebar.js.
  if (!document.querySelector('link[data-myspace-polish]')) {
    const polish = document.createElement('link');
    polish.rel = 'stylesheet';
    polish.href = 'visual-polish.css';
    polish.dataset.myspacePolish = 'true';
    document.head.appendChild(polish);
  }
  try {
    if (localStorage.getItem('mySpaceTheme') === 'monochrome') {
      document.body.dataset.theme = 'monochrome';
      document.body.classList.remove('modo-claro');
    }
  } catch {}
  const pages=[
    {name:'Dashboard',file:'index.html',icon:'dashboard'},
    {name:'My Tasks',file:'tasks.html',icon:'tasks'},
    {name:'Statistics',file:'statistics.html',icon:'statistics'},
    {name:'Focus Mode',file:'focus.html',icon:'focus'},
    {name:'Notes & Journal',file:'notes.html',icon:'notes'},
    {name:'Habit Tracker',file:'habits.html',icon:'habits'},
    {name:'Daily Quote',file:'quotes.html',icon:'quote'},
    {name:'Backup & Restore',file:'backup.html',icon:'backup'},
    {name:'Cloud Sync',file:'sync.html',icon:'backup'}
  ];
  const icons={
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    tasks:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 10 2 2 3-3 M14 10h4 M7 16h11"/>',
    statistics:'<path d="M4 20V10 M10 20V4 M16 20v-7 M22 20V8 M2 20h20"/>',
    focus:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    habits:'<path d="M4 13l5 5L20 6"/><circle cx="12" cy="12" r="10"/>',
    notes:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8 M8 12h8 M8 16h5"/>',
    backup:'<path d="M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4"/>',
    quote:'<path d="M3 21c3-2 5-5 5-9H3V4h8v8c0 5-3 8-8 9Z M14 21c3-2 5-5 5-9h-5V4h8v8c0 5-3 8-8 9Z"/>',
    account:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 8l-2-2-2 1-1-3h-4l-1 3-2-1-2 2 1 2-3 1v3l3 1-1 2 2 2 2-1 1 3h4l1-3 2 1 2-2-1-2 3-1v-3l-3-1z"/>',
    menu:'<path d="M4 6h16 M4 12h16 M4 18h16"/>'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${icons[name]||''}</svg>`;
  const current=location.pathname.split('/').pop()||'index.html';
  const sidebar=document.createElement('aside');sidebar.className='myspace-sidebar';sidebar.id='myspace-sidebar';sidebar.setAttribute('aria-label','Application navigation');
  const brand=document.createElement('a');brand.className='sidebar-brand';brand.href='index.html';brand.innerHTML='<span class="sidebar-logo">✦</span><span>My Space</span>';
  const sectionTitle=document.createElement('div');sectionTitle.className='sidebar-section-title';sectionTitle.textContent='WORKSPACE';
  function link(page){const a=document.createElement('a');a.href=page.file;a.className='sidebar-link';const icon=document.createElement('span');icon.className='sidebar-icon';icon.innerHTML=svg(page.icon);const label=document.createElement('span');label.textContent=page.name;a.append(icon,label);if(page.file===current){a.classList.add('active');a.setAttribute('aria-current','page');}return a;}
  const nav=document.createElement('nav');nav.className='sidebar-links';nav.setAttribute('aria-label','Main navigation');pages.forEach(p=>nav.appendChild(link(p)));
  const bottom=document.createElement('div');bottom.className='sidebar-bottom';
  const divider=document.createElement('div');divider.className='sidebar-divider';bottom.append(divider,link({name:'Settings',file:'settings.html',icon:'settings'}),link({name:'Account',file:'auth.html',icon:'account'}));
  const soundsToggle=document.createElement('button');soundsToggle.type='button';soundsToggle.className='sidebar-link';soundsToggle.id='ui-sounds-toggle';soundsToggle.style.width='100%';soundsToggle.style.textAlign='left';soundsToggle.style.cursor='pointer';soundsToggle.style.fontFamily='inherit';soundsToggle.style.fontSize='14px';soundsToggle.style.background='transparent';soundsToggle.style.border='1px solid transparent';
  const soundsIcon=document.createElement('span');soundsIcon.className='sidebar-icon';soundsIcon.textContent='♫';const soundsLabel=document.createElement('span');soundsToggle.append(soundsIcon,soundsLabel);bottom.appendChild(soundsToggle);
  const status=document.createElement('div');status.className='sidebar-status';status.innerHTML='<span class="sidebar-status-dot"></span><span>Your personal workspace</span>';bottom.appendChild(status);
  sidebar.append(brand,sectionTitle,nav,bottom);
  const mobile=document.createElement('div');mobile.className='myspace-mobile-header';const mobileBrand=document.createElement('a');mobileBrand.href='index.html';mobileBrand.className='mobile-brand';mobileBrand.innerHTML='<span>✦</span> My Space';const toggle=document.createElement('button');toggle.type='button';toggle.className='sidebar-toggle';toggle.setAttribute('aria-label','Open navigation');toggle.setAttribute('aria-controls',sidebar.id);toggle.setAttribute('aria-expanded','false');toggle.innerHTML=svg('menu');mobile.append(mobileBrand,toggle);
  const overlay=document.createElement('div');overlay.className='myspace-sidebar-overlay';overlay.setAttribute('aria-hidden','true');
  document.body.classList.add('myspace-shell');document.body.prepend(sidebar,mobile,overlay);
  const query=matchMedia('(max-width: 900px)');let open=false;
  function sync(){sidebar.inert=query.matches&&!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');}
  function close(restore=true){if(!open)return;open=false;document.body.classList.remove('sidebar-open');if(restore&&query.matches)toggle.focus();sync();}
  toggle.addEventListener('click',()=>{if(open){close();return;}open=true;document.body.classList.add('sidebar-open');sync();sidebar.querySelector('a')?.focus();});
  overlay.addEventListener('click',()=>close());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)close();if(e.key==='Tab'&&open){const elements=[...sidebar.querySelectorAll('a[href],button:not([disabled])')];const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  query.addEventListener('change',()=>{open=false;document.body.classList.remove('sidebar-open');sync();});sync();

  // Subtle user-initiated UI clicks, generated with Web Audio. No downloads.
  const AUDIO_KEY='mySpaceUiSounds';let audio=null;
  let enabled=true;try{enabled=localStorage.getItem(AUDIO_KEY)!=='off';}catch{}
  function refreshSoundButton(){soundsLabel.textContent=enabled?'UI Sounds: On':'UI Sounds: Off';soundsToggle.setAttribute('aria-pressed',String(enabled));}
  function clickSound(){if(!enabled)return;try{const Ctor=window.AudioContext||window.webkitAudioContext;if(!Ctor)return;if(!audio||audio.state==='closed')audio=new Ctor();if(audio.state==='suspended')audio.resume().catch(()=>{});const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(680,now);osc.frequency.exponentialRampToValueAtTime(400,now+.045);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.07);osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.08);osc.onended=()=>{osc.disconnect();gain.disconnect();};}catch(e){console.debug('UI sound unavailable',e);}}
  document.addEventListener('click',e=>{const target=e.target.closest('button,a[href],input[type="checkbox"]');if(target && !target.disabled && target!==soundsToggle)clickSound();});
  soundsToggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem(AUDIO_KEY,enabled?'on':'off');}catch{}refreshSoundButton();if(enabled)clickSound();});
  window.addEventListener('storage',e=>{if(e.key===AUDIO_KEY){enabled=e.newValue!=='off';refreshSoundButton();}});
  window.addEventListener('myspace:uisoundschange', e=>{enabled=Boolean(e.detail?.enabled);refreshSoundButton();});
  refreshSoundButton();
})();
