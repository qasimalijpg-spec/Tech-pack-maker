/* =====================================================================
   model.js — what a tech pack contains, and the maths on it
   (totals, hidden sizes, deadline warnings, duplicating).
   If you want to add a new field to every tech pack, add it in newPack().
   ===================================================================== */
'use strict';
(function (TP) {
  const { uid, num, int, clone, daysUntil } = TP.util;

  const PRINT_METHODS = [
    ['dtf', 'DTF'], ['sublimation', 'Sublimation'], ['screen', 'Screen print'],
    ['embroidery', 'Embroidery'], ['puff', 'Puff print'], ['other', 'Other (type it)'],
  ];
  const STAGES = [
    ['fabric', 'Fabric bought'], ['cutting', 'Cutting'], ['printing', 'Printing'],
    ['stitching', 'Stitching'], ['packing', 'Packing'], ['shipped', 'Shipped'],
  ];
  const DEFAULT_SIZES = ['14/16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

  const blankNote = () => ({ id: uid(), text: '', showClient: false });

  function newPack(settings) {
    const s = settings || TP.settings.current;
    const now = Date.now();
    return {
      id: uid(), createdAt: now, updatedAt: now,
      order: {
        project: '', client: '', manufacturer: s.manufacturer || 'Blaze Impex',
        description: '', totalPieces: '', unit: 'pieces', startDate: TP.util.todayISO(), endDate: '',
      },
      designs: [{ id: uid(), name: 'Design 1', front: null, back: null }],
      logos: [],
      fabrics: [{ id: uid(), part: 'Shirt', type: '', gsm: '', store: '' }],
      patterns: [{ id: uid(), part: 'Shirt', name: '', code: '' }],
      printing: [{ id: uid(), part: 'Shirt', method: 'dtf', other: '' }],
      sizes: (s.sizes && s.sizes.length ? s.sizes : DEFAULT_SIZES).slice(),
      colors: [{ id: uid(), hex: '#111111', name: 'Black', qty: {} }],
      labels: {
        woven: { notes: '', size: '', images: [] },
        hangtag: { notes: '', size: '', images: [] },
        packaging: { type: '', logoColor: '', bagSize: '', images: [] },
      },
      notes: [blankNote(), blankNote(), blankNote(), blankNote(), blankNote()],
      progress: {},
    };
  }

  /* Totals for the colours & sizes table */
  function totals(pack) {
    const perSize = {};
    const perColor = {};
    let grand = 0;
    for (const size of pack.sizes) perSize[size] = 0;
    for (const c of pack.colors) {
      let t = 0;
      for (const size of pack.sizes) {
        const q = int(c.qty[size]);
        perSize[size] += q; t += q;
      }
      perColor[c.id] = t; grand += t;
    }
    return { perSize, perColor, grand };
  }

  /* Sizes that have at least one piece (zero sizes are hidden in the final tech pack) */
  function visibleSizes(pack) {
    const t = totals(pack);
    return pack.sizes.filter((s) => t.perSize[s] > 0);
  }

  /* Returns a warning text if the colour table total doesn't match the order total */
  function totalMismatch(pack) {
    const want = int(pack.order.totalPieces);
    if (!want) return null;
    const got = totals(pack).grand;
    if (got === want) return null;
    return `Sizes table adds up to ${got} pieces, but the order total is ${want}. ` +
      (got < want ? `${want - got} pieces are missing.` : `${got - want} pieces too many.`);
  }

  function stagesDone(pack) { return STAGES.filter(([k]) => pack.progress && pack.progress[k]).length; }
  function isFinished(pack) { return !!(pack.progress && pack.progress.shipped); }

  /* Deadline warning: null, or {level:'late'|'soon', text} */
  function deadline(pack) {
    if (isFinished(pack) || !pack.order.endDate) return null;
    const d = daysUntil(pack.order.endDate);
    const warnDays = int(TP.settings.current.deadlineDays) || 7;
    if (d < 0) return { level: 'late', text: `Late! End date passed ${-d} day${d === -1 ? '' : 's'} ago and the order is not shipped.` };
    if (d === 0) return { level: 'late', text: 'End date is TODAY and the order is not shipped.' };
    if (d <= warnDays) return { level: 'soon', text: `Only ${d} day${d === 1 ? '' : 's'} left until the end date. Order not finished yet.` };
    return null;
  }

  /* Copy a tech pack to start a new order */
  function duplicate(pack) {
    const p = clone(pack);
    p.id = uid();
    p.createdAt = p.updatedAt = Date.now();
    p.order.project = (p.order.project || 'Untitled') + ' (copy)';
    p.order.startDate = TP.util.todayISO();
    p.progress = {};
    return p;
  }

  /* Make older saved packs safe to open if new fields were added later */
  function upgrade(p) {
    const base = newPack();
    for (const k of Object.keys(base)) if (p[k] === undefined) p[k] = base[k];
    p.order = Object.assign({}, base.order, p.order);
    p.labels = Object.assign({}, base.labels, p.labels);
    p.progress = p.progress || {};
    return p;
  }

  function methodLabel(row) {
    if (row.method === 'other') return row.other || 'Other';
    const m = PRINT_METHODS.find(([k]) => k === row.method);
    return m ? m[1] : row.method;
  }

  function title(pack) { return pack.order.project || 'Untitled tech pack'; }

  TP.model = {
    PRINT_METHODS, STAGES, DEFAULT_SIZES,
    newPack, blankNote, totals, visibleSizes, totalMismatch, stagesDone, isFinished, deadline,
    duplicate, upgrade, methodLabel, title, num,
  };

  /* ---------- Saving / loading packs ---------- */
  TP.packs = {
    async all() {
      const list = (await TP.db.all('packs')).map(upgrade);
      return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // newest first
    },
    async get(id) { const p = await TP.db.get('packs', id); return p ? upgrade(p) : null; },
    async save(pack) { pack.updatedAt = Date.now(); await TP.db.put('packs', pack); },
    async remove(id) {
      await TP.db.del('packs', id);
      await TP.db.del('costings', id);
      // The costing sheet row is kept on purpose: it is your history of past orders.
    },
  };
})(window.TP);
