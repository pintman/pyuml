/* Python-Editor auf Basis von CodeMirror 5 (Fallback: <textarea>, falls das CDN nicht lädt). */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  /** → { getValue, setValue, onChange(fn), markError(line), clearError(), gotoLine(line), focus } (Zeilen 1-basiert) */
  P.createEditor = function (parent, value) {
    if (typeof G.CodeMirror !== 'function') return textareaEditor(parent, value);

    const cm = G.CodeMirror(parent, {
      value: value,
      mode: { name: 'python', version: 3 },
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      smartIndent: true,
      electricChars: true,
      styleActiveLine: true,
      extraKeys: {
        Tab: function (cm) {
          if (cm.somethingSelected()) cm.indentSelection('add');
          else cm.replaceSelection('    ', 'end');
        },
        'Shift-Tab': function (cm) { cm.indentSelection('subtract'); }
      }
    });
    let errorLine = null, gotoMark = null;

    return {
      getValue: function () { return cm.getValue(); },
      setValue: function (v) { cm.setValue(v); cm.clearHistory(); },
      onChange: function (fn) { cm.on('changes', function () { fn(cm.getValue()); }); },
      markError: function (line) {
        this.clearError();
        if (line == null) return;
        errorLine = cm.addLineClass(Math.max(0, Math.min(line - 1, cm.lineCount() - 1)), 'background', 'cm-error-line');
      },
      clearError: function () {
        if (errorLine) cm.removeLineClass(errorLine, 'background', 'cm-error-line');
        errorLine = null;
      },
      gotoLine: function (line) {
        const l = Math.max(0, line - 1);
        if (gotoMark) cm.removeLineClass(gotoMark, 'background', 'cm-goto-line');
        gotoMark = cm.addLineClass(l, 'background', 'cm-goto-line');
        cm.setSelection({ line: l, ch: 0 }, { line: l, ch: cm.getLine(l).length });
        cm.scrollIntoView({ line: l, ch: 0 }, 80);
        cm.focus();
        const mark = gotoMark;
        setTimeout(function () {
          if (gotoMark === mark) { cm.removeLineClass(mark, 'background', 'cm-goto-line'); gotoMark = null; }
        }, 1500);
      },
      focus: function () { cm.focus(); },
      refresh: function () { cm.refresh(); }
    };
  };

  function textareaEditor(parent, value) {
    const ta = document.createElement('textarea');
    ta.className = 'fallback';
    ta.spellcheck = false;
    ta.value = value;
    parent.appendChild(ta);
    function lineStart(line) {
      const lines = ta.value.split('\n');
      let pos = 0;
      for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
      return { start: pos, end: pos + (lines[line - 1] || '').length };
    }
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
    });
    return {
      getValue: function () { return ta.value; },
      setValue: function (v) { ta.value = v; ta.dispatchEvent(new Event('input')); },
      onChange: function (fn) { ta.addEventListener('input', function () { fn(ta.value); }); },
      markError: function () {},
      clearError: function () {},
      gotoLine: function (line) { const r = lineStart(line); ta.focus(); ta.setSelectionRange(r.start, r.end); },
      focus: function () { ta.focus(); },
      refresh: function () {}
    };
  }
})(globalThis);
