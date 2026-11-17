/* =====================================================================
   export.js — turns the tech pack pages into files:
     printPDF(pack, mode)  → SHARP PDF: opens the browser's print window,
                              choose "Save as PDF". Text stays real text.
     pdfFile(pack, mode)   → PDF file made from pictures at 3× resolution
                              (backup method that works everywhere).
     clientJPGs(pack)      → one JPG picture per client page.
   After the Factory PDF is saved, the app goes straight to Costing.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;
  const MAX_CANVAS_AREA = 16000000; // iPhone limit for one picture

  const baseName = (pack) => util.safeName([model.title(pack), pack.order.styleNo].filter(Boolean).join(' '));
  const goCosting = (pack) => { ui.toast('Now fill in the costs for this order.', 'ok'); TP.app.go(`#/pack/${pack.id}/costing`); };

  async function waitImages(pages) {
    const imgs = pages.flatMap((p) => Array.from(p.querySelectorAll('img')));
    await Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? null : (i.decode ? i.decode().catch(() => {}) : null))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  }

  /* ---------------- Sharp PDF through the browser ---------------- */
  async function printPDF(pack, mode) {
    const busy = ui.busy('Preparing the pages…');
    let r;
    try {
      r = await TP.doc.render(pack, mode);
      let root = document.getElementById('print-root');
      if (!root) { root = h('div', { id: 'print-root' }); document.body.appendChild(root); }
      root.innerHTML = '';
      r.pages.forEach((p) => root.appendChild(p));
      await waitImages(r.pages);
      const oldTitle = document.title;
      document.title = `${baseName(pack)} - ${mode === 'client' ? 'Client' : 'Factory'} Tech Pack`; // becomes the PDF file name
      busy.close();
      let after = false;
      const done = () => {
        if (after) return; after = true;
        document.title = oldTitle;
        root.innerHTML = '';
        if (mode === 'factory') goCosting(pack);
      };
      window.addEventListener('afterprint', done, { once: true });
      ui.toast('In the print window choose "Save as PDF" (on iPhone: Share → Save to Files).', 'ok');
      await new Promise((res) => setTimeout(res, 300));
      window.print(); // "afterprint" runs done() when the print window closes
    } catch (e) {
      console.error(e);
      ui.toast('Could not prepare the PDF: ' + e.message, 'error');
    } finally {
      busy.close();
      if (r) r.done();
    }
  }

  /* Picture of one page */
  function snap(page, scale) {
    const area = page.offsetWidth * page.offsetHeight;
    const s = Math.min(scale, Math.sqrt(MAX_CANVAS_AREA / Math.max(1, area)));
    return window.html2canvas(page, { scale: s, backgroundColor: '#ffffff', useCORS: true, logging: false });
  }
  const blobOf = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

  /* Pop-up with Save / Share buttons. afterSave runs once a button is pressed. */
  function readyDialog({ title, blob, files, filename, afterSave, preview }) {
    const list = files || [{ blob, filename }];
    const canShare = util.isPhone() && list.every((f) => util.canShareFiles(f.blob, f.filename));
    const act = async (how) => {
      try {
        if (how === 'share') {
          const fs = list.map((f) => new File([f.blob], f.filename, { type: f.blob.type }));
          try { await navigator.share({ files: fs, title }); } catch (e) { if (e && e.name !== 'AbortError') throw e; }
        } else {
          for (const f of list) { util.download(f.blob, f.filename); await new Promise((r) => setTimeout(r, 400)); }
        }
      } catch (e) { ui.toast('Could not share: ' + e.message, 'error'); return false; }
      if (afterSave) setTimeout(afterSave, 600);
    };
    ui.modal({
      title,
      body: h('div', null,
        preview ? h('div', { class: 'ready-preview checker' }, h('img', { src: preview, alt: '' })) : null,
        h('p', { class: 'lead' }, list.length > 1 ? `${list.length} files are ready:` : 'Your file is ready: ',
          list.length > 1 ? null : h('strong', null, list[0].filename)),
        list.length > 1 ? h('ul', { class: 'file-list' }, list.map((f) => h('li', null, f.filename))) : null,
        canShare ? h('p', { class: 'muted small' }, 'Press "Share" to send on WhatsApp / Instagram, or "Save to Files".') : null),
      actions: [
        canShare ? { label: '📤 Share', cls: 'primary', onClick: () => act('share') } : null,
        { label: list.length > 1 ? '⬇ Save files' : '⬇ Save file', cls: canShare ? 'secondary' : 'primary', onClick: () => act('save') },
      ].filter(Boolean),
    });
  }

  /* ---------------- PDF made from pictures (3×) ---------------- */
  async function pdfFile(pack, mode) {
    const busy = ui.busy('Making PDF…');
    let r;
    try {
      r = await TP.doc.render(pack, mode);
      await waitImages(r.pages);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      for (let i = 0; i < r.pages.length; i++) {
        busy.update(`Making PDF… page ${i + 1} of ${r.pages.length}`);
        const c = await snap(r.pages[i], 3);
        if (i) doc.addPage('a4', 'landscape');
        doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }
      const blob = doc.output('blob');
      const filename = `${baseName(pack)} - ${mode === 'client' ? 'Client' : 'Factory'} Tech Pack.pdf`;
      busy.close();
      readyDialog({ title: 'PDF ready', blob, filename, afterSave: mode === 'factory' ? () => goCosting(pack) : null });
    } catch (e) {
      console.error(e);
      ui.toast('Could not make the PDF: ' + e.message, 'error');
    } finally {
      busy.close();
      if (r) r.done();
    }
  }

  /* ---------------- Client JPGs: one picture per page ---------------- */
  async function clientJPGs(pack) {
    const busy = ui.busy('Making pictures…');
    let r;
    try {
      r = await TP.doc.render(pack, 'client');
      await waitImages(r.pages);
      const files = [];
      for (let i = 0; i < r.pages.length; i++) {
        busy.update(`Making picture ${i + 1} of ${r.pages.length}…`);
        const c = await snap(r.pages[i], 2.2); // about 2450 pixels wide
        const blob = await blobOf(c, 'image/jpeg', 0.92);
        files.push({ blob, filename: `${baseName(pack)} - Client Tech Pack ${i + 1} of ${r.pages.length}.jpg` });
      }
      busy.close();
      readyDialog({ title: 'Pictures ready', files, preview: URL.createObjectURL(files[0].blob) });
    } catch (e) {
      console.error(e);
      ui.toast('Could not make the pictures: ' + e.message, 'error');
    } finally {
      busy.close();
      if (r) r.done();
    }
  }

  TP.export = { printPDF, pdfFile, clientJPGs, readyDialog };
})(window.TP);
