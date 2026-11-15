/* =====================================================================
   editor.js — the "Details" page where you fill in a tech pack.
   Everything saves automatically while you type.
   Each section is built by its own function below (orderSection,
   designSection, fabricSection ...) so it is easy to change one part.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;

  const PARTS = ['Shirt', 'T-shirt', 'Shorts', 'Hoodie', 'Sweatshirt', 'Trouser', 'Jogger', 'Jacket', 'Tank top', 'Jersey', 'Rib / collar', 'Pocket', 'Hood lining'];

  TP.pages = TP.pages || {};
  TP.pages.edit = function (root, pack) {
    const save = util.debounce(async () => {
      try { await TP.packs.save(pack); TP.app.saved(); }
      catch (e) { ui.toast('Could not save! ' + e.message, 'error'); }
    }, 500);
    const saveNow = () => save.flush(); // pictures are saved straight away
    const sections = {}; // key -> redraw()

    /* A section card that can redraw itself. urduKey adds the Urdu switch. */
    function section(key, title, urduKey, buildBody) {
      const card = h('section', { class: 'card', id: 'sec-' + key });
      const redraw = () => {
        card.innerHTML = '';
        const right = urduKey ? ui.toggle(TP.urdu.isOn(pack, urduKey), (on) => {
          TP.urdu.setSection(pack, urduKey, on); save(); redraw();
        }, 'Urdu', 'small') : null;
        TP.add(card, h('div', { class: 'card-head' }, h('h2', null, title), right ? h('div', { class: 'card-tools' }, right) : null));
        TP.add(card, buildBody(redraw));
        if (urduKey && TP.urdu.isOn(pack, urduKey)) TP.add(card, TP.urdu.checkPanel(pack, urduKey, save));
      };
      sections[key] = redraw;
      redraw();
      return card;
    }

    /* Small "delete row" button */
    const delBtn = (arr, i, redraw, what) => ui.iconBtn('🗑', 'Delete ' + what, async () => {
      if (await ui.confirm(`Delete this ${what}?`, 'Delete', true)) { arr.splice(i, 1); save(); redraw(); }
    }, 'danger-ghost');

    /* ---------- Order details ---------- */
    function orderSection() {
      const o = pack.order;
      return h('div', null,
        h('div', { class: 'grid2' },
          ui.field('Project name', ui.text(o, 'project', (v) => { save(); TP.app.setTitle(v); }, { placeholder: 'e.g. Artemis' })),
          ui.field('Client / brand name', ui.text(o, 'client', save, { placeholder: 'e.g. Artemis Athletics' }))),
        ui.field('Manufacturer', ui.text(o, 'manufacturer', save)),
        ui.field('Order description', ui.text(o, 'description', save, { multiline: true, placeholder: 'e.g. Football kit: shirt + shorts' })),
        h('div', { class: 'grid2' },
          ui.field('Total order', h('div', { class: 'row-inline' },
            ui.number(o, 'totalPieces', () => { save(); updateTotals(); }, { placeholder: 'e.g. 300', inputmode: 'numeric' }),
            ui.select(o, 'unit', [['pieces', 'pieces'], ['sets', 'sets']], save, 'unit-select'))),
          h('div', { class: 'grid2 tight' },
            ui.field('Start date', ui.text(o, 'startDate', save, { type: 'date' })),
            ui.field('End date', ui.text(o, 'endDate', () => { save(); TP.app.refreshBanner(pack); }, { type: 'date' })))));
    }

    /* ---------- Design pictures ---------- */
    function designSection(redraw) {
      return h('div', null,
        h('p', { class: 'muted small' }, 'Add the front and back picture of each design. Then use "Remove background" and "Crop / size" on each picture.'),
        pack.designs.map((d, i) => h('div', { class: 'design-block' },
          h('div', { class: 'row-inline' },
            ui.text(d, 'name', save, { placeholder: 'Design name, e.g. Home kit' }),
            pack.designs.length > 1 ? delBtn(pack.designs, i, redraw, 'design') : null),
          h('div', { class: 'grid2' },
            h('div', null, h('div', { class: 'field-label' }, 'Front'), TP.images.single(d, 'front', saveNow, 'Add front picture')),
            h('div', null, h('div', { class: 'field-label' }, 'Back'), TP.images.single(d, 'back', saveNow, 'Add back picture'))))),
        ui.btn('+ Add another design', () => {
          pack.designs.push({ id: util.uid(), name: 'Design ' + (pack.designs.length + 1), front: null, back: null });
          save(); redraw();
        }, 'secondary'));
    }

    /* ---------- Logo ---------- */
    function logoSection() {
      return h('div', null,
        h('p', { class: 'muted small' }, 'Add one or more of the client\'s logo pictures.'),
        TP.images.gallery(pack.logos, saveNow, 'Add logo pictures'));
    }

    /* ---------- Fabric ---------- */
    function fabricSection(redraw) {
      return h('div', null,
        pack.fabrics.map((f, i) => h('div', { class: 'row-card' },
          h('div', { class: 'row-card-head' }, h('strong', null, f.part || 'Part ' + (i + 1)), delBtn(pack.fabrics, i, redraw, 'fabric part')),
          h('div', { class: 'grid4' },
            ui.field('Part', ui.text(f, 'part', save, { list: 'dl-parts', placeholder: 'e.g. Shirt' })),
            ui.field('Fabric type', ui.text(f, 'type', save, { list: 'dl-fabric-types', placeholder: 'Pick or type' })),
            ui.field('GSM', ui.number(f, 'gsm', save, { placeholder: 'e.g. 180', inputmode: 'numeric' })),
            ui.field('Fabric store', ui.text(f, 'store', save, { list: 'dl-fabric-stores', placeholder: 'Where we buy it' }))))),
        ui.btn('+ Add fabric part', () => { pack.fabrics.push({ id: util.uid(), part: '', type: '', gsm: '', store: '' }); save(); redraw(); }, 'secondary'));
    }

    /* ---------- Pattern ---------- */
    function patternSection(redraw) {
      return h('div', null,
        pack.patterns.map((p, i) => h('div', { class: 'row-card' },
          h('div', { class: 'row-card-head' }, h('strong', null, p.part || 'Part ' + (i + 1)), delBtn(pack.patterns, i, redraw, 'pattern')),
          h('div', { class: 'grid3' },
            ui.field('Part', ui.text(p, 'part', save, { list: 'dl-parts', placeholder: 'e.g. Shorts' })),
            ui.field('Pattern name', ui.text(p, 'name', save, { placeholder: 'e.g. Raglan slim fit' })),
            ui.field('Pattern code', ui.text(p, 'code', save, { placeholder: 'e.g. P-104' }))))),
        ui.btn('+ Add pattern', () => { pack.patterns.push({ id: util.uid(), part: '', name: '', code: '' }); save(); redraw(); }, 'secondary'));
    }

    /* ---------- Printing ---------- */
    function printingSection(redraw) {
      return h('div', null,
        pack.printing.map((p, i) => h('div', { class: 'row-card' },
          h('div', { class: 'row-card-head' }, h('strong', null, p.part || 'Part ' + (i + 1)), delBtn(pack.printing, i, redraw, 'printing row')),
          h('div', { class: 'grid3' },
            ui.field('Part', ui.text(p, 'part', save, { list: 'dl-parts', placeholder: 'e.g. Shirt front' })),
            ui.field('Print type', ui.select(p, 'method', model.PRINT_METHODS, () => { save(); redraw(); })),
            p.method === 'other' ? ui.field('Type the print method', ui.text(p, 'other', save, { placeholder: 'e.g. Heat transfer vinyl' })) : h('div')))),
        ui.btn('+ Add printing', () => { pack.printing.push({ id: util.uid(), part: '', method: 'dtf', other: '' }); save(); redraw(); }, 'secondary'));
    }

    /* ---------- Colours and sizes ---------- */
    let totalsRefs = null;
    function updateTotals() {
      if (!totalsRefs) return;
      const t = model.totals(pack);
      for (const s of pack.sizes) if (totalsRefs.size[s]) totalsRefs.size[s].textContent = t.perSize[s];
      for (const c of pack.colors) if (totalsRefs.color[c.id]) totalsRefs.color[c.id].textContent = t.perColor[c.id];
      totalsRefs.grand.textContent = t.grand;
      const mm = model.totalMismatch(pack);
      totalsRefs.warn.innerHTML = '';
      totalsRefs.warn.className = mm ? 'alert danger' : (util.int(pack.order.totalPieces) ? 'alert ok' : 'hidden');
      totalsRefs.warn.textContent = mm ? '⚠ Mistake check: ' + mm : `✓ Total matches the order (${t.grand} ${pack.order.unit}).`;
    }

    function coloursSection(redraw) {
      totalsRefs = { size: {}, color: {}, grand: null, warn: h('div') };
      const head = h('tr', null, h('th', { class: 'col-colour' }, 'Colour'),
        pack.sizes.map((s) => h('th', null, h('div', { class: 'size-head' }, s,
          h('button', { type: 'button', class: 'size-x', title: 'Remove size ' + s, onClick: async () => {
            const used = pack.colors.some((c) => util.int(c.qty[s]));
            if (used && !await ui.confirm(`Size ${s} has quantities. Remove it anyway?`, 'Remove', true)) return;
            pack.sizes.splice(pack.sizes.indexOf(s), 1);
            pack.colors.forEach((c) => { delete c.qty[s]; });
            save(); redraw();
          } }, '×')))),
        h('th', null, 'Total'), h('th'));

      const rows = pack.colors.map((c, i) => {
        const totalCell = h('td', { class: 'total-cell' }, '0');
        totalsRefs.color[c.id] = totalCell;
        return h('tr', null,
          h('td', { class: 'col-colour' }, h('div', { class: 'colour-cell' },
            h('input', { type: 'color', class: 'swatch', value: c.hex || '#000000', onInput: (e) => { c.hex = e.target.value; save(); } }),
            ui.text(c, 'name', save, { placeholder: 'Colour name', cls: 'colour-name' }))),
          pack.sizes.map((s) => {
            const inp = h('input', { class: 'input qty', inputmode: 'numeric', placeholder: '0',
              onInput: (e) => { c.qty[s] = e.target.value.replace(/[^\d]/g, ''); save(); updateTotals(); } });
            inp.value = c.qty[s] || '';
            return h('td', null, inp);
          }),
          totalCell,
          h('td', null, delBtn(pack.colors, i, redraw, 'colour')));
      });

      const foot = h('tr', null, h('td', { class: 'col-colour' }, h('strong', null, 'Total')),
        pack.sizes.map((s) => { const td = h('td', { class: 'total-cell' }, '0'); totalsRefs.size[s] = td; return td; }),
        (totalsRefs.grand = h('td', { class: 'total-cell grand' }, '0')), h('td'));

      const box = h('div', null,
        h('p', { class: 'muted small' }, 'Add each colour as a row and type the pieces for each size. Sizes with 0 pieces are hidden in the final tech pack.'),
        h('div', { class: 'table-scroll' }, h('table', { class: 'sizes-table' }, h('thead', null, head), h('tbody', null, rows), h('tfoot', null, foot))),
        h('div', { class: 'btn-row' },
          ui.btn('+ Add colour', () => { pack.colors.push({ id: util.uid(), hex: '#ffffff', name: '', qty: {} }); save(); redraw(); }, 'secondary'),
          ui.btn('+ Add size', async () => {
            const s = await ui.ask('Add a size column', 'Size name (e.g. 7XL or 10/12)');
            if (!s) return;
            if (pack.sizes.includes(s)) { ui.toast('That size is already there.'); return; }
            pack.sizes.push(s); save(); redraw();
          }, 'secondary')),
        totalsRefs.warn);
      setTimeout(updateTotals);
      return box;
    }

    /* ---------- Labels, tags and packaging ---------- */
    function labelsSection() {
      const L = pack.labels;
      return h('div', { class: 'labels-grid' },
        h('div', { class: 'row-card' }, h('h3', null, 'Woven label'),
          ui.field('Colour / design notes', ui.text(L.woven, 'notes', save, { multiline: true, rows: 2, placeholder: 'e.g. Black label, white logo' })),
          ui.field('Size', ui.text(L.woven, 'size', save, { placeholder: 'e.g. 5 × 2 cm' })),
          TP.images.gallery(L.woven.images, saveNow, 'Add label pictures')),
        h('div', { class: 'row-card' }, h('h3', null, 'Hangtag / card'),
          ui.field('Colour / design notes', ui.text(L.hangtag, 'notes', save, { multiline: true, rows: 2, placeholder: 'e.g. Matte black card, gold print' })),
          ui.field('Size', ui.text(L.hangtag, 'size', save, { placeholder: 'e.g. 9 × 5 cm' })),
          TP.images.gallery(L.hangtag.images, saveNow, 'Add hangtag pictures')),
        h('div', { class: 'row-card' }, h('h3', null, 'Packaging'),
          ui.field('Packaging type', ui.text(L.packaging, 'type', save, { placeholder: 'e.g. Zip-lock poly bag' })),
          ui.field('Logo colour', ui.text(L.packaging, 'logoColor', save, { placeholder: 'e.g. White' })),
          ui.field('Bag size', ui.text(L.packaging, 'bagSize', save, { placeholder: 'e.g. 30 × 40 cm' })),
          TP.images.gallery(L.packaging.images, saveNow, 'Add packaging pictures')));
    }

    /* ---------- Extra notes ---------- */
    function notesSection(redraw) {
      return h('div', null,
        h('p', { class: 'muted small' }, 'Tick "Client" for notes the client should see. Use the small Urdu switch on a line to show only that line in Urdu.'),
        pack.notes.map((n, i) => h('div', { class: 'note-row' },
          h('span', { class: 'note-num' }, i + 1 + '.'),
          ui.text(n, 'text', save, { placeholder: i === 0 ? 'e.g. Deep pockets on shorts' : 'Extra note' }),
          h('div', { class: 'note-tools' },
            ui.toggle(n.urdu, (on) => { n.urdu = on; if (!on) pack.urdu.sections.notes = false; save(); redraw(); }, 'Urdu', 'small'),
            ui.checkbox(n.showClient, (on) => { n.showClient = on; save(); }, 'Client'),
            ui.iconBtn('🗑', 'Delete line', () => { pack.notes.splice(i, 1); save(); redraw(); }, 'danger-ghost')))),
        ui.btn('+ Add more lines', () => { pack.notes.push(model.blankNote()); save(); redraw(); }, 'secondary'));
    }

    /* ---------- Page layout ---------- */
    const s = TP.settings.current;
    const datalists = h('div', null,
      h('datalist', { id: 'dl-parts' }, PARTS.map((p) => h('option', { value: p }))),
      h('datalist', { id: 'dl-fabric-types' }, s.fabricTypes.map((p) => h('option', { value: p }))),
      h('datalist', { id: 'dl-fabric-stores' }, s.fabricStores.map((p) => h('option', { value: p }))));

    const redrawAll = () => Object.values(sections).forEach((r) => r());

    TP.add(root, 
      datalists,
      h('div', { class: 'card urdu-bar' },
        h('div', null, h('strong', null, 'Urdu for the Factory Version'),
          h('div', { class: 'muted small' }, 'Use the Urdu switch on each section, or:')),
        h('div', { class: 'btn-row' },
          ui.btn('All Urdu', () => { TP.urdu.setAll(pack, true); save(); redrawAll(); }, 'secondary'),
          ui.btn('All English', () => { TP.urdu.setAll(pack, false); save(); redrawAll(); }, 'secondary'))),
      section('order', 'Order details', 'order', orderSection),
      section('designs', 'Design pictures', null, designSection),
      section('logo', 'Logo', null, logoSection),
      section('fabric', 'Fabric', 'fabric', fabricSection),
      section('pattern', 'Pattern', 'pattern', patternSection),
      section('printing', 'Printing', 'printing', printingSection),
      section('colours', 'Colours and sizes', 'colours', coloursSection),
      section('labels', 'Labels, tags and packaging', 'labels', labelsSection),
      section('notes', 'Extra notes', 'notes', notesSection),
      h('div', { class: 'card next-steps' },
        h('p', { class: 'muted' }, 'All changes are saved automatically on this device.'),
        h('div', { class: 'btn-row' },
          ui.btn('💾 Save now', async () => { await save.flush(); ui.toast('Saved ✓', 'ok'); }, 'secondary big'),
          ui.btn('🏭 See Factory Version', () => TP.app.go(`#/pack/${pack.id}/factory`), 'primary big'),
          ui.btn('📸 See Client Version', () => TP.app.go(`#/pack/${pack.id}/client`), 'teal big'))));

    // Save straight away when leaving this page
    return () => save.flush();
  };
})(window.TP);
