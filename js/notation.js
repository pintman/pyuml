/* UML-Textnotation für Klassen, Attribute, Methoden und Linienbeschriftungen (reine Funktionen). */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  const STEREOTYPES = { abstract: '«abstract»', interface: '«interface»', enum: '«enumeration»' };
  const LABELED = { association: true, aggregation: true, composition: true };

  function attributeText(a) {
    return a.visibility + ' ' + a.name + (a.type ? ': ' + a.type : '');
  }

  function paramText(p) {
    return p.name + (p.type ? ': ' + p.type : '') + (p.default != null ? ' = ' + p.default : '');
  }

  /** Konstruktor (__init__) erscheint mit dem Klassennamen und ohne Rückgabetyp; Rückgabe None als void. */
  function methodText(m, className) {
    const ctor = m.name === '__init__' && className;
    const returns = m.returns === 'None' ? 'void' : m.returns;
    return m.visibility + ' ' + (ctor ? className : m.name) + '(' + m.params.map(paramText).join(', ') + ')' +
      (returns && !ctor ? ': ' + returns : '');
  }

  /** Klasse → { stereotype, name, nameItalic, sections: [[{text, italic, underline}]] } */
  function classView(cls) {
    const view = {
      stereotype: STEREOTYPES[cls.kind] || null,
      name: cls.name,
      nameItalic: cls.kind === 'abstract',
      sections: []
    };
    if (cls.kind === 'external') return view;      // nur Namensbereich
    const middle = (cls.literals || []).map(function (l) { return { text: l, italic: false, underline: false }; })
      .concat(cls.attributes.map(function (a) {
        return { text: attributeText(a), italic: false, underline: !!a.static };
      }));
    const methods = cls.methods.map(function (m) {
      return { text: methodText(m, cls.name), italic: !!m.abstract, underline: !!m.static };
    });
    view.sections = [middle, methods];
    return view;
  }

  /** Beziehung → { head, tail } (nur Multiplizitäten, nur Assoziation/Aggregation/Komposition). */
  function edgeLabels(rel) {
    if (!LABELED[rel.kind]) return { head: null, tail: null };
    return { head: rel.targetMult || null, tail: rel.sourceMult || null };
  }

  P.Notation = {
    attributeText: attributeText,
    methodText: methodText,
    paramText: paramText,
    classView: classView,
    edgeLabels: edgeLabels
  };
})(globalThis);
