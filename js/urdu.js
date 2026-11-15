/* =====================================================================
   urdu.js — Urdu option for the Factory Version.
   - LABELS: fixed Urdu words for headings (you can improve them here)
   - GLOSSARY: common garment words, used when there is no internet
   - translate(): free online translation, then you can check/edit it
   Your English text is never changed. Translations are kept in
   pack.urdu.tr  as  { "english text": "اردو متن" }.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui } = TP;

  const LABELS = {
    'Order details': 'آرڈر کی تفصیل',
    'Project name': 'پروجیکٹ کا نام',
    'Client / brand': 'کلائنٹ / برانڈ',
    'Manufacturer': 'بنانے والا',
    'Order description': 'آرڈر کی وضاحت',
    'Total order': 'کل آرڈر',
    'Start date': 'شروع کی تاریخ',
    'End date': 'آخری تاریخ',
    'Fabric': 'کپڑا',
    'Part': 'حصہ',
    'Fabric type': 'کپڑے کی قسم',
    'GSM': 'جی ایس ایم',
    'Fabric store': 'کپڑے کی دکان',
    'Pattern': 'پیٹرن',
    'Pattern name': 'پیٹرن کا نام',
    'Pattern code': 'پیٹرن کوڈ',
    'Printing': 'پرنٹنگ',
    'Print type': 'پرنٹ کی قسم',
    'Colours and sizes': 'رنگ اور سائز',
    'Colour': 'رنگ',
    'Total': 'کل',
    'Grand total': 'کل تعداد',
    'Labels and packaging': 'لیبل اور پیکنگ',
    'Woven label': 'ووون لیبل',
    'Hangtag / card': 'ہینگ ٹیگ / کارڈ',
    'Packaging': 'پیکنگ',
    'Colour / design': 'رنگ / ڈیزائن',
    'Size': 'سائز',
    'Packaging type': 'پیکنگ کی قسم',
    'Logo colour': 'لوگو کا رنگ',
    'Bag size': 'بیگ کا سائز',
    'Extra notes': 'اضافی ہدایات',
    'pieces': 'پیس',
    'sets': 'سیٹ',
    'Design pictures': 'ڈیزائن کی تصاویر',
    'Front': 'سامنے',
    'Back': 'پیچھے',
    'Logo': 'لوگو',
    'Progress': 'کام کی صورتحال',
  };

  const GLOSSARY = {
    // print methods
    'dtf': 'ڈی ٹی ایف', 'sublimation': 'سبلیمیشن', 'screen print': 'اسکرین پرنٹ', 'embroidery': 'کڑھائی', 'puff print': 'پف پرنٹ',
    // garments & parts
    'shirt': 'شرٹ', 't-shirt': 'ٹی شرٹ', 'tshirt': 'ٹی شرٹ', 'shorts': 'شارٹس', 'short': 'شارٹ', 'hoodie': 'ہوڈی', 'sweatshirt': 'سویٹ شرٹ',
    'trouser': 'ٹراؤزر', 'trousers': 'ٹراؤزر', 'pants': 'پینٹ', 'jacket': 'جیکٹ', 'jogger': 'جوگر', 'joggers': 'جوگرز', 'tracksuit': 'ٹریک سوٹ',
    'jersey': 'جرسی', 'tank top': 'ٹینک ٹاپ', 'vest': 'بنیان', 'cap': 'ٹوپی', 'sleeve': 'آستین', 'sleeves': 'آستینیں', 'collar': 'کالر',
    'pocket': 'جیب', 'pockets': 'جیبیں', 'hood': 'ہڈ', 'cuff': 'کف', 'cuffs': 'کف', 'waistband': 'کمر بند', 'drawstring': 'ڈوری',
    'zipper': 'زِپ', 'zip': 'زِپ', 'button': 'بٹن', 'buttons': 'بٹن', 'rib': 'رب', 'neck': 'گلا', 'front': 'سامنے', 'back': 'پیچھے',
    'side': 'سائیڈ', 'left': 'بایاں', 'right': 'دایاں', 'chest': 'سینہ', 'logo': 'لوگو', 'label': 'لیبل', 'tag': 'ٹیگ', 'bag': 'بیگ',
    'poly bag': 'پولی بیگ', 'box': 'ڈبہ', 'fabric': 'کپڑا', 'cotton': 'کاٹن', 'polyester': 'پولیسٹر', 'fleece': 'فلیس', 'parachute': 'پیراشوٹ',
    'mesh': 'میش', 'terry': 'ٹیری', 'french terry': 'فرنچ ٹیری', 'stitching': 'سلائی', 'cutting': 'کٹائی', 'printing': 'پرنٹنگ',
    'packing': 'پیکنگ', 'washing': 'دھلائی', 'acid wash': 'ایسڈ واش', 'distressing': 'ڈسٹریسنگ', 'rhinestones': 'نگینے',
    'deep': 'گہری', 'big': 'بڑا', 'small': 'چھوٹا', 'long': 'لمبا', 'loose': 'ڈھیلا', 'tight': 'تنگ', 'oversized': 'اوور سائز',
    'double': 'ڈبل', 'single': 'سنگل', 'stitch': 'سلائی', 'with': 'کے ساتھ', 'and': 'اور', 'on': 'پر', 'no': 'نہیں', 'not': 'نہیں',
    // colours
    'black': 'کالا', 'white': 'سفید', 'red': 'لال', 'blue': 'نیلا', 'navy': 'نیوی', 'navy blue': 'نیوی بلیو', 'green': 'ہرا',
    'grey': 'سلیٹی', 'gray': 'سلیٹی', 'yellow': 'پیلا', 'orange': 'نارنجی', 'pink': 'گلابی', 'purple': 'جامنی', 'brown': 'بھورا',
    'maroon': 'میرون', 'beige': 'بیج', 'cream': 'کریم', 'olive': 'زیتونی', 'sky blue': 'آسمانی', 'gold': 'سنہری', 'silver': 'چاندی',
    'light': 'ہلکا', 'dark': 'گہرا', 'heather grey': 'ہیدر گرے', 'charcoal': 'چارکول',
  };

  const hasLabel = (en) => !!LABELS[en];
  const label = (en) => LABELS[en] || en;

  /* ---------- Translation ---------- */
  function fromGlossary(text) {
    const t = text.trim().toLowerCase();
    if (GLOSSARY[t]) return GLOSSARY[t];
    // word by word (keeps numbers and unknown words as they are)
    const words = t.split(/(\s+|[,./()+-])/);
    let known = 0, total = 0;
    const out = words.map((w) => {
      if (!w.trim() || /^[\s,./()+-]+$/.test(w)) return w;
      total++;
      if (GLOSSARY[w]) { known++; return GLOSSARY[w]; }
      if (/^\d+%?$/.test(w)) { known++; return w; }
      return w;
    }).join('');
    return known ? out : null;
  }

  async function online(text) {
    // Free Google Translate address used by many small apps (no account needed)
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=' + encodeURIComponent(text);
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const out = (j[0] || []).map((x) => x[0]).join('');
        if (out) return out;
      }
    } catch (e) { /* try the next one */ }
    // Backup free service
    const r2 = await fetch('https://api.mymemory.translated.net/get?langpair=en|ur&q=' + encodeURIComponent(text));
    const j2 = await r2.json();
    const out2 = j2 && j2.responseData && j2.responseData.translatedText;
    if (!out2) throw new Error('no translation');
    return out2;
  }

  async function translateOne(text) {
    const exact = GLOSSARY[text.trim().toLowerCase()];
    if (exact) return exact;
    try { return await online(text); }
    catch (e) { return fromGlossary(text); }
  }

  /* All English texts that need Urdu for one section */
  function phrases(pack, section) {
    const list = [];
    const add = (s) => { if (s && String(s).trim() && !/^[\d\s.,/%x×-]+$/.test(s)) list.push(String(s).trim()); };
    switch (section) {
      case 'order': add(pack.order.description); break;
      case 'fabric': pack.fabrics.forEach((f) => { add(f.part); add(f.type); }); break;
      case 'pattern': pack.patterns.forEach((p) => { add(p.part); add(p.name); }); break;
      case 'printing': pack.printing.forEach((p) => { add(p.part); add(TP.model.methodLabel(p)); }); break;
      case 'colours': pack.colors.forEach((c) => add(c.name)); break;
      case 'labels': {
        const L = pack.labels;
        add(L.woven.notes); add(L.hangtag.notes); add(L.packaging.type); add(L.packaging.logoColor);
        break;
      }
      case 'notes': pack.notes.forEach((n) => { if (n.urdu) add(n.text); }); break;
    }
    return [...new Set(list)];
  }

  function isOn(pack, section) {
    if (section === 'notes') return !!pack.urdu.sections.notes || pack.notes.some((n) => n.urdu);
    return !!pack.urdu.sections[section];
  }

  function missing(pack) {
    const out = [];
    for (const [sec] of TP.model.URDU_SECTIONS) {
      if (!isOn(pack, sec)) continue;
      for (const p of phrases(pack, sec)) if (!pack.urdu.tr[p]) out.push(p);
    }
    return [...new Set(out)];
  }

  /* Translate every phrase that has no Urdu yet. Returns how many failed. */
  async function fillMissing(pack, list) {
    const todo = list || missing(pack);
    let failed = 0;
    const queue = todo.slice();
    const worker = async () => {
      while (queue.length) {
        const t = queue.shift();
        const u = await translateOne(t);
        if (u) pack.urdu.tr[t] = u; else failed++;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return failed;
  }

  /* Set a section on/off. For "notes" it also sets every note line. */
  function setSection(pack, section, on) {
    pack.urdu.sections[section] = on;
    if (section === 'notes') pack.notes.forEach((n) => { n.urdu = on; });
  }
  function setAll(pack, on) { for (const [sec] of TP.model.URDU_SECTIONS) setSection(pack, sec, on); }

  /* Box under a section where you can check and fix the Urdu */
  function checkPanel(pack, section, onChange) {
    const box = h('div', { class: 'urdu-panel' });
    const draw = () => {
      box.innerHTML = '';
      const list = phrases(pack, section);
      TP.add(box, h('div', { class: 'urdu-panel-head' },
        h('strong', null, 'Urdu check'),
        ui.btn('Translate again', async () => {
          const b = ui.busy('Translating…');
          list.forEach((t) => { delete pack.urdu.tr[t]; });
          const failed = await fillMissing(pack, list);
          b.close();
          if (failed) ui.toast(`${failed} line(s) could not be translated. Please type the Urdu yourself.`, 'warn');
          onChange(); draw();
        }, 'small secondary')));
      if (!list.length) { TP.add(box, h('p', { class: 'muted small' }, 'Nothing to translate yet. Type the English text first.')); return; }
      TP.add(box, h('p', { class: 'muted small' }, 'Check the Urdu below and fix anything wrong. Your English stays the same.'));
      for (const t of list) {
        const inp = h('textarea', { class: 'input urdu', dir: 'rtl', rows: 1, placeholder: 'اردو یہاں لکھیں',
          onInput: (e) => { pack.urdu.tr[t] = e.target.value; onChange(); } });
        inp.value = pack.urdu.tr[t] || '';
        TP.add(box, h('div', { class: 'urdu-row' }, h('div', { class: 'urdu-en' }, t), inp));
      }
    };
    draw();
    // Translate anything missing automatically
    const need = phrases(pack, section).filter((t) => !pack.urdu.tr[t]);
    if (need.length) fillMissing(pack, need).then(() => { onChange(); draw(); });
    return box;
  }

  TP.urdu = { LABELS, GLOSSARY, label, hasLabel, phrases, missing, fillMissing, setSection, setAll, isOn, checkPanel, translateOne };
})(window.TP);
