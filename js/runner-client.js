/* Client für den Run-Worker: Entprellung, Zeitlimit mit Neustart, input()-Replay, Verwerfen veralteter Läufe. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  /**
   * opts: { createWorker() → Worker, delay = 400, timeout = 5000, prompt(text) → string|null,
   *         onOutput(stream, text), onRunStart(), onRunEnd('done'|'timeout'|'input-cancelled'|'cancelled'),
   *         onStatus('loading'|'ready'|'failed', message), setTimeout, clearTimeout }
   * → { update(source), runNow(source), cancel(), status() }
   */
  P.createRunnerClient = function (opts) {
    const delay = opts.delay == null ? 400 : opts.delay;
    const timeout = opts.timeout == null ? 5000 : opts.timeout;
    const setT = opts.setTimeout || G.setTimeout.bind(G);
    const clearT = opts.clearTimeout || G.clearTimeout.bind(G);
    const call = function (name) {
      const fn = opts[name];
      if (fn) fn.apply(null, Array.prototype.slice.call(arguments, 1));
    };

    let worker = null;
    let state = 'loading';
    let latest = 0;
    let active = null;        // id des gesendeten, noch nicht beendeten Laufs
    let job = null;           // {source, inputs} der aktuellen Ausführung
    let pending = false;      // job wartet auf 'ready'
    let debounce = null;
    let limit = null;

    function setStatus(s, msg) {
      state = s;
      call('onStatus', s, msg);
    }

    function clearLimit() {
      if (limit !== null) { clearT(limit); limit = null; }
    }

    function startWorker() {
      let w;
      setStatus('loading');
      try { w = opts.createWorker(); } catch (e) {
        worker = null;
        setStatus('failed', e && e.message ? e.message : String(e));
        return;
      }
      worker = w;
      w.onmessage = function (e) { if (w === worker) onMessage(e.data); };
      w.onerror = function (e) {
        if (w !== worker) return;
        clearLimit();
        const wasActive = active !== null;
        active = null;
        pending = false;
        setStatus('failed', e && e.message ? e.message : 'Worker konnte nicht gestartet werden');
        if (wasActive) call('onRunEnd', 'failed');
      };
    }

    function stopWorker() {
      clearLimit();
      if (worker) worker.terminate();
      worker = null;
      active = null;
    }

    function send() {
      pending = false;
      latest++;
      active = latest;
      call('onRunStart');
      worker.postMessage({ id: latest, source: job.source, inputs: job.inputs.slice() });
    }

    /** Aktuellen job ausführen: ggf. laufenden Lauf abbrechen, ggf. auf 'ready' warten. */
    function dispatch() {
      if (active !== null) { stopWorker(); startWorker(); }
      else if (!worker && state !== 'failed') startWorker();
      if (state === 'ready') send();
      else pending = state === 'loading';
    }

    function onMessage(d) {
      if (d.type === 'ready') {
        setStatus('ready');
        if (pending && job) send();
        return;
      }
      if (d.type === 'failed') {
        pending = false;
        return setStatus('failed', d.message);
      }
      if (d.id !== active) return;                         // veraltete Antwort
      if (d.started) {
        clearLimit();
        limit = setT(onTimeout, timeout);
      } else if (d.stream) {
        call('onOutput', d.stream, d.text);
      } else if (d.done) {
        clearLimit();
        active = null;
        call('onRunEnd', 'done');
      } else if (d.needInput) {
        clearLimit();
        active = null;
        const value = opts.prompt ? opts.prompt(d.prompt) : null;
        if (value == null) return call('onRunEnd', 'input-cancelled');
        job = { source: job.source, inputs: job.inputs.concat([String(value)]) };
        dispatch();
      }
    }

    function onTimeout() {
      limit = null;
      stopWorker();
      job = null;
      call('onRunEnd', 'timeout');
      startWorker();
    }

    function runNow(source) {
      if (debounce !== null) { clearT(debounce); debounce = null; }
      job = { source: source, inputs: [] };
      dispatch();
    }

    startWorker();
    return {
      update: function (source) {
        if (debounce !== null) clearT(debounce);
        debounce = setT(function () { debounce = null; runNow(source); }, delay);
      },
      runNow: runNow,
      cancel: function () {
        if (debounce !== null) { clearT(debounce); debounce = null; }
        pending = false;
        job = null;
        if (active !== null) {
          stopWorker();                                    // neuer Worker erst beim nächsten Lauf
          call('onRunEnd', 'cancelled');
        }
      },
      status: function () { return state; }
    };
  };
})(globalThis);
