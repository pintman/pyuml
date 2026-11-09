(function () {
  function fakeStore() {
    const data = {};
    return {
      data: data,
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); }
    };
  }

  T.test('Storage: erster Start liefert null, danach gespeicherten Text', function () {
    const store = fakeStore();
    const s = PyUML.createStorage(store);
    T.eq(s.load(), null);
    s.save('class A: pass');
    T.eq(PyUML.createStorage(store).load(), 'class A: pass');
    T.eq(store.data['pyuml.source'], 'class A: pass');
  });

  T.test('Storage: Fehler beim Zugriff werden abgefangen', function () {
    const broken = { getItem: function () { throw new Error('denied'); }, setItem: function () { throw new Error('quota'); } };
    const s = PyUML.createStorage(broken);
    T.eq(s.load(), null);
    s.save('x');
    T.eq(PyUML.createStorage(null).load(), null);
  });

  T.test('Beispielprogramm vorhanden', function () {
    T.ok(PyUML.EXAMPLE.indexOf('class Fahrzeug(ABC)') >= 0);
  });
})();
