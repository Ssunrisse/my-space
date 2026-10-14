// My Space — persistent themes, including Dark Monochrome.
(() => {
  'use strict';
  const KEY = 'mySpaceTheme';
  const THEMES = new Set(['amethyst', 'crimson', 'pearl', 'monochrome']);

  function getTheme() {
    try {
      const saved = localStorage.getItem(KEY);
      if (THEMES.has(saved)) return saved;
      return localStorage.getItem('tema') === 'claro' ? 'pearl' : 'amethyst';
    } catch {
      return 'amethyst';
    }
  }

  function applyTheme(name, persist = false) {
    const theme = THEMES.has(name) ? name : 'amethyst';
    document.body.dataset.theme = theme;
    // Dark Monochrome must never inherit Pearl's light-mode CSS.
    document.body.classList.toggle('modo-claro', theme === 'pearl');
    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
        localStorage.setItem('tema', theme === 'pearl' ? 'claro' : 'oscuro');
      } catch (error) {
        console.warn('Could not persist theme:', error);
      }
    }
  }

  applyTheme(getTheme());
  document.addEventListener('myspace:themechange', event => {
    if (event.detail && THEMES.has(event.detail.theme)) {
      applyTheme(event.detail.theme, true);
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === KEY) applyTheme(getTheme());
  });
})();
