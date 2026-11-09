/* Minimaler Assert-Runner ohne Abhängigkeiten (Node und Browser). */
(function (G) {
  'use strict';
  const tests = [];
  const T = {};

  T.test = function (name, fn) { tests.push({ name: name, fn: fn }); };

  function fail(msg) { throw new Error(msg); }
  function show(x) { try { return JSON.stringify(x); } catch (e) { return String(x); } }

  T.ok = function (v, msg) { if (!v) fail(msg || 'erwartet truthy, war ' + show(v)); };
  T.eq = function (a, b, msg) {
    if (!Object.is(a, b)) fail((msg ? msg + ': ' : '') + 'erwartet ' + show(b) + ', war ' + show(a));
  };
  T.near = function (a, b, eps, msg) {
    if (Math.abs(a - b) > (eps || 1e-9)) fail((msg ? msg + ': ' : '') + 'erwartet ≈' + b + ', war ' + a);
  };
  T.deepEq = function (a, b, msg) {
    const sa = show(a), sb = show(b);
    if (sa !== sb) fail((msg ? msg + ': ' : '') + 'erwartet ' + sb + ', war ' + sa);
  };
  T.throws = function (fn, msg) {
    try { fn(); } catch (e) { return e; }
    fail(msg || 'Exception erwartet');
  };

  /** Fixture als Uint8Array laden (Node: fs, Browser: fetch). Wird vom Host gesetzt. */
  T.fixture = null;

  /** Fixture nicht ladbar → Test wird übersprungen statt rot. */
  T.Skip = function (msg) { this.message = msg; };

  /** Alle Tests ausführen; log(status, name, detail). → { passed, failed, skipped } */
  T.run = async function (log) {
    const res = { passed: 0, failed: 0, skipped: 0 };
    for (const t of tests) {
      try {
        await t.fn();
        res.passed++; log('ok', t.name);
      } catch (e) {
        if (e instanceof T.Skip) { res.skipped++; log('skip', t.name, e.message); }
        else { res.failed++; log('fail', t.name, e && e.stack ? e.stack : String(e)); }
      }
    }
    return res;
  };

  G.T = T;
})(globalThis);
