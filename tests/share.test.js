(function () {
  const S = PyUML.Share;
  const SAFE = /^[A-Za-z0-9_-]*$/;

  function roundTrip(text) {
    const enc = S.encode(text);
    T.ok(SAFE.test(enc), 'nur URL-sichere Zeichen: ' + enc);
    T.eq(S.decode(enc), text);
  }

  T.test('Share: Round-Trip ASCII', function () { roundTrip('class A:\n    pass\n'); });
  T.test('Share: Round-Trip Umlaute', function () { roundTrip('# Größe, Übermaß, ähnlich: ß'); });
  T.test('Share: Round-Trip Emoji', function () { roundTrip('# Größe 🚗 👩‍🏫'); });
  T.test('Share: Round-Trip Tab und Zeilenumbrüche', function () { roundTrip('a\tb\r\nc\n\n\td'); });
  T.test('Share: Round-Trip leerer Text', function () {
    T.eq(S.encode(''), '');
    T.eq(S.decode(''), '');
  });
  T.test('Share: Round-Trip Beispielprogramm', function () { roundTrip(PyUML.EXAMPLE); });
  T.test('Share: Round-Trip alle Restlängen ohne Auffüllzeichen', function () {
    ['a', 'ab', 'abc', 'abcd', 'ä', 'äb'].forEach(function (t) {
      T.ok(S.encode(t).indexOf('=') < 0);
      roundTrip(t);
    });
  });

  T.test('Share: decode wirft bei ungültigen Zeichen', function () {
    T.throws(function () { S.decode('%%%'); });
    T.throws(function () { S.decode('ab+c'); });
  });
  T.test('Share: decode wirft bei ungültigem UTF-8', function () {
    T.throws(function () { S.decode('_w'); });          // Byte 0xFF
    T.throws(function () { S.decode(S.encode('ä').slice(0, 2)); }); // halbe Sequenz
  });

  T.test('Share: buildUrl ersetzt Fragment der Basis', function () {
    const url = S.buildUrl('https://example.org/pyuml/#alt', '# Größe 🚗');
    T.ok(url.indexOf('https://example.org/pyuml/#code=') === 0, url);
    T.ok(SAFE.test(url.slice('https://example.org/pyuml/#code='.length)));
    T.eq(S.buildUrl('https://example.org/pyuml/', 'x'), 'https://example.org/pyuml/#code=' + S.encode('x'));
  });

  T.test('Share: readHash', function () {
    T.eq(S.readHash(''), null);
    T.eq(S.readHash('#'), null);
    T.eq(S.readHash('#foo=1'), null);
    T.deepEq(S.readHash('#code=' + S.encode('class A: pass')), { code: 'class A: pass' });
    T.deepEq(S.readHash('#foo=1&code=' + S.encode('ä')), { code: 'ä' });
    T.deepEq(S.readHash('#code='), { code: '' });
    T.deepEq(S.readHash('#code=%%%'), { error: true });
    T.deepEq(S.readHash('#code=_w'), { error: true });
  });

  T.test('Share: Link-Round-Trip', function () {
    const text = '# Größe 🚗\tTab\nclass Auto:\n    pass\n';
    const url = S.buildUrl('https://example.org/pyuml/', text);
    T.deepEq(S.readHash(url.slice(url.indexOf('#'))), { code: text });
  });
})();
