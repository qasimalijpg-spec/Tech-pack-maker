/* =====================================================================
   core.js — small shared helpers used by every other file.
   - TP.h(...)        build HTML elements
   - TP.ui.*          buttons, inputs, switches, pop-up windows, messages
   - TP.util.*        ids, dates, numbers, downloads and sharing
   ===================================================================== */
'use strict';
window.TP = window.TP || {};

(function (TP) {
  /* ---------- Build an element: TP.h('div', {class:'x', onClick: fn}, 'text', child) ---------- */
  const PROPS = ['value', 'checked', 'disabled', 'selected', 'hidden', 'indeterminate'];
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else if (PROPS.includes(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    appendKids(el, kids);
    return el;
  }
  function appendKids(el, kids) {
    for (const k of kids) {
      if (k === null || k === undefined || k === false) continue;
      if (Array.isArray(k)) appendKids(el, k);
      else if (k instanceof Node) el.appendChild(k);
      else el.appendChild(document.createTextNode(String(k)));
    }
  }
  TP.h = h;
  /* Add children to an element, skipping empty ones (null / false) */
  TP.add = (el, ...kids) => { appendKids(el, kids); return el; };

  /* ---------- General helpers ---------- */
  const util = {
    uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    clone(o) { return JSON.parse(JSON.stringify(o)); },
    num(v) { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; },
    int(v) { return Math.round(util.num(v)); },
    round2(n) { return Math.round(n * 100) / 100; },
    money(n) { return 'PKR ' + util.round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); },
    plain(n) { return util.round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); },
    todayISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); },
    fmtDate(iso) {
      if (!iso) return '';
      const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(d)) return iso;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    fmtDateTime(ts) {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },
    daysUntil(iso) {
      if (!iso) return null;
      const end = new Date(iso + 'T00:00:00');
      const now = new Date(); now.setHours(0, 0, 0, 0);
      return Math.round((end - now) / 86400000);
    },
    safeName(s) { return String(s || 'tech-pack').replace(/[\\/:*?"<>|]+/g, '').trim() || 'tech-pack'; },
    debounce(fn, ms) {
      let t;
      const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
      d.flush = (...a) => { clearTimeout(t); return fn(...a); };
      return d;
    },
    isPhone() { return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)); },
    readFile(file) {
      return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    },
    readText(file) {
      return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
    },
    /* Save a file to the computer / phone */
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename, style: { display: 'none' } });
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
    },
    canShareFiles(blob, filename) {
      try {
        const f = new File([blob], filename, { type: blob.type });
        return !!(navigator.canShare && navigator.canShare({ files: [f] }));
      } catch (e) { return false; }
    },
    /* Open the phone's Share menu (WhatsApp, Instagram, Save to Files...). Returns false if not possible. */
    async share(blob, filename, title) {
      if (!util.canShareFiles(blob, filename)) return false;
      const f = new File([blob], filename, { type: blob.type });
      try { await navigator.share({ files: [f], title: title || filename }); }
      catch (e) { if (e && e.name !== 'AbortError') throw e; }
      return true;
    },
  };
  TP.util = util;

  /* ---------- UI building blocks ---------- */
  const ui = {};

  ui.btn = (label, onClick, cls = '', extra = {}) =>
    h('button', Object.assign({ type: 'button', class: 'btn ' + cls, onClick }, extra), label);

  ui.iconBtn = (icon, title, onClick, cls = '') =>
    h('button', { type: 'button', class: 'icon-btn ' + cls, title, 'aria-label': title, onClick }, icon);

  /* A labelled field: label on top, input below */
  ui.field = (label, input, hint) =>
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);

  /* Text input linked to obj[key]. onChange runs after every keystroke. */
  ui.text = (obj, key, onChange, opts = {}) => {
    const tag = opts.multiline ? 'textarea' : 'input';
    const el = h(tag, {
      class: 'input ' + (opts.cls || ''), type: opts.multiline ? null : (opts.type || 'text'),
      placeholder: opts.placeholder || '', list: opts.list || null, rows: opts.rows || (opts.multiline ? 3 : null),
      inputmode: opts.inputmode || null, dir: opts.dir || null, autocomplete: 'off',
      onInput: (e) => { obj[key] = e.target.value; onChange && onChange(e.target.value); },
    });
    el.value = obj[key] ?? '';
    return el;
  };
  ui.number = (obj, key, onChange, opts = {}) =>
    ui.text(obj, key, onChange, Object.assign({ inputmode: 'decimal', cls: 'num' }, opts));

  ui.select = (obj, key, options, onChange, cls = '') => {
    const el = h('select', {
      class: 'input ' + cls,
      onChange: (e) => { obj[key] = e.target.value; onChange && onChange(e.target.value); },
    }, options.map(([v, l]) => h('option', { value: v }, l)));
    el.value = obj[key] ?? options[0][0];
    return el;
  };

  /* On/off switch */
  ui.toggle = (checked, onChange, label, cls = '') => {
    const input = h('input', { type: 'checkbox', checked: !!checked, onChange: (e) => onChange(e.target.checked) });
    return h('label', { class: 'switch ' + cls }, input, h('span', { class: 'slider' }), label ? h('span', { class: 'switch-label' }, label) : null);
  };

  ui.checkbox = (checked, onChange, label) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!checked, onChange: (e) => onChange(e.target.checked) }), h('span', null, label));

  /* Message at bottom of screen */
  ui.toast = (msg, type = '') => {
    let box = document.getElementById('toasts');
    if (!box) { box = h('div', { id: 'toasts' }); document.body.appendChild(box); }
    const t = h('div', { class: 'toast ' + type }, msg);
    box.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, type === 'error' ? 5000 : 2600);
  };

  /* Pop-up window. actions: [{label, cls, onClick}] — return false from onClick to keep it open */
  ui.modal = ({ title, body, actions = [], wide = false, onClose }) => {
    const close = () => { wrap.remove(); document.body.classList.remove('no-scroll'); onClose && onClose(); };
    const wrap = h('div', { class: 'modal-wrap', onClick: (e) => { if (e.target === wrap) close(); } },
      h('div', { class: 'modal' + (wide ? ' wide' : '') },
        h('div', { class: 'modal-head' }, h('h2', null, title || ''), ui.iconBtn('✕', 'Close', close, 'ghost')),
        h('div', { class: 'modal-body' }, body),
        actions.length ? h('div', { class: 'modal-actions' }, actions.map((a) =>
          ui.btn(a.label, async () => { const r = await a.onClick?.(); if (r !== false) close(); }, a.cls || ''))) : null));
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    return { close, el: wrap };
  };

  ui.confirm = (message, okLabel = 'Yes', danger = false) => new Promise((res) => {
    let answered = false;
    ui.modal({
      title: 'Please confirm', body: h('p', { class: 'lead' }, message),
      actions: [
        { label: 'Cancel', cls: 'secondary', onClick: () => { answered = true; res(false); } },
        { label: okLabel, cls: danger ? 'danger' : 'primary', onClick: () => { answered = true; res(true); } },
      ],
      onClose: () => { if (!answered) res(false); },
    });
  });

  ui.ask = (title, label, value = '') => new Promise((res) => {
    let answered = false;
    const input = h('input', { class: 'input', value });
    const m = ui.modal({
      title, body: ui.field(label, input),
      actions: [
        { label: 'Cancel', cls: 'secondary', onClick: () => { answered = true; res(null); } },
        { label: 'OK', cls: 'primary', onClick: () => { answered = true; res(input.value.trim()); } },
      ],
      onClose: () => { if (!answered) res(null); },
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { answered = true; res(input.value.trim()); m.close(); } });
    setTimeout(() => input.focus(), 50);
  });

  /* Full-screen "please wait" message */
  ui.busy = (msg) => {
    const text = h('div', { class: 'busy-text' }, msg);
    const el = h('div', { class: 'busy' }, h('div', { class: 'spinner' }), text);
    document.body.appendChild(el);
    return { update: (m) => { text.textContent = m; }, close: () => el.remove() };
  };

  /* A card (white box) with a heading and optional buttons on the right */
  ui.card = (title, right, ...body) =>
    h('section', { class: 'card' },
      title ? h('div', { class: 'card-head' }, h('h2', null, title), right ? h('div', { class: 'card-tools' }, right) : null) : null,
      ...body);

  TP.ui = ui;
})(window.TP);
