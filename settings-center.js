/* My Space 3.6 — settings use existing storage keys. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const status=$('settings-status');
 const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
 const write=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{status.textContent='Unable to save preferences in this browser.';return false;}};
 const say=message=>{status.textContent=message;};
 const name=$('profile-name');name.value=read('nombreUsuario','');
 $('profile-form').addEventListener('submit',e=>{e.preventDefault();const value=name.value.trim();if(write('nombreUsuario',value))say('Display name saved.');});
 const theme=read('mySpaceTheme','amethyst');
 const selected=document.querySelector(`input[name="theme"][value="${['amethyst','crimson','pearl','monochrome'].includes(theme)?theme:'amethyst'}"]`);
 if(selected)selected.checked=true;
 document.querySelectorAll('input[name="theme"]').forEach(input=>input.addEventListener('change',()=>{
   if(!input.checked)return;
   if(write('mySpaceTheme',input.value)){
     document.body.dataset.theme=input.value;
     document.body.classList.toggle('modo-claro',input.value==='pearl');
     write('tema',input.value==='pearl'?'claro':'oscuro');
     document.dispatchEvent(new CustomEvent('myspace:themechange',{detail:{theme:input.value}}));
     say('Theme preference saved.');
   }
 }));
 const sounds=$('setting-ui-sounds');sounds.checked=read('mySpaceUiSounds','on')!=='off';
 sounds.addEventListener('change',()=>{if(write('mySpaceUiSounds',sounds.checked?'on':'off')){window.dispatchEvent(new CustomEvent('myspace:uisoundschange',{detail:{enabled:sounds.checked}}));say('Sound preference saved.');}});
 const reminders=$('setting-reminders');reminders.checked=read('mySpaceRemindersEnabled','on')!=='off';
 reminders.addEventListener('change',()=>{if(write('mySpaceRemindersEnabled',reminders.checked?'on':'off'))say('Reminder preference saved.');});
 window.addEventListener('storage',e=>{
   if(e.key==='mySpaceUiSounds')sounds.checked=e.newValue!=='off';
   if(e.key==='mySpaceRemindersEnabled')reminders.checked=e.newValue!=='off';
 });
})();
