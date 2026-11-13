# Tasks

## 1. Kodierung (DOM-frei)

- [x] 1.1 `js/share.js` mit `P.Share.encode/decode` (UTF-8 ↔ Base64url ohne `=`) anlegen und in `tests/run.js` (Quellliste nach `storage`) eintragen; verifizieren: `node tests/run.js` lädt das Modul ohne Fehler
- [x] 1.2 `tests/share.test.js`: Round-Trip für ASCII, Umlaute, Emoji, Tab/Zeilenumbrüche, leeren Text, `P.EXAMPLE`; Ausgabe enthält nur `[A-Za-z0-9_-]`; `decode` wirft bei `%%%` und bei ungültigem UTF-8; verifizieren: `node tests/run.js` grün
- [x] 1.3 `P.Share.buildUrl(baseHref, text)` und `P.Share.readHash(hash)` (Rückgabe `{code}` / `{error:true}` / `null`, Fragment der Basis wird ersetzt) inkl. Tests in `tests/share.test.js` (z. B. `https://example.org/pyuml/#alt` → `https://example.org/pyuml/#code=…`, `''`/`#foo=1` → `null`); verifizieren: `node tests/run.js` grün

## 2. Oberfläche und Startlogik

- [x] 2.1 `index.html`: Schaltfläche `#btn-share` („Teilen“, Titel „Link mit Quelltext kopieren“), Element `#notice` (`aria-live="polite"`) in der Kopfzeile, `<script src="js/share.js">` vor `app.js`; Stil für `#notice` in `css/style.css`; verifizieren: Seite lädt im Browser ohne Konsolenfehler
- [x] 2.2 `js/app.js`: Hilfsfunktion `notify(text)` (blendet nach ~3 s aus); Teilen-Handler mit `navigator.clipboard.writeText`, Fallback `prompt`, Hinweis bei Link > 8.000 Zeichen; verifizieren: Klick auf „Teilen“ zeigt „Link kopiert“, eingefügter Link enthält `#code=`
- [x] 2.3 `js/app.js`: Startreihenfolge Link → Storage → Beispiel; bei gültigem Link `storage.save(code)` und Fragment per `history.replaceState` entfernen; bei ungültigem Link Meldung „Link konnte nicht gelesen werden“, Storage unverändert; verifizieren manuell: (a) Link in neuem Tab zeigt Code + Diagramm, Adresszeile ohne `#…`; (b) danach ändern + neu laden behält Änderung; (c) `#code=%%%` zeigt Meldung und alten Code
- [x] 2.4 `hashchange`-Listener mit demselben Ablauf (`editor.setValue`); verifizieren: anderen Link in dieselbe Adresszeile einfügen lädt dessen Code ohne Reload

## 3. Dokumentation und Abschluss

- [x] 3.1 `README.md`: Abschnitt „Teilen“ (Link enthält Quelltext im Fragment, wird nicht an Server übertragen, Link-Code ersetzt lokalen Stand) und Satz „Quelltext bleibt im Browser“ präzisieren; verifizieren: README beschreibt Verhalten wie in `specs/share-link/spec.md`
- [x] 3.2 Gesamtprüfung: `node tests/run.js` grün; Szenarien aus `specs/share-link/spec.md` (Sonderzeichen-Round-Trip über echten Link, leerer Editor, Vorrang vor lokalem Stand) im Browser über `python3 -m http.server` durchgespielt
