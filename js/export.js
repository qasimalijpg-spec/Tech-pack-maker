/* =====================================================================
   export.js — turns the finished sheets into files:
     factoryPDF(pack)  → A4 PDF, then opens the Costing page
     clientJPG(pack)   → 1080-pixel-wide JPG for Instagram / WhatsApp
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;
  const MAX_CANVAS_AREA = 16000000; // iPhone limit for one picture

  /* Put the sheet off-screen at full size, wait for pictures and fonts */
  async function stage(sheet) {
    const box = h('div', { class: 'export-stage' }, sheet);
    document.body.appendChild(box);
    const imgs = Array.from(sheet.querySelectorAll('img'));
    await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 60));
    return box;
  }

  function snap(el, scale) {
    const area = el.offsetWidth * el.offsetHeight;
    const s = Math.min(scale, Math.sqrt(MAX_CANVAS_AREA / Math.max(1, area)));
    return window.html2canvas(el, { scale: s, backgroundColor: '#ffffff', useCORS: true, logging: false });
  }

  const blobOf = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

  /* Pop-up with Save / Share buttons. afterSave runs once a button is pressed. */
  function readyDialog({ title, blob, filename, afterSave, preview }) {
    const canShare = util.isPhone() && util.canShareFiles(blob, filename);
    const act = async (how) => {
      try {
        if (how === 'share') { await util.share(blob, filename, title); }
        else util.download(blob, filename);
      } catch (e) { ui.toast('Could not share: ' + e.message, 'error'); return false; }
      if (afterSave) setTimeout(afterSave, 600);
    };
    ui.modal({
      title,
      body: h('div', null,
        preview ? h('div', { class: 'ready-preview checker' }, h('img', { src: preview, alt: '' })) : null,
        h('p', { class: 'lead' }, 'Your file is ready: ', h('strong', null, filename)),
        canShare ? h('p', { class: 'muted small' }, 'Press "Share" to send it on WhatsApp / Instagram or "Save to Files".') : null),
      actions: [
        canShare ? { label: '📤 Share', cls: 'primary', onClick: () => act('share') } : null,
        { label: '⬇ Save file', cls: canShare ? 'secondary' : 'primary', onClick: () => act('save') },
      ].filter(Boolean),
    });
  }

  /* ---------------- Factory PDF ---------------- */
  async function factoryPDF(pack) {
    const busy = ui.busy('Making PDF…');
    let box;
    try {
      const miss = TP.urdu.missing(pack);
      if (miss.length) { busy.update('Translating to Urdu…'); await TP.urdu.fillMissing(pack, miss); await TP.packs.save(pack); }
      busy.update('Making PDF…');
      const sheet = TP.sheets.factorySheet(pack);
      box = await stage(sheet);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const PW = 210, PH = 297, M = 10, CW = PW - 2 * M, BOTTOM = PH - 12;
      let y = M;
      const blocks = Array.from(sheet.querySelectorAll('.tp-block'));
      for (let i = 0; i < blocks.length; i++) {
        busy.update(`Making PDF… ${Math.round(((i + 1) / blocks.length) * 100)}%`);
        const c = await snap(blocks[i], 2);
        const mmPerPx = CW / c.width;
        const hmm = c.height * mmPerPx;
        if (hmm <= BOTTOM - M) {
          if (y + hmm > BOTTOM) { doc.addPage(); y = M; }
          doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', M, y, CW, hmm);
          y += hmm + 2;
        } else {
          // very tall block: cut it into page-sized slices
          if (y > M) { doc.addPage(); y = M; }
          const slicePx = Math.floor((BOTTOM - M) / mmPerPx);
          for (let top = 0; top < c.height; top += slicePx) {
            const hpx = Math.min(slicePx, c.height - top);
            const part = document.createElement('canvas');
            part.width = c.width; part.height = hpx;
            part.getContext('2d').drawImage(c, 0, top, c.width, hpx, 0, 0, c.width, hpx);
            if (top > 0) { doc.addPage(); y = M; }
            doc.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', M, y, CW, hpx * mmPerPx);
            y += hpx * mmPerPx + 2;
          }
        }
      }
      // page numbers
      const n = doc.getNumberOfPages();
      for (let p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setTextColor(140);
        doc.text(`${model.title(pack)} · Factory tech pack · Page ${p} of ${n}`, PW / 2, PH - 6, { align: 'center' });
      }
      const blob = doc.output('blob');
      const filename = `${util.safeName(model.title(pack))} - Factory Tech Pack.pdf`;
      busy.close(); box.remove(); box = null;
      readyDialog({
        title: 'PDF ready', blob, filename,
        afterSave: () => { ui.toast('Now fill in the costs for this order.', 'ok'); TP.app.go(`#/pack/${pack.id}/costing`); },
      });
    } catch (e) {
      console.error(e);
      ui.toast('Could not make the PDF: ' + e.message, 'error');
    } finally {
      busy.close();
      if (box) box.remove();
    }
  }

  /* ---------------- Client JPG ---------------- */
  async function clientJPG(pack) {
    const busy = ui.busy('Making picture…');
    let box;
    try {
      const sheet = TP.sheets.clientSheet(pack);
      box = await stage(sheet);
      const c = await snap(sheet, 1080 / sheet.offsetWidth); // 1080 pixels wide
      const blob = await blobOf(c, 'image/jpeg', 0.92);
      const filename = `${util.safeName(model.title(pack))} - Tech Pack.jpg`;
      busy.close(); box.remove(); box = null;
      readyDialog({ title: 'Picture ready', blob, filename, preview: URL.createObjectURL(blob) });
    } catch (e) {
      console.error(e);
      ui.toast('Could not make the picture: ' + e.message, 'error');
    } finally {
      busy.close();
      if (box) box.remove();
    }
  }

  TP.export = { factoryPDF, clientJPG, readyDialog };
})(window.TP);
