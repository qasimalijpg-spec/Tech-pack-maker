/* =====================================================================
   app.js — starts the app and switches between screens.
   Screen addresses (shown after # in the address bar):
     #/                     start screen
     #/pack/ID/edit         tech pack: form + live preview (Factory)
     #/pack/ID/factory      same, showing the Factory Version preview
     #/pack/ID/client       same, showing the Client Version preview
     #/pack/ID/costing      Costing page for that order
     #/sheet                Costing Sheet (Excel)
     #/settings             Settings
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, model } = TP;
  let cleanup = null;
  let banner = null;
  const savedDot = h('span', { class: 'saved-dot' }, 'Saved ✓');

  /* Black brand bar: logo, title, and buttons */
  function bar(title, sub, pack) {
    const s = TP.settings.current;
    return h('header', { class: 'bar' },
      h('a', { href: '#/', class: 'bar-logo', title: 'Start screen' }, h('img', { src: s.companyLogoWhite || TP.ASSETS.logoWhite, alt: s.companyName || 'Blaze Impex' })),
      h('div', { class: 'ttl' }, h('span', null, sub || 'Tech Pack Maker'), h('b', { class: 'top-title' }, title || (s.companyName || 'Blaze Impex'))),
      h('div', { class: 'sp' }),
      savedDot,
      h('nav', { class: 'bar-nav' },
        title ? h('a', { class: 'bar-btn', href: '#/', title: 'Start screen' }, '⌂', h('span', { class: 'hide-sm' }, ' Home')) : null,
        pack ? h('a', { class: 'bar-btn', href: `#/pack/${pack.id}/costing`, title: 'Costing for this order' }, '₨', h('span', { class: 'hide-sm' }, ' Costing')) : null,
        h('a', { class: 'bar-btn', href: '#/sheet', title: 'Costing Sheet' }, '📊', h('span', { class: 'hide-sm' }, ' Costing Sheet')),
        h('a', { class: 'bar-btn', href: '#/settings', title: 'Settings' }, '⚙', h('span', { class: 'hide-sm' }, ' Settings'))));
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
    document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()); // close pop-ups when changing screen
    document.body.classList.remove('no-scroll');
    document.body.className = '';
    delete document.body.dataset.tab;
    window.scrollTo(0, 0);

    try {
      if (parts[0] === 'pack' && parts[1]) {
        const pack = await TP.packs.get(parts[1]);
        if (!pack) { ui.toast('That tech pack was not found.', 'error'); go('#/'); return; }
        const view = parts[2] || 'edit';
        banner = h('div', { class: 'hidden' });
        if (view === 'costing') {
          TP.add(app, bar(model.title(pack), 'Costing · ' + (pack.order.client || 'order'), pack), page);
          TP.add(page, banner);
          refreshBanner(pack);
          cleanup = (await TP.pages.costing(page, pack)) || null;
        } else {
          document.body.classList.add('pack-screen');
          page.classList.add('wide');
          TP.add(app, bar(model.title(pack), 'Tech Pack Maker' + (pack.order.client ? ' · ' + pack.order.client : ''), pack), page);
          TP.add(page, banner);
          refreshBanner(pack);
          cleanup = TP.pages.pack(page, pack, { mode: view === 'client' ? 'client' : 'factory', tab: view === 'edit' ? 'edit' : 'preview' }) || null;
        }
      } else if (parts[0] === 'settings') {
        TP.add(app, bar('Settings'), page);
        await TP.pages.settings(page);
      } else if (parts[0] === 'sheet') {
        TP.add(app, bar('Costing Sheet', 'All orders'), page);
        await TP.pages.sheet(page);
      } else {
        TP.add(app, bar('', 'Tech Pack Maker'), page);
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

  /* Update the name at the top while you type the style name */
  function setTitle(t) {
    document.querySelectorAll('.top-title').forEach((el) => { el.textContent = t || 'Untitled tech pack'; });
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
