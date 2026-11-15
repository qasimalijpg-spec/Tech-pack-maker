/* =====================================================================
   db.js — saves everything on this device (inside the browser).
   Uses IndexedDB, which can hold lots of pictures and keeps them
   after the app or browser is closed.

   Storage "boxes":
     packs     – the tech packs
     costings  – the costing page for each tech pack
     sheet     – one row per order for the Excel costing sheet
     settings  – your company settings
   ===================================================================== */
'use strict';
(function (TP) {
  const DB_NAME = 'techpack-builder';
  const DB_VERSION = 1;
  const STORES = { packs: 'id', costings: 'packId', sheet: 'packId', settings: 'key' };
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, keyPath] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Ask the browser to keep our data even when the device is low on space
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    return dbPromise;
  }

  function run(store, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const s = tx.objectStore(store);
      const req = fn(s);
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Saving was cancelled (the device may be full).'));
    }));
  }

  TP.db = {
    STORES,
    get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
    put: (store, obj) => run(store, 'readwrite', (s) => s.put(obj)),
    del: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
    all: (store) => run(store, 'readonly', (s) => s.getAll()),
    clear: (store) => run(store, 'readwrite', (s) => s.clear()),
  };
})(window.TP);
