/* Zoomen/Verschieben des Diagramms über die viewBox; Klick auf Klasse meldet deren Zeile. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};
  const PAD = 20;
  const CLICK_TOLERANCE = 4;

  /** container: Element, das das <svg> enthält. opts.onClassClick(line) */
  P.createViewport = function (container, opts) {
    let svg = null, content = null, view = null, key = null;
    const pointers = new Map();
    let drag = null;       // { x, y, moved }
    let pinch = null;      // { dist, view, mid }

    function apply() {
      if (svg && view) svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
    }

    function fit() {
      if (!content) return;
      view = { x: -PAD, y: -PAD, w: content.w + 2 * PAD, h: content.h + 2 * PAD };
      apply();
    }

    /** Pixel → Diagrammeinheiten (preserveAspectRatio meet: der größere Faktor zählt). */
    function scale() {
      const r = svg.getBoundingClientRect();
      return Math.max(view.w / (r.width || 1), view.h / (r.height || 1));
    }

    function toDiagram(clientX, clientY) {
      const r = svg.getBoundingClientRect();
      const s = scale();
      // Zentrierung durch xMidYMid berücksichtigen
      const ox = (r.width * s - view.w) / 2, oy = (r.height * s - view.h) / 2;
      return { x: view.x - ox + (clientX - r.left) * s, y: view.y - oy + (clientY - r.top) * s };
    }

    function zoomAt(clientX, clientY, factor) {
      const p = toDiagram(clientX, clientY);
      const w = view.w * factor;
      if (w < 50 || w > 50000) return;
      view = { x: p.x - (p.x - view.x) * factor, y: p.y - (p.y - view.y) * factor, w: w, h: view.h * factor };
      apply();
    }

    container.addEventListener('wheel', function (e) {
      if (!svg) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX, e.clientY, Math.exp(dy * 0.0015));
    }, { passive: false });

    container.addEventListener('pointerdown', function (e) {
      if (!svg) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      container.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, target: e.target };
      } else if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
        drag = null;
      }
    });

    container.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.dist / dist);
        pinch.dist = dist;
      } else if (drag) {
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > CLICK_TOLERANCE) {
          drag.moved = true;
          container.classList.add('panning');
        }
        if (drag.moved) {
          const s = scale();
          view.x -= (e.clientX - drag.x) * s;
          view.y -= (e.clientY - drag.y) * s;
          apply();
        }
        drag.x = e.clientX; drag.y = e.clientY;
      }
    });

    function end(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && !drag.moved && e.type === 'pointerup') {
        const g = drag.target && drag.target.closest ? drag.target.closest('.uml-class') : null;
        if (g && g.dataset.line && opts && opts.onClassClick) opts.onClassClick(Number(g.dataset.line));
      }
      if (pointers.size === 0) { drag = null; container.classList.remove('panning'); }
    }
    container.addEventListener('pointerup', end);
    container.addEventListener('pointercancel', end);

    return {
      /** Neues SVG übernehmen; gleicher Klassenschlüssel → Ausschnitt bleibt, sonst einpassen. */
      setSvg: function (el, newKey) {
        svg = el;
        content = { w: Number(el.dataset.width) || 0, h: Number(el.dataset.height) || 0 };
        if (view && key === newKey) apply();
        else fit();
        key = newKey;
      },
      clear: function () { svg = null; content = null; view = null; key = null; },
      fit: fit
    };
  };
})(globalThis);
