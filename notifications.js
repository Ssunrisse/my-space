/* My Space 3.8 — Global notification center */
(() => {
  'use strict';
  if (window.MySpaceNotify) return;
  const root = document.createElement('div');
  root.className = 'myspace-toast-region';
  root.setAttribute('aria-label', 'Notifications');
  root.setAttribute('role', 'region');
  document.body.appendChild(root);

  const active = new Set();
  const queue = [];
  const MAX_VISIBLE = 3;
  const MAX_QUEUE = 12;

  function showNext() {
    while (active.size < MAX_VISIBLE && queue.length) {
      const item = queue.shift();
      const toast = document.createElement('div');
      toast.className = `myspace-toast myspace-toast--${item.type}`;
      toast.setAttribute('role', item.type === 'error' ? 'alert' : 'status');
      const marker = document.createElement('span');
      marker.className = 'myspace-toast-symbol';
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i';
      const text = document.createElement('span');
      text.className = 'myspace-toast-text';
      text.textContent = item.message;
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'myspace-toast-dismiss';
      dismiss.setAttribute('aria-label', 'Dismiss notification');
      dismiss.textContent = '×';
      toast.append(marker, text, dismiss);
      let timeout;
      function close() {
        clearTimeout(timeout);
        if (!active.has(toast)) return;
        active.delete(toast);
        toast.remove();
        showNext();
      }
      dismiss.addEventListener('click', close);
      root.append(toast);
      active.add(toast);
      timeout = setTimeout(close, item.duration);
    }
  }
  function notify(message, options = {}) {
    if (typeof message !== 'string' || !message.trim()) return;
    const type = ['success', 'info', 'error'].includes(options.type) ? options.type : 'info';
    const duration = Number.isFinite(options.duration) ? Math.min(12000, Math.max(2500, options.duration)) : 4300;
    if (queue.length >= MAX_QUEUE) queue.shift();
    queue.push({message:message.slice(0,220),type,duration});
    showNext();
  }
  window.MySpaceNotify = notify;
  window.addEventListener('myspace:notify', (event) => {
    const detail = event.detail || {};
    notify(detail.message, detail);
  });
})();
