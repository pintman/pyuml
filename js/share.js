/* Teilen per Link: Quelltext als UTF-8/Base64url im URL-Fragment (#code=…). DOM-frei. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};
  const KEY = 'code';

  /** Text → Base64url ohne Auffüllzeichen */
  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return G.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** Base64url → Text; wirft bei ungültigen Zeichen oder ungültigem UTF-8 */
  function decode(str) {
    if (!/^[A-Za-z0-9_-]*$/.test(str) || str.length % 4 === 1) throw new Error('Ungültige Kodierung');
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const bin = G.atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  /** Link auf baseHref (ohne dessen Fragment) mit kodiertem Text */
  function buildUrl(baseHref, text) {
    const i = baseHref.indexOf('#');
    return (i >= 0 ? baseHref.slice(0, i) : baseHref) + '#' + KEY + '=' + encode(text);
  }

  /** location.hash → { code } | { error: true } | null (kein Schlüssel) */
  function readHash(hash) {
    if (!hash) return null;
    const params = new URLSearchParams(hash.charAt(0) === '#' ? hash.slice(1) : hash);
    if (!params.has(KEY)) return null;
    // URLSearchParams wandelt '%xx' und '+' um – Rohwert direkt aus dem Fragment lesen
    const m = /(?:^#?|&)code=([^&]*)/.exec(hash);
    try { return { code: decode(m ? m[1] : params.get(KEY)) }; } catch (e) { return { error: true }; }
  }

  P.Share = { encode: encode, decode: decode, buildUrl: buildUrl, readHash: readHash };
})(globalThis);
