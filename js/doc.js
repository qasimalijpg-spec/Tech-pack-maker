/* =====================================================================
   doc.js — builds the tech pack pages (A4 landscape) from a tech pack.

     TP.doc.render(pack, 'factory' | 'client')  →  { pages, done() }

   Factory Version: 4 pages
     1 Overview & Colourways   2 Artwork & Points of Interest
     3 Materials, Trims & Hardware   4 Measurements & Production
   Client Version: pages 1, 2 and 4, WITHOUT costs, fabric stores,
     suppliers, pattern codes and the progress tracker (they are simply
     never added to the client pages).

   How it works: every page is made of columns, every column of
   "blocks" (sections). Blocks are added one by one; when a column is
   full, the rest moves to an extra page with the same header and
   footer ("continued"). Long lists (notes, trims, table rows) are split
   between pages. Empty sections are left out and the numbers close up.
   ===================================================================== */
'use strict';
(function (TP) {
  const { util, model } = TP;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const two = (n) => String(n).padStart(2, '0');
  const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const anyOf = (o, keys) => keys.some((k) => has(o[k]));
  const join = (arr, sep = ' · ') => arr.filter(has).map(esc).join(sep);
  const fmt = (iso) => (iso ? util.fmtDate(iso) : '');

  function H(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /* A picture (image object) as <img>, respecting its "size on the tech pack" setting */
  function pic(im, empty) {
    if (!im || !im.src) return empty === undefined ? '' : `<span class="tp-empty">${esc(empty)}</span>`;
    const k = im.scale && im.scale < 100 ? ` style="max-width:${im.scale}%;max-height:${im.scale}%"` : '';
    return `<img src="${im.src}" alt=""${k}>`;
  }

  const sec = (n, h, cont) => `<div class="tp-sec"><span class="n">${two(n)}</span><span class="h">${h}${cont ? '<small>continued</small>' : ''}</span><span class="rule"></span></div>`;

  /* ---------------- page frame: header band, info strip, footer ---------------- */
  function logos(s) {
    return { white: s.companyLogoWhite || TP.ASSETS.logoWhite, black: (s.companyLogo && s.companyLogo.src) || TP.ASSETS.logoBlack };
  }

  function frame(ctx, title, cols) {
    const { pack, s } = ctx, o = pack.order;
    const sub = [o.styleNo && 'Style ' + o.styleNo, o.client].filter(has).join(' · ');
    const sizes = model.sizesInUse(pack);
    return H(`<section class="tp-page">
      <header class="tp-hd"><img class="logo" src="${logos(s).white}" alt=""><div class="sep"></div>
        <div class="doc"><span class="tp-k">Technical Package</span><span class="t">${title}</span></div>
        <div class="right"><span class="tp-k">${esc(sub)}</span><span class="t">${esc(o.project || 'Untitled style')}</span></div></header>
      <div class="tp-strip">
        <div><div class="tp-lab">Client</div><div class="tp-val">${esc(o.client || '—')}</div></div>
        <div><div class="tp-lab">Designer</div><div class="tp-val">${esc(o.designer || '—')}</div></div>
        <div><div class="tp-lab">Style No.</div><div class="tp-val">${esc(o.styleNo || '—')}</div></div>
        <div class="w"><div class="tp-lab">Style Name</div><div class="tp-val">${esc(o.project || '—')}</div></div>
        <div><div class="tp-lab">Date</div><div class="tp-val">${esc(fmt(o.startDate) || '—')}</div></div>
        <div><div class="tp-lab">Stage</div><div class="tp-val">${esc(o.stage || '—')}</div></div>
        <div class="w"><div class="tp-lab">Main Fabric</div><div class="tp-val">${esc(o.mainFabric || '—')}</div></div>
        <div><div class="tp-lab">Size Range · Sample</div><div class="tp-sizes${sizes.length > 7 ? ' many' : ''}">${sizes.map((z) => `<span class="${z === o.sampleSize ? 'on' : ''}">${esc(z)}</span>`).join('')}</div></div>
      </div>
      <main class="tp-bd">${cols.map((c) => `<div class="tp-col" style="${c.style}"></div>`).join('')}</main>
      <footer class="tp-ft"><img class="flogo" src="${logos(s).black}" alt=""><span class="dot"></span><span>${esc(s.handle || '@blaze_impex')}</span><span class="dot"></span>
        <span>${ctx.mode === 'client' ? 'Client copy' : 'Factory copy · Confidential'}</span><span class="pg"></span></footer>
    </section>`);
  }

  /* ================= SECTIONS (blocks) =================
     A block is { title, render(items, cont, n, isLast) } and optionally
     items:[...] (then it can be split across pages), fill:true (stretches),
     or titles:[...] (a row holding several numbered sections). */

  // ---- Page 1 ----
  function colourwaysBlock(ctx) {
    const list = ctx.pack.colourways.filter((c) => has(c.name) || c.front || c.back || c.side);
    if (!list.length) return null;
    return {
      fill: true, items: list,
      render: (items) => `<div class="tp-cw">${items.map((c) => {
        const i = ctx.pack.colourways.indexOf(c);
        const fig = (im, cap, cls) => (im ? `<figure class="${cls || ''}"><div class="imgbox">${pic(im)}</div><figcaption>${cap}</figcaption></figure>` : '');
        const figs = fig(c.front, 'Front') + fig(c.back, 'Back') + fig(c.side, 'Side', 'side');
        return `<div class="tp-cwrow"><div class="tp-cwmeta"><div class="no">${two(i + 1)}</div><div class="nm">${esc(c.name || '—')}</div>
          <div class="sw"><span class="chip" style="background:${esc(c.hex)}"></span>${esc(c.note)}</div>
          ${has(c.tag) ? `<span class="tag">${esc(c.tag)}</span>` : ''}</div>
          <div class="tp-flats">${figs || '<span class="tp-empty">Add front and back pictures</span>'}</div></div>`;
      }).join('')}</div>`,
    };
  }

  function kvBlock(title, rows) {
    if (!rows.length) return null;
    return { title, items: rows, render: (items, cont, n) => `<div>${sec(n, title, cont)}<div class="tp-kv">${items.map(([k, v]) => `<div class="k">${esc(k)}</div><div class="v">${v}</div>`).join('')}</div></div>` };
  }
  function summaryBlock(ctx) {
    return kvBlock('Summary', ctx.pack.summary.filter((r) => has(r.v)).map((r) => [r.k, esc(r.v)]));
  }
  function orderBlock(ctx) {
    const o = ctx.pack.order;
    const rows = [];
    if (has(o.totalPieces)) rows.push(['Total order', `<b>${esc(o.totalPieces)}</b> ${esc(o.unit)}`]);
    if (has(o.startDate)) rows.push(['Start date', esc(fmt(o.startDate))]);
    if (has(o.endDate)) rows.push(['End date', `<b>${esc(fmt(o.endDate))}</b>`]);
    if (has(o.manufacturer)) rows.push(['Manufacturer', esc(o.manufacturer)]);
    if (has(o.description)) rows.push(['Description', esc(o.description)]);
    return kvBlock('Order', rows);
  }
  function revisionsBlock(ctx) {
    const revs = ctx.pack.revisions;
    if (!revs.some((r) => has(r.text) || has(r.date))) return null;
    return {
      title: 'Revisions', items: revs,
      render: (items, cont, n) => `<div>${sec(n, 'Revisions', cont)}<table class="tp-tbl"><tr><th style="width:12mm">Rev</th><th style="width:22mm">Date</th><th>Summary</th></tr>
        ${items.map((r) => { const m = has(r.text) ? '' : ' class="m"'; return `<tr><td${m}>${esc(r.rev || '—')}</td><td${m}>${esc(r.date || '—')}</td><td${m}>${esc(r.text || '—')}</td></tr>`; }).join('')}</table></div>`,
    };
  }

  // ---- Page 2 ----
  const PER_VIEW = 6; // callouts listed under each drawing; the rest continue below
  function poiBlock(ctx) {
    const c = ctx.pack.colourways[0] || {};
    const poi = ctx.pack.poi;
    if (!c.front && !c.back && !poi.some((p) => has(p.title))) return null;
    const view = (which) => {
      const src = which === 'front' ? c.front : c.back;
      const items = poi.map((p, i) => Object.assign({ i }, p)).filter((p) => p.view === which);
      const nums = items.map((p) => p.i + 1);
      const range = nums.length ? two(Math.min(...nums)) + (nums.length > 1 ? ' — ' + two(Math.max(...nums)) : '') : '';
      return `<div class="tp-view"><div class="vl"><span class="tp-cap">${which === 'front' ? 'Front' : 'Back'}</span><span class="tp-cap">${range}</span></div>
        <div class="tp-stage"><div class="wrapimg">${src ? pic(src) : `<span class="tp-empty">Add a ${which} picture</span>`}
        ${src ? items.filter((p) => p.x !== null && p.x !== undefined).map((p) => `<span class="tp-pin" style="left:${p.x}%;top:${p.y}%">${p.i + 1}</span>`).join('') : ''}</div></div>
        <div class="tp-cos">${items.slice(0, PER_VIEW).map(callout).join('')}</div></div>`;
    };
    return { title: 'Points of Interest', fill: true, render: (_, cont, n) => `<div class="tp-fill">${sec(n, 'Points of Interest')}<div class="tp-views" style="margin-top:-2mm">${view('front')}${view('back')}</div></div>` };
  }
  const callout = (p) => `<div class="tp-co"><span class="b">${p.i + 1}</span><div><div class="t">${esc(p.title || '—')}</div>${has(p.desc) ? `<div class="s">${esc(p.desc)}</div>` : ''}</div></div>`;
  function poiMoreBlock(ctx) {
    const extra = [];
    for (const v of ['front', 'back']) {
      ctx.pack.poi.map((p, i) => Object.assign({ i }, p)).filter((p) => p.view === v).slice(PER_VIEW).forEach((p) => extra.push(p));
    }
    if (!extra.length) return null;
    return { title: 'More Points of Interest', items: extra, render: (items, cont, n) => `<div>${sec(n, 'More Points of Interest', cont)}<div class="tp-cos grid">${items.map(callout).join('')}</div></div>` };
  }
  function artBlock(ctx) {
    const list = ctx.pack.art.filter((a) => a.img || anyOf(a, ['title', 'technique', 'colour', 'size', 'placement']));
    if (!list.length) return null;
    return {
      title: 'Artwork Details', items: list,
      render: (items, cont, n) => `<div>${sec(n, 'Artwork Details', cont)}<div class="tp-art">${items.map((a) => {
        const i = ctx.pack.art.indexOf(a);
        return `<div class="tp-ac"><div class="pv">${pic(a.img, 'Artwork image')}</div><div class="meta"><div class="t">${two(i + 1)} · ${esc(a.title || '—')}</div>
          <div class="s">${join([a.technique, a.colour, a.size])}</div>${has(a.placement) ? `<div class="s">Placement: ${esc(a.placement)}</div>` : ''}</div></div>`;
      }).join('')}</div></div>`,
    };
  }
  function logosBlock(ctx) {
    const list = ctx.pack.logos.filter((l) => l && l.src);
    if (!list.length) return null;
    return { title: 'Logo', render: (_, cont, n) => `<div>${sec(n, 'Logo')}<div class="tp-logos">${list.map((l) => `<span class="lg">${pic(l)}</span>`).join('')}</div></div>` };
  }
  function tableBlock(title, head, rows, widths) {
    if (!rows.length) return null;
    return {
      title, items: rows,
      render: (items, cont, n) => `<div>${sec(n, title, cont)}<table class="tp-tbl"><tr>${head.map((x, i) => `<th${widths && widths[i] ? ` style="width:${widths[i]}"` : ''}>${x}</th>`).join('')}</tr>
        ${items.map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="b"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</table></div>`,
    };
  }
  function printingBlock(ctx) {
    return tableBlock('Printing', ['Part', 'Print type'], ctx.pack.printing.filter((p) => has(p.part) || p.method !== 'other' || has(p.other))
      .map((p) => [esc(p.part || '—'), esc(model.methodLabel(p))]), ['40%']);
  }

  // ---- Page 3 (factory only) ----
  function fabricBlock(ctx) {
    return tableBlock('Fabric', ['Part', 'Fabric type', 'GSM', 'Fabric store'],
      ctx.pack.fabrics.filter((f) => anyOf(f, ['part', 'type', 'gsm', 'store'])).map((f) => [esc(f.part || '—'), esc(f.type), esc(f.gsm), esc(f.store)]), ['24%', '', '12%', '26%']);
  }
  function patternBlock(ctx) {
    return tableBlock('Pattern', ['Part', 'Pattern name', 'Pattern code'],
      ctx.pack.patterns.filter((p) => anyOf(p, ['part', 'name', 'code'])).map((p) => [esc(p.part || '—'), esc(p.name), esc(p.code)]), ['24%', '', '24%']);
  }
  function bomBlock(ctx) {
    const rows = ctx.pack.bom.filter((r) => anyOf(r, ['item', 'desc', 'colour', 'place'])).map((r) => [esc(r.item), esc(r.desc), esc(r.colour), esc(r.place)]);
    // Trims & hardware are added to the bill of materials automatically
    ctx.pack.trims.filter((t) => anyOf(t, ['description', 'size', 'colour', 'placement'])).forEach((t) =>
      rows.push([esc(t.type || 'Trim'), join([t.description, t.size], ', ') + (has(t.qty) ? ` <span style="color:#7a7873">× ${esc(t.qty)}</span>` : ''), esc(t.colour), esc(t.placement)]));
    return tableBlock('Bill of Materials', ['Item', 'Description', 'Colour', 'Placement'], rows, ['20%', '', '18%', '24%']);
  }
  function trimsBlock(ctx) {
    const list = ctx.pack.trims.filter((t) => t.photo || anyOf(t, ['description', 'size', 'colour', 'placement', 'qty', 'supplier']));
    if (!list.length) return null;
    const line = (k, v) => (has(v) ? `<div class="ln"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>` : '');
    return {
      title: 'Trims & Hardware', items: list,
      render: (items, cont, n) => `<div>${sec(n, 'Trims & Hardware', cont)}<div class="tp-trims">${items.map((t) => `<div class="tp-trim">
        <div class="ph">${pic(t.photo, 'No photo')}</div>
        <div class="dt"><div class="ty">${esc(t.type || 'Trim')}</div><div class="ds">${esc(t.description || '—')}</div>
          ${line('Size', t.size)}${line('Colour', t.colour)}${line('Placement', t.placement)}${line('Qty / pc', t.qty)}${ctx.mode === 'factory' ? line('Supplier', t.supplier) : ''}</div></div>`).join('')}</div></div>`,
    };
  }

  // ---- Page 4 ----
  function howBlock(ctx) {
    const m = ctx.pack.meas;
    const pins = m.rows.filter((r) => r.x !== null && r.x !== undefined && has(r.l));
    if (!m.diagram) return null;
    const unit = m.unit === 'cm' ? 'centimetres' : 'inches';
    return {
      title: 'How to Measure', fill: true,
      render: (_, cont, n) => `<div class="tp-fill">${sec(n, 'How to Measure')}<div class="tp-meas" style="margin-top:-2mm"><div class="stg"><div class="wrapimg">${pic(m.diagram)}
        ${pins.map((r) => `<span class="tp-lpin" style="left:${r.x}%;top:${r.y}%">${esc(r.l)}</span>`).join('')}</div></div>
        <div class="tp-note" style="text-align:center">All measurements in ${unit}, garment laid flat.</div></div></div>`,
    };
  }
  function progressBlock(ctx) {
    if (ctx.mode !== 'factory') return null;
    const p = ctx.pack.progress || {};
    return { title: 'Production Progress', render: (_, cont, n) => `<div>${sec(n, 'Progress')}<div class="tp-prog">${model.STAGES.map(([k, l]) => `<span class="${p[k] ? 'on' : ''}"><i>${p[k] ? '✓' : ''}</i>${esc(l)}</span>`).join('')}</div></div>` };
  }
  function specBlock(ctx) {
    const m = ctx.pack.meas, z = model.sizesInUse(ctx.pack), sm = ctx.pack.order.sampleSize;
    const rows = m.rows.filter((r) => has(r.name) || Object.values(r.vals || {}).some(has));
    if (!rows.length) return null;
    const unit = m.unit === 'cm' ? 'cm' : 'in';
    return {
      title: 'Measurement Specification', items: rows,
      render: (items, cont, n, last) => `<div>${sec(n, 'Measurement Specification', cont)}
        <table class="tp-spec"><tr><th></th><th class="l">Point of measure (${unit})</th>${z.map((x) => `<th class="${x === sm ? 'hl' : ''}">${esc(x)}${x === sm ? ' · Sample' : ''}</th>`).join('')}<th>Tol ±</th></tr>
        ${items.map((r) => `<tr><td class="poi"><span>${esc(r.l)}</span></td><td class="nm">${esc(r.name)}${has(r.how) ? `<small>${esc(r.how)}</small>` : ''}</td>
          ${z.map((x) => { const v = (r.vals || {})[x]; return `<td class="${x === sm ? 'hl' : ''}${has(v) ? '' : ' na'}">${has(v) ? esc(v) : '—'}</td>`; }).join('')}<td class="tol">${esc(m.tol)}</td></tr>`).join('')}</table>
        ${last && has(m.note) ? `<div class="tp-note">${esc(m.note)}</div>` : ''}</div>`,
    };
  }
  function finishRowBlock(ctx) {
    const p = ctx.pack, L = p.labels;
    const swatches = p.swatches.filter((c) => has(c.name) || has(c.note));
    const parts = [];
    if (swatches.length) {
      parts.push({ t: 'Colours', html: swatches.map((c) => `<div class="tp-sw"><span class="c" style="background:${esc(c.hex)}"></span><div><div class="t">${esc(c.name)}</div><div class="s">${esc(c.note)}</div></div></div>`).join('') });
    }
    const lab = [];
    const wovenImg = L.woven.images[0];
    if (wovenImg || has(L.woven.notes) || has(L.woven.size)) {
      lab.push(`<div class="tp-tag">${wovenImg ? pic(wovenImg) : `<span class="w1">${esc(p.order.client || 'Brand')}</span><span class="sz">${esc(p.order.sampleSize || '')}</span>`}</div>`);
      lab.push(`<div class="tp-mini"><b>Woven label</b>${has(L.woven.notes) ? ', ' + esc(L.woven.notes) : ''}${has(L.woven.size) ? ` (${esc(L.woven.size)})` : ''}</div>`);
    }
    if (has(L.hangtag.notes) || has(L.hangtag.size) || L.hangtag.images.length) {
      lab.push(`<div class="tp-mini"><b>Hangtag / card</b>${has(L.hangtag.notes) ? ', ' + esc(L.hangtag.notes) : ''}${has(L.hangtag.size) ? ` (${esc(L.hangtag.size)})` : ''}</div>`);
    }
    if (anyOf(L.packaging, ['type', 'logoColor', 'bagSize']) || L.packaging.images.length) {
      lab.push(`<div class="tp-mini"><b>Packaging</b>${has(L.packaging.type) ? ', ' + esc(L.packaging.type) : ''}${has(L.packaging.logoColor) ? `, logo ${esc(L.packaging.logoColor)}` : ''}${has(L.packaging.bagSize) ? ` (${esc(L.packaging.bagSize)})` : ''}</div>`);
    }
    const thumbs = [...L.woven.images.slice(1), ...L.hangtag.images, ...L.packaging.images].slice(0, 6);
    if (thumbs.length) lab.push(`<div class="tp-thumbs">${thumbs.map((im) => `<span>${pic(im)}</span>`).join('')}</div>`);
    if (lab.length) parts.push({ t: 'Labels & Packaging', html: lab.join('') });
    if (has(p.wash)) parts.push({ t: 'Wash & Finish', html: `<div class="tp-mini">${esc(p.wash)}</div>`, w: true });
    if (!parts.length) return null;
    return {
      titles: parts.map((x) => x.t),
      render: (_, cont, nums) => `<div class="tp-g3">${parts.map((x, i) => `<div class="${x.w ? 'w' : ''}">${sec(nums[i], x.t)}${x.html}</div>`).join('')}</div>`,
    };
  }
  function qtyBlock(ctx) {
    const p = ctx.pack, sizes = model.visibleSizes(p), t = model.totals(p);
    const rows = p.colors.filter((c) => t.perColor[c.id] > 0);
    if (!rows.length || !sizes.length) return null;
    const mm = model.totalMismatch(p);
    return {
      title: 'Colours & Sizes', items: rows,
      render: (items, cont, n, last) => `<div>${sec(n, 'Quantities', cont)}
        <table class="tp-spec"><tr><th class="l">Colour</th>${sizes.map((s) => `<th>${esc(s)}</th>`).join('')}<th>Total</th></tr>
        ${items.map((c) => `<tr><td class="sw"><i style="background:${esc(c.hex)}"></i>${esc(c.name || '—')}</td>${sizes.map((s) => { const q = util.int(c.qty[s]); return `<td class="${q ? '' : 'na'}">${q || '—'}</td>`; }).join('')}<td style="font-weight:800">${t.perColor[c.id]}</td></tr>`).join('')}
        ${last ? `<tr class="tot"><td class="sw">Grand total</td>${sizes.map((s) => `<td>${t.perSize[s]}</td>`).join('')}<td class="gt">${t.grand}</td></tr>` : ''}</table>
        ${last && mm && ctx.mode === 'factory' ? `<div class="tp-note warn">⚠ ${esc(mm)}</div>` : ''}</div>`,
    };
  }
  function notesBlock(ctx) {
    const list = ctx.pack.notes.filter((x) => has(x.text) && (ctx.mode === 'factory' || x.showClient));
    if (!list.length) return null;
    const title = ctx.mode === 'factory' ? 'Factory Notes' : 'Notes';
    return {
      title, items: list,
      render: (items, cont, n) => `<div>${sec(n, title, cont)}<div class="tp-notes">${items.map((x) => `<div><i>${two(list.indexOf(x) + 1)}</i><span>${esc(x.text)}</span></div>`).join('')}</div></div>`,
    };
  }
  const signBlock = () => ({ render: () => '<div class="tp-sign"><div>Prepared by</div><div>Client approval</div><div>Factory sign-off</div></div>' });

  /* ---------------- the pages of each version ---------------- */
  function defs(ctx) {
    const f = ctx.mode === 'factory';
    const narrowQty = model.visibleSizes(ctx.pack).length <= 5;
    const out = [
      { title: 'Overview &amp; Colourways', cols: [
        { style: 'flex:1', blocks: [colourwaysBlock(ctx)] },
        { style: 'width:78mm;flex:none', blocks: [summaryBlock(ctx), orderBlock(ctx), revisionsBlock(ctx)] }] },
      { title: 'Artwork &amp; Points of Interest', cols: [
        { style: 'flex:1.18', blocks: [poiBlock(ctx), poiMoreBlock(ctx)] },
        { style: 'flex:1', blocks: [artBlock(ctx), logosBlock(ctx), printingBlock(ctx)] }] },
    ];
    if (f) out.push({ title: 'Materials, Trims &amp; Hardware', cols: [
      { style: 'flex:1', blocks: [fabricBlock(ctx), patternBlock(ctx), bomBlock(ctx)] },
      { style: 'flex:1.25', blocks: [trimsBlock(ctx)] }] });
    out.push({ title: 'Measurements &amp; Production', cols: [
      // the quantity grid sits under the drawing when there are only a few sizes, else full width
      { style: 'width:86mm;flex:none', blocks: [howBlock(ctx), narrowQty ? qtyBlock(ctx) : null, progressBlock(ctx)] },
      { style: 'flex:1;gap:4mm', blocks: [specBlock(ctx), finishRowBlock(ctx), narrowQty ? null : qtyBlock(ctx), notesBlock(ctx), signBlock()] }] });
    if (!f) out[out.length - 1].title = 'Measurements &amp; Details';
    return out;
  }

  /* ---------------- pagination ---------------- */
  const overflows = (col) => col.scrollHeight > col.clientHeight + 1;

  function fillColumn(col, queue) {
    while (queue.length) {
      const it = queue[0], b = it.b;
      const empty = !col.children.length;
      if (!b.items) {
        const el = H(b.render(null, false, b.nums || b.n, true));
        col.appendChild(el);
        if (overflows(col) && !empty) { el.remove(); return; }
        queue.shift();
        continue;
      }
      const rest = b.items.length - it.start, cont = it.start > 0;
      const make = (k) => H(b.render(b.items.slice(it.start, it.start + k), cont, b.n, it.start + k >= b.items.length));
      const tryK = (k) => { const el = make(k); col.appendChild(el); const ok = !overflows(col); el.remove(); return ok; };
      if (tryK(rest)) { col.appendChild(make(rest)); queue.shift(); continue; }
      let lo = 0, hi = rest - 1;
      while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (tryK(mid)) lo = mid; else hi = mid - 1; }
      if (lo === 0) { if (!empty) return; lo = 1; } // a single item that is too big still goes on its own page
      col.appendChild(make(lo));
      it.start += lo;
      return; // this column is full
    }
  }

  /* Drawings with pins (points of interest, how to measure) are sized to fill
     their box exactly, keeping their shape, so the pins stay in the right place. */
  async function fitDrawings(pages) {
    const imgs = pages.flatMap((p) => Array.from(p.querySelectorAll('.tp-stage img, .tp-meas .stg img')));
    await Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
    for (const im of imgs) {
      const box = im.closest('.tp-stage, .stg');
      if (!box || !im.naturalWidth) continue;
      const W = box.clientWidth, Hh = box.clientHeight;
      const want = parseFloat(im.style.maxWidth) || 100; // "size on the tech pack" setting
      const k = Math.min(W / im.naturalWidth, Hh / im.naturalHeight) * (want / 100);
      im.classList.add('fit');
      im.style.width = Math.floor(im.naturalWidth * k) + 'px';
      im.style.height = Math.floor(im.naturalHeight * k) + 'px';
    }
  }

  async function render(pack, mode) {
    const ctx = { pack, mode: mode === 'client' ? 'client' : 'factory', s: TP.settings.current };
    if (document.fonts && document.fonts.load) {
      await Promise.all([document.fonts.load('600 10px Inter'), document.fonts.load('700 10px "Inter Tight"')]).catch(() => {});
    }
    const stage = document.createElement('div');
    stage.className = 'tp-measure';
    document.body.appendChild(stage);
    const pages = [];
    let n = 0;
    for (const def of defs(ctx)) {
      const cols = def.cols.map((c) => ({ style: c.style, blocks: c.blocks.filter(Boolean) }));
      // a page holding only the sign-off lines is not worth printing
      const real = cols.some((c) => c.blocks.some((b) => b.title || b.titles || b.fill || b.items));
      if (!real) continue;
      for (const c of cols) for (const b of c.blocks) {
        if (b.titles) b.nums = b.titles.map(() => ++n);
        else if (b.title) b.n = ++n;
      }
      const queues = cols.map((c) => c.blocks.map((b) => ({ b, start: 0 })));
      let first = true, guard = 0;
      while (queues.some((q) => q.length) && guard++ < 40) {
        const page = frame(ctx, def.title + (first ? '' : ' <span style="color:#9a978f;font-weight:500">· continued</span>'), cols);
        stage.appendChild(page);
        const colEls = page.querySelectorAll('.tp-col');
        queues.forEach((q, i) => fillColumn(colEls[i], q));
        pages.push(page);
        first = false;
      }
    }
    pages.forEach((p, i) => { p.querySelector('.pg').textContent = `${two(i + 1)} / ${two(pages.length)}`; });
    await fitDrawings(pages);
    return { pages, done: () => stage.remove() };
  }

  TP.doc = { render };
})(window.TP);
