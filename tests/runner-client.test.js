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
          if (t.at <= now && pending.has(id)) { pending.delete(id); t.fn(); }
        }
      }
    };
  }
  function fakeWorker() {
    return {
      sent: [], terminated: false,
      postMessage: function (m) { this.sent.push(m); },
      terminate: function () { this.terminated = true; },
      reply: function (d) { this.onmessage({ data: d }); }
    };
  }
  function setup(promptAnswers) {
    const timers = fakeTimers();
    const workers = [];
    const log = { out: [], starts: 0, ends: [], status: [], prompts: [] };
    const answers = (promptAnswers || []).slice();
    const client = PyUML.createRunnerClient({
      createWorker: function () { const w = fakeWorker(); workers.push(w); return w; },
      setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
      prompt: function (t) { log.prompts.push(t); return answers.shift(); },
      onOutput: function (s, t) { log.out.push(s + ':' + t); },
      onRunStart: function () { log.starts++; },
      onRunEnd: function (r) { log.ends.push(r); },
      onStatus: function (s, msg) { log.status.push(msg ? s + ':' + msg : s); }
    });
    const w = function () { return workers[workers.length - 1]; };
    return { timers: timers, workers: workers, w: w, log: log, client: client };
  }
  function ready(s) { s.w().reply({ type: 'ready' }); }
  function last(w) { return w.sent[w.sent.length - 1]; }

  T.test('Runner: Entprellung, 10× update → 1 Auftrag', function () {
    const s = setup();
    ready(s);
    for (let i = 1; i <= 10; i++) { s.client.update('x'.repeat(i)); s.timers.advance(50); }
    T.eq(s.w().sent.length, 0);
    s.timers.advance(400);
    T.eq(s.w().sent.length, 1);
    T.deepEq(s.w().sent[0], { id: 1, source: 'xxxxxxxxxx', inputs: [] });
  });

  T.test('Runner: Ausgabe und Ende', function () {
    const s = setup();
    ready(s);
    s.client.runNow('print(1)');
    const id = s.w().sent[0].id;
    s.w().reply({ id: id, started: true });
    s.w().reply({ id: id, stream: 'out', text: '1\n' });
    s.w().reply({ id: id, done: true });
    T.deepEq(s.log.out, ['out:1\n']);
    T.eq(s.log.starts, 1);
    T.deepEq(s.log.ends, ['done']);
  });

  T.test('Runner: veraltete Antworten werden verworfen', function () {
    const s = setup();
    ready(s);
    s.client.runNow('a');
    const first = s.w().sent[0].id;
    s.w().reply({ id: first, done: true });
    s.client.runNow('b');
    s.w().reply({ id: first, stream: 'out', text: 'alt' });
    s.w().reply({ id: first, done: true });
    T.deepEq(s.log.out, []);
    T.deepEq(s.log.ends, ['done']);
  });

  T.test('Runner: runNow vor ready wird nach ready nachgeholt', function () {
    const s = setup();
    T.deepEq(s.log.status, ['loading']);
    s.client.runNow('a');
    s.client.runNow('b');
    T.eq(s.w().sent.length, 0);
    ready(s);
    T.eq(s.client.status(), 'ready');
    T.eq(s.w().sent.length, 1);
    T.eq(s.w().sent[0].source, 'b');
  });

  T.test('Runner: Zeitlimit 5000 ms ab started, Worker beendet und neu erzeugt', function () {
    const s = setup();
    ready(s);
    s.client.runNow('while True: pass');
    const w1 = s.w();
    s.timers.advance(10000);
    T.eq(w1.terminated, false, 'kein Timer vor started');
    w1.reply({ id: w1.sent[0].id, started: true });
    s.timers.advance(4999);
    T.eq(w1.terminated, false);
    s.timers.advance(1);
    T.eq(w1.terminated, true);
    T.deepEq(s.log.ends, ['timeout']);
    T.eq(s.workers.length, 2);
    T.eq(s.client.status(), 'loading');
    ready(s);
    T.eq(s.client.status(), 'ready');
    T.eq(s.w().sent.length, 0, 'abgebrochener Lauf wird nicht wiederholt');
    s.client.runNow('print("ok")');
    T.eq(s.w().sent[0].source, 'print("ok")');
  });

  T.test('Runner: kein Zeitlimit nach done', function () {
    const s = setup();
    ready(s);
    s.client.runNow('a');
    const id = s.w().sent[0].id;
    s.w().reply({ id: id, started: true });
    s.w().reply({ id: id, done: true });
    s.timers.advance(10000);
    T.eq(s.workers.length, 1);
    T.deepEq(s.log.ends, ['done']);
  });

  T.test('Runner: neuer Auftrag während eines Laufs startet den Worker neu', function () {
    const s = setup();
    ready(s);
    s.client.runNow('a');
    const w1 = s.w();
    w1.reply({ id: w1.sent[0].id, started: true });
    s.client.runNow('b');
    T.eq(w1.terminated, true);
    T.eq(s.workers.length, 2);
    w1.reply({ id: w1.sent[0].id, stream: 'out', text: 'alt' });
    T.deepEq(s.log.out, []);
    s.timers.advance(6000);
    T.eq(s.workers.length, 2, 'alter Timer gelöscht');
    ready(s);
    T.eq(s.w().sent[0].source, 'b');
  });

  T.test('Runner: input() → Wert, Neustart mit verlängerter Liste', function () {
    const s = setup(['Ada']);
    ready(s);
    s.client.runNow('src');
    const w = s.w();
    w.reply({ id: w.sent[0].id, started: true });
    w.reply({ id: w.sent[0].id, needInput: true, prompt: 'Name? ' });
    T.deepEq(s.log.prompts, ['Name? ']);
    T.eq(w.sent.length, 2);
    T.deepEq(w.sent[1].inputs, ['Ada']);
    T.eq(w.sent[1].source, 'src');
    T.eq(s.log.starts, 2, 'Ausgabe wird geleert');
    T.eq(s.workers.length, 1, 'kein Neustart nötig');
  });

  T.test('Runner: Warten auf input() zählt nicht zum Zeitlimit', function () {
    const s = setup([]);
    ready(s);
    s.client.runNow('src');
    const w = s.w();
    w.reply({ id: w.sent[0].id, started: true });
    s.timers.advance(4000);
    w.reply({ id: w.sent[0].id, needInput: true, prompt: '' });
    s.timers.advance(4000);
    T.eq(w.terminated, false);
  });

  T.test('Runner: input() abbrechen beendet ohne weiteren Auftrag', function () {
    const s = setup([null]);
    ready(s);
    s.client.runNow('src');
    const w = s.w();
    w.reply({ id: w.sent[0].id, needInput: true, prompt: 'x' });
    T.eq(w.sent.length, 1);
    T.deepEq(s.log.ends, ['input-cancelled']);
  });

  T.test('Runner: neuer Lauf beginnt mit leerer Eingabeliste', function () {
    const s = setup(['Ada']);
    ready(s);
    s.client.runNow('src');
    const w = s.w();
    w.reply({ id: w.sent[0].id, needInput: true, prompt: '' });
    w.reply({ id: last(w).id, done: true });
    s.client.update('src2');
    s.timers.advance(400);
    T.deepEq(last(w).inputs, []);
    T.eq(last(w).source, 'src2');
  });

  T.test('Runner: cancel() verwirft Entprellung und ignoriert alten Lauf', function () {
    const s = setup();
    ready(s);
    s.client.runNow('a');
    const w1 = s.w();
    w1.reply({ id: w1.sent[0].id, started: true });
    s.client.update('b');
    s.client.cancel();
    T.eq(w1.terminated, true);
    T.deepEq(s.log.ends, ['cancelled']);
    s.timers.advance(10000);
    T.eq(s.workers.length, 1, 'kein Neustart ohne Bedarf');
    w1.reply({ id: w1.sent[0].id, stream: 'out', text: 'alt' });
    T.deepEq(s.log.out, []);
    s.client.runNow('c');
    T.eq(s.workers.length, 2, 'Neustart beim nächsten Lauf');
    ready(s);
    T.eq(s.w().sent[0].source, 'c');
  });

  T.test('Runner: cancel() ohne aktiven Lauf sendet nichts mehr', function () {
    const s = setup();
    s.client.runNow('a');                                   // wartet auf ready
    s.client.update('b');
    s.client.cancel();
    ready(s);
    s.timers.advance(1000);
    T.eq(s.w().sent.length, 0);
    T.eq(s.workers.length, 1);
  });

  T.test('Runner: Ladefehler', function () {
    const s = setup();
    s.w().reply({ type: 'failed', message: 'offline' });
    T.eq(s.client.status(), 'failed');
    T.eq(s.log.status[s.log.status.length - 1], 'failed:offline');
    s.client.runNow('a');
    T.eq(s.w().sent.length, 0);
  });
})();
