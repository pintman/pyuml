/* Web Worker: führt den Quelltext für den Ausgabe-Bereich aus (eigene Pyodide-Instanz, getrennt von der Analyse).
 * Protokoll:  → {id, source, inputs}
 *             ← {type: 'ready'} | {type: 'failed', message}
 *             ← {id, started: true}
 *             ← {id, stream: 'out'|'err'|'note', text}
 *             ← {id, done: true} | {id, needInput: true, prompt}
 */
'use strict';
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const runner = (async function () {
  importScripts(PYODIDE_URL + 'pyodide.js');
  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  const res = await fetch('../py/run_program.py');
  if (!res.ok) throw new Error('py/run_program.py nicht ladbar (HTTP ' + res.status + ')');
  pyodide.FS.writeFile('/home/pyodide/run_program.py', await res.text());
  return { pyodide: pyodide, run: pyodide.pyimport('run_program').run };
})();

runner.then(
  function () { self.postMessage({ type: 'ready' }); },
  function (e) { self.postMessage({ type: 'failed', message: String(e && e.message || e) }); }
);

self.onmessage = async function (e) {
  const id = e.data.id;
  let r;
  try { r = await runner; } catch (err) { return; }      // 'failed' wurde schon gemeldet
  self.postMessage({ id: id, started: true });
  const write = function (stream, text) { self.postMessage({ id: id, stream: stream, text: text }); };
  let inputs = null, result = null;
  try {
    inputs = r.pyodide.toPy(e.data.inputs || []);
    result = r.run(e.data.source, inputs, write);
    const status = result.get('status');
    if (status === 'input') self.postMessage({ id: id, needInput: true, prompt: result.get('prompt') });
    else self.postMessage({ id: id, done: true });
  } catch (err) {
    write('err', String(err && err.message || err) + '\n');
    self.postMessage({ id: id, done: true });
  } finally {
    if (inputs && inputs.destroy) inputs.destroy();
    if (result && result.destroy) result.destroy();
  }
};
