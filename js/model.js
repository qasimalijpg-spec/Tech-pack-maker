/* =====================================================================
   model.js — what a tech pack contains, and the maths on it
   (totals, sizes in use, deadline warnings, checks before export,
   duplicating, and upgrading tech packs saved by older versions).
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
  const TRIM_TYPES = ['Zipper', 'Zipper puller', 'Eyelet / grommet', 'Aglet', 'Drawcord', 'Button', 'Snap', 'Rivet',
    'Cord stopper', 'Elastic', 'Velcro', 'Woven label', 'Hangtag', 'Size label', 'Care label', 'Patch', 'Other'];
  const SUMMARY_KEYS = ['Garment', 'Fit', 'Fabric', 'Finish', 'Closure', 'Decoration', 'Drawstrings', 'Quantity'];
  const STAGE_OPTIONS = ['Proto', '1st Sample', '2nd Sample', 'Fit sample', 'Pre-production', 'Production'];
  const DEFAULT_SIZES = ['14/16', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

  const blankNote = () => ({ id: uid(), text: '', showClient: false });
  const blankColourway = (n) => ({ id: uid(), name: n ? 'Colour ' + n : '', hex: '#2f3136', note: '', tag: '', front: null, back: null, side: null });
  const blankMeasRows = () => [
    { id: uid(), l: 'A', name: 'Shoulder width', how: 'Seam to seam, across back', vals: {}, x: null, y: null },
    { id: uid(), l: 'B', name: 'Sleeve length', how: 'Shoulder point to cuff edge', vals: {}, x: null, y: null },
    { id: uid(), l: 'C', name: 'Chest width', how: '1" below armhole, side to side', vals: {}, x: null, y: null },
    { id: uid(), l: 'D', name: 'Body length', how: 'High point shoulder to hem', vals: {}, x: null, y: null },
  ];

  function newPack(settings) {
    const s = settings || TP.settings.current;
    const now = Date.now();
    return {
      id: uid(), createdAt: now, updatedAt: now, version: 2,
      order: {
        project: '', styleNo: '', client: '', designer: '', manufacturer: s.manufacturer || 'Blaze Impex',
        stage: '1st Sample', mainFabric: '', sampleSize: '',
        description: '', totalPieces: '', unit: 'pieces', startDate: TP.util.todayISO(), endDate: '',
      },
      summary: SUMMARY_KEYS.map((k) => ({ id: uid(), k, v: '' })),
      revisions: [{ id: uid(), rev: '00', date: '', text: 'First sample issued' }],
      colourways: [blankColourway(1)],
      poi: [],
      art: [],
      logos: [],
      fabrics: [{ id: uid(), part: 'Body', type: '', gsm: '', store: '' }],
      patterns: [{ id: uid(), part: 'Body', name: '', code: '' }],
      printing: [{ id: uid(), part: 'Front', method: 'dtf', other: '' }],
      trims: [],
      bom: [],
      meas: { diagram: null, unit: 'in', tol: '½', note: '', rows: blankMeasRows() },
      swatches: [],
      wash: '',
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

  /* The size range shown on the tech pack (info strip and measurement columns).
     Up to 8 sizes: all of them. More than 8: only the range from the first to the
     last size that has pieces, measurements or is the sample size. */
  function sizesInUse(pack) {
    if (pack.sizes.length <= 8) return pack.sizes.slice();
    const t = totals(pack);
    const used = pack.sizes.filter((s) => t.perSize[s] > 0 || s === pack.order.sampleSize ||
      pack.meas.rows.some((r) => String((r.vals || {})[s] || '').trim()));
    if (!used.length) return pack.sizes.slice();
    return pack.sizes.slice(pack.sizes.indexOf(used[0]), pack.sizes.indexOf(used[used.length - 1]) + 1);
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

  /* ---------- Checks before export (a friendly list, never a blocker) ---------- */
  const GARMENTS = [
    ['hoodie', ['hoodie', 'hoody', 'hooded']], ['sweatshirt', ['sweatshirt', 'crewneck', 'sweater']],
    ['t-shirt', ['t-shirt', 'tshirt', 'tee', 't shirt']], ['shirt', ['shirt', 'polo', 'jersey']],
    ['shorts', ['shorts', 'short']], ['trousers', ['trouser', 'trousers', 'pants', 'jogger', 'joggers', 'sweatpants']],
    ['jacket', ['jacket', 'windbreaker', 'bomber', 'coat']], ['tracksuit', ['tracksuit', 'track suit', 'set']],
    ['tank top', ['tank', 'vest', 'singlet']], ['cap', ['cap', 'hat', 'beanie']],
  ];
  function garmentsIn(text) {
    const t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9 -]/g, ' ') + ' ';
    return GARMENTS.filter(([, words]) => words.some((w) => t.includes(' ' + w + ' ') || t.includes(' ' + w + 's '))).map(([g]) => g);
  }
  const HAS_UNIT = /(\d\s*(["”″]|in\b|inch|inches|cm\b|mm\b))|(\b(in|inch|inches|cm|mm)\b)/i;

  function checks(pack) {
    const out = [];
    const warn = (text) => out.push({ level: 'warn', text });
    const ok = (text) => out.push({ level: 'ok', text });

    const mm = totalMismatch(pack);
    if (mm) warn('Quantities: ' + mm);
    else if (int(pack.order.totalPieces)) ok(`Total order matches the colours-and-sizes total (${pack.order.totalPieces}).`);
    else warn('Total order is empty. Type it in Order details so the app can check the quantities.');

    const hasMeas = pack.meas.rows.some((r) => Object.values(r.vals || {}).some((v) => String(v).trim()));
    if (hasMeas && !pack.meas.unit) warn('Measurements need a unit. Choose inches or cm in Measurements.');
    else if (hasMeas) ok(`Measurements are in ${pack.meas.unit === 'cm' ? 'centimetres' : 'inches'}.`);
    const noName = pack.meas.rows.filter((r) => Object.values(r.vals || {}).some((v) => String(v).trim()) && !r.name.trim());
    if (noName.length) warn(`Measurement point ${noName.map((r) => r.l).join(', ')} has numbers but no name.`);

    const sizeFields = [
      ['Woven label size', pack.labels.woven.size], ['Hangtag size', pack.labels.hangtag.size], ['Bag size', pack.labels.packaging.bagSize],
      ...pack.trims.map((t) => [`${t.type || 'Trim'} size`, t.size]),
      ...pack.art.map((a) => [`Artwork "${a.title || 'untitled'}" size`, a.size]),
    ].filter(([, v]) => String(v || '').trim());
    const noUnit = sizeFields.filter(([, v]) => /\d/.test(v) && !HAS_UNIT.test(v));
    if (noUnit.length) noUnit.forEach(([k, v]) => warn(`${k} "${v}" has no unit. Add " (inches), cm or mm.`));
    else if (sizeFields.length) ok('Label and trim sizes have units.');

    const garment = (pack.summary.find((r) => r.k.toLowerCase() === 'garment') || {}).v || '';
    const g1 = garmentsIn(garment), g2 = garmentsIn(pack.order.description);
    if (g1.length && g2.length && !g1.some((g) => g2.includes(g))) {
      warn(`Order description mentions ${g2.join(', ')}, but the garment in Summary is ${g1.join(', ')}. Please check.`);
    } else if (g1.length && g2.length) ok('Order description matches the garment type.');

    if (!pack.colourways.some((c) => c.front || c.back)) warn('No front or back picture yet (Colourways).');
    return out;
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

  /* Make older saved packs safe to open, and convert version-1 packs */
  function upgrade(p) {
    const base = newPack();
    // Version 1 had "designs" (front/back pictures). They become colourways.
    if (p.designs && !p.colourways) {
      p.colourways = p.designs.map((d, i) => Object.assign(blankColourway(i + 1), { name: d.name || 'Colour ' + (i + 1), front: d.front || null, back: d.back || null }));
      if (!p.colourways.length) p.colourways = [blankColourway(1)];
    }
    delete p.designs;
    delete p.urdu; // Urdu option was removed
    for (const k of Object.keys(base)) if (p[k] === undefined) p[k] = base[k];
    p.order = Object.assign({}, base.order, p.order);
    p.labels = Object.assign({}, base.labels, p.labels);
    p.meas = Object.assign({}, base.meas, p.meas);
    p.progress = p.progress || {};
    p.notes.forEach((n) => { delete n.urdu; });
    p.version = 2;
    return p;
  }

  function methodLabel(row) {
    if (row.method === 'other') return row.other || 'Other';
    const m = PRINT_METHODS.find(([k]) => k === row.method);
    return m ? m[1] : row.method;
  }

  function title(pack) { return pack.order.project || 'Untitled tech pack'; }

  TP.model = {
    PRINT_METHODS, STAGES, TRIM_TYPES, SUMMARY_KEYS, STAGE_OPTIONS, DEFAULT_SIZES,
    newPack, blankNote, blankColourway, totals, visibleSizes, sizesInUse, totalMismatch, checks,
    stagesDone, isFinished, deadline, duplicate, upgrade, methodLabel, title, num,
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
