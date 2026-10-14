(() => {
  'use strict';
  const DB_NAME = 'mySpaceNotesDB';
  const STORES = ['notes', 'folders'];
  const VERSION = 1;
  const KEYS = ['mySpaceUnifiedTasks', 'mySpaceHabitsV1', 'mySpaceFocusSettings', 'mySpaceFocusHistory', 'mySpaceAmbientStudioV2', 'mySpaceDashboardLayoutV1', 'mySpaceUiSounds', 'mySpaceTheme', 'tema', 'nombreUsuario'];
  const $ = id => document.getElementById(id);
  let selectedBackup = null;
  const status = message => { $('backup-status').textContent = message; };
  const errText = error => error instanceof Error ? error.message : String(error);

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, {keyPath:'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || Error('Could not open Notes storage.'));
      request.onblocked = () => reject(Error('Close other My Space tabs and try again.'));
    });
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error || Error('Notes database transaction aborted.'));
      tx.onerror = () => reject(tx.error || Error('Notes database transaction failed.'));
    });
  }

  async function readNotes() {
    const db = await openDB();
    try {
      const tx = db.transaction(STORES,'readonly');
      const done = transactionDone(tx);
      const requests = STORES.map(name => new Promise((resolve,reject) => {
        const r = tx.objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }));
      const [notes, folders] = await Promise.all([...requests,done]).then(values=>values.slice(0,2));
      return {notes,folders};
    } finally { db.close(); }
  }

  async function writeNotes(data) {
    const db = await openDB();
    try {
      const tx = db.transaction(STORES,'readwrite');
      const done = transactionDone(tx);
      for (const storeName of STORES) {
        const store = tx.objectStore(storeName);
        store.clear();
        for (const entry of data[storeName]) store.put(entry);
      }
      await done;
    } finally { db.close(); }
  }

  function readLocal() {
    const values = {};
    for (const key of KEYS) values[key] = localStorage.getItem(key);
    return values;
  }

  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.app !== 'My Space' || data.schemaVersion !== 1) throw Error('This is not a supported My Space backup (version 1).');
    if (!data.localStorage || typeof data.localStorage !== 'object' || Array.isArray(data.localStorage)) throw Error('Missing browser settings data.');
    if (!data.indexedDB || typeof data.indexedDB !== 'object' || Array.isArray(data.indexedDB)) throw Error('Missing notes database.');
    for (const key of KEYS) if (!(key in data.localStorage) || (data.localStorage[key] !== null && typeof data.localStorage[key] !== 'string')) throw Error(`Invalid storage entry: ${key}`);
    for (const store of STORES) {
      if (!Array.isArray(data.indexedDB[store]) || data.indexedDB[store].length > 100000) throw Error(`Invalid or oversized ${store} collection.`);
      const ids = new Set();
      for (const item of data.indexedDB[store]) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw Error(`Invalid or duplicate ID in ${store}.`);
        ids.add(item.id);
        if (store === 'notes' && (typeof item.title !== 'string' || typeof item.html !== 'string' || typeof item.folderId !== 'string' || typeof item.favorite !== 'boolean' || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string')) throw Error('Invalid note fields.');
        if (store === 'folders' && typeof item.name !== 'string') throw Error('Invalid folder fields.');
      }
    }
    // Check known JSON data types without evaluating anything from the file.
    const expected = {mySpaceUnifiedTasks:'array',mySpaceHabitsV1:'array',mySpaceFocusHistory:'array',mySpaceFocusSettings:'object',mySpaceAmbientStudioV2:'object',mySpaceDashboardLayoutV1:'object'};
    for (const [key,type] of Object.entries(expected)) {
      const value = data.localStorage[key];
      if (value === null) continue;
      let parsed; try {parsed = JSON.parse(value);} catch {throw Error(`Invalid JSON for ${key}.`);}
      if (type==='array' ? !Array.isArray(parsed) : !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(`Invalid value for ${key}.`);
    }
    return data;
  }

  function downloadJSON(data) {
    const day = new Date().toISOString().slice(0,10);
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`my-space-backup-${day}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  async function exportBackup() {
    $('backup-export').disabled=true;
    status('Creating backup…');
    try {
      const local = readLocal();
      const indexed = await readNotes();
      const backup = {app:'My Space',schemaVersion:VERSION,exportedAt:new Date().toISOString(),localStorage:local,indexedDB:indexed};
      downloadJSON(backup);
      status('Backup downloaded. Store this file somewhere safe.');
      showSummary(backup);
    } catch (error) { status(`Backup failed: ${errText(error)}`); }
    finally { $('backup-export').disabled=false; }
  }

  function countTasks(backup) {try{const v=JSON.parse(backup.localStorage.mySpaceUnifiedTasks||'[]');return Array.isArray(v)?v.length:0;}catch{return 0;}}
  function countFocus(backup) {try{const v=JSON.parse(backup.localStorage.mySpaceFocusHistory||'[]');return Array.isArray(v)?v.length:0;}catch{return 0;}}
  function showSummary(backup, target=$('backup-summary')) {
    target.textContent=`${countTasks(backup)} tasks · ${backup.indexedDB.notes.length} notes · ${backup.indexedDB.folders.length} folders · ${countFocus(backup)} focus sessions`;
  }

  $('backup-file').addEventListener('change', async event => {
    selectedBackup=null;
    $('backup-preview').hidden=true;
    $('backup-acknowledge').checked=false;
    $('backup-acknowledge').disabled=true;
    $('backup-restore').disabled=true;
    const file=event.target.files?.[0];
    if (!file) return;
    if (file.size > 20*1024*1024) {status('The backup exceeds the 20 MB safety limit.');return;}
    try {
      const data=validate(JSON.parse(await file.text()));
      selectedBackup=data;
      const preview=$('backup-preview');
      const date = new Date(data.exportedAt);
      preview.textContent=`Backup: ${Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()} · `;
      const summary=document.createElement('span');
      showSummary(data,summary);
      preview.append(summary);
      preview.hidden=false;
      $('backup-acknowledge').disabled=false;
      status('Backup validated. Review the contents before restoring.');
    } catch(error) {status(`Invalid backup: ${errText(error)}`);}
  });

  $('backup-acknowledge').addEventListener('change',e=>{$('backup-restore').disabled=!selectedBackup||!e.target.checked;});

  $('backup-restore').addEventListener('click', async () => {
    if (!selectedBackup || !$('backup-acknowledge').checked) return;
    if (!confirm('This will REPLACE your existing tasks, notes, focus history, and preferences. Close other My Space tabs first. Continue?')) return;
    $('backup-restore').disabled=true;
    $('backup-export').disabled=true;
    status('Restoring… Do not close this tab.');
    let before=null;
    try {
      before={localStorage:readLocal(),indexedDB:await readNotes()};
      // Perform the notes update as a single IndexedDB transaction.
      await writeNotes(selectedBackup.indexedDB);
      try {
        for (const key of KEYS) {
          const value=selectedBackup.localStorage[key];
          if (value===null) localStorage.removeItem(key);
          else localStorage.setItem(key,value);
        }
      } catch(error) {
        // Restore both stores to the pre-import snapshot if localStorage writes fail.
        for (const key of KEYS) {
          try {const old=before.localStorage[key];if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);}catch{}
        }
        await writeNotes(before.indexedDB);
        throw error;
      }
      status('Restore complete! Reload My Space to see your data.');
      $('backup-acknowledge').checked=false;
      selectedBackup=null;
      $('backup-file').value='';
      $('backup-preview').hidden=true;
    } catch(error) {status(`Restore failed: ${errText(error)}. Your existing data may need checking; restore a backup if necessary.`);}
    finally {$('backup-export').disabled=false;$('backup-restore').disabled=true;}
  });

  $('backup-export').addEventListener('click',exportBackup);
  (async()=>{try{showSummary({localStorage:readLocal(),indexedDB:await readNotes()});}catch(error){$('backup-summary').textContent=`Storage unavailable: ${errText(error)}`;}})();
})();
