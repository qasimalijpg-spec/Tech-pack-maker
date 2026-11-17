/* =====================================================================
   sample.js — the "Glory Hoodie" example tech pack (Revamp Era, GH12).
   Press "Load the Glory Hoodie example" on the start screen to see a
   finished tech pack. Its pictures live in sample-images.js, which is
   only loaded when needed.
   ===================================================================== */
'use strict';
(function (TP) {
  const { uid } = TP.util;

  function loadImages() {
    if (TP.SAMPLE_IMAGES) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/sample-images.js';
      s.onload = res; s.onerror = () => rej(new Error('Could not load the example pictures.'));
      document.head.appendChild(s);
    });
  }

  async function build() {
    await loadImages();
    const I = TP.SAMPLE_IMAGES;
    const img = (src) => TP.images.fromData(src);
    const p = TP.model.newPack();
    Object.assign(p.order, {
      project: 'Glory Hoodie', styleNo: 'Gh12', client: 'Revamp Era', designer: 'Revamp Era',
      stage: '1st Sample', mainFabric: '450 GSM Cotton Fleece', sampleSize: 'L',
      description: 'Full-zip hoodie, oversized. 2 samples: 1 black, 1 grey.',
      totalPieces: '2', unit: 'pieces', startDate: '2024-12-26', endDate: '',
    });
    p.sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
    p.summary = [
      ['Garment', 'Full-zip hoodie, oversized'], ['Fit', 'Slightly cropped, approx. 2" shorter'],
      ['Fabric', '100% cotton fleece, 450 GSM'], ['Finish', 'Light acid wash, faded, not spotty'],
      ['Closure', 'Regular zipper, both colourways'], ['Decoration', 'Broken screen print, screen print, embroidery'],
      ['Drawstrings', 'None'], ['Quantity', '2 samples · 1 black, 1 grey'],
    ].map(([k, v]) => ({ id: uid(), k, v }));
    p.revisions = [{ id: uid(), rev: '00', date: '26 Dec 2024', text: 'First sample issued' },
      { id: uid(), rev: '01', date: '', text: '' }, { id: uid(), rev: '02', date: '', text: '' }];
    p.colourways = [
      { id: uid(), name: 'Black', hex: '#2f3136', note: 'Black · light acid wash', tag: 'Zip-up · 1 sample', front: img(I.bkFront), back: img(I.bkBack), side: img(I.bkSide) },
      { id: uid(), name: 'Grey', hex: '#56637a', note: 'Pantone Cool Gray 10 C', tag: 'Zip-up · 1 sample', front: img(I.grFront), back: img(I.grBack), side: img(I.grSide) },
    ];
    p.poi = [
      ['front', 66, 44, 'Chest print — "Revamp Era"', 'Broken screen print, white. Both colourways.'],
      ['front', 88, 70, '"1001" — left sleeve', 'Screen print, outlined numbers only. Not broken.'],
      ['back', 80, 46, '"Rise to Glory" — centre back', 'Broken screen print, white.'],
      ['back', 50, 80, '"Revamp Era" script', 'Embroidery, white.'],
      ['back', 12, 70, '"1001" — back of left sleeve', 'Runs across the side of the sleeve.'],
    ].map(([view, x, y, title, desc]) => ({ id: uid(), view, x, y, title, desc }));
    p.art = [
      [I.art1, 'Revamp Era chest print', 'Broken screen print', 'White ink', '5 × 3 in', 'Left chest'],
      [I.art2, '1001 sleeve print', 'Screen print, outline only', 'White ink', '4 in wide', 'Left sleeve'],
      [I.art3, 'Rise to Glory back print', 'Broken screen print', 'White ink', '11 × 7 in', 'Centre back'],
      [I.art4, 'Revamp Era script', 'Embroidery', 'White thread', '6 in wide', 'Back, under print'],
    ].map(([src, title, technique, colour, size, placement]) => ({ id: uid(), img: img(src), title, technique, colour, size, placement }));
    p.printing = [
      { id: uid(), part: 'Chest + centre back', method: 'other', other: 'Broken screen print' },
      { id: uid(), part: 'Left sleeve', method: 'screen', other: '' },
      { id: uid(), part: 'Back script', method: 'embroidery', other: '' },
    ];
    p.fabrics = [{ id: uid(), part: 'Body, hood, sleeves', type: '100% cotton fleece (13.27 oz/yd²)', gsm: '450', store: 'Ali Fabrics, Sialkot' },
      { id: uid(), part: 'Cuffs, hem', type: '1×1 rib, cotton', gsm: '320', store: 'Ali Fabrics, Sialkot' }];
    p.patterns = [{ id: uid(), part: 'Body', name: 'Oversized full-zip hoodie, cropped 2"', code: 'BI-HD-012' },
      { id: uid(), part: 'Hood', name: '3-panel hood, no drawcord', code: 'BI-HD-012H' }];
    p.trims = [
      { id: uid(), type: 'Zipper', description: 'Regular zipper, open end', size: '1" tape', colour: 'Tonal', placement: 'Centre front', qty: '1', supplier: 'YKK, Lahore', photo: null },
      { id: uid(), type: 'Zipper puller', description: 'Plain metal puller', size: '30 mm', colour: 'Gunmetal', placement: 'Centre front', qty: '1', supplier: 'YKK, Lahore', photo: null },
      { id: uid(), type: 'Woven label', description: 'Custom woven neck tag, logo + size', size: '2 × 1.5 in', colour: 'White', placement: 'Inside back neck', qty: '1', supplier: 'Sialkot Labels', photo: null },
    ];
    p.bom = [{ id: uid(), item: 'Fabric', desc: '100% cotton fleece, 450 GSM (13.27 oz/yd²)', colour: 'Black / Grey', place: 'Body, hood, sleeves' }];
    p.meas = {
      diagram: img(TP.ASSETS.measureHoodie), unit: 'in', tol: '½',
      note: 'Sample is made in size L. Remaining sizes to be graded once the sample is approved.',
      rows: [
        ['A', 'Shoulder width', 'Seam to seam, across back', { M: '25', L: '26' }],
        ['B', 'Sleeve length', 'Shoulder point to cuff edge', { M: '23½', L: '24' }],
        ['C', 'Chest width', '1" below armhole, side to side', { M: '25', L: '26' }],
        ['D', 'Body length', 'High point shoulder to hem', { M: '24½', L: '25' }],
      ].map(([l, name, how, vals]) => ({ id: uid(), l, name, how, vals, x: null, y: null })),
    };
    p.swatches = [
      { id: uid(), hex: '#2f3136', name: '01 · Black', note: 'Light acid wash' },
      { id: uid(), hex: '#56637a', name: '02 · Grey', note: 'Pantone Cool Gray 10 C' },
      { id: uid(), hex: '#ffffff', name: 'Artwork · White', note: 'All prints & embroidery' },
    ];
    p.colors = [
      { id: uid(), hex: '#2f3136', name: 'Black', qty: { L: '1' } },
      { id: uid(), hex: '#56637a', name: 'Grey', qty: { L: '1' } },
    ];
    p.labels = {
      woven: { notes: 'Woven neck tag, white, logo + size. Black shown for demo only.', size: '2 × 1.5 in', images: [] },
      hangtag: { notes: '', size: '', images: [] },
      packaging: { type: 'Single poly bag, folded', logoColor: '', bagSize: '12 × 16 in', images: [] },
    };
    p.wash = 'Light acid wash on all broken-screen areas and overall body. Faded look, even finish, not spotty. Match the fabric finish to the mockup.';
    p.notes = [
      'No drawstrings on the hood.', 'Slightly cropped fit, about 2" shorter.', 'Make one black and one grey zip-up sample.',
      '"1001" screen print on the left sleeve only.', 'All prints and embroidery in white.', 'Acid wash must be light and even.',
    ].map((text) => ({ id: uid(), text, showClient: true }));
    return p;
  }

  TP.sample = { build };
})(window.TP);
