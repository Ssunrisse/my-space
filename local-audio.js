/* My Space 3.0 — local audio playlist; no upload or remote fetch */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('local-audio-files');
  if (!input) return;
  const player = new Audio();
  player.preload = 'metadata';
  const KEY = 'mySpaceLocalAudioPreferences';
  let preferences = {volume:45, loop:true};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Number.isFinite(saved?.volume)) preferences.volume = Math.max(0,Math.min(100, saved.volume));
    if (typeof saved?.loop === 'boolean') preferences.loop = saved.loop;
  } catch {}
  const tracks = [];
  let index = -1;
  let disposed = false;
  const status = $('local-audio-status');
  const slider = $('local-audio-volume');
  const repeat = $('local-audio-loop');
  const play = $('local-audio-play');
  const seek = $('local-audio-seek');
  slider.value = String(preferences.volume);
  repeat.checked = preferences.loop;
  player.volume = preferences.volume / 100;
  function savePrefs() {
    try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch {}
  }
  function duration(time) {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const t = Math.floor(time);
    return Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
  }
  function active() { return tracks[index] || null; }
  function update() {
    const track = active();
    $('local-audio-title-playing').textContent = track ? track.name : 'No track selected';
    $('local-audio-elapsed').textContent = duration(player.currentTime);
    $('local-audio-duration').textContent = duration(player.duration);
    seek.value = Number.isFinite(player.duration) && player.duration > 0
      ? String(Math.round(player.currentTime / player.duration * 1000)) : '0';
    seek.disabled = !track || !Number.isFinite(player.duration) || player.duration <= 0;
    play.disabled = !track;
    play.textContent = !track || player.paused ? 'Play' : 'Pause';
    $('local-audio-previous').disabled = !track || tracks.length < 2;
    $('local-audio-next').disabled = !track || tracks.length < 2;
    $('local-audio-volume-value').textContent = preferences.volume + '%';
    renderPlaylist();
  }
  function renderPlaylist() {
    const root = $('local-audio-playlist');
    root.replaceChildren();
    for (let i=0; i<tracks.length; i++) {
      const li = document.createElement('li');
      li.classList.toggle('current', i === index);
      const label = document.createElement('span');
      label.textContent = tracks[i].name;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = i === index ? 'Selected' : 'Play';
      button.setAttribute('aria-label', 'Play ' + tracks[i].name);
      button.addEventListener('click', () => select(i, true));
      li.append(label, button);
      root.append(li);
    }
  }
  async function begin() {
    if (!active() || disposed) return;
    try {
      await player.play();
      status.textContent = 'Playing: ' + active().name;
    } catch (error) {
      status.textContent = 'Playback blocked or unsupported. Try pressing Play again.';
    }
    update();
  }
  function select(nextIndex, shouldPlay) {
    if (nextIndex < 0 || nextIndex >= tracks.length) return;
    player.pause();
    index = nextIndex;
    player.src = tracks[index].url;
    player.load();
    status.textContent = 'Selected: ' + tracks[index].name;
    update();
    if (shouldPlay) void begin();
  }
  function addFiles(files) {
    const candidates = Array.from(files).filter(file =>
      file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
    if (!candidates.length) {
      status.textContent = 'Please select supported audio files.';
      return;
    }
    for (const file of candidates) {
      tracks.push({name:file.name, url:URL.createObjectURL(file)});
    }
    if (index === -1) select(0, false);
    else update();
    status.textContent = `Added ${candidates.length} track${candidates.length===1?'':'s'} to the playlist.`;
  }
  function navigate(direction) {
    if (!tracks.length) return;
    const next = (index + direction + tracks.length) % tracks.length;
    select(next, true);
  }
  function clear() {
    player.pause();
    player.removeAttribute('src');
    player.load();
    tracks.forEach(track => URL.revokeObjectURL(track.url));
    tracks.length = 0;
    index = -1;
    status.textContent = 'Playlist cleared.';
    update();
  }
  input.addEventListener('change', e => { addFiles(e.target.files); input.value=''; });
  const drop = $('local-audio-drop');
  for (const event of ['dragenter','dragover']) drop.addEventListener(event, e => {
    e.preventDefault(); drop.classList.add('drag-over');
  });
  for (const event of ['dragleave','drop']) drop.addEventListener(event, e => {
    e.preventDefault(); drop.classList.remove('drag-over');
  });
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  play.addEventListener('click', () => {
    if (!active()) return;
    if (player.paused) void begin(); else player.pause();
    update();
  });
  $('local-audio-previous').addEventListener('click', () => navigate(-1));
  $('local-audio-next').addEventListener('click', () => navigate(1));
  $('local-audio-clear').addEventListener('click', clear);
  slider.addEventListener('input', () => {
    preferences.volume = Number(slider.value);
    player.volume = preferences.volume/100;
    savePrefs(); update();
  });
  repeat.addEventListener('change', () => {preferences.loop=repeat.checked;savePrefs();});
  seek.addEventListener('input', () => {
    if (Number.isFinite(player.duration) && player.duration>0)
      player.currentTime = Number(seek.value)/1000*player.duration;
  });
  player.addEventListener('timeupdate', () => {
    $('local-audio-elapsed').textContent = duration(player.currentTime);
    if (Number.isFinite(player.duration) && player.duration>0)
      seek.value = String(Math.round(player.currentTime/player.duration*1000));
  });
  player.addEventListener('loadedmetadata', update);
  player.addEventListener('pause', update);
  player.addEventListener('play', update);
  player.addEventListener('error', () => {
    status.textContent = 'This browser cannot play this audio file.';
    update();
  });
  player.addEventListener('ended', () => {
    if (index + 1 < tracks.length) select(index + 1, true);
    else if (preferences.loop && tracks.length) select(0, true);
    else {status.textContent='Playlist finished.';update();}
  });
  window.addEventListener('pagehide', () => {disposed=true;clear();});
  update();
})();
