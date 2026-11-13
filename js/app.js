/* Verdrahtung: Editor → Analyse (Worker) → Layout (ELK) → SVG → Viewport. */
(function (G) {
  'use strict';
  const P = G.PyUML;
  const $ = function (id) { return document.getElementById(id); };

  const els = {
    panes: $('panes'), editorPane: $('editor-pane'), splitter: $('splitter'),
    diagram: $('diagram'), message: $('diagram-message'),
    error: $('status-error'), warnings: $('status-warnings'),
    fileInput: $('file-input')
  };

  let storage;
  try { storage = P.createStorage(G.localStorage); } catch (e) { storage = P.createStorage(null); }
  let noticeTimer = null;
  // Startreihenfolge: geteilter Link → gespeicherter Stand → Beispiel
  const shared = takeSharedCode();
  if (shared != null) storage.save(shared);
  const saved = storage.load();
  const editor = P.createEditor($('editor'), shared != null ? shared : saved != null ? saved : P.EXAMPLE);
  let fileName = 'programm.py';
  let hasDiagram = false;
  let renderSeq = 0;

  // ---- Geteilter Link ----
  /** Liest #code=… und entfernt das Fragment. → Quelltext oder null (kein/ungültiger Link) */
  function takeSharedCode() {
    const res = P.Share.readHash(G.location.hash);
    if (!res) return null;
    G.history.replaceState(null, '', G.location.pathname + G.location.search);
    if (res.error) { notify('Link konnte nicht gelesen werden', true); return null; }
    return res.code;
  }

  G.addEventListener('hashchange', function () {
    const code = takeSharedCode();
    if (code != null) editor.setValue(code);            // onChange speichert und analysiert
  });

  // ---- Meldungen ----
  function notify(text, isError) {
    const el = $('notice');
    el.textContent = text;
    el.classList.toggle('error', !!isError);
    el.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { el.hidden = true; }, isError ? 6000 : 3000);
  }

  function showMessage(text, isError) {
    els.message.textContent = text || '';
    els.message.hidden = !text;
    els.message.classList.toggle('error', !!isError);
  }

  function showError(err) {
    if (!err) {
      els.error.hidden = true;
      els.error.textContent = '';
      editor.clearError();
      return;
    }
    els.error.textContent = (err.line != null ? 'Zeile ' + err.line + ': ' : '') + 'Syntaxfehler – ' + err.message;
    els.error.hidden = false;
    editor.markError(err.line);
  }

  function showWarnings(list) {
    els.warnings.innerHTML = '';
    (list || []).forEach(function (w) {
      const li = document.createElement('li');
      li.textContent = (w.line != null ? 'Zeile ' + w.line + ': ' : '') + w.message;
      if (w.line != null) li.addEventListener('click', function () { editor.gotoLine(w.line); });
      els.warnings.appendChild(li);
    });
    els.warnings.hidden = !(list && list.length);
  }

  // ---- Diagramm ----
  const viewport = P.createViewport(els.diagram, { onClassClick: function (line) { editor.gotoLine(line); } });
  $('btn-fit').addEventListener('click', function () { viewport.fit(); });

  let elk = null, measure = null;
  function ensureLayout() {
    if (!elk) {
      if (typeof G.ELK !== 'function') throw new Error('Layout-Bibliothek ELK konnte nicht geladen werden.');
      elk = new G.ELK();
      measure = P.Layout.canvasMeasure(document);
    }
  }

  function showModel(model) {
    showError(null);
    showWarnings(model.warnings);
    els.diagram.classList.remove('stale');
    if (!model.classes.length) {
      els.diagram.innerHTML = '';
      viewport.clear();
      hasDiagram = false;
      showMessage('Keine Klassen gefunden');
      return;
    }
    const seq = ++renderSeq;
    try { ensureLayout(); } catch (e) { showMessage(e.message, true); return; }
    P.Layout.layout(model, measure, elk).then(function (laidOut) {
      if (seq !== renderSeq) return;                       // inzwischen neueres Modell
      els.diagram.innerHTML = P.Render.renderSvg(model, laidOut);
      const key = model.classes.map(function (c) { return c.name; }).sort().join('\n');
      viewport.setSvg(els.diagram.querySelector('svg'), key);
      hasDiagram = true;
      showMessage('');
    }).catch(function (e) {
      if (seq === renderSeq) showMessage('Diagramm konnte nicht berechnet werden: ' + (e && e.message || e), true);
    });
  }

  function onSyntaxError(err) {
    showError(err);
    renderSeq++;                                           // laufendes Layout verwerfen
    if (hasDiagram) els.diagram.classList.add('stale');
  }

  // ---- Analyse ----
  let client;
  try {
    client = P.createAnalyzerClient({
      worker: new Worker('js/worker.js'),
      onResult: showModel,
      onError: onSyntaxError,
      onStatus: function (status, msg) {
        if (status === 'loading') showMessage('Python wird geladen …');
        else if (status === 'ready') { showMessage(''); client.analyzeNow(editor.getValue()); }
        else if (status === 'failed') {
          showMessage('Python konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite ' +
            'über einen Webserver öffnen (z. B. python3 -m http.server).' + (msg ? '\n(' + msg + ')' : ''), true);
        }
      }
    });
  } catch (e) {
    showMessage('Python konnte nicht geladen werden: ' + e.message, true);
  }

  editor.onChange(function (text) {
    storage.save(text);
    if (client && client.status() === 'ready') client.update(text);
  });

  // ---- Schaltflächen ----
  $('btn-example').addEventListener('click', function () {
    if (editor.getValue() === P.EXAMPLE) return;
    if (G.confirm('Den aktuellen Quelltext durch das Beispielprogramm ersetzen?')) editor.setValue(P.EXAMPLE);
  });

  $('btn-open').addEventListener('click', function () { els.fileInput.click(); });
  els.fileInput.addEventListener('change', function () {
    const file = els.fileInput.files && els.fileInput.files[0];
    if (!file) return;
    file.text().then(function (text) {
      fileName = file.name;
      editor.setValue(text);
    });
    els.fileInput.value = '';
  });

  $('btn-save').addEventListener('click', function () {
    const blob = new Blob([editor.getValue()], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = /\.py$/i.test(fileName) ? fileName : fileName + '.py';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $('btn-share').addEventListener('click', function () {
    const url = P.Share.buildUrl(G.location.href, editor.getValue());
    const long = url.length > 8000 ? ' – Link ist sehr lang, manche Programme kürzen ihn' : '';
    function fallback() { G.prompt('Link zum Kopieren:', url); }
    if (G.navigator.clipboard && G.navigator.clipboard.writeText) {
      G.navigator.clipboard.writeText(url).then(function () { notify('Link kopiert' + long); }, fallback);
    } else {
      fallback();
    }
  });

  // ---- Verschiebbare Trennlinie ----
  els.splitter.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    els.splitter.setPointerCapture(e.pointerId);
    els.splitter.classList.add('dragging');
    function move(ev) {
      const r = els.panes.getBoundingClientRect();
      const pct = Math.min(85, Math.max(15, (ev.clientX - r.left) / r.width * 100));
      els.editorPane.style.flexBasis = pct + '%';
    }
    function up() {
      els.splitter.classList.remove('dragging');
      els.splitter.removeEventListener('pointermove', move);
      els.splitter.removeEventListener('pointerup', up);
      editor.refresh();
    }
    els.splitter.addEventListener('pointermove', move);
    els.splitter.addEventListener('pointerup', up);
  });

  G.PyUML.app = { editor: editor, client: client };   // für Tests/Konsole
})(globalThis);
