/* Client für den Analyse-Worker: Entprellung, Verwerfen veralteter Antworten, Status. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  /**
   * opts: { worker, delay = 400, onResult(model), onError(error), onStatus('loading'|'ready'|'failed', message),
   *         setTimeout, clearTimeout }
   * → { update(source), analyzeNow(source), status() }
   */
  P.createAnalyzerClient = function (opts) {
    const worker = opts.worker;
    const delay = opts.delay == null ? 400 : opts.delay;
    const setT = opts.setTimeout || G.setTimeout.bind(G);
    const clearT = opts.clearTimeout || G.clearTimeout.bind(G);
    let latest = 0;
    let timer = null;
    let state = 'loading';

    function setStatus(s, msg) {
      state = s;
      if (opts.onStatus) opts.onStatus(s, msg);
    }

    worker.onmessage = function (e) {
      const d = e.data;
      if (d.type === 'ready') return setStatus('ready');
      if (d.type === 'failed') return setStatus('failed', d.message);
      if (d.id !== latest) return;                 // veraltete Antwort
      if (d.error) { if (opts.onError) opts.onError(d.error); }
      else if (opts.onResult) opts.onResult(d.model);
    };
    worker.onerror = function (e) {
      setStatus('failed', e && e.message ? e.message : 'Worker konnte nicht gestartet werden');
    };

    function analyzeNow(source) {
      if (timer !== null) { clearT(timer); timer = null; }
      latest++;
      worker.postMessage({ id: latest, source: source });
    }

    setStatus('loading');
    return {
      update: function (source) {
        if (timer !== null) clearT(timer);
        timer = setT(function () { timer = null; analyzeNow(source); }, delay);
      },
      analyzeNow: analyzeNow,
      status: function () { return state; }
    };
  };
})(globalThis);
