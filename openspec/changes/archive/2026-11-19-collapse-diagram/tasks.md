# Tasks

## 1. Markup und Stile

- [x] 1.1 `index.html`: Im `diagram-pane` die `.diagram-tools` durch die Kopfzeile `<div class="diagram-head">` ersetzen. Sie enthält `#btn-diagram` (`aria-expanded="true"`, `aria-controls="diagram"`, `title="Diagramm ein-/ausklappen"`, `<span class="arrow">▾</span> Diagramm`) und rechts `#btn-fit`. Verifizieren: Die Seite lädt über `python3 -m http.server` ohne Konsolenfehler, die Kopfzeile steht über dem Diagramm und „Einpassen“ funktioniert
- [x] 1.2 `css/style.css`: Stile für `.diagram-head` und `.diagram-toggle` wie bei `.output-head`/`.output-toggle` und `.diagram-tools` entfernen. Für `#panes.diagram-collapsed` im breiten Layout: senkrechte Leiste (~32 px, `writing-mode: vertical-rl`, Pfeil ◂), `#diagram`, `#diagram-message` und `#btn-fit` ausgeblendet, `.splitter` ausgeblendet, `editor-pane { flex: 1 1 0 !important }`. Im schmalen Layout (< 800 px) nur die waagerechte Kopfzeile, der Editor füllt den Rest. Verifizieren manuell: Die Klasse `diagram-collapsed` in den DevTools in beiden Breiten setzen und entfernen und sicherstellen, dass das Layout wie in design.md (Entscheidung 2) aussieht

## 2. Verhalten

- [x] 2.1 `js/app.js`: `diagramStore = P.createStorage(G.localStorage, 'pyuml.diagramVisible')` (mit `try/catch` wie bei `visStore`) und `setDiagramVisible(visible, save)`: Klasse `diagram-collapsed` auf `els.panes` umschalten, `aria-expanded` setzen, `editor.refresh()` aufrufen und speichern. Klick auf `#btn-diagram` schaltet um, beim Start wird mit dem gespeicherten Zustand initialisiert (Standard: ausgeklappt). Verifizieren manuell im Browser: Einklappen zeigt nur die Leiste, der Editor wird breiter. Nach dem Neuladen bleibt das Diagramm eingeklappt. In einem frischen Profil ist es ausgeklappt
- [x] 2.2 Szenarien aus `specs/class-diagram/spec.md` und `specs/source-editor/spec.md` prüfen. Verifizieren manuell: Bei eingeklapptem Diagramm `class Fahrrad: pass` ergänzen und ausklappen, dann ist `Fahrrad` sichtbar. Ein Syntaxfehler in Zeile 3 erscheint eingeklappt unter dem Editor. Die Trennlinie auf ca. 60 % ziehen, ein- und ausklappen, dann ist die Breite wieder ca. 60 %. Zoom und Ausschnitt bleiben nach dem Ein- und Ausklappen erhalten. Im schmalen Fenster (600 px) bleibt nur die Kopfzeile unter dem Editor
- [x] 2.3 `README.md`: Einen Satz zum Ein- und Ausklappen des Diagramms über die Kopfzeile „Diagramm“ ergänzen (der Zustand wird gespeichert, die Analyse läuft weiter). Verifizieren: Die README beschreibt das Verhalten wie in `specs/class-diagram/spec.md`

## 3. Gesamtprüfung

- [x] 3.1 `node tests/run.js` und `python3 -m unittest discover tests` sind grün, `openspec validate collapse-diagram --strict` ist gültig, und das Ausgabe-Einklappen funktioniert unabhängig davon weiter (beide Bereiche gleichzeitig eingeklappt: der Editor füllt die volle Höhe und fast die volle Breite)

## Workflow follow-up

- Nach der Umsetzung mit `/opsx:archive` archivieren.
