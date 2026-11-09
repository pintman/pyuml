/* SVG-Renderer: Modell + ELK-Ergebnis → SVG-String in UML-2.5-Notation. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Linienart und Marker je Beziehungsart
  const STYLE = {
    generalization: { dashed: false, end: 'm-triangle', start: null },
    realization: { dashed: true, end: 'm-triangle', start: null },
    association: { dashed: false, end: 'm-arrow', start: null },
    aggregation: { dashed: false, end: 'm-arrow', start: 'm-diamond-hollow' },
    composition: { dashed: false, end: 'm-arrow', start: 'm-diamond-filled' },
    dependency: { dashed: true, end: 'm-arrow', start: null }
  };

  const DEFS =
    '<defs>' +
    '<marker id="m-triangle" viewBox="0 0 20 20" refX="20" refY="10" markerWidth="14" markerHeight="14" ' +
    'markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M0,1 L20,10 L0,19 Z" class="m-hollow"/></marker>' +
    '<marker id="m-arrow" viewBox="0 0 20 20" refX="20" refY="10" markerWidth="12" markerHeight="12" ' +
    'markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M0,2 L20,10 L0,18" class="m-open"/></marker>' +
    '<marker id="m-diamond-hollow" viewBox="0 0 28 14" refX="28" refY="7" markerWidth="20" markerHeight="10" ' +
    'markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M0,7 L14,1 L28,7 L14,13 Z" class="m-hollow"/></marker>' +
    '<marker id="m-diamond-filled" viewBox="0 0 28 14" refX="28" refY="7" markerWidth="20" markerHeight="10" ' +
    'markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
    '<path d="M0,7 L14,1 L28,7 L14,13 Z" class="m-filled"/></marker>' +
    '</defs>';

  function edgePoints(edge) {
    const pts = [];
    (edge.sections || []).forEach(function (s) {
      pts.push(s.startPoint);
      (s.bendPoints || []).forEach(function (b) { pts.push(b); });
      pts.push(s.endPoint);
    });
    return pts;
  }

  function textAttrs(line) {
    return (line.italic ? ' font-style="italic"' : '') + (line.underline ? ' text-decoration="underline"' : '');
  }

  function renderClass(cls, node, box) {
    const M = P.Layout.METRICS;
    const view = P.Notation.classView(cls);
    const w = node.width, cx = w / 2;
    const base = M.padY + M.fontSize;          // Grundlinie der ersten Zeile im Abschnitt
    let s = '<g class="uml-class uml-' + cls.kind + '" data-name="' + esc(cls.name) + '"' +
      (cls.line != null ? ' data-line="' + cls.line + '"' : '') +
      ' transform="translate(' + node.x + ',' + node.y + ')">';
    s += '<rect width="' + w + '" height="' + node.height + '" class="box"/>';
    let y = base;
    if (view.stereotype) {
      s += '<text x="' + cx + '" y="' + y + '" text-anchor="middle" class="stereotype">' + esc(view.stereotype) + '</text>';
      y += M.lineHeight;
    }
    s += '<text x="' + cx + '" y="' + y + '" text-anchor="middle" font-weight="bold" class="name"' +
      (view.nameItalic ? ' font-style="italic"' : '') + '>' + esc(view.name) + '</text>';
    box.sections.forEach(function (sec) {
      s += '<line x1="0" y1="' + sec.y + '" x2="' + w + '" y2="' + sec.y + '" class="sep"/>';
      sec.lines.forEach(function (l) {
        s += '<text x="' + M.padX + '" y="' + (l.y + M.fontSize) + '"' + textAttrs(l) + '>' + esc(l.text) + '</text>';
      });
    });
    return s + '</g>';
  }

  function renderEdge(edge, rel) {
    let pts = edgePoints(edge);
    if (edge.reversed) pts = pts.slice().reverse();     // Darstellung in UML-Richtung (Unter → Oberklasse)
    if (pts.length < 2) return '';
    const st = STYLE[rel.kind] || STYLE.association;
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ',' + p.y; }).join(' ');
    let s = '<path d="' + d + '" class="edge edge-' + rel.kind + (st.dashed ? ' dashed' : '') + '"' +
      ' data-kind="' + rel.kind + '"' +
      (st.start ? ' marker-start="url(#' + st.start + ')"' : '') +
      ' marker-end="url(#' + st.end + ')"/>';
    (edge.labels || []).forEach(function (l) {
      const M = P.Layout.METRICS;
      s += '<text x="' + (l.x + M.labelPad) + '" y="' + (l.y + M.fontSize) + '" class="mult">' + esc(l.text) + '</text>';
    });
    return s;
  }

  /** model, laidOut = {graph, boxes} → SVG-String */
  function renderSvg(model, laidOut) {
    const g = laidOut.graph;
    const nodes = {};
    (g.children || []).forEach(function (n) { nodes[n.id] = n; });
    const width = Math.ceil(g.width || 0), height = Math.ceil(g.height || 0);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" class="uml" viewBox="0 0 ' + width + ' ' + height + '"' +
      ' data-width="' + width + '" data-height="' + height + '">' + DEFS;
    s += '<g class="edges">';
    (g.edges || []).forEach(function (e) {
      const rel = model.relations[Number(e.id.slice(1))];
      if (rel) s += renderEdge(e, rel);
    });
    s += '</g><g class="classes">';
    model.classes.forEach(function (c) {
      if (nodes[c.name]) s += renderClass(c, nodes[c.name], laidOut.boxes[c.name]);
    });
    return s + '</g></svg>';
  }

  P.Render = { renderSvg: renderSvg, STYLE: STYLE, escape: esc };
})(globalThis);
