/* =====================================================================
   editor.js — the tech pack screen: the form on the left, the live
   preview of the pages on the right (on a phone: Edit / Preview tabs).
   Everything saves automatically while you type.

   The form is made of numbered sections. Each one is built by its own
   function below (orderSection, summarySection, colourwaysSection ...),
   so it is easy to change one part without touching the others.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;
  const two = (n) => String(n).padStart(2, '0');

  const PARTS = ['Body', 'Front', 'Back', 'Sleeves', 'Hood', 'Shirt', 'T-shirt', 'Shorts', 'Hoodie', 'Sweatshirt', 'Trouser', 'Jogger',
    'Jacket', 'Tank top', 'Jersey', 'Rib / collar', 'Cuffs, hem', 'Pocket', 'Hood lining', 'Left chest', 'Centre back', 'Left sleeve'];
  const OPEN_KEY = 'tp-open-sections';

  function openSet() {
    try { return new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '["order"]')); } catch (e) { return new Set(['order']); }
  }

  TP.pages = TP.pages || {};
  TP.pages.pack = function (root, pack, opts = {}) {
    let mode = opts.mode === 'client' ? 'client' : 'factory';
    const opened = openSet();
    let poiSel = 0, measSel = 0;

    /* ---------- saving + live preview ---------- */
    const save = util.debounce(async () => {
      try { await TP.packs.save(pack); TP.app.saved(); }
      catch (e) { ui.toast('Could not save! ' + e.message, 'error'); }
    }, 500);
    const changed = () => { save(); preview.later(); };
    const saveNow = () => { save.flush(); preview.later(); }; // pictures are saved straight away

    /* ---------- small building blocks ---------- */
    const txt = (obj, key, label, ph, o = {}) => ui.field(label, ui.text(obj, key, o.onInput || changed, Object.assign({ placeholder: ph || '' }, o)));
    const num = (obj, key, label, ph) => ui.field(label, ui.number(obj, key, changed, { placeholder: ph || '' }));
    const delBtn = (arr, i, redraw, what, after) => ui.iconBtn('✕', 'Remove ' + what, async () => {
      if (await ui.confirm(`Remove this ${what}?`, 'Remove', true)) { arr.splice(i, 1); after && after(); changed(); redraw(); }
    }, 'danger-ghost');
    const addBtn = (label, fn) => ui.btn('+ ' + label, fn, 'secondary small add');
    const help = (t) => h('p', { class: 'help' }, t);
    const item = (head, ...kids) => h('div', { class: 'item' }, h('div', { class: 'ihead' }, ...[].concat(head)), ...kids);

    /* A numbered section that can fold open/closed and redraw itself */
    const sections = [];
    function section(key, title, hint, build) {
      const n = sections.length + 1;
      const body = h('div', { class: 'body' });
      const hintEl = h('span', { class: 'hint' });
      const det = h('details', { class: 'sec', 'data-sec': key, open: opened.has(key) || null },
        h('summary', null, h('span', { class: 'num' }, two(n)), h('span', { class: 'stitle' }, title), hintEl), body);
      det.addEventListener('toggle', () => {
        det.open ? opened.add(key) : opened.delete(key);
        try { localStorage.setItem(OPEN_KEY, JSON.stringify([...opened])); } catch (e) { /* ignore */ }
      });
      const redraw = () => {
        const y = window.scrollY;
        body.innerHTML = '';
        TP.add(body, build(redraw));
        hintEl.textContent = typeof hint === 'function' ? hint() : (hint || '');
        window.scrollTo(0, y);
      };
      redraw();
      sections.push({ key, det, redraw });
      return det;
    }
    const redrawAll = () => sections.forEach((s) => s.redraw());

    /* ================= 01 Order details ================= */
    function orderSection(redraw) {
      const o = pack.order;
      if (!pack.sizes.includes(o.sampleSize)) o.sampleSize = pack.sizes.includes('M') ? 'M' : (pack.sizes[0] || '');
      return [
        h('div', { class: 'row' },
          txt(o, 'project', 'Style name / project', 'e.g. Glory Hoodie', { onInput: () => { changed(); TP.app.setTitle(o.project); } }),
          txt(o, 'styleNo', 'Style no.', 'e.g. GH12')),
        h('div', { class: 'row' }, txt(o, 'client', 'Client / brand', 'e.g. Revamp Era'), txt(o, 'designer', 'Designer', 'e.g. Revamp Era')),
        h('div', { class: 'row' }, txt(o, 'manufacturer', 'Manufacturer'),
          ui.field('Stage', ui.text(o, 'stage', changed, { list: 'dl-stages', placeholder: '1st Sample' }))),
        ui.field('Main fabric', ui.text(o, 'mainFabric', changed, { list: 'dl-fabric-types', placeholder: 'e.g. 450 GSM Cotton Fleece' })),
        h('div', { class: 'row' },
          ui.field('Total order', h('div', { class: 'row-inline' },
            ui.number(o, 'totalPieces', () => { changed(); qtyRefresh(); }, { placeholder: 'e.g. 300', inputmode: 'numeric' }),
            ui.select(o, 'unit', [['pieces', 'pieces'], ['sets', 'sets']], changed, 'unit-select'))),
          ui.field('Sample size', ui.select(o, 'sampleSize', pack.sizes.map((s) => [s, s]), changed))),
        h('div', { class: 'row' },
          ui.field('Date (start)', ui.text(o, 'startDate', changed, { type: 'date' })),
          ui.field('End date', ui.text(o, 'endDate', () => { changed(); TP.app.refreshBanner(pack); }, { type: 'date' }))),
        txt(o, 'description', 'Order description', 'e.g. Full-zip hoodie, oversized. 300 pieces.', { multiline: true, rows: 2 }),
        help('Size range and sizes are set in section 10 (Quantities). The sample size is highlighted on the tech pack.'),
      ];
    }

    /* ================= 02 Summary & revisions ================= */
    function summarySection(redraw) {
      return [
        help('Short facts about the garment. Lines left empty are not shown.'),
        pack.summary.map((r, i) => h('div', { class: 'row kvrow' },
          ui.field('Label', ui.text(r, 'k', changed)), ui.field('Detail', ui.text(r, 'v', changed, { placeholder: placeholderFor(r.k) })),
          delBtn(pack.summary, i, redraw, 'line'))),
        addBtn('Add line', () => { pack.summary.push({ id: util.uid(), k: '', v: '' }); changed(); redraw(); }),
        h('div', { class: 'sub' }, 'Revisions'),
        pack.revisions.map((r, i) => h('div', { class: 'row revrow' },
          ui.field('Rev', ui.text(r, 'rev', changed)), ui.field('Date', ui.text(r, 'date', changed, { placeholder: '26 Dec 2024' })),
          ui.field('What changed', ui.text(r, 'text', changed)), delBtn(pack.revisions, i, redraw, 'revision'))),
        addBtn('Add revision', () => { pack.revisions.push({ id: util.uid(), rev: two(pack.revisions.length), date: '', text: '' }); changed(); redraw(); }),
      ];
    }
    function placeholderFor(k) {
      return ({ Garment: 'e.g. Full-zip hoodie, oversized', Fit: 'e.g. Slightly cropped', Fabric: 'e.g. 100% cotton fleece, 450 GSM', Finish: 'e.g. Light acid wash',
        Closure: 'e.g. Regular zipper', Decoration: 'e.g. Screen print, embroidery', Drawstrings: 'e.g. None', Quantity: 'e.g. 2 samples' })[k] || '';
    }

    /* ================= 03 Colourways ================= */
    function colourwaysSection(redraw) {
      return [
        help('Front, back and side picture for each colour. The background is removed automatically after upload (tap Undo if it goes wrong). Colourway 1 is used for the points of interest. 3 colourways fit on one page; more continue on the next page.'),
        pack.colourways.map((c, i) => item([h('b', null, 'COLOURWAY ' + two(i + 1)), pack.colourways.length > 1 ? delBtn(pack.colourways, i, redraw, 'colourway') : null],
          h('div', { class: 'row', style: { gridTemplateColumns: '1fr auto' } }, txt(c, 'name', 'Colour name', 'e.g. Black'),
            ui.field('Swatch', h('input', { type: 'color', class: 'swatch', value: c.hex || '#000000', onInput: (e) => { c.hex = e.target.value; changed(); } }))),
          h('div', { class: 'row' }, txt(c, 'note', 'Colour note', 'Pantone / wash'), txt(c, 'tag', 'Tag', 'e.g. Zip-up · 1 sample')),
          h('div', { class: 'imgs3' },
            h('div', null, h('div', { class: 'cap' }, 'Front'), TP.images.single(c, 'front', saveNow, 'Front')),
            h('div', null, h('div', { class: 'cap' }, 'Back'), TP.images.single(c, 'back', saveNow, 'Back')),
            h('div', null, h('div', { class: 'cap' }, 'Side'), TP.images.single(c, 'side', saveNow, 'Side'))))),
        addBtn('Add colourway', () => { pack.colourways.push(model.blankColourway(pack.colourways.length + 1)); changed(); redraw(); }),
      ];
    }

    /* Tap-to-place pad, used for callout pins and measurement letters */
    function pinPad(src, label, dots, onPlace) {
      const stage = h('div', { class: 'stagep' });
      if (!src) return h('div', { class: 'pp empty' }, h('div', { class: 'lbl' }, label), help(`Add a ${label.toLowerCase()} picture first.`));
      const im = h('img', { src, alt: label, draggable: 'false' });
      TP.add(stage, im, dots.map((d) => h('span', { class: 'dot' + (d.on ? ' on' : '') + (d.dark ? ' dark' : ''), style: { left: d.x + '%', top: d.y + '%' } }, d.label)));
      stage.addEventListener('click', (e) => {
        const r = im.getBoundingClientRect();
        const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
        if (x < 0 || x > 100 || y < 0 || y > 100) return;
        onPlace(x, y);
      });
      return h('div', { class: 'pp' }, h('div', { class: 'lbl' }, label), stage);
    }

    /* ================= 04 Points of interest ================= */
    function poiSection(redraw) {
      const c0 = pack.colourways[0] || {};
      poiSel = Math.min(poiSel, Math.max(0, pack.poi.length - 1));
      const pad = (view) => pinPad(view === 'front' ? c0.front && c0.front.src : c0.back && c0.back.src, view === 'front' ? 'Front' : 'Back',
        pack.poi.map((p, i) => ({ p, i })).filter(({ p }) => p.view === view && p.x !== null && p.x !== undefined)
          .map(({ p, i }) => ({ x: p.x, y: p.y, label: i + 1, on: i === poiSel })),
        (x, y) => {
          if (!pack.poi.length) pack.poi.push({ id: util.uid(), view, x: null, y: null, title: '', desc: '' });
          Object.assign(pack.poi[poiSel], { view, x, y }); changed(); redraw();
        });
      return [
        help('1. Tap a callout below to select it (red border).  2. Tap the drawing where it goes. Its number appears on the tech pack.'),
        h('div', { class: 'pinpad' }, pad('front'), pad('back')),
        pack.poi.map((p, i) => {
          const el = item([h('b', null, 'CALLOUT ' + (i + 1)),
            ui.select(p, 'view', [['front', 'Front'], ['back', 'Back']], () => { changed(); redraw(); }, 'mini'),
            h('span', { class: 'muted small' }, p.x === null || p.x === undefined ? 'not placed yet' : 'placed ✓'),
            delBtn(pack.poi, i, redraw, 'callout')],
          txt(p, 'title', 'What and where', 'e.g. Chest print — "Revamp Era"'), txt(p, 'desc', 'Technique / note', 'e.g. Screen print, white'));
          el.classList.toggle('sel', i === poiSel);
          el.addEventListener('click', (e) => { if (i !== poiSel && !e.target.closest('button,select')) { poiSel = i; redraw(); } });
          return el;
        }),
        addBtn('Add callout', () => { pack.poi.push({ id: util.uid(), view: 'front', x: null, y: null, title: '', desc: '' }); poiSel = pack.poi.length - 1; changed(); redraw(); }),
      ];
    }

    /* ================= 05 Artwork & printing ================= */
    function artSection(redraw) {
      return [
        pack.art.map((a, i) => item([h('b', null, 'ARTWORK ' + two(i + 1)), delBtn(pack.art, i, redraw, 'artwork')],
          TP.images.single(a, 'img', saveNow, 'Add artwork picture'),
          h('div', { class: 'row' }, txt(a, 'title', 'Name', 'e.g. Revamp Era chest print'), txt(a, 'technique', 'Technique', 'e.g. Screen print')),
          h('div', { class: 'row3' }, txt(a, 'colour', 'Ink / thread colour', 'e.g. White ink'), txt(a, 'size', 'Size (inches)', 'e.g. 5 × 3 in'), txt(a, 'placement', 'Placement', 'e.g. Left chest')))),
        addBtn('Add artwork', () => { pack.art.push({ id: util.uid(), img: null, title: '', technique: '', colour: '', size: '', placement: '' }); changed(); redraw(); }),
        h('div', { class: 'sub' }, 'Client logo'),
        help('One or more of the client\'s logo pictures.'),
        TP.images.gallery(pack.logos, saveNow, 'Add logo pictures'),
        h('div', { class: 'sub' }, 'Printing'),
        pack.printing.map((p, i) => h('div', { class: 'row3 aligned' },
          ui.field('Part', ui.text(p, 'part', changed, { list: 'dl-parts', placeholder: 'e.g. Chest' })),
          ui.field('Print type', ui.select(p, 'method', model.PRINT_METHODS, () => { changed(); redraw(); })),
          h('div', { class: 'row-inline' }, p.method === 'other' ? ui.field('Type it', ui.text(p, 'other', changed, { placeholder: 'e.g. Heat transfer' })) : h('div', { style: { flex: 1 } }),
            delBtn(pack.printing, i, redraw, 'printing row')))),
        addBtn('Add printing', () => { pack.printing.push({ id: util.uid(), part: '', method: 'dtf', other: '' }); changed(); redraw(); }),
      ];
    }

    /* ================= 06 Fabric & pattern ================= */
    function fabricSection(redraw) {
      return [
        pack.fabrics.map((f, i) => item([h('b', null, (f.part || 'Fabric ' + (i + 1)).toUpperCase()), delBtn(pack.fabrics, i, redraw, 'fabric part')],
          h('div', { class: 'row' },
            ui.field('Part', ui.text(f, 'part', changed, { list: 'dl-parts', placeholder: 'e.g. Body' })),
            ui.field('Fabric type', ui.text(f, 'type', changed, { list: 'dl-fabric-types', placeholder: 'Pick or type' }))),
          h('div', { class: 'row' },
            num(f, 'gsm', 'GSM', 'e.g. 180'),
            ui.field('Fabric store (factory only)', ui.text(f, 'store', changed, { list: 'dl-fabric-stores', placeholder: 'Where we buy it' }))))),
        addBtn('Add fabric part', () => { pack.fabrics.push({ id: util.uid(), part: '', type: '', gsm: '', store: '' }); changed(); redraw(); }),
        h('div', { class: 'sub' }, 'Pattern'),
        pack.patterns.map((p, i) => h('div', { class: 'row3 aligned' },
          ui.field('Part', ui.text(p, 'part', changed, { list: 'dl-parts', placeholder: 'e.g. Body' })),
          ui.field('Pattern name', ui.text(p, 'name', changed, { placeholder: 'e.g. Oversized hoodie' })),
          h('div', { class: 'row-inline' }, ui.field('Pattern code', ui.text(p, 'code', changed, { placeholder: 'e.g. P-104' })), delBtn(pack.patterns, i, redraw, 'pattern')))),
        addBtn('Add pattern', () => { pack.patterns.push({ id: util.uid(), part: '', name: '', code: '' }); changed(); redraw(); }),
        h('div', { class: 'sub' }, 'Bill of materials'),
        help('Extra materials to list. Trims & hardware (section 07) are added to the bill of materials automatically.'),
        pack.bom.map((r, i) => item([h('b', null, (r.item || 'Item').toUpperCase()), delBtn(pack.bom, i, redraw, 'item')],
          h('div', { class: 'row' }, txt(r, 'item', 'Item', 'e.g. Fabric'), txt(r, 'colour', 'Colour', 'e.g. Black / Grey')),
          h('div', { class: 'row' }, txt(r, 'desc', 'Description', 'e.g. 100% cotton fleece'), txt(r, 'place', 'Placement', 'e.g. Body, hood')))),
        addBtn('Add item', () => { pack.bom.push({ id: util.uid(), item: '', desc: '', colour: '', place: '' }); changed(); redraw(); }),
      ];
    }

    /* ================= 07 Trims & hardware ================= */
    function trimsSection(redraw) {
      return [
        help('Zippers, eyelets, aglets, drawcords, labels… Each one becomes a card on the Materials page and a row in the bill of materials.'),
        pack.trims.map((t, i) => item([h('b', null, 'TRIM ' + two(i + 1)), delBtn(pack.trims, i, redraw, 'trim')],
          h('div', { class: 'trim-edit' },
            h('div', { class: 'trim-photo' }, TP.images.single(t, 'photo', saveNow, 'Photo')),
            h('div', null,
              ui.field('Type', ui.select(t, 'type', model.TRIM_TYPES.map((x) => [x, x]), changed)),
              txt(t, 'description', 'Description', 'e.g. Metal zipper, open end'))),
          h('div', { class: 'row3' }, txt(t, 'size', 'Size (with unit)', 'e.g. 1" tape or 20 mm'), txt(t, 'colour', 'Colour / finish', 'e.g. Gunmetal'), txt(t, 'placement', 'Placement', 'e.g. Centre front')),
          h('div', { class: 'row' }, num(t, 'qty', 'Quantity per garment', 'e.g. 1'), txt(t, 'supplier', 'Supplier (factory only)', 'e.g. YKK, Lahore')))),
        addBtn('Add trim / hardware', () => { pack.trims.push({ id: util.uid(), type: 'Zipper', description: '', size: '', colour: '', placement: '', qty: '1', supplier: '', photo: null }); changed(); redraw(); }),
      ];
    }

    /* ================= 08 Measurements ================= */
    function measSection(redraw) {
      const m = pack.meas;
      measSel = Math.min(measSel, Math.max(0, m.rows.length - 1));
      const nextLetter = () => String.fromCharCode(65 + (m.rows.length % 26));
      return [
        h('div', { class: 'row3' },
          ui.field('Unit', ui.select(m, 'unit', [['in', 'Inches'], ['cm', 'Centimetres']], changed)),
          txt(m, 'tol', 'Tolerance ±', 'e.g. ½'),
          ui.field('Sample size', ui.select(pack.order, 'sampleSize', pack.sizes.map((s) => [s, s]), () => { changed(); sections.find((s) => s.key === 'order').redraw(); }))),
        h('div', { class: 'sub' }, 'How-to-measure drawing'),
        m.diagram ? null : ui.btn('Use the standard hoodie drawing', () => { m.diagram = TP.images.fromData(TP.ASSETS.measureHoodie); saveNow(); redraw(); }, 'secondary small'),
        TP.images.single(m, 'diagram', () => { saveNow(); redraw(); }, 'Add measuring drawing'),
        m.diagram ? h('div', null,
          help('Optional: tap a point below, then tap the drawing to put its letter there. (The standard hoodie drawing already has A–D.)'),
          h('div', { class: 'pinpad one' }, pinPad(m.diagram.src, 'Drawing',
            m.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.x !== null && r.x !== undefined).map(({ r, i }) => ({ x: r.x, y: r.y, label: r.l, on: i === measSel, dark: true })),
            (x, y) => { if (m.rows[measSel]) { Object.assign(m.rows[measSel], { x, y }); changed(); redraw(); } }))) : null,
        h('div', { class: 'sub' }, 'Measurements (' + (m.unit === 'cm' ? 'cm' : 'inches') + ', garment laid flat)'),
        h('div', { class: 'meas-grid' }, h('table', null,
          h('tr', null, h('th', null, 'Pt'), h('th', { class: 'l' }, 'Name'), h('th', { class: 'l' }, 'How to measure'),
            pack.sizes.map((z) => h('th', { class: z === pack.order.sampleSize ? 'hl' : '' }, z)), h('th')),
          m.rows.map((r, i) => {
            const tr = h('tr', { class: i === measSel ? 'sel' : '' },
              h('td', null, h('input', { class: 'input letter', value: r.l, onInput: (e) => { r.l = e.target.value.toUpperCase().slice(0, 2); changed(); } })),
              h('td', { class: 'nm' }, ui.text(r, 'name', changed, { placeholder: 'Point name' })),
              h('td', { class: 'nm' }, ui.text(r, 'how', changed, { placeholder: 'How to measure' })),
              pack.sizes.map((z) => {
                const inp = h('input', { class: 'input mv' + (z === pack.order.sampleSize ? ' hl' : ''), inputmode: 'decimal', onInput: (e) => { r.vals[z] = e.target.value; changed(); } });
                inp.value = r.vals[z] || '';
                return h('td', null, inp);
              }),
              h('td', null, delBtn(m.rows, i, redraw, 'measurement')));
            tr.addEventListener('focusin', () => { if (measSel !== i) { measSel = i; tr.parentElement.querySelectorAll('tr').forEach((x) => x.classList.remove('sel')); tr.classList.add('sel'); } });
            tr.addEventListener('click', (e) => { if (measSel !== i && e.target.tagName !== 'INPUT') { measSel = i; redraw(); } });
            return tr;
          }))),
        addBtn('Add point', () => { m.rows.push({ id: util.uid(), l: nextLetter(), name: '', how: '', vals: {}, x: null, y: null }); measSel = m.rows.length - 1; changed(); redraw(); }),
        txt(m, 'note', 'Note under the chart', 'e.g. Sample is made in size L. Other sizes graded after approval.', { multiline: true, rows: 2 }),
      ];
    }

    /* ================= 09 Colours, labels, packaging & wash ================= */
    function finishSection(redraw) {
      const L = pack.labels;
      return [
        h('div', { class: 'sub first' }, 'Colour swatches'),
        pack.swatches.map((c, i) => h('div', { class: 'row swrow' },
          ui.field('Swatch', h('input', { type: 'color', class: 'swatch', value: c.hex || '#000000', onInput: (e) => { c.hex = e.target.value; changed(); } })),
          txt(c, 'name', 'Name', 'e.g. 01 · Black'), txt(c, 'note', 'Note', 'e.g. Light acid wash'), delBtn(pack.swatches, i, redraw, 'colour'))),
        h('div', { class: 'btn-row' },
          addBtn('Add colour', () => { pack.swatches.push({ id: util.uid(), hex: '#888888', name: '', note: '' }); changed(); redraw(); }),
          pack.colourways.some((c) => c.name) ? ui.btn('Copy from colourways', () => {
            pack.colourways.filter((c) => c.name).forEach((c, i) => pack.swatches.push({ id: util.uid(), hex: c.hex, name: `${two(i + 1)} · ${c.name}`, note: c.note }));
            changed(); redraw();
          }, 'secondary small') : null),
        h('div', { class: 'sub' }, 'Labels and packaging'),
        h('div', { class: 'item' }, h('div', { class: 'ihead' }, h('b', null, 'WOVEN LABEL')),
          txt(L.woven, 'notes', 'Colour / design notes', 'e.g. White label, black logo + size', { multiline: true, rows: 2 }),
          txt(L.woven, 'size', 'Size (with unit)', 'e.g. 2 × 1.5 in'),
          TP.images.gallery(L.woven.images, saveNow, 'Add label pictures')),
        h('div', { class: 'item' }, h('div', { class: 'ihead' }, h('b', null, 'HANGTAG / CARD')),
          txt(L.hangtag, 'notes', 'Colour / design notes', 'e.g. Matte black card, gold print', { multiline: true, rows: 2 }),
          txt(L.hangtag, 'size', 'Size (with unit)', 'e.g. 9 × 5 cm'),
          TP.images.gallery(L.hangtag.images, saveNow, 'Add hangtag pictures')),
        h('div', { class: 'item' }, h('div', { class: 'ihead' }, h('b', null, 'PACKAGING')),
          h('div', { class: 'row3' }, txt(L.packaging, 'type', 'Packaging type', 'e.g. Zip-lock poly bag'), txt(L.packaging, 'logoColor', 'Logo colour', 'e.g. White'), txt(L.packaging, 'bagSize', 'Bag size (with unit)', 'e.g. 30 × 40 cm')),
          TP.images.gallery(L.packaging.images, saveNow, 'Add packaging pictures')),
        h('div', { class: 'sub' }, 'Wash and finish'),
        ui.field('Wash & finish', ui.text(pack, 'wash', changed, { multiline: true, rows: 3, placeholder: 'e.g. Light acid wash, even finish, not spotty.' })),
      ];
    }

    /* ================= 10 Quantities & progress ================= */
    let qtyRefs = null;
    function qtyRefresh() {
      if (!qtyRefs) return;
      const t = model.totals(pack);
      for (const s of pack.sizes) if (qtyRefs.size[s]) qtyRefs.size[s].textContent = t.perSize[s];
      for (const c of pack.colors) if (qtyRefs.color[c.id]) qtyRefs.color[c.id].textContent = t.perColor[c.id];
      qtyRefs.grand.textContent = t.grand;
      const mm = model.totalMismatch(pack);
      qtyRefs.warn.className = mm ? 'alert danger' : (util.int(pack.order.totalPieces) ? 'alert ok' : 'hidden');
      qtyRefs.warn.textContent = mm ? '⚠ Mistake check: ' + mm : `✓ Total matches the order (${t.grand} ${pack.order.unit}).`;
    }
    function qtySection(redraw) {
      qtyRefs = { size: {}, color: {}, grand: null, warn: h('div') };
      const head = h('tr', null, h('th', { class: 'col-colour' }, 'Colour'),
        pack.sizes.map((s) => h('th', null, h('div', { class: 'size-head' }, s,
          h('button', { type: 'button', class: 'size-x', title: 'Remove size ' + s, onClick: async () => {
            const used = pack.colors.some((c) => util.int(c.qty[s]));
            if (used && !await ui.confirm(`Size ${s} has quantities. Remove it anyway?`, 'Remove', true)) return;
            pack.sizes.splice(pack.sizes.indexOf(s), 1);
            pack.colors.forEach((c) => { delete c.qty[s]; });
            changed(); redrawAll();
          } }, '×')))),
        h('th', null, 'Total'), h('th'));
      const rows = pack.colors.map((c, i) => {
        const totalCell = h('td', { class: 'total-cell' }, '0');
        qtyRefs.color[c.id] = totalCell;
        return h('tr', null,
          h('td', { class: 'col-colour' }, h('div', { class: 'colour-cell' },
            h('input', { type: 'color', class: 'swatch', value: c.hex || '#000000', onInput: (e) => { c.hex = e.target.value; changed(); } }),
            ui.text(c, 'name', changed, { placeholder: 'Colour name', cls: 'colour-name' }))),
          pack.sizes.map((s) => {
            const inp = h('input', { class: 'input qty', inputmode: 'numeric', placeholder: '0',
              onInput: (e) => { c.qty[s] = e.target.value.replace(/[^\d]/g, ''); changed(); qtyRefresh(); } });
            inp.value = c.qty[s] || '';
            return h('td', null, inp);
          }),
          totalCell,
          h('td', null, delBtn(pack.colors, i, redraw, 'colour')));
      });
      const foot = h('tr', null, h('td', { class: 'col-colour' }, h('strong', null, 'Total')),
        pack.sizes.map((s) => { const td = h('td', { class: 'total-cell' }, '0'); qtyRefs.size[s] = td; return td; }),
        (qtyRefs.grand = h('td', { class: 'total-cell grand' }, '0')), h('td'));
      setTimeout(qtyRefresh);
      return [
        help('One row per colour, pieces per size. These columns are also your size range. Sizes with 0 pieces are hidden in the quantity table.'),
        h('div', { class: 'table-scroll' }, h('table', { class: 'sizes-table' }, h('thead', null, head), h('tbody', null, rows), h('tfoot', null, foot))),
        h('div', { class: 'btn-row' },
          addBtn('Add colour', () => { pack.colors.push({ id: util.uid(), hex: '#ffffff', name: '', qty: {} }); changed(); redraw(); }),
          addBtn('Add size', async () => {
            const s = await ui.ask('Add a size column', 'Size name (e.g. 7XL or 10/12)');
            if (!s) return;
            if (pack.sizes.includes(s)) { ui.toast('That size is already there.'); return; }
            pack.sizes.push(s); changed(); redrawAll();
          })),
        qtyRefs.warn,
        h('div', { class: 'sub' }, 'Production progress (factory only)'),
        h('div', { class: 'stages' }, model.STAGES.map(([k, l]) => h('label', { class: 'stage' + (pack.progress[k] ? ' done' : '') },
          h('input', { type: 'checkbox', checked: !!pack.progress[k], onChange: (e) => {
            pack.progress[k] = e.target.checked;
            e.target.parentElement.classList.toggle('done', e.target.checked);
            changed(); TP.app.refreshBanner(pack);
          } }), h('span', null, l)))),
      ];
    }

    /* ================= 11 Notes ================= */
    function notesSection(redraw) {
      return [
        help('Numbered notes for the factory. Tick "Client" for notes the client should also see.'),
        pack.notes.map((n, i) => h('div', { class: 'note-row' },
          h('span', { class: 'note-num' }, two(i + 1)),
          ui.text(n, 'text', changed, { placeholder: i === 0 ? 'e.g. Deep pockets on shorts' : 'Note' }),
          h('div', { class: 'note-tools' },
            ui.checkbox(n.showClient, (on) => { n.showClient = on; changed(); }, 'Client'),
            ui.iconBtn('✕', 'Remove note', () => { pack.notes.splice(i, 1); changed(); redraw(); }, 'danger-ghost')))),
        addBtn('Add more lines', () => { pack.notes.push(model.blankNote()); changed(); redraw(); }),
      ];
    }

    /* ================= 12 Costing ================= */
    function costingSection() {
      return [
        help('Factory only. Costs are never printed on any tech pack. They are kept on the Costing page and in your Excel Costing Sheet.'),
        h('div', { class: 'btn-row' },
          ui.btn('Open the costing page', () => TP.app.go(`#/pack/${pack.id}/costing`), 'primary'),
          ui.btn('Costing Sheet (Excel)', () => TP.app.go('#/sheet'), 'secondary')),
      ];
    }

    /* ================= live preview ================= */
    const pagesEl = h('div', { class: 'pages' });
    const infoEl = h('span', { class: 'pvinfo' });
    const checksEl = h('div', { class: 'checks' });
    const seg = h('div', { class: 'seg', role: 'tablist' });
    const actions = h('div', { class: 'pvactions' });

    const preview = {
      token: 0, dirty: true, timer: null,
      later() { clearTimeout(preview.timer); preview.dirty = true; preview.timer = setTimeout(preview.run, 350); },
      visible() { return !(window.matchMedia('(max-width: 900px)').matches && document.body.dataset.tab !== 'preview'); },
      async run() {
        drawChecks();
        if (!preview.visible() || !pagesEl.isConnected) return;
        const my = ++preview.token;
        const r = await TP.doc.render(pack, mode);
        if (my !== preview.token) { r.done(); return; }
        preview.dirty = false;
        pagesEl.innerHTML = '';
        r.pages.forEach((p) => TP.add(pagesEl, h('div', { class: 'sheet' }, p)));
        r.done();
        infoEl.textContent = `A4 landscape · ${r.pages.length} page${r.pages.length > 1 ? 's' : ''} · updates as you type`;
        fit();
      },
    };
    function fit() {
      const w = pagesEl.clientWidth;
      if (!w) return;
      const pw = (297 * 96) / 25.4, ph = (210 * 96) / 25.4, k = w / pw;
      pagesEl.querySelectorAll('.sheet').forEach((sh) => { sh.style.height = ph * k + 'px'; sh.firstElementChild.style.transform = `scale(${k})`; });
    }
    new ResizeObserver(fit).observe(pagesEl);

    function drawChecks() {
      const list = model.checks(pack);
      const warns = list.filter((c) => c.level === 'warn');
      checksEl.innerHTML = '';
      const det = h('details', { class: 'check-box' + (warns.length ? ' has-warn' : '') },
        h('summary', null, warns.length ? `⚠ ${warns.length} thing${warns.length > 1 ? 's' : ''} to check before you send it` : '✓ Checks passed'),
        h('ul', null, list.map((c) => h('li', { class: c.level }, c.text))));
      TP.add(checksEl, det);
    }

    function drawActions() {
      seg.innerHTML = ''; actions.innerHTML = '';
      [['factory', 'Factory Version'], ['client', 'Client Version']].forEach(([k, l]) => TP.add(seg,
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === mode), class: k === mode ? 'on' : '', onClick: () => {
          if (mode === k) return;
          mode = k; drawActions(); preview.later();
          history.replaceState(null, '', `#/pack/${pack.id}/${k}`);
        } }, l)));
      const run = (fn) => async () => { await save.flush(); if (await confirmChecks()) fn(); };
      if (mode === 'factory') {
        TP.add(actions,
          ui.btn('⬇ Save PDF', run(() => TP.export.printPDF(pack, 'factory')), 'primary'),
          ui.btn('PDF file (picture)', run(() => TP.export.pdfFile(pack, 'factory')), 'secondary'),
          ui.btn('Costing', () => TP.app.go(`#/pack/${pack.id}/costing`), 'secondary'));
      } else {
        TP.add(actions,
          ui.btn('⬇ Save JPG pictures', run(() => TP.export.clientJPGs(pack)), 'primary'),
          ui.btn('Save PDF', run(() => TP.export.printPDF(pack, 'client')), 'secondary'),
          ui.btn('PDF file (picture)', run(() => TP.export.pdfFile(pack, 'client')), 'secondary'));
      }
    }

    /* Friendly list before export. Never blocks: you can always continue. */
    async function confirmChecks() {
      const warns = model.checks(pack).filter((c) => c.level === 'warn');
      if (!warns.length) return true;
      return new Promise((res) => {
        let answered = false;
        ui.modal({
          title: 'Quick check before you send it',
          body: h('div', null, h('p', { class: 'muted' }, 'These are just reminders. You can fix them first, or continue.'),
            h('ul', { class: 'check-list' }, warns.map((c) => h('li', null, c.text)))),
          actions: [
            { label: 'Go back and fix', cls: 'secondary', onClick: () => { answered = true; res(false); } },
            { label: 'Continue anyway', cls: 'primary', onClick: () => { answered = true; res(true); } },
          ],
          onClose: () => { if (!answered) res(false); },
        });
      });
    }

    /* Phone: Edit / Preview tabs */
    const tabs = h('div', { class: 'ptabs', role: 'tablist' });
    function setTab(t) {
      document.body.dataset.tab = t;
      tabs.innerHTML = '';
      [['edit', 'Edit'], ['preview', 'Preview']].forEach(([k, l]) => TP.add(tabs,
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === t), class: k === t ? 'on' : '', onClick: () => { setTab(k); window.scrollTo(0, 0); } }, l)));
      if (t === 'preview' && preview.dirty) preview.run(); else fit();
    }

    /* ---------- page layout ---------- */
    const s = TP.settings.current;
    const datalists = h('div', null,
      h('datalist', { id: 'dl-parts' }, PARTS.map((p) => h('option', { value: p }))),
      h('datalist', { id: 'dl-stages' }, model.STAGE_OPTIONS.map((p) => h('option', { value: p }))),
      h('datalist', { id: 'dl-fabric-types' }, s.fabricTypes.map((p) => h('option', { value: p }))),
      h('datalist', { id: 'dl-fabric-stores' }, s.fabricStores.map((p) => h('option', { value: p }))));

    const editor = h('div', { class: 'editor' },
      section('order', 'Order details', () => pack.order.project, orderSection),
      section('summary', 'Summary & revisions', () => pack.summary.filter((r) => r.v).length + ' lines', summarySection),
      section('cw', 'Colourways', () => pack.colourways.length + ' colour' + (pack.colourways.length > 1 ? 's' : ''), colourwaysSection),
      section('poi', 'Points of interest', () => pack.poi.length + ' callouts', poiSection),
      section('art', 'Artwork & printing', () => pack.art.length + ' artwork', artSection),
      section('fabric', 'Fabric & pattern', () => pack.fabrics.length + ' fabric', fabricSection),
      section('trims', 'Trims & hardware', () => pack.trims.length + ' items', trimsSection),
      section('meas', 'Measurements', () => pack.meas.rows.length + ' points', measSection),
      section('finish', 'Colours, labels, packaging & wash', '', finishSection),
      section('qty', 'Quantities & progress', () => model.totals(pack).grand + ' pcs', qtySection),
      section('notes', 'Notes', () => pack.notes.filter((n) => n.text).length + ' notes', notesSection),
      section('costing', 'Costing (factory only)', '', costingSection));

    TP.add(root, datalists, tabs,
      h('div', { class: 'wrap' },
        editor,
        h('div', { class: 'preview' },
          h('div', { class: 'pvhead' }, seg, infoEl),
          actions, checksEl, pagesEl)));

    drawActions();
    setTab(opts.tab === 'preview' ? 'preview' : 'edit');
    preview.run();

    // Save straight away when leaving this screen
    return () => save.flush();
  };
})(window.TP);
