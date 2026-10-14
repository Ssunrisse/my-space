(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEYS = ['mySpaceUnifiedTasks','mySpaceHabitsV1','mySpaceFocusSettings','mySpaceFocusHistory','mySpaceAmbientStudioV2','mySpaceDashboardLayoutV1','mySpaceUiSounds','mySpaceTheme','tema','nombreUsuario'];
  const STORES = ['notes','folders'];
  const DB_NAME = 'mySpaceNotesDB';
  let client, user, cloudRow = null, busy = false;
  const say = text => { $('sync-status').textContent = text; };

  function openDB() {
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded = () => { for (const name of STORES) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name,{keyPath:'id'}); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || Error('Notes database unavailable.'));
      req.onblocked = () => reject(Error('Close other My Space tabs first.'));
    });
  }
  function txDone(tx) {return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Notes transaction failed.'));tx.onabort=()=>reject(tx.error||Error('Notes transaction aborted.'));});}
  async function readNotes() {
    const db=await openDB();
    try {
      const tx=db.transaction(STORES,'readonly');const done=txDone(tx);
      const items=STORES.map(name=>new Promise((resolve,reject)=>{const req=tx.objectStore(name).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}));
      const result=await Promise.all([...items,done]);return {notes:result[0],folders:result[1]};
    } finally {db.close();}
  }
  async function writeNotes(data) {
    const db=await openDB();
    try {
      const tx=db.transaction(STORES,'readwrite');const done=txDone(tx);
      for(const name of STORES){const store=tx.objectStore(name);store.clear();for(const item of data[name])store.put(item);}
      await done;
    } finally {db.close();}
  }
  async function capture() {
    const values={};for(const key of STORAGE_KEYS)values[key]=localStorage.getItem(key);
    return {format:'myspace-cloud-v1', savedAt:new Date().toISOString(),localStorage:values,indexedDB:await readNotes()};
  }
  function validate(snapshot) {
    if(!snapshot||snapshot.format!=='myspace-cloud-v1'||!snapshot.localStorage||!snapshot.indexedDB)throw Error('Unsupported cloud snapshot.');
    for(const key of STORAGE_KEYS)if(!(key in snapshot.localStorage)||(snapshot.localStorage[key]!==null&&typeof snapshot.localStorage[key]!=='string'))throw Error('Invalid saved setting: '+key);
    for(const name of STORES){
      const records=snapshot.indexedDB[name];if(!Array.isArray(records)||records.length>20000)throw Error('Invalid '+name+' collection.');
      const seen=new Set();
      for(const record of records){if(!record||typeof record!=='object'||typeof record.id!=='string'||!record.id||seen.has(record.id))throw Error('Invalid or duplicate '+name+' ID.');seen.add(record.id);
        if(name==='notes'&&(!['title','html','folderId','createdAt','updatedAt'].every(k=>typeof record[k]==='string')||typeof record.favorite!=='boolean'))throw Error('Invalid note record.');
        if(name==='folders'&&typeof record.name!=='string')throw Error('Invalid folder record.');
      }
    }
    for(const key of ['mySpaceUnifiedTasks','mySpaceHabitsV1','mySpaceFocusHistory']){const raw=snapshot.localStorage[key];if(raw!==null&&!Array.isArray(JSON.parse(raw)))throw Error('Invalid '+key);}
    for(const key of ['mySpaceFocusSettings','mySpaceAmbientStudioV2','mySpaceDashboardLayoutV1']){const raw=snapshot.localStorage[key];if(raw!==null){const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid '+key);}}
  }
  function refreshButtons(){ $('sync-upload').disabled=busy||!user;$('sync-download').disabled=busy||!user||!cloudRow; }
  async function getCloud(){
    const {data,error}=await client.from('myspace_snapshots').select('payload,updated_at').eq('user_id',user.id).maybeSingle();
    if(error)throw error;cloudRow=data;
    $('sync-cloud').textContent=data?'Last uploaded: '+new Date(data.updated_at).toLocaleString():'No cloud backup yet.';
    refreshButtons();
  }
  async function upload(){
    if(!user||busy)return;
    if(!confirm('Replace the cloud snapshot for this account with the current local workspace?'))return;
    busy=true;refreshButtons();say('Uploading...');
    try {
      const payload=await capture();validate(payload);
      if(JSON.stringify(payload).length>3800000)throw Error('Workspace too large for this sync version. Export a local backup instead.');
      const {error}=await client.from('myspace_snapshots').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw error;await getCloud();say('Cloud snapshot saved successfully.');
    }catch(e){say('Upload failed: '+e.message);}finally{busy=false;refreshButtons();}
  }
  async function restore(){
    if(!user||busy||!cloudRow)return;
    if(!confirm('This will REPLACE the local tasks, notes, habits and preferences in this browser. Continue?'))return;
    busy=true;refreshButtons();say('Restoring...');
    let before=null;
    try {
      // Re-fetch under the currently authenticated user before changing any local data.
      await getCloud();if(!cloudRow)throw Error('Cloud snapshot was deleted.');
      const payload=cloudRow.payload;validate(payload);
      before=await capture();
      await writeNotes(payload.indexedDB);
      for(const key of STORAGE_KEYS){const value=payload.localStorage[key];if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
      say('Restore complete. Reloading...');location.reload();
    }catch(e){
      if(before){try{await writeNotes(before.indexedDB);for(const key of STORAGE_KEYS){const value=before.localStorage[key];if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}catch(rollbackError){console.error('Rollback failed',rollbackError);say('Restore failed and rollback failed. Use Backup & Restore to recover your last exported backup.');busy=false;refreshButtons();return;}}
      say('Restore failed: '+e.message);
    }finally{busy=false;refreshButtons();}
  }
  async function init(){
    const cfg=window.MYSPACE_SUPABASE;
    if(!window.supabase?.createClient||!cfg||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url)||!cfg.publishableKey||cfg.publishableKey.startsWith('YOUR_')){say('Configure auth-config.js first.');return;}
    client=window.supabase.createClient(cfg.url,cfg.publishableKey);
    try {
      const {data,error}=await client.auth.getUser();if(error)throw error;
      user=data.user;
      if(!user){$('sync-account').textContent='Not signed in. Open Account first.';return;}
      $('sync-account').textContent=user.email||'Signed in';
      const local=await capture();$('sync-local').textContent=`${JSON.parse(local.localStorage.mySpaceUnifiedTasks||'[]').length} tasks · ${local.indexedDB.notes.length} notes · ${JSON.parse(local.localStorage.mySpaceHabitsV1||'[]').length} habits`;
      await getCloud();say('Ready. Make a local export in Backup & Restore before your first restore.');
    }catch(e){say('Could not load sync: '+e.message);}finally{refreshButtons();}
  }
  $('sync-upload').addEventListener('click',upload);$('sync-download').addEventListener('click',restore);
  init();
})();
