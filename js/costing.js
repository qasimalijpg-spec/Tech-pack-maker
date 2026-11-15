/* =====================================================================
   costing.js — the Costing page (one per order) and the Costing Sheet
   (all orders, downloadable as Excel). Costs are NEVER put in any
   tech pack: they live only here.
   All costs are in PKR, per piece, unless the label says otherwise.
   Empty boxes count as zero.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;
  const N = util.num;

  /* Every simple "per piece" box, grouped. Add a new cost here and it
     appears on the page AND as a new column in the Excel sheet. */
  const GROUPS = [
    ['Making (per piece)', [['cutting', 'Cutting'], ['stitching', 'Stitching'], ['pressing', 'Pressing'], ['packing', 'Packing']]],
    ['Printing (per piece)', [['dtf', 'DTF'], ['sublimation', 'Sublimation'], ['screen', 'Screen print'], ['embroidery', 'Embroidery'], ['puff', 'Puff print']]],
    ['Finishing and extras (per piece)', [['acidWash', 'Acid wash'], ['distressing', 'Distressing'], ['zipper', 'Zipper'], ['rhinestones', 'Rhinestones']]],
  ];
  const TRIMS = [['label', 'Woven labels'], ['hangtag', 'Hangtags / cards'], ['polybag', 'Poly bags']];

  function blank(pack) {
    const c = {
      packId: pack.id, pieces: '', fabrics: [], c: {}, shipping: { kg: '', price: '' },
      oneOff: [{ name: 'Sample', amount: '' }, { name: 'Screen setup', amount: '' }],
      others: [{ name: '', amount: '' }, { name: '', amount: '' }, { name: '', amount: '' }],
      trims: { mode: 'none', label: { on: true, qty: '' }, hangtag: { on: true, qty: '' }, polybag: { on: true, qty: '' } },
    };
    return c;
  }

  /* Keep fabric lines in step with the tech pack's fabric parts */
  function syncFabrics(cost, pack) {
    const old = cost.fabrics || [];
    cost.fabrics = pack.fabrics.map((f) => {
      const prev = old.find((x) => x.id === f.id) || {};
      return { id: f.id, part: f.part, type: f.type, gsm: f.gsm, kg: prev.kg || '', price: prev.price || '' };
    });
  }

  function piecesOf(cost, pack) {
    return N(cost.pieces) || util.int(pack.order.totalPieces) || model.totals(pack).grand;
  }

  /* All the maths in one place */
  function calc(cost, pack) {
    const pieces = piecesOf(cost, pack);
    const per = (total) => (pieces ? total / pieces : 0);
    const r = { pieces, fabricLines: [], fields: {} };
    r.fabric = 0;
    for (const f of cost.fabrics) { const v = N(f.kg) * N(f.price); r.fabricLines.push(v); r.fabric += v; }
    r.simple = 0;
    for (const [, items] of GROUPS) for (const [k] of items) { r.fields[k] = N(cost.c[k]); r.simple += r.fields[k]; }
    r.shippingTotal = N(cost.shipping.kg) * N(cost.shipping.price);
    r.shipping = per(r.shippingTotal);
    r.oneOffTotal = cost.oneOff.reduce((s, x) => s + N(x.amount), 0);
    r.oneOff = per(r.oneOffTotal);
    r.other = cost.others.reduce((s, x) => s + N(x.amount), 0);
    const prices = TP.settings.current.prices;
    r.trims = {};
    for (const [k] of TRIMS) {
      const t = cost.trims[k];
      r.trims[k] = cost.trims.mode === 'custom' && t.on && N(t.qty) > 0 ? N(prices[k]) / N(t.qty) : 0;
    }
    r.trimTotal = r.trims.label + r.trims.hangtag + r.trims.polybag;
    r.perPiece = r.fabric + r.simple + r.shipping + r.oneOff + r.other + r.trimTotal;
    r.total = r.perPiece * pieces;
    return r;
  }

  function fabricText(pack) {
    return pack.fabrics.filter((f) => f.part || f.type).map((f) => [f.part, f.type, f.gsm ? f.gsm + ' GSM' : ''].filter(Boolean).join(' ')).join('; ');
  }

  /* One row for the Excel sheet */
  function sheetRow(cost, pack) {
    const r = calc(cost, pack);
    const R = util.round2;
    const row = {
      packId: pack.id, date: util.todayISO(), savedAt: Date.now(),
      project: model.title(pack), client: pack.order.client, product: pack.order.description,
      pieces: r.pieces, fabricDetails: fabricText(pack), fabric: R(r.fabric),
    };
    for (const [, items] of GROUPS) for (const [k] of items) row[k] = R(r.fields[k]);
    Object.assign(row, {
      shipping: R(r.shipping), oneOff: R(r.oneOff),
      label: R(r.trims.label), hangtag: R(r.trims.hangtag), polybag: R(r.trims.polybag),
      other: R(r.other), otherDetails: cost.others.filter((o) => N(o.amount)).map((o) => `${o.name || 'Other'}: ${o.amount}`).join('; '),
      perPiece: R(r.perPiece), total: R(r.total),
    });
    return row;
  }

  /* Excel columns: [key in row, column title] */
  function columns() {
    const cols = [['date', 'Date'], ['project', 'Project'], ['client', 'Client'], ['product', 'Product / description'],
      ['pieces', 'Total pieces'], ['fabricDetails', 'Fabric details'], ['fabric', 'Fabric / pc']];
    for (const [, items] of GROUPS) for (const [k, l] of items) cols.push([k, l + ' / pc']);
    cols.push(['shipping', 'Shipping / pc'], ['oneOff', 'One-off costs / pc'], ['label', 'Labels / pc'], ['hangtag', 'Hangtags / pc'],
      ['polybag', 'Poly bags / pc'], ['other', 'Other / pc'], ['otherDetails', 'Other details'], ['perPiece', 'TOTAL per piece (PKR)'], ['total', 'TOTAL order (PKR)']);
    return cols;
  }

  async function downloadExcel() {
    const rows = (await TP.db.all('sheet')).sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
    if (!rows.length) { ui.toast('No orders in the costing sheet yet.'); return; }
    const cols = columns();
    const aoa = [cols.map((c) => c[1])].concat(rows.map((r) => cols.map(([k]) => r[k] ?? '')));
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols.map(([k]) => ({ wch: ['project', 'client', 'product', 'fabricDetails', 'otherDetails'].includes(k) ? 24 : 13 }));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Costing');
    const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    TP.export.readyDialog({ title: 'Excel file ready', blob, filename: `Costing Sheet ${util.todayISO()}.xlsx` });
  }

  /* =================== COSTING PAGE =================== */
  TP.pages = TP.pages || {};
  TP.pages.costing = async function (root, pack) {
    const saved = await TP.db.get('costings', pack.id);
    const cost = Object.assign(blank(pack), saved || {});
    syncFabrics(cost, pack);
    const live = []; // [element, () => text] pairs updated on every change
    const show = (fn, cls) => { const el = h('span', { class: cls || 'calc' }); live.push([el, fn]); return el; };
    const refresh = () => { const r = calc(cost, pack); live.forEach(([el, fn]) => { el.textContent = fn(r); }); };
    const autosave = util.debounce(() => TP.db.put('costings', cost), 500);
    const changed = () => { refresh(); autosave(); };
    const box = (obj, key, placeholder) => ui.number(obj, key, changed, { placeholder: placeholder || '0' });
    const money = util.money;
    const o = pack.order;

    // Summary (filled in automatically from the tech pack)
    const summary = ui.card('Order', null,
      h('div', { class: 'summary' },
        h('div', null, h('span', { class: 'k' }, 'Order name'), h('strong', null, model.title(pack))),
        h('div', null, h('span', { class: 'k' }, 'Client'), h('strong', null, o.client || '–')),
        h('div', null, h('span', { class: 'k' }, 'Product'), h('strong', null, o.description || '–')),
        h('div', null, h('span', { class: 'k' }, 'Fabric'), h('strong', null, fabricText(pack) || '–'))),
      ui.field('Total pieces (used to divide one-off costs)', box(cost, 'pieces', String(util.int(o.totalPieces) || model.totals(pack).grand || 0)),
        'Leave empty to use the tech pack total.'));

    // Fabric
    const fabricCard = ui.card('Fabric (per piece)', null,
      h('p', { class: 'muted small' }, 'Fabric cost per piece = kg used per piece × price per kg.'),
      cost.fabrics.length ? cost.fabrics.map((f, i) => h('div', { class: 'row-card' },
        h('div', { class: 'row-card-head' }, h('strong', null, [f.part, f.type].filter(Boolean).join(' – ') || 'Fabric ' + (i + 1)), h('span', { class: 'muted small' }, f.gsm ? f.gsm + ' GSM' : 'GSM not set')),
        h('div', { class: 'grid3' },
          ui.field('Kg used per piece', box(f, 'kg', 'e.g. 0.25')),
          ui.field('Price per kg (PKR)', box(f, 'price', 'e.g. 1200')),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Cost per piece'), show((r) => money(r.fabricLines[i]), 'calc big'))))) :
        h('p', { class: 'muted' }, 'No fabric parts in this tech pack. Add them in Details → Fabric.'),
      h('div', { class: 'subtotal' }, 'Fabric total per piece: ', show((r) => money(r.fabric))));

    // Simple groups
    const groupCards = GROUPS.map(([title, items]) => ui.card(title, null,
      h('div', { class: 'grid4' }, items.map(([k, l]) => ui.field(l, box(cost.c, k))))));

    // Shipping
    const shipCard = ui.card('Shipping', null,
      h('p', { class: 'muted small' }, 'Type the total shipping weight for the whole order. It is divided across all pieces.'),
      h('div', { class: 'grid3' },
        ui.field('Total weight (kg)', box(cost.shipping, 'kg')),
        ui.field('Price per kg (PKR)', box(cost.shipping, 'price')),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Shipping'), show((r) => `${money(r.shippingTotal)} total = ${money(r.shipping)} / pc`, 'calc'))));

    // Lines with a name + amount (one-off and other)
    const namedLines = (arr, namePh, onRedraw) => {
      const wrap = h('div');
      const draw = () => {
        wrap.innerHTML = '';
        arr.forEach((x, i) => TP.add(wrap, h('div', { class: 'named-line' },
          ui.text(x, 'name', changed, { placeholder: namePh }), box(x, 'amount'),
          ui.iconBtn('🗑', 'Delete line', () => { arr.splice(i, 1); changed(); draw(); }, 'danger-ghost'))));
        TP.add(wrap, ui.btn('+ Add line', () => { arr.push({ name: '', amount: '' }); changed(); draw(); }, 'secondary small'));
        onRedraw && onRedraw();
      };
      draw();
      return wrap;
    };
    const oneOffCard = ui.card('One-off costs for the whole order', null,
      h('p', { class: 'muted small' }, 'Costs paid once for the whole order (sample, screen setup…). They are divided across all pieces.'),
      namedLines(cost.oneOff, 'e.g. Sample'),
      h('div', { class: 'subtotal' }, show((r) => `${money(r.oneOffTotal)} total ÷ ${r.pieces || 0} pieces = ${money(r.oneOff)} per piece`)));
    const otherCard = ui.card('Other costs (per piece)', null,
      h('p', { class: 'muted small' }, 'Name these yourself, e.g. "Thread", "Elastic", "Courier to client".'),
      namedLines(cost.others, 'Name this cost'),
      h('div', { class: 'subtotal' }, 'Other total per piece: ', show((r) => money(r.other))));

    // Labels, hangtags and poly bags
    const trimsBody = h('div');
    const drawTrims = () => {
      trimsBody.innerHTML = '';
      const prices = TP.settings.current.prices;
      const opt = (mode, title, sub) => h('label', { class: 'radio-card' + (cost.trims.mode === mode ? ' active' : '') },
        h('input', { type: 'radio', name: 'trims', checked: cost.trims.mode === mode, onChange: () => { cost.trims.mode = mode; changed(); drawTrims(); } }),
        h('div', null, h('strong', null, title), h('div', { class: 'muted small' }, sub)));
      TP.add(trimsBody, h('div', { class: 'grid2' },
        opt('none', '1. No custom labels, tags or bags', 'All three count as zero.'),
        opt('custom', '2. Custom labels, tags and bags', 'Uses your fixed prices from Settings.')));
      if (cost.trims.mode === 'custom') {
        TRIMS.forEach(([k, l]) => {
          const t = cost.trims[k];
          TP.add(trimsBody, h('div', { class: 'row-card trim-row' + (t.on ? '' : ' off') },
            h('div', { class: 'row-card-head' }, ui.toggle(t.on, (on) => { t.on = on; changed(); drawTrims(); }, l),
              h('span', { class: 'muted small' }, 'Fixed price: ' + money(N(prices[k])))),
            t.on ? h('div', { class: 'grid2' },
              ui.field('Quantity', box(t, 'qty', 'e.g. 100')),
              h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Cost per piece'),
                show((r) => `${money(N(prices[k]))} ÷ ${N(t.qty) || 0} = ${money(r.trims[k])}`, 'calc'))) : null));
        });
        TP.add(trimsBody, h('p', { class: 'muted small' }, 'Change the fixed prices in ', h('a', { href: '#/settings' }, 'Settings'), '.'));
      }
      refresh();
    };
    drawTrims();
    const trimsCard = ui.card('Labels, hangtags and poly bags', null, trimsBody);

    // Totals bar + save
    const totals = h('div', { class: 'cost-total' },
      h('div', null, h('span', { class: 'k' }, 'Total cost per piece'), show((r) => money(r.perPiece), 'calc huge')),
      h('div', null, h('span', { class: 'k' }, 'Total for whole order'), show((r) => `${money(r.total)} (${r.pieces || 0} pcs)`, 'calc huge')),
      ui.btn('💾 Save to Costing Sheet', async () => {
        await autosave.flush();
        await TP.db.put('sheet', sheetRow(cost, pack));
        ui.toast('Saved ✓ Added to your Costing Sheet.', 'ok');
      }, 'primary big'));

    TP.add(root, 
      h('div', { class: 'alert info' }, '🔒 Costs are only on this page and in your Costing Sheet. They never appear in any tech pack.'),
      summary, fabricCard, ...groupCards, shipCard, oneOffCard, otherCard, trimsCard,
      h('div', { class: 'card' }, h('div', { class: 'btn-row' }, ui.btn('📊 Open Costing Sheet', () => TP.app.go('#/sheet'), 'secondary'))),
      totals);
    refresh();
    return () => autosave.flush();
  };

  /* =================== COSTING SHEET PAGE =================== */
  TP.pages.sheet = async function (root) {
    const rows = (await TP.db.all('sheet')).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const packIds = new Set((await TP.db.all('packs')).map((p) => p.id));
    const body = h('div');
    const draw = () => {
      body.innerHTML = '';
      if (!rows.length) {
        TP.add(body, h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, '📊'), h('p', null, 'No orders yet.'),
          h('p', { class: 'muted' }, 'Open a tech pack → Costing → press "Save to Costing Sheet".')));
        return;
      }
      TP.add(body, h('div', { class: 'table-scroll' }, h('table', { class: 'data-table' },
        h('thead', null, h('tr', null, ['Date', 'Project', 'Client', 'Pieces', 'Per piece', 'Whole order', ''].map((x) => h('th', null, x)))),
        h('tbody', null, rows.map((r, i) => h('tr', null,
          h('td', null, util.fmtDate(r.date)), h('td', null, h('strong', null, r.project)), h('td', null, r.client || ''),
          h('td', { class: 'num' }, r.pieces), h('td', { class: 'num' }, util.money(r.perPiece)), h('td', { class: 'num' }, util.money(r.total)),
          h('td', { class: 'nowrap' },
            packIds.has(r.packId) ? ui.btn('Open', () => TP.app.go(`#/pack/${r.packId}/costing`), 'small secondary') : h('span', { class: 'muted small' }, '(tech pack deleted)'),
            ui.iconBtn('🗑', 'Remove row', async () => {
              if (!await ui.confirm(`Remove "${r.project}" from the costing sheet?`, 'Remove', true)) return;
              await TP.db.del('sheet', r.packId); rows.splice(i, 1); draw();
            }, 'danger-ghost'))))))));
    };
    draw();
    TP.add(root, 
      ui.card('Costing Sheet', null,
        h('p', { class: 'muted' }, 'One row per order. Saving an order\'s costing again updates its row with the new date.'),
        ui.btn('⬇ Download Excel file', downloadExcel, 'primary big')),
      body);
  };

  TP.costing = { calc, sheetRow, columns, downloadExcel };
})(window.TP);
