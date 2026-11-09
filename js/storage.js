/* Speichern des Quelltexts im Browser (localStorage); Fehler (privater Modus, Quota) werden geschluckt. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  /** → { load(): string|null, save(text) } */
  P.createStorage = function (store, key) {
    key = key || 'pyuml.source';
    return {
      load: function () {
        try { return store ? store.getItem(key) : null; } catch (e) { return null; }
      },
      save: function (text) {
        try { if (store) store.setItem(key, text); } catch (e) { /* ignorieren */ }
      }
    };
  };
})(globalThis);
