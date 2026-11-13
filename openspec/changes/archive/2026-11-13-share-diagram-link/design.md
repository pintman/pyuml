# Design

## Context

Rein statische Seite ohne Build-Schritt (GitHub Pages). Startlogik in `js/app.js`: `storage.load()` → sonst `P.EXAMPLE` → `P.createEditor(...)`. Gespeichert wird nur in `editor.onChange` (initialer Wert löst kein Change aus). DOM-freie Module werden in `tests/run.js` per `vm` in Node getestet; Muster: `P.createStorage` in `js/storage.js`.

## Goals / Non-Goals

**Goals:**
- Link ohne Server, rein clientseitig kodiert/dekodiert.
- Kodierlogik DOM-frei und in Node testbar.

**Non-Goals:**
- Kompression des Quelltexts (kann später unter eigenem Schlüssel, z. B. `#z=`, ergänzt werden).
- Kurz-URLs, Layout-/Zoom-Zustand im Link, Dateiname im Link.

## Decisions

**Base64url statt Hex.** Hex verdoppelt die Länge (2 Zeichen/Byte), Base64 braucht ~1,33 Zeichen/Byte. Base64url (`-`/`_`, ohne `=`) braucht kein Percent-Encoding. Umsetzung: `TextEncoder` → Bytes → `btoa` über Binärstring → Ersetzen von `+/` und Entfernen von `=`; Dekodieren umgekehrt mit `TextDecoder('utf-8', { fatal: true })`, damit beschädigte Bytes einen Fehler werfen statt Ersatzzeichen zu liefern. Funktioniert in Browser und Node ≥ 16.

**Fragment statt Query.** `#code=…` wird nicht an den Server übertragen (Datenschutz, siehe Spec) und erlaubt das Entfernen per `history.replaceState` ohne Reload. Parsing über `URLSearchParams(hash.slice(1))`, damit weitere Schlüssel später möglich sind.

**Modul `js/share.js`** mit `P.Share = { encode(text), decode(str), buildUrl(baseHref, text), readHash(hash) }`. `readHash` liefert `{ code: string }`, `{ error: true }` (Schlüssel vorhanden, nicht dekodierbar) oder `null` (kein Schlüssel). `buildUrl` entfernt ein vorhandenes Fragment der Basis-URL.

**Startreihenfolge in `app.js`:** `readHash(location.hash)` → bei `code`: Editor mit Link-Code anlegen, sofort `storage.save(code)`, Fragment per `history.replaceState(null, '', location.pathname + location.search)` entfernen. Bei `error`: Hinweis zeigen, Fragment ebenfalls entfernen, normal mit Storage/Beispiel starten (Storage bleibt unangetastet). Zusätzlich `hashchange`-Listener: Fügt der Nutzer einen anderen Link in denselben Tab ein, lädt die Seite nicht neu – dann denselben Ablauf per `editor.setValue` ausführen.

**Rückmeldung:** Neues Element `#notice` in der Kopfzeile (`aria-live="polite"`), blendet „Link kopiert“ bzw. Fehlertexte nach einigen Sekunden aus. Bewusst getrennt von `#status-error`/`#diagram-message`, die von Analyse-Ergebnissen überschrieben werden.

**Zwischenablage:** `navigator.clipboard.writeText(url)`; schlägt das fehl (kein sicherer Kontext, verweigert), `window.prompt('Link zum Kopieren:', url)` als Fallback.

## Risks / Trade-offs

- [Sehr lange Links bei großem Quelltext; manche Messenger/Browser kürzen ab ~2.000–8.000 Zeichen] → Für Unterrichtsbeispiele (wenige KB) unkritisch; bei mehr als 8.000 Zeichen Hinweis „Link ist sehr lang“ zusätzlich zur Erfolgsmeldung. Kompression später möglich.
- [Link überschreibt lokalen Stand ohne Rückfrage] → Bewusst so (Link-Öffnen ist explizite Nutzerabsicht); Spec legt Vorrang fest. Vorheriger Stand ist über „Öffnen“/eigene Dateien wiederherstellbar, nicht über die App.
- [Abgeschnittene, aber zufällig gültige Base64-Strings ergeben verkürzten Code statt Fehler] → Akzeptiert; `fatal`-Decoder fängt die meisten Fälle (halbe UTF-8-Sequenzen). Prüfsumme wäre Overkill.
