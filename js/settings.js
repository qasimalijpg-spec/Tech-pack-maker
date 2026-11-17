/* =====================================================================
   settings.js — your company settings + backup / restore.
   Change the starting values in DEFAULTS below if you like.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util } = TP;

  const DEFAULTS = {
    key: 'main',
    companyName: 'Blaze Impex',
    companyLogo: null,       // leave empty to use the built-in Blaze Impex logo
    companyLogoWhite: null,  // made automatically from companyLogo, for the black header
    handle: '@blaze_impex',  // shown in the tech pack footer
    autoBg: true,            // remove the background automatically after every upload
    manufacturer: 'Blaze Impex',
    sizes: ['14/16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'],
    fabricTypes: ['Jersey 65/35', 'Jersey 100% cotton', 'Parachute', 'Fleece', 'French terry', 'Polyester interlock', 'Dri-fit mesh', 'Rib'],
    fabricStores: [],
    prices: { label: 3000, hangtag: 4000, polybag: 8000 },
    deadlineDays: 7,
  };

  TP.settings = {
    DEFAULTS,
    current: util.clone(DEFAULTS),
    async load() {
      try {
        const saved = await TP.db.get('settings', 'main');
        const s = Object.assign(util.clone(DEFAULTS), saved || {});
        s.prices = Object.assign({}, DEFAULTS.prices, s.prices);
        TP.settings.current = s;
      } catch (e) { console.error(e); }
      return TP.settings.current;
    },
    async save() {
      const c = TP.settings.current;
      // keep the white header version of the logo in step with the logo
      const src = c.companyLogo && c.companyLogo.src;
      if (src && c._whiteFor !== src) { c.companyLogoWhite = await TP.images.whiteVersion(src); c._whiteFor = src; }
      if (!src) { c.companyLogoWhite = null; c._whiteFor = null; }
      await TP.db.put('settings', c);
    },
  };

  /* A list of small "chips" with an × to remove and a box to add more */
  ui.chips = (arr, onChange, placeholder) => {
    const wrap = h('div', { class: 'chips-wrap' });
    const draw = () => {
      wrap.innerHTML = '';
      const input = h('input', { class: 'input', placeholder: placeholder || 'Type and press Add' });
      const add = () => {
        const v = input.value.trim();
        if (!v) return;
        if (!arr.includes(v)) { arr.push(v); onChange(); }
        draw();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      TP.add(wrap, 
        h('div', { class: 'chips' }, arr.map((v, i) => h('span', { class: 'chip' }, v,
          h('button', { type: 'button', class: 'chip-x', title: 'Remove', onClick: () => { arr.splice(i, 1); onChange(); draw(); } }, '×')))),
        h('div', { class: 'row-inline' }, input, ui.btn('Add', add, 'secondary')));
    };
    draw();
    return wrap;
  };

  /* ---------- Backup ---------- */
  async function makeBackup() {
    const data = { app: 'tech-pack-builder', version: 1, savedAt: new Date().toISOString() };
    for (const store of Object.keys(TP.db.STORES)) data[store] = await TP.db.all(store);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const name = `Tech Pack Backup ${util.todayISO()}.json`;
    if (util.isPhone() && await util.share(blob, name, 'Tech Pack Backup')) return;
    util.download(blob, name);
  }

  async function restoreBackup(file) {
    let data;
    try { data = JSON.parse(await util.readText(file)); } catch (e) { ui.toast('This is not a backup file.', 'error'); return; }
    if (data.app !== 'tech-pack-builder') { ui.toast('This is not a Tech Pack Builder backup file.', 'error'); return; }
    const ok = await ui.confirm(
      `Restore backup from ${util.fmtDateTime(data.savedAt)}? Tech packs in the backup will be added. ` +
      'Any tech pack with the same ID will be replaced by the backup copy. Your other tech packs stay.', 'Restore');
    if (!ok) return;
    const busy = ui.busy('Restoring backup…');
    try {
      for (const store of Object.keys(TP.db.STORES)) {
        for (const item of data[store] || []) await TP.db.put(store, item);
      }
      await TP.settings.load();
      ui.toast('Backup restored ✓', 'ok');
      TP.app.go('#/');
    } catch (e) { ui.toast('Could not restore: ' + e.message, 'error'); }
    busy.close();
  }

  /* ---------- Settings page ---------- */
  TP.pages = TP.pages || {};
  TP.pages.settings = async function (root) {
    const s = TP.settings.current;
    const save = util.debounce(async () => { await TP.settings.save(); TP.app.saved(); }, 400);

    const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' },
      onChange: (e) => { if (e.target.files[0]) restoreBackup(e.target.files[0]); e.target.value = ''; } });

    TP.add(root, 
      ui.card('My company', null,
        ui.field('Company name', ui.text(s, 'companyName', save)),
        ui.field('Website or Instagram (tech pack footer)', ui.text(s, 'handle', save, { placeholder: '@blaze_impex' })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Company logo'),
          h('p', { class: 'help' }, 'Leave empty to use the Blaze Impex logo. A dark logo on a see-through background works best: the app makes a white copy for the black header.'),
          h('div', { class: 'logo-preview' },
            h('span', { class: 'on-black' }, h('img', { src: s.companyLogoWhite || TP.ASSETS.logoWhite, alt: '' })),
            h('span', { class: 'on-white' }, h('img', { src: (s.companyLogo && s.companyLogo.src) || TP.ASSETS.logoBlack, alt: '' }))),
          TP.images.single(s, 'companyLogo', async () => { await TP.settings.save(); TP.app.saved(); }, 'Add your own logo')),
      ),
      ui.card('Pictures', null,
        ui.toggle(s.autoBg !== false, (on) => { s.autoBg = on; save(); }, 'Remove the background automatically after every upload'),
        h('p', { class: 'help' }, 'You can always tap "Undo" on a picture to get the original back.')),
      ui.card('Defaults for new tech packs', null,
        ui.field('Default manufacturer name', ui.text(s, 'manufacturer', save)),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Default size list (in order)'),
          ui.chips(s.sizes, save, 'e.g. 7XL')),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Fabric types (to pick from a list)'),
          ui.chips(s.fabricTypes, save, 'e.g. Jersey 65/35')),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Fabric stores (where you buy fabric)'),
          ui.chips(s.fabricStores, save, 'e.g. Ali Fabrics, Sialkot')),
        ui.field('Warn me when the end date is this many days away', ui.number(s, 'deadlineDays', save)),
      ),
      ui.card('Fixed prices for custom labels, tags and bags (PKR)', null,
        h('p', { class: 'muted' }, 'Used on the Costing page when you choose "Custom labels, tags and bags".'),
        h('div', { class: 'grid3' },
          ui.field('Woven labels', ui.number(s.prices, 'label', save)),
          ui.field('Hangtags / cards', ui.number(s.prices, 'hangtag', save)),
          ui.field('Poly bags', ui.number(s.prices, 'polybag', save))),
      ),
      ui.card('Backup', null,
        h('p', { class: 'muted' }, 'Your tech packs are saved only on this device. Download a backup file regularly and keep it safe (Google Drive, email, USB). You can also use it to move your tech packs to another device.'),
        h('div', { class: 'btn-row' },
          ui.btn('⬇ Download backup', makeBackup, 'primary'),
          ui.btn('⬆ Restore from backup', () => fileIn.click(), 'secondary')),
        fileIn,
      ),
      h('p', { class: 'muted center small' }, 'Tech Pack Builder · everything is stored on this device only'),
    );
  };

  TP.backup = { makeBackup, restoreBackup };
})(window.TP);
