(function () {
  const N = PyUML.Notation;
  const fakeMeasure = function (text) { return text.length * 7; };

  function cls(name, extra) {
    return Object.assign({ name: name, line: 1, kind: 'class', attributes: [], methods: [], literals: [] }, extra || {});
  }

  // ---------------------------------------------------------------- 6.1 Notation

  T.test('Notation: privates typisiertes Attribut', function () {
    T.eq(N.attributeText({ name: '__kontostand', type: 'float', visibility: '-' }), '- __kontostand: float');
  });

  T.test('Notation: Attribut ohne Typ', function () {
    T.eq(N.attributeText({ name: 'wert', type: null, visibility: '+' }), '+ wert');
  });

  T.test('Notation: statisches Attribut unterstrichen, Beziehungsattribut bleibt', function () {
    const v = N.classView(cls('Bank', { attributes: [
      { name: 'anzahl', type: 'int', visibility: '+', static: true },
      { name: 'konten', type: 'list[Konto]', visibility: '+', static: false }] }));
    T.deepEq(v.sections[0], [
      { text: '+ anzahl: int', italic: false, underline: true },
      { text: '+ konten: list[Konto]', italic: false, underline: false }]);
  });

  T.test('Notation: Methode mit Rückgabe, abstrakt kursiv, statisch unterstrichen', function () {
    const m = { name: 'fahren', params: [{ name: 'km', type: 'int', default: '10' }], returns: 'float', visibility: '+', static: false, abstract: false };
    T.eq(N.methodText(m), '+ fahren(km: int = 10): float');
    T.eq(N.methodText({ name: 'kaufen', params: [], returns: 'None', visibility: '+' }), '+ kaufen(): void');
    T.eq(N.methodText({ name: 'f', params: [], returns: 'int | None', visibility: '+' }), '+ f(): int | None');
    T.eq(N.methodText({ name: 'f', params: [{ name: 'x', type: null, default: null }], returns: null, visibility: '#' }), '# f(x)');
    const v = N.classView(cls('Form', { kind: 'abstract', methods: [
      { name: 'flaeche', params: [], returns: 'float', visibility: '+', static: false, abstract: true },
      { name: 'neu', params: [], returns: null, visibility: '+', static: true, abstract: false },
      { name: '__init__', params: [{ name: 'seiten', type: 'int', default: null }], returns: 'None', visibility: '+', static: false, abstract: false }] }));
    T.deepEq(v.sections[1], [
      { text: '+ flaeche(): float', italic: true, underline: false },
      { text: '+ neu()', italic: false, underline: true },
      { text: '+ Form(seiten: int)', italic: false, underline: false }]);
  });

  T.test('Notation: Klassenarten', function () {
    const a = N.classView(cls('Form', { kind: 'abstract' }));
    T.eq(a.stereotype, '«abstract»'); T.ok(a.nameItalic);
    T.eq(N.classView(cls('Fahrbar', { kind: 'interface' })).stereotype, '«interface»');
    const e = N.classView(cls('Farbe', { kind: 'enum', literals: ['ROT', 'BLAU'] }));
    T.eq(e.stereotype, '«enumeration»');
    T.deepEq(e.sections[0].map(function (l) { return l.text; }), ['ROT', 'BLAU']);
    const n = N.classView(cls('Auto'));
    T.eq(n.stereotype, null); T.ok(!n.nameItalic);
    T.eq(n.sections.length, 2, 'leere Bereiche bleiben');
    T.eq(N.classView(cls('Exception', { kind: 'external' })).sections.length, 0, 'extern: nur Name');
  });

  T.test('Notation: nur Multiplizitäten als Linienbeschriftung', function () {
    T.deepEq(N.edgeLabels({ kind: 'association', targetMult: '*', sourceMult: null }), { head: '*', tail: null });
    T.deepEq(N.edgeLabels({ kind: 'composition', targetMult: '0..*', sourceMult: '1' }), { head: '0..*', tail: '1' });
    T.deepEq(N.edgeLabels({ kind: 'dependency', targetMult: '1', sourceMult: null }), { head: null, tail: null });
    T.deepEq(N.edgeLabels({ kind: 'generalization', targetMult: null, sourceMult: null }), { head: null, tail: null });
  });

  // ---------------------------------------------------------------- 6.2 Layout-Graph

  const MODEL = {
    classes: [cls('Tier', { kind: 'abstract' }), cls('Hund'), cls('Katze'), cls('Maus'),
      cls('Napf', { attributes: [{ name: 'x', type: 'int', visibility: '+', static: false }] })],
    relations: [
      { kind: 'generalization', source: 'Hund', target: 'Tier', targetMult: null, sourceMult: null, line: 3 },
      { kind: 'generalization', source: 'Katze', target: 'Tier', targetMult: null, sourceMult: null, line: 5 },
      { kind: 'generalization', source: 'Maus', target: 'Tier', targetMult: null, sourceMult: null, line: 7 },
      { kind: 'aggregation', source: 'Hund', target: 'Napf', targetMult: '1..*', sourceMult: '1', line: 4 },
      { kind: 'dependency', source: 'Katze', target: 'Napf', targetMult: null, sourceMult: null, line: 6 }]
  };

  T.test('Layout: Knoten in Modellreihenfolge mit gemessener Größe', function () {
    const g = PyUML.Layout.buildGraph(MODEL, fakeMeasure).graph;
    T.deepEq(g.children.map(function (c) { return c.id; }), ['Tier', 'Hund', 'Katze', 'Maus', 'Napf']);
    const M = PyUML.Layout.METRICS;
    const tier = g.children[0];
    // Header mit Stereotyp (2 Zeilen) + zwei leere Bereiche
    T.eq(tier.height, 2 * M.padY + 2 * M.lineHeight + 2 * M.emptySection);
    const napf = g.children[4];
    T.eq(napf.width, Math.max(M.minWidth, Math.ceil('+ x: int'.length * 7 + 2 * M.padX)));
    T.eq(napf.height, 2 * M.padY + M.lineHeight + (2 * M.padY + M.lineHeight) + M.emptySection);
  });

  T.test('Layout: Vererbungskanten umgedreht, übrige Quelle → Ziel', function () {
    const g = PyUML.Layout.buildGraph(MODEL, fakeMeasure).graph;
    T.deepEq([g.edges[0].sources[0], g.edges[0].targets[0], g.edges[0].reversed], ['Tier', 'Hund', true]);
    T.deepEq([g.edges[3].sources[0], g.edges[3].targets[0], g.edges[3].reversed], ['Hund', 'Napf', false]);
    T.eq(g.layoutOptions['elk.direction'], 'DOWN');
    T.eq(g.layoutOptions['elk.layered.considerModelOrder.strategy'], 'NODES_AND_EDGES');
  });

  T.test('Layout: Labels nur Multiplizitäten mit HEAD/TAIL', function () {
    const g = PyUML.Layout.buildGraph(MODEL, fakeMeasure).graph;
    T.deepEq(g.edges[3].labels.map(function (l) { return [l.text, l.layoutOptions['elk.edgeLabels.placement']]; }),
      [['1..*', 'HEAD'], ['1', 'TAIL']]);
    T.eq(g.edges[0].labels.length, 0);
    T.eq(g.edges[4].labels.length, 0);
  });

  // ---------------------------------------------------------------- 6.3 Renderer

  /** Pseudo-ELK-Ergebnis: Knoten nebeneinander, gerade Kanten. */
  function fakeLayout(model) {
    const built = PyUML.Layout.buildGraph(model, fakeMeasure);
    const g = built.graph;
    let x = 0;
    g.children.forEach(function (c) { c.x = x; c.y = 0; x += c.width + 40; });
    const pos = {};
    g.children.forEach(function (c) { pos[c.id] = c; });
    g.edges.forEach(function (e) {
      const s = pos[e.sources[0]], t = pos[e.targets[0]];
      e.sections = [{ startPoint: { x: s.x + 10, y: s.height }, bendPoints: [{ x: s.x + 10, y: 300 }], endPoint: { x: t.x + 10, y: t.height } }];
      e.labels.forEach(function (l, i) { l.x = t.x + 12; l.y = t.height + 4 + 20 * i; });
    });
    g.width = x; g.height = 400;
    return built;
  }

  function full() {
    return {
      classes: [
        cls('Fahrbar', { kind: 'interface', line: 1 }),
        cls('Auto', { line: 4,
          attributes: [{ name: 'anzahl', type: 'int', visibility: '+', static: true, line: 5 },
            { name: 'motor', type: 'Motor', visibility: '+', static: false, line: 7 }],
          methods: [{ name: 'neu', params: [], returns: null, visibility: '+', static: true, abstract: false, line: 8 },
            { name: 'fahren', params: [], returns: null, visibility: '+', static: false, abstract: true, line: 9 }] }),
        cls('Motor', { line: 12 }), cls('Rad', { line: 14 }), cls('Fahrer', { line: 16 }),
        cls('Halter', { line: 18 }), cls('Garage', { line: 20 }), cls('Exception', { kind: 'external', line: null })],
      relations: [
        { kind: 'realization', source: 'Auto', target: 'Fahrbar', targetMult: null, sourceMult: null },
        { kind: 'composition', source: 'Auto', target: 'Motor', targetMult: '1', sourceMult: null },
        { kind: 'aggregation', source: 'Garage', target: 'Auto', targetMult: '0..*', sourceMult: '1' },
        { kind: 'association', source: 'Halter', target: 'Auto', targetMult: '*', sourceMult: null },
        { kind: 'dependency', source: 'Fahrer', target: 'Auto', targetMult: null, sourceMult: null },
        { kind: 'generalization', source: 'Rad', target: 'Exception', targetMult: null, sourceMult: null }]
    };
  }

  function pathFor(svg, kind) {
    const m = svg.match(new RegExp('<path [^>]*data-kind="' + kind + '"[^>]*>'));
    return m ? m[0] : null;
  }

  T.test('Render: Marker je Beziehungsart', function () {
    const model = full();
    const svg = PyUML.Render.renderSvg(model, fakeLayout(model));
    ['m-triangle', 'm-arrow', 'm-diamond-hollow', 'm-diamond-filled'].forEach(function (id) {
      T.ok(svg.indexOf('<marker id="' + id + '"') >= 0, id);
    });
    const gen = pathFor(svg, 'generalization');
    T.ok(/marker-end="url\(#m-triangle\)"/.test(gen) && !/dashed/.test(gen) && !/marker-start/.test(gen), gen);
    const real = pathFor(svg, 'realization');
    T.ok(/marker-end="url\(#m-triangle\)"/.test(real) && /dashed/.test(real), real);
    const comp = pathFor(svg, 'composition');
    T.ok(/marker-start="url\(#m-diamond-filled\)"/.test(comp) && /marker-end="url\(#m-arrow\)"/.test(comp), comp);
    const aggr = pathFor(svg, 'aggregation');
    T.ok(/marker-start="url\(#m-diamond-hollow\)"/.test(aggr), aggr);
    const assoc = pathFor(svg, 'association');
    T.ok(/marker-end="url\(#m-arrow\)"/.test(assoc) && !/marker-start/.test(assoc) && !/dashed/.test(assoc), assoc);
    const dep = pathFor(svg, 'dependency');
    T.ok(/marker-end="url\(#m-arrow\)"/.test(dep) && /dashed/.test(dep), dep);
  });

  T.test('Render: Vererbungslinie in UML-Richtung (endet an der Oberklasse)', function () {
    const model = full();
    const lo = fakeLayout(model);
    const svg = PyUML.Render.renderSvg(model, lo);
    const fahrbar = lo.graph.children[0];
    const d = pathFor(svg, 'realization').match(/d="([^"]+)"/)[1];
    const last = d.split(' ').pop().slice(1).split(',').map(Number);
    T.deepEq(last, [fahrbar.x + 10, fahrbar.height]);
  });

  T.test('Render: statische Member unterstrichen, abstrakte kursiv, data-line', function () {
    const model = full();
    const svg = PyUML.Render.renderSvg(model, fakeLayout(model));
    T.ok(/<text [^>]*text-decoration="underline"[^>]*>\+ anzahl: int<\/text>/.test(svg), 'anzahl');
    T.ok(/<text [^>]*text-decoration="underline"[^>]*>\+ neu\(\)<\/text>/.test(svg), 'neu');
    T.ok(/<text [^>]*font-style="italic"[^>]*>\+ fahren\(\)<\/text>/.test(svg), 'fahren');
    T.ok(/<text [^>]*>\+ motor: Motor<\/text>/.test(svg), 'Attribut mit Beziehung bleibt');
    T.ok(svg.indexOf('data-name="Motor" data-line="12"') >= 0, 'data-line');
    T.ok(svg.indexOf('«interface»') >= 0);
  });

  T.test('Render: Linien nur mit Multiplizitäten beschriftet', function () {
    const model = full();
    const svg = PyUML.Render.renderSvg(model, fakeLayout(model));
    const labels = (svg.match(/<text [^>]*class="mult"[^>]*>[^<]*<\/text>/g) || [])
      .map(function (t) { return t.replace(/<[^>]+>/g, ''); });
    T.deepEq(labels.slice().sort(), ['*', '0..*', '1', '1'].sort());
    T.ok(svg.indexOf('«use»') < 0);
    // Klassensymbol extern: nur Name, keine Trennlinien
    const ext = svg.match(/<g class="uml-class uml-external"[^]*?<\/g>/)[0];
    T.ok(ext.indexOf('class="sep"') < 0, ext);
  });

  T.test('Render: Escaping', function () {
    T.eq(PyUML.Render.escape('dict[str, "A"<B>&]'), 'dict[str, &quot;A&quot;&lt;B&gt;&amp;]');
  });
})();
