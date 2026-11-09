(function () {
  function fakeTimers() {
    let now = 0, seq = 0;
    const pending = new Map();
    return {
      setTimeout: function (fn, ms) { const id = ++seq; pending.set(id, { at: now + ms, fn: fn }); return id; },
      clearTimeout: function (id) { pending.delete(id); },
      advance: function (ms) {
        now += ms;
        for (const [id, t] of Array.from(pending)) {
          if (t.at <= now) { pending.delete(id); t.fn(); }
        }
      }
    };
  }
  function fakeWorker() {
    return { sent: [], postMessage: function (m) { this.sent.push(m); }, reply: function (d) { this.onmessage({ data: d }); } };
  }
  function setup() {
    const timers = fakeTimers();
    const worker = fakeWorker();
    const log = { results: [], errors: [], status: [] };
    const client = PyUML.createAnalyzerClient({
      worker: worker, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
      onResult: function (m) { log.results.push(m); },
      onError: function (e) { log.errors.push(e); },
      onStatus: function (s, msg) { log.status.push(msg ? s + ':' + msg : s); }
    });
    return { timers: timers, worker: worker, log: log, client: client };
  }

  T.test('Client: Entprellung 400 ms, nur eine Anfrage nach schnellem Tippen', function () {
    const s = setup();
    for (let i = 1; i <= 10; i++) { s.client.update('x'.repeat(i)); s.timers.advance(50); }
    T.eq(s.worker.sent.length, 0);
    s.timers.advance(349);
    T.eq(s.worker.sent.length, 0, 'vor 400 ms');
    s.timers.advance(1);
    T.eq(s.worker.sent.length, 1);
    T.eq(s.worker.sent[0].source, 'xxxxxxxxxx');
  });

  T.test('Client: veraltete Antworten werden verworfen', function () {
    const s = setup();
    s.client.analyzeNow('a');
    s.client.analyzeNow('b');
    const [first, second] = s.worker.sent;
    s.worker.reply({ id: second.id, model: { classes: ['b'] } });
    s.worker.reply({ id: first.id, model: { classes: ['a'] } });
    T.deepEq(s.log.results, [{ classes: ['b'] }]);
  });

  T.test('Client: Fehler und Status', function () {
    const s = setup();
    T.deepEq(s.log.status, ['loading']);
    s.worker.reply({ type: 'ready' });
    T.eq(s.client.status(), 'ready');
    s.client.analyzeNow('class A');
    s.worker.reply({ id: s.worker.sent[0].id, error: { line: 1, col: 8, message: "expected ':'" } });
    T.eq(s.log.errors.length, 1);
    T.eq(s.log.errors[0].line, 1);
    s.worker.reply({ type: 'failed', message: 'offline' });
    T.eq(s.log.status[s.log.status.length - 1], 'failed:offline');
  });

  T.test('Client: analyzeNow bricht laufende Entprellung ab', function () {
    const s = setup();
    s.client.update('a');
    s.client.analyzeNow('b');
    s.timers.advance(1000);
    T.eq(s.worker.sent.length, 1);
    T.eq(s.worker.sent[0].source, 'b');
  });
})();
