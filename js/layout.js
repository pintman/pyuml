/* Modell → ELK-Graph (Größen per Textmessung), Layout per ELK „layered“. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  const M = {
    font: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    lineHeight: 18,
    padX: 10,
    padY: 5,
    emptySection: 10,
    minWidth: 80,
    labelPad: 2
  };

  const OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
    'elk.layered.considerModelOrder.components': 'MODEL_ORDER',
    'elk.separateConnectedComponents': 'true',
    'elk.spacing.componentComponent': '40',
    'elk.spacing.nodeNode': '40',
    'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    'elk.spacing.edgeNode': '20',
    'elk.spacing.edgeEdge': '12',
    'elk.spacing.edgeLabel': '4',
    'elk.layered.spacing.edgeNodeBetweenLayers': '20',
    'elk.aspectRatio': '1.6'
  };

  const REVERSED = { generalization: true, realization: true };

  /** Geometrie eines Klassensymbols (relativ zur linken oberen Ecke). measure(text, {bold, italic}) → Breite. */
  function measureBox(view, measure) {
    const lh = M.lineHeight;
    let width = measure(view.name, { bold: true, italic: view.nameItalic });
    if (view.stereotype) width = Math.max(width, measure(view.stereotype, {}));
    const header = { y: 0, height: 2 * M.padY + lh * (view.stereotype ? 2 : 1) };
    let y = header.height;
    const sections = view.sections.map(function (lines) {
      const s = { y: y, height: lines.length ? 2 * M.padY + lh * lines.length : M.emptySection, lines: [] };
      lines.forEach(function (l, i) {
        width = Math.max(width, measure(l.text, { italic: l.italic }));
        s.lines.push({ text: l.text, italic: l.italic, underline: l.underline, y: y + M.padY + lh * i });
      });
      y += s.height;
      return s;
    });
    return {
      width: Math.max(M.minWidth, Math.ceil(width + 2 * M.padX)),
      height: y,
      header: header,
      sections: sections
    };
  }

  function label(text, placement, measure) {
    return {
      text: text,
      width: Math.ceil(measure(text, {}) + 2 * M.labelPad),
      height: M.lineHeight,
      layoutOptions: { 'elk.edgeLabels.placement': placement }
    };
  }

  /** Modell → { graph (ELK-JSON), boxes: {name: box} } */
  function buildGraph(model, measure) {
    const boxes = {};
    const children = model.classes.map(function (c) {
      const box = measureBox(P.Notation.classView(c), measure);
      boxes[c.name] = box;
      return { id: c.name, width: box.width, height: box.height };
    });
    const edges = model.relations.map(function (r, i) {
      const rev = !!REVERSED[r.kind];
      const lbl = P.Notation.edgeLabels(r);
      const labels = [];
      if (lbl.head) labels.push(label(lbl.head, 'HEAD', measure));
      if (lbl.tail) labels.push(label(lbl.tail, 'TAIL', measure));
      return {
        id: 'e' + i,
        sources: [rev ? r.target : r.source],
        targets: [rev ? r.source : r.target],
        labels: labels,
        reversed: rev,
        kind: r.kind
      };
    });
    return {
      graph: { id: 'root', layoutOptions: Object.assign({}, OPTIONS), children: children, edges: edges },
      boxes: boxes
    };
  }

  /** Canvas-basierte Textmessung mit der Diagrammschrift. */
  function canvasMeasure(doc) {
    const ctx = doc.createElement('canvas').getContext('2d');
    return function (text, style) {
      ctx.font = (style.italic ? 'italic ' : '') + (style.bold ? 'bold ' : '') + M.fontSize + 'px ' + M.font;
      return ctx.measureText(text).width;
    };
  }

  /** → Promise<{ graph: ELK-Ergebnis, boxes }> */
  function layout(model, measure, elk) {
    const built = buildGraph(model, measure);
    return elk.layout(built.graph).then(function (g) { return { graph: g, boxes: built.boxes }; });
  }

  P.Layout = { METRICS: M, OPTIONS: OPTIONS, measureBox: measureBox, buildGraph: buildGraph,
    canvasMeasure: canvasMeasure, layout: layout };
})(globalThis);
