/* =====================================================================
   home.js — the start screen: two big buttons + list of saved tech packs.
   ===================================================================== */
'use strict';
(function (TP) {
  const { h, ui, util, model } = TP;

  async function newPack() {
    const p = model.newPack();
    await TP.packs.save(p);
    TP.app.go(`#/pack/${p.id}/edit`);
  }

  function thumb(p) {
    const d = p.designs.find((x) => x.front || x.back);
    const src = d ? (d.front || d.back).src : null;
    return h('div', { class: 'thumb checker' }, src ? h('img', { src, alt: '' }) : h('span', { class: 'thumb-empty' }, '👕'));
  }

  /* Pop-up list to choose a tech pack for Factory or Client version */
  function chooser(list, version) {
    const isFactory = version === 'factory';
    const body = h('div', { class: 'chooser' },
      isFactory ? ui.btn('+ New tech pack', () => { m.close(); newPack(); }, 'primary big block') : null,
      list.length ? h('p', { class: 'muted' }, isFactory ? 'Or open a saved tech pack:' : 'Choose a tech pack to show to the client:')
        : h('p', { class: 'muted' }, isFactory ? '' : 'No tech packs yet. Make one first with Factory Version.'),
      list.map((p) => h('button', { type: 'button', class: 'chooser-item', onClick: () => { m.close(); TP.app.go(`#/pack/${p.id}/${version}`); } },
        thumb(p), h('div', null, h('strong', null, model.title(p)), h('div', { class: 'muted small' }, p.order.client || 'No client name')))));
    const m = ui.modal({ title: isFactory ? 'Factory Version' : 'Client Version', body });
  }

  TP.pages = TP.pages || {};
  TP.pages.home = async function (root) {
    const list = await TP.packs.all();

    const listBox = h('div', { class: 'pack-list' });
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Search by project or client…' });

    const drawList = () => {
      const q = search.value.trim().toLowerCase();
      const shown = list.filter((p) => !q || (p.order.project + ' ' + p.order.client).toLowerCase().includes(q));
      listBox.innerHTML = '';
      if (!list.length) {
        TP.add(listBox, h('div', { class: 'empty' }, h('div', { class: 'empty-icon' }, '📋'),
          h('p', null, 'No tech packs yet.'), h('p', { class: 'muted' }, 'Press "Factory Version" above to make your first one.')));
        return;
      }
      if (!shown.length) { TP.add(listBox, h('p', { class: 'muted center' }, 'Nothing found.')); return; }
      for (const p of shown) {
        const dl = model.deadline(p);
        const done = model.stagesDone(p);
        const t = model.totals(p).grand;
        TP.add(listBox, h('div', { class: 'pack-item' },
          h('div', { class: 'pack-main', onClick: () => TP.app.go(`#/pack/${p.id}/edit`) },
            thumb(p),
            h('div', { class: 'pack-info' },
              h('div', { class: 'pack-title' }, model.title(p)),
              h('div', { class: 'muted small' }, [p.order.client, `${t || util.int(p.order.totalPieces) || 0} ${p.order.unit}`].filter(Boolean).join(' · ')),
              h('div', { class: 'muted small' }, 'Made ' + util.fmtDate(new Date(p.createdAt).toISOString().slice(0, 10)) +
                (p.order.endDate ? ' · Due ' + util.fmtDate(p.order.endDate) : '')),
              h('div', { class: 'progress-mini' }, h('div', { class: 'bar' }, h('span', { style: { width: (done / 6) * 100 + '%' } })),
                h('span', { class: 'small muted' }, model.isFinished(p) ? 'Shipped ✓' : `${done}/6 stages`)),
              dl ? h('div', { class: 'badge ' + dl.level }, dl.level === 'late' ? '⚠ ' + dl.text : '⏰ ' + dl.text) : null)),
          h('div', { class: 'pack-actions' },
            ui.btn('Open', () => TP.app.go(`#/pack/${p.id}/edit`), 'primary'),
            ui.btn('Duplicate', async () => {
              const c = model.duplicate(p);
              await TP.packs.save(c);
              ui.toast('Copy made ✓ Now change what is different for the new order.', 'ok');
              TP.app.go(`#/pack/${c.id}/edit`);
            }, 'secondary'),
            ui.btn('Delete', async () => {
              if (!await ui.confirm(`Delete "${model.title(p)}"? This cannot be undone.`, 'Delete', true)) return;
              await TP.packs.remove(p.id);
              list.splice(list.indexOf(p), 1);
              drawList();
              ui.toast('Deleted');
            }, 'danger-outline'))));
      }
    };
    search.addEventListener('input', drawList);

    const lateCount = list.filter((p) => model.deadline(p)).length;

    TP.add(root, 
      h('div', { class: 'hero' },
        h('button', { type: 'button', class: 'big-choice factory', onClick: () => chooser(list, 'factory') },
          h('span', { class: 'big-icon' }, '🏭'),
          h('span', { class: 'big-title' }, 'Factory Version'),
          h('span', { class: 'big-sub' }, 'New tech pack or full working copy')),
        h('button', { type: 'button', class: 'big-choice client', onClick: () => chooser(list, 'client') },
          h('span', { class: 'big-icon' }, '📸'),
          h('span', { class: 'big-title' }, 'Client Version'),
          h('span', { class: 'big-sub' }, 'Clean picture to send to clients'))),
      lateCount ? h('div', { class: 'alert warn' }, `⏰ ${lateCount} order${lateCount > 1 ? 's are' : ' is'} close to or past the end date. See below.`) : null,
      h('div', { class: 'list-head' }, h('h2', null, 'My tech packs'), h('span', { class: 'muted' }, `${list.length} saved`)),
      list.length > 3 ? search : null,
      listBox);
    drawList();
  };

  TP.home = { newPack };
})(window.TP);
