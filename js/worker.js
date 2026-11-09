/* Web Worker: lädt Pyodide und py/uml_model.py, analysiert Quelltext (ohne ihn auszuführen).
 * Protokoll:  → {id, source}
 *             ← {type: 'ready'} | {type: 'failed', message}
 *             ← {id, model} | {id, error: {line, col, message}}
 */
'use strict';
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const analyzer = (async function () {
  importScripts(PYODIDE_URL + 'pyodide.js');
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  const res = await fetch('../py/uml_model.py');
  if (!res.ok) throw new Error('py/uml_model.py nicht ladbar (HTTP ' + res.status + ')');
  pyodide.FS.writeFile('/home/pyodide/uml_model.py', await res.text());
  return pyodide.pyimport('uml_model').analyze_json;
})();

analyzer.then(
  function () { self.postMessage({ type: 'ready' }); },
  function (e) { self.postMessage({ type: 'failed', message: String(e && e.message || e) }); }
);

self.onmessage = async function (e) {
  const id = e.data.id;
  let fn;
  try { fn = await analyzer; } catch (err) { return; }   // 'failed' wurde schon gemeldet
  try {
    const result = JSON.parse(fn(e.data.source));
    if (result.error) self.postMessage({ id: id, error: result.error });
    else self.postMessage({ id: id, model: result });
  } catch (err) {
    self.postMessage({ id: id, error: { line: null, col: null, message: String(err && err.message || err) } });
  }
};
