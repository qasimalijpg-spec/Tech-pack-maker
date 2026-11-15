/* =====================================================================
   sheets.js — draws the finished tech pack pages:
     factorySheet(pack)  full working copy for you and your workers
     clientSheet(pack)   clean copy for clients (NO costs, fabric store
                         or pattern codes — those are simply never added)
   Plus the Factory and Client pages with their buttons.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;

  const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const anyRow = (rows, keys) => rows.some((r) => keys.some((k) => has(r[k])));

  function picture(img, maxH, cls) {
    if (!img) return null;
    const k = (img.scale || 100) / 100;
    return h('img', { class: 'tp-img ' + (cls || ''), src: img.src, alt: '', style: { maxHeight: Math.round(maxH * k) + 'px', maxWidth: Math.round(100 * k) + '%' } });
  }

  function companyHeader(sub) {
    const s = TP.settings.current;
    return h('div', { class: 'tp-company' },
      s.companyLogo ? h('img', { class: 'tp-company-logo', src: s.companyLogo.src, alt: '' }) : null,
      h('div', null, h('div', { class: 'tp-company-name' }, s.companyName || ''), sub ? h('div', { class: 'tp-sub' }, sub) : null));
  }

  /* =================== FACTORY SHEET =================== */
  function factorySheet(pack) {
    const title = (en) => h('h3', { class: 'tp-h' }, en);
    const o = pack.order;
    const blocks = [];
    const block = (...kids) => { const b = h('div', { class: 'tp-block' }, ...kids); blocks.push(b); return b; };

    // 1. Header + order details
    block(
      h('div', { class: 'tp-top' }, companyHeader(), h('div', { class: 'tp-doc' }, h('div', { class: 'tp-doc-title' }, 'TECH PACK'), h('div', { class: 'tp-sub' }, 'Factory copy · ' + util.fmtDate(util.todayISO())))),
      h('div', { class: 'tp-project' }, model.title(pack)),
      h('table', { class: 'tp-info' }, h('tbody', null,
        h('tr', null, h('th', null, 'Client / brand'), h('td', null, o.client), h('th', null, 'Manufacturer'), h('td', null, o.manufacturer)),
        h('tr', null, h('th', null, 'Total order'), h('td', null, has(o.totalPieces) ? `${o.totalPieces} ` : '', has(o.totalPieces) ? o.unit : ''),
          h('th', null, 'Start date'), h('td', null, util.fmtDate(o.startDate))),
        h('tr', null, h('th', null, 'End date'), h('td', null, util.fmtDate(o.endDate)), h('th'), h('td')),
        has(o.description) ? h('tr', null, h('th', null, 'Order description'), h('td', { colspan: 3 }, o.description)) : null)));

    // 2. Design pictures (one block per design so PDF pages break nicely)
    pack.designs.filter((d) => d.front || d.back).forEach((d, i) => block(
      i === 0 ? title('Design pictures') : null,
      h('div', { class: 'tp-design-name' }, d.name),
      h('div', { class: 'tp-pair' },
        d.front ? h('figure', null, picture(d.front, 380), h('figcaption', null, 'Front')) : null,
        d.back ? h('figure', null, picture(d.back, 380), h('figcaption', null, 'Back')) : null)));

    // 3. Logo
    if (pack.logos.length) block(title('Logo'), h('div', { class: 'tp-logos' }, pack.logos.map((l) => picture(l, 140))));

    // 4. Fabric
    if (anyRow(pack.fabrics, ['part', 'type', 'gsm', 'store'])) block(title('Fabric'),
      h('table', { class: 'tp-table' },
        h('thead', null, h('tr', null, h('th', null, 'Part'), h('th', null, 'Fabric type'), h('th', null, 'GSM'), h('th', null, 'Fabric store'))),
        h('tbody', null, pack.fabrics.map((f) => h('tr', null, h('td', null, f.part), h('td', null, f.type), h('td', null, f.gsm), h('td', null, f.store))))));

    // 5. Pattern
    if (anyRow(pack.patterns, ['part', 'name', 'code'])) block(title('Pattern'),
      h('table', { class: 'tp-table' },
        h('thead', null, h('tr', null, h('th', null, 'Part'), h('th', null, 'Pattern name'), h('th', null, 'Pattern code'))),
        h('tbody', null, pack.patterns.map((p) => h('tr', null, h('td', null, p.part), h('td', null, p.name), h('td', null, p.code))))));

    // 6. Printing
    if (pack.printing.length) block(title('Printing'),
      h('table', { class: 'tp-table' },
        h('thead', null, h('tr', null, h('th', null, 'Part'), h('th', null, 'Print type'))),
        h('tbody', null, pack.printing.map((p) => h('tr', null, h('td', null, p.part), h('td', null, model.methodLabel(p)))))));

    // 7. Colours and sizes
    block(title('Colours and sizes'), sizesTable(pack, (en) => en, (en) => en));

    // 8. Labels and packaging
    const L = pack.labels;
    const labelBox = (head, rows, imgs) => h('div', { class: 'tp-label-box' }, h('h4', null, head),
      rows.filter(([, v]) => has(v)).map(([k, v]) => h('div', { class: 'tp-kv' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v))),
      h('div', { class: 'tp-label-imgs' }, imgs.map((i) => picture(i, 110))));
    block(title('Labels and packaging'), h('div', { class: 'tp-labels' },
      labelBox('Woven label', [['Colour / design', L.woven.notes], ['Size', L.woven.size]], L.woven.images),
      labelBox('Hangtag / card', [['Colour / design', L.hangtag.notes], ['Size', L.hangtag.size]], L.hangtag.images),
      labelBox('Packaging', [['Packaging type', L.packaging.type], ['Logo colour', L.packaging.logoColor], ['Bag size', L.packaging.bagSize]], L.packaging.images)));

    // 9. Extra notes
    const notes = pack.notes.filter((n) => has(n.text));
    if (notes.length) block(title('Extra notes'), h('ol', { class: 'tp-notes' }, notes.map((n) => h('li', null, n.text))));

    // 10. Progress
    block(h('h3', { class: 'tp-h' }, 'Progress'), h('div', { class: 'tp-progress' },
      model.STAGES.map(([k, l]) => h('span', { class: 'tp-stage' + (pack.progress[k] ? ' done' : '') }, h('span', { class: 'box' }, pack.progress[k] ? '✓' : ''), l))));

    return h('div', { class: 'tp-sheet factory' }, blocks);
  }

  /* Colours & sizes table — only sizes with pieces are shown */
  function sizesTable(pack) {
    const sizes = model.visibleSizes(pack);
    const t = model.totals(pack);
    const colors = pack.colors.filter((c) => t.perColor[c.id] > 0 || has(c.name));
    if (!sizes.length) return h('p', { class: 'tp-muted' }, 'No quantities entered yet.');
    return h('table', { class: 'tp-table tp-sizes' },
      h('thead', null, h('tr', null, h('th', { class: 'left' }, 'Colour'), sizes.map((s) => h('th', null, s)), h('th', null, 'Total'))),
      h('tbody', null, colors.map((c) => h('tr', null,
        h('td', { class: 'left' }, h('span', { class: 'tp-swatch', style: { background: c.hex } }), c.name),
        sizes.map((s) => h('td', null, util.int(c.qty[s]) || '–')),
        h('td', { class: 'strong' }, t.perColor[c.id])))),
      h('tfoot', null, h('tr', null, h('td', { class: 'left' }, 'Grand total'), sizes.map((s) => h('td', null, t.perSize[s])), h('td', { class: 'grand' }, t.grand))));
  }

  /* =================== CLIENT SHEET =================== */
  function clientSheet(pack) {
    const o = pack.order;
    const L = pack.labels;
    const s = TP.settings.current;
    const sec = (title, ...kids) => h('div', { class: 'tp-block' }, h('h3', { class: 'tp-h' }, title), ...kids);
    const kv = (k, v) => has(v) ? h('div', { class: 'tp-kv' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v)) : null;
    const notes = pack.notes.filter((n) => n.showClient && has(n.text));
    const designs = pack.designs.filter((d) => d.front || d.back);
    const labelBox = (head, rows, imgs) => {
      const r = rows.filter(([, v]) => has(v));
      if (!r.length && !imgs.length) return null;
      return h('div', { class: 'tp-label-box' }, h('h4', null, head), r.map(([k, v]) => kv(k, v)), h('div', { class: 'tp-label-imgs' }, imgs.map((i) => picture(i, 90))));
    };
    const labelBoxes = [
      labelBox('Woven label', [['Colour / design', L.woven.notes], ['Size', L.woven.size]], L.woven.images),
      labelBox('Hangtag / card', [['Colour / design', L.hangtag.notes], ['Size', L.hangtag.size]], L.hangtag.images),
      labelBox('Packaging', [['Type', L.packaging.type], ['Logo colour', L.packaging.logoColor], ['Bag size', L.packaging.bagSize]], L.packaging.images),
    ].filter(Boolean);

    return h('div', { class: 'tp-sheet client' },
      h('div', { class: 'tp-block tp-client-head' },
        companyHeader('Tech pack'),
        h('div', { class: 'tp-project' }, model.title(pack)),
        has(o.client) ? h('div', { class: 'tp-brand' }, o.client) : null),
      designs.length ? h('div', { class: 'tp-block' }, designs.map((d) => h('div', { class: 'tp-design' },
        designs.length > 1 || has(d.name) ? h('div', { class: 'tp-design-name' }, d.name) : null,
        h('div', { class: 'tp-pair' },
          d.front ? h('figure', null, picture(d.front, 300), h('figcaption', null, 'Front')) : null,
          d.back ? h('figure', null, picture(d.back, 300), h('figcaption', null, 'Back')) : null)))) : null,
      pack.logos.length ? sec('Logo', h('div', { class: 'tp-logos' }, pack.logos.map((l) => picture(l, 90)))) : null,
      sec('Colours, sizes and quantities', sizesTable(pack)),
      pack.printing.length ? sec('Printing', pack.printing.map((p) => kv(p.part || 'Print', model.methodLabel(p)))) : null,
      labelBoxes.length ? sec('Labels and packaging', h('div', { class: 'tp-labels' }, labelBoxes)) : null,
      notes.length ? sec('Notes', h('ul', { class: 'tp-notes' }, notes.map((n) => h('li', null, n.text)))) : null,
      h('div', { class: 'tp-footer' },
        s.companyLogo ? h('img', { src: s.companyLogo.src, alt: '' }) : null,
        h('span', null, (s.companyName || '') + (has(o.manufacturer) && o.manufacturer !== s.companyName ? ' · Made by ' + o.manufacturer : ''))));
  }

  /* Shows a sheet shrunk to fit the screen (the export uses full size) */
  function preview(sheet) {
    const frame = h('div', { class: 'sheet-frame' }, sheet);
    const fit = () => {
      const w = frame.clientWidth;
      const k = Math.min(1, w / sheet.offsetWidth);
      sheet.style.transform = `scale(${k})`;
      sheet.style.left = Math.max(0, (w - sheet.offsetWidth * k) / 2) + 'px';
      frame.style.height = Math.ceil(sheet.offsetHeight * k) + 'px';
    };
    new ResizeObserver(fit).observe(frame);
    sheet.querySelectorAll('img').forEach((i) => i.addEventListener('load', fit));
    setTimeout(fit, 30);
    return frame;
  }

  /* =================== FACTORY PAGE =================== */
  TP.pages = TP.pages || {};
  TP.pages.factory = function (root, pack) {
    const save = util.debounce(() => TP.packs.save(pack).then(TP.app.saved), 300);
    const holder = h('div');

    const draw = () => { holder.innerHTML = ''; TP.add(holder, preview(factorySheet(pack))); };

    const mm = model.totalMismatch(pack);
    TP.add(root, 
      h('div', { class: 'card toolbar' },
        ui.btn('⬇ Save as PDF', () => TP.export.factoryPDF(pack), 'primary big'),
        ui.btn('💰 Costing', () => TP.app.go(`#/pack/${pack.id}/costing`), 'secondary')),
      mm ? h('div', { class: 'alert danger' }, '⚠ Mistake check: ' + mm) : null,
      ui.card('Progress tracker', null,
        h('p', { class: 'muted small' }, 'Tick each stage when it is done.'),
        h('div', { class: 'stages' }, model.STAGES.map(([k, l]) => h('label', { class: 'stage' + (pack.progress[k] ? ' done' : '') },
          h('input', { type: 'checkbox', checked: !!pack.progress[k], onChange: (e) => {
            pack.progress[k] = e.target.checked;
            e.target.parentElement.classList.toggle('done', e.target.checked);
            save(); draw(); TP.app.refreshBanner(pack);
          } }), h('span', null, l))))),
      holder);
    draw();
    return () => save.flush();
  };

  /* =================== CLIENT PAGE =================== */
  TP.pages.client = function (root, pack) {
    const mm = model.totalMismatch(pack);
    TP.add(root, 
      h('div', { class: 'card toolbar' },
        ui.btn('⬇ Save as picture (JPG)', () => TP.export.clientJPG(pack), 'teal big'),
        h('div', { class: 'muted small' }, 'This copy never shows costs, fabric stores or pattern codes. Notes appear only if you ticked "Client".')),
      mm ? h('div', { class: 'alert danger' }, '⚠ Mistake check: ' + mm) : null,
      preview(clientSheet(pack)));
  };

  TP.sheets = { factorySheet, clientSheet, sizesTable };
})(window.TP);
