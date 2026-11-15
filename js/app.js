/* =====================================================================
   app.js — starts the app and switches between screens.
   Screen addresses (shown after # in the address bar):
     #/                     start screen
     #/pack/ID/edit         Details (fill in the tech pack)
     #/pack/ID/factory      Factory Version
     #/pack/ID/client       Client Version
     #/pack/ID/costing      Costing page
     #/sheet                Costing Sheet (Excel)
     #/settings             Settings
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, model } = TP;
  let cleanup = null;
  let banner = null;
  const savedDot = h('span', { class: 'saved-dot' }, 'Saved ✓');

  const PACK_TABS = [['edit', '✏️ Details'], ['factory', '🏭 Factory'], ['client', '📸 Client'], ['costing', '💰 Costing']];

  function topbar(title, showHome) {
    return h('header', { class: 'topbar' },
      showHome ? h('a', { class: 'top-btn', href: '#/' }, '⌂ Home') : h('div', { class: 'brand' }, h('img', { src: 'icons/favicon.png', alt: '' }), 'Tech Pack Builder'),
      h('div', { class: 'top-title' }, title || ''),
      savedDot,
      h('nav', { class: 'top-nav' },
        h('a', { class: 'top-btn', href: '#/sheet', title: 'Costing Sheet' }, '📊', h('span', { class: 'hide-sm' }, ' Costing Sheet')),
        h('a', { class: 'top-btn', href: '#/settings', title: 'Settings' }, '⚙️', h('span', { class: 'hide-sm' }, ' Settings'))));
  }

  function refreshBanner(pack) {
    if (!banner) return;
    const dl = model.deadline(pack);
    banner.className = dl ? 'alert ' + (dl.level === 'late' ? 'danger' : 'warn') : 'hidden';
    banner.textContent = dl ? (dl.level === 'late' ? '⚠ ' : '⏰ ') + dl.text : '';
  }

  async function route() {
    if (cleanup) { try { await cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const app = document.getElementById('app');
    const hash = location.hash || '#/';
    const parts = hash.replace(/^#\/?/, '').split('/');
    const page = h('main', { class: 'page' });
    banner = null;
    app.innerHTML = '';
    window.scrollTo(0, 0);

    try {
      if (parts[0] === 'pack' && parts[1]) {
        const pack = await TP.packs.get(parts[1]);
        if (!pack) { ui.toast('That tech pack was not found.', 'error'); go('#/'); return; }
        const view = PACK_TABS.some(([k]) => k === parts[2]) ? parts[2] : 'edit';
        banner = h('div', { class: 'hidden' });
        TP.add(app, 
          topbar(model.title(pack), true),
          h('div', { class: 'pack-head' },
            h('div', { class: 'pack-head-title' }, h('span', { class: 'ph-name' }, model.title(pack)), pack.order.client ? h('span', { class: 'muted' }, ' · ' + pack.order.client) : null),
            h('nav', { class: 'tabs' }, PACK_TABS.map(([k, l]) => h('a', { class: 'tab' + (k === view ? ' active' : ''), href: `#/pack/${pack.id}/${k}` }, l)))),
          page);
        TP.add(page, banner);
        refreshBanner(pack);
        cleanup = TP.pages[view](page, pack) || null;
        if (cleanup && cleanup.then) cleanup = await cleanup;
      } else if (parts[0] === 'settings') {
        TP.add(app, topbar('Settings', true), page);
        await TP.pages.settings(page);
      } else if (parts[0] === 'sheet') {
        TP.add(app, topbar('Costing Sheet', true), page);
        await TP.pages.sheet(page);
      } else {
        TP.add(app, topbar('', false), page);
        await TP.pages.home(page);
      }
    } catch (e) {
      console.error(e);
      TP.add(page, h('div', { class: 'alert danger' }, 'Something went wrong: ' + e.message));
    }
  }

  function go(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }

  function saved() {
    savedDot.classList.add('show');
    clearTimeout(saved._t);
    saved._t = setTimeout(() => savedDot.classList.remove('show'), 1500);
  }

  /* Update the names at the top while you type the project name */
  function setTitle(t) {
    const name = t || 'Untitled tech pack';
    document.querySelectorAll('.top-title, .ph-name').forEach((el) => { el.textContent = name; });
  }

  TP.app = { go, saved, refreshBanner, setTitle };

  async function start() {
    try { await TP.settings.load(); }
    catch (e) { ui.toast('This browser cannot save data. Please use Safari or Chrome (not private mode).', 'error'); }
    window.addEventListener('hashchange', route);
    // Save any unsaved typing when the app is closed or hidden
    const flush = () => { if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } } };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    route();
    // Offline support (only works when the app is online at an https address, not when opened as a file)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  start();
})(window.TP);
