/* =====================================================================
   images.js — everything about pictures:
   - adding pictures (made smaller so the app stays fast)
   - removing the background automatically after upload (free, inside the app) + undo
   - cropping, rotating and choosing the size on the tech pack
   - the picture boxes you see in the forms

   A picture is saved like this:
   { id, original, noBg, useNoBg, crop:{x,y,w,h}|null, rotate, scale, src }
     original = the picture as you uploaded it (never changed)
     noBg     = the same picture with background removed
     src      = the final picture shown in tech packs (rebuilt after every change)
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util } = TP;
  const MAX_SIDE = 1600; // pictures bigger than this are made smaller

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Could not read this picture.'));
      im.src = src;
    });
  }
  function canvas(w, hgt) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hgt)); return c; }
  const isPng = (src) => /^data:image\/(png|webp|gif)/.test(src);

  async function fromFile(file) {
    const data = await util.readFile(file);
    const im = await loadImg(data);
    const k = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
    const c = canvas(im.naturalWidth * k, im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const keepAlpha = /png|webp|gif/.test(file.type);
    const original = keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
    const img = { id: util.uid(), original, noBg: null, useNoBg: false, crop: null, rotate: 0, scale: 100, src: original };
    return img;
  }

  /* Draw the base picture turned by `rot` degrees */
  async function rotated(src, rot) {
    const im = await loadImg(src);
    const w = im.naturalWidth, hh = im.naturalHeight;
    const swap = rot === 90 || rot === 270;
    const c = canvas(swap ? hh : w, swap ? w : hh);
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(im, -w / 2, -hh / 2);
    return c;
  }

  /* Make the final picture (src) from original/noBg + rotate + crop */
  async function rebuild(img) {
    const base = img.useNoBg && img.noBg ? img.noBg : img.original;
    if (!img.rotate && !img.crop) { img.src = base; return img; }
    const rc = await rotated(base, img.rotate || 0);
    const cr = img.crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = cr.x * rc.width, sy = cr.y * rc.height, sw = cr.w * rc.width, sh = cr.h * rc.height;
    const out = canvas(sw, sh);
    out.getContext('2d').drawImage(rc, sx, sy, sw, sh, 0, 0, out.width, out.height);
    img.src = isPng(base) ? out.toDataURL('image/png') : out.toDataURL('image/jpeg', 0.92);
    return img;
  }

  /* Cut away see-through edges so the item fills its box */
  async function trim(src) {
    const im = await loadImg(src);
    const c = canvas(im.naturalWidth, im.naturalHeight);
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return src; // nothing left — keep as is
    const pad = Math.round(Math.max(c.width, c.height) * 0.02);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
    const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  /* ---------------- Background removal ----------------
     1st try: free AI helper (IMG.LY background removal). It runs inside
              your browser; the picture is NOT uploaded anywhere. The first
              time it downloads its "brain" (about 40–80 MB), then it is cached.
     If that fails (no internet etc.): a simple built-in method that works
              well on plain/white backgrounds.                                 */
  let libPromise = null;
  function loadAI() {
    if (!libPromise) {
      libPromise = (async () => {
        const urls = [
          'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
          'https://esm.sh/@imgly/background-removal@1.4.5',
        ];
        let lastErr;
        for (const u of urls) { try { return await import(u); } catch (e) { lastErr = e; } }
        throw lastErr || new Error('AI helper not available');
      })();
      libPromise.catch(() => { libPromise = null; });
    }
    return libPromise;
  }

  async function aiRemove(src, onProgress) {
    const lib = await loadAI();
    const blobIn = await (await fetch(src)).blob();
    const blob = await lib.removeBackground(blobIn, {
      model: util.isPhone() ? 'small' : 'medium',
      proxyToWorker: false,
      output: { format: 'image/png' },
      progress: (key, cur, total) => {
        if (onProgress && total) onProgress(`Downloading AI helper (first time only)… ${Math.round((cur / total) * 100)}%`);
      },
    });
    return await util.readFile(blob);
  }

  /* Simple method: removes the colour that touches the picture edges */
  async function simpleRemove(src) {
    const im = await loadImg(src);
    const c = canvas(im.naturalWidth, im.naturalHeight);
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const W = c.width, H = c.height;
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;
    // Find the most common colour along the edges
    const buckets = new Map();
    const edge = [];
    for (let x = 0; x < W; x++) { edge.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++) { edge.push(y * W, y * W + W - 1); }
    for (const p of edge) {
      const i = p * 4;
      const key = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
      const b = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
      buckets.set(key, b);
    }
    let best = null;
    for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
    const br = best.r / best.n, bg = best.g / best.n, bb = best.b / best.n;
    const dist = (i) => Math.hypot(d[i] - br, d[i + 1] - bg, d[i + 2] - bb);
    const TOL = 52;
    // Flood fill from the edges
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (const p of edge) if (!seen[p] && dist(p * 4) < TOL) { seen[p] = 1; stack.push(p); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p / W) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of nb) if (q >= 0 && !seen[q] && dist(q * 4) < TOL) { seen[q] = 1; stack.push(q); }
    }
    for (let p = 0; p < W * H; p++) {
      if (seen[p]) { d[p * 4 + 3] = 0; continue; }
      // soften pixels that sit next to the removed background
      const x = p % W, y = (p / W) | 0;
      if ((x > 0 && seen[p - 1]) || (x < W - 1 && seen[p + 1]) || (y > 0 && seen[p - W]) || (y < H - 1 && seen[p + W])) {
        const k = Math.min(1, dist(p * 4) / (TOL * 2));
        d[p * 4 + 3] = Math.round(255 * Math.max(0.25, k));
      }
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }

  async function removeBg(img, onProgress) {
    let out, method = 'ai';
    try {
      onProgress && onProgress('Removing background…');
      out = await aiRemove(img.original, onProgress);
    } catch (e) {
      console.warn('AI background removal failed, using simple method', e);
      method = 'simple';
      onProgress && onProgress('Removing background (simple method)…');
      out = await simpleRemove(img.original);
    }
    img.noBg = await trim(out);
    img.useNoBg = true;
    img.crop = null; img.rotate = 0; // crop again after removing background
    await rebuild(img);
    return method;
  }

  /* ---------------- Crop / rotate / size editor ---------------- */
  function editor(img) {
    return new Promise(async (resolve) => {
      const base = img.useNoBg && img.noBg ? img.noBg : img.original;
      let rot = img.rotate || 0;
      let crop = img.crop ? Object.assign({}, img.crop) : { x: 0, y: 0, w: 1, h: 1 };
      let scale = img.scale || 100;
      let rc = await rotated(base, rot);

      const cv = h('canvas', { class: 'crop-canvas' });
      const ctx = cv.getContext('2d');
      let dw = 0, dh = 0; // displayed size
      const HANDLE = 22;

      function layout() {
        const maxW = Math.min(window.innerWidth - 56, 720);
        const maxH = Math.min(window.innerHeight * 0.55, 560);
        const k = Math.min(maxW / rc.width, maxH / rc.height);
        dw = Math.round(rc.width * k); dh = Math.round(rc.height * k);
        const dpr = window.devicePixelRatio || 1;
        cv.width = dw * dpr; cv.height = dh * dpr;
        cv.style.width = dw + 'px'; cv.style.height = dh + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }
      function draw() {
        ctx.clearRect(0, 0, dw, dh);
        ctx.drawImage(rc, 0, 0, dw, dh);
        const x = crop.x * dw, y = crop.y * dh, w = crop.w * dw, hh = crop.h * dh;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, dw, y); ctx.fillRect(0, y + hh, dw, dh - y - hh);
        ctx.fillRect(0, y, x, hh); ctx.fillRect(x + w, y, dw - x - w, hh);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, hh);
        ctx.fillStyle = '#fff';
        for (const [cx, cy] of [[x, y], [x + w, y], [x, y + hh], [x + w, y + hh]]) {
          ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
        }
      }
      let drag = null;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / dw, y: (e.clientY - r.top) / dh }; };
      cv.addEventListener('pointerdown', (e) => {
        const p = pos(e);
        const corners = { nw: [crop.x, crop.y], ne: [crop.x + crop.w, crop.y], sw: [crop.x, crop.y + crop.h], se: [crop.x + crop.w, crop.y + crop.h] };
        let mode = null;
        for (const [k, [cx, cy]] of Object.entries(corners)) {
          if (Math.abs((p.x - cx) * dw) < HANDLE && Math.abs((p.y - cy) * dh) < HANDLE) { mode = k; break; }
        }
        if (!mode && p.x > crop.x && p.x < crop.x + crop.w && p.y > crop.y && p.y < crop.y + crop.h) mode = 'move';
        if (!mode) { mode = 'se'; crop = { x: p.x, y: p.y, w: 0.001, h: 0.001 }; }
        drag = { mode, start: p, orig: Object.assign({}, crop) };
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const p = pos(e), o = drag.orig;
        const clamp = (v) => Math.max(0, Math.min(1, v));
        const MIN = 0.04;
        if (drag.mode === 'move') {
          crop.x = Math.max(0, Math.min(1 - o.w, o.x + p.x - drag.start.x));
          crop.y = Math.max(0, Math.min(1 - o.h, o.y + p.y - drag.start.y));
        } else {
          let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
          if (drag.mode.includes('w')) x0 = clamp(Math.min(p.x, x1 - MIN));
          if (drag.mode.includes('e')) x1 = clamp(Math.max(p.x, x0 + MIN));
          if (drag.mode.includes('n')) y0 = clamp(Math.min(p.y, y1 - MIN));
          if (drag.mode.includes('s')) y1 = clamp(Math.max(p.y, y0 + MIN));
          crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }
        draw();
      });
      const end = () => { drag = null; };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);

      const sizeLabel = h('span', null, scale + '%');
      const slider = h('input', { type: 'range', min: 30, max: 100, step: 5, value: scale, class: 'range',
        onInput: (e) => { scale = +e.target.value; sizeLabel.textContent = scale + '%'; } });

      const body = h('div', { class: 'crop-body' },
        h('p', { class: 'muted small' }, 'Drag the white corners to crop. Drag inside the box to move it.'),
        h('div', { class: 'crop-stage checker' }, cv),
        h('div', { class: 'btn-row' },
          ui.btn('↻ Rotate', async () => { rot = (rot + 90) % 360; rc = await rotated(base, rot); crop = { x: 0, y: 0, w: 1, h: 1 }; layout(); }, 'secondary'),
          ui.btn('Reset crop', () => { crop = { x: 0, y: 0, w: 1, h: 1 }; draw(); }, 'secondary')),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Size on the tech pack: ', sizeLabel), slider));

      let done = false;
      ui.modal({
        title: 'Crop and resize', body, wide: true,
        actions: [
          { label: 'Cancel', cls: 'secondary', onClick: () => { done = true; resolve(false); } },
          { label: 'Apply', cls: 'primary', onClick: async () => {
            done = true;
            const full = crop.x < 0.002 && crop.y < 0.002 && crop.w > 0.996 && crop.h > 0.996;
            img.rotate = rot; img.crop = full ? null : crop; img.scale = scale;
            await rebuild(img);
            resolve(true);
          } },
        ],
        onClose: () => { if (!done) resolve(false); },
      });
      requestAnimationFrame(layout);
    });
  }

  /* ---------------- Picture boxes used in the forms ---------------- */

  function pickFiles(multiple) {
    return new Promise((res) => {
      const inp = h('input', { type: 'file', accept: 'image/*', multiple: multiple || null, style: { display: 'none' } });
      inp.addEventListener('change', () => { res(Array.from(inp.files || [])); inp.remove(); });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  async function addFiles(files) {
    const out = [];
    for (const f of files) {
      try { out.push(await fromFile(f)); } catch (e) { ui.toast(e.message, 'error'); }
    }
    return out;
  }

  /* A picture made from a built-in data address (logos, sample pictures) */
  function fromData(src) {
    return { id: util.uid(), original: src, noBg: null, useNoBg: false, crop: null, rotate: 0, scale: 100, src };
  }

  /* White copy of a logo, for the black header band */
  async function whiteVersion(src) {
    const im = await loadImg(src);
    const c = canvas(im.naturalWidth, im.naturalHeight);
    const ctx = c.getContext('2d');
    ctx.drawImage(im, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      // dark pixels become solid white, light pixels become see-through
      const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      const a = (d[i + 3] / 255) * (1 - lum);
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * Math.min(1, a * 1.4));
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  }

  /* ---------- Automatic background removal after upload ---------- */
  const busy = new Map(); // picture id -> message shown while working
  const autoOn = () => TP.settings.current.autoBg !== false;
  function announce(id) { document.dispatchEvent(new CustomEvent('tp-img', { detail: id })); }

  async function autoRemove(img, onChange) {
    busy.set(img.id, 'Removing background…'); announce(img.id);
    try {
      const method = await removeBg(img, (m) => { busy.set(img.id, m); announce(img.id); });
      if (method === 'simple' && !autoRemove.warned) {
        autoRemove.warned = true; // say it once, not for every picture
        ui.toast('Background removed with the simple method (the AI helper needs internet). Not happy? Tap Undo.', 'warn');
      }
    } catch (e) {
      ui.toast('Could not remove the background: ' + e.message, 'error');
    }
    busy.delete(img.id);
    onChange && onChange();
    announce(img.id);
  }
  function afterUpload(imgs, onChange) { if (autoOn()) imgs.forEach((im) => autoRemove(im, onChange)); }

  /* One picture with its buttons */
  function tile(img, { onChange, onDelete, onReplace, caption, refresh }) {
    const wrap = h('div', { class: 'img-tile' });
    const draw = () => {
      wrap.innerHTML = '';
      const working = busy.get(img.id);
      const chip = working ? null : img.useNoBg
        ? h('div', { class: 'bg-chip' }, '✓ Background removed · ',
          h('button', { type: 'button', onClick: async () => { img.useNoBg = false; img.crop = null; img.rotate = 0; await rebuild(img); onChange(); draw(); } }, 'Undo'))
        : h('button', { type: 'button', class: 'bg-chip off', onClick: () => autoRemove(img, () => { onChange(); }) }, '✨ Remove background');
      TP.add(wrap,
        caption ? h('div', { class: 'img-caption' }, caption) : null,
        h('div', { class: 'img-box checker' }, h('img', { src: img.src, alt: caption || 'picture' }),
          working ? h('div', { class: 'img-over' }, h('span', { class: 'spinner sm' }), h('span', null, working)) : null),
        chip,
        h('div', { class: 'img-actions' },
          ui.btn('✂ Crop / size', async () => { if (await editor(img)) { onChange(); draw(); } }, 'small secondary'),
          onReplace ? ui.btn('Replace', onReplace, 'small secondary') : null,
          ui.btn('Delete', async () => { if (await ui.confirm('Delete this picture?', 'Delete', true)) onDelete(); }, 'small danger-outline')));
    };
    // redraw when background removal for this picture moves on
    const listener = (e) => {
      if (!wrap.isConnected) { document.removeEventListener('tp-img', listener); return; }
      if (e.detail === img.id) (refresh || draw)();
    };
    document.addEventListener('tp-img', listener);
    draw();
    return wrap;
  }

  /* A single picture slot, e.g. "Front" — obj[key] holds the picture */
  function single(obj, key, onChange, addLabel, caption) {
    const box = h('div', { class: 'img-slot' });
    const draw = () => {
      box.innerHTML = '';
      const add = async () => {
        const [img] = await addFiles((await pickFiles(false)).slice(0, 1));
        if (img) { obj[key] = img; onChange(); draw(); afterUpload([img], onChange); }
      };
      if (!obj[key]) {
        TP.add(box, h('button', { type: 'button', class: 'img-add', onClick: add },
          h('span', { class: 'plus' }, '+'), h('span', null, addLabel || 'Add picture')));
      } else {
        TP.add(box, tile(obj[key], {
          caption,
          onChange,
          onDelete: () => { obj[key] = null; onChange(); draw(); },
          onReplace: add,
        }));
      }
    };
    draw();
    return box;
  }

  /* Many pictures (logos, label pictures...) — arr is the list */
  function gallery(arr, onChange, addLabel) {
    const box = h('div', { class: 'img-gallery' });
    const draw = () => {
      box.innerHTML = '';
      arr.forEach((img, i) => TP.add(box, tile(img, {
        onChange,
        onDelete: () => { arr.splice(i, 1); onChange(); draw(); },
      })));
      TP.add(box, h('button', { type: 'button', class: 'img-add', onClick: async () => {
        const imgs = await addFiles(await pickFiles(true));
        if (imgs.length) { arr.push(...imgs); onChange(); draw(); afterUpload(imgs, onChange); }
      } }, h('span', { class: 'plus' }, '+'), h('span', null, addLabel || 'Add pictures')));
    };
    draw();
    return box;
  }

  TP.images = { fromFile, fromData, whiteVersion, rebuild, removeBg, simpleRemove, editor, tile, single, gallery, loadImg, isBusy: (id) => busy.has(id) };
})(window.TP);
