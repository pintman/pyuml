# Tasks

## 1. Markup und Stile

- [x] 1.1 `index.html`: `<div class="splitter-h" id="output-splitter" role="separator" aria-orientation="horizontal" title="Trennlinie verschieben"></div>` direkt vor `<section class="output">` einfügen. Verifizieren: Die Seite lädt über `python3 -m http.server` ohne Konsolenfehler, die Trennlinie liegt zwischen der Fehler- und Warnungsanzeige und der Kopfzeile „Ausgabe“
- [x] 1.2 `css/style.css`: `.splitter-h` (6 px, `cursor: row-resize`, `touch-action: none`, Hover und `.dragging` in `--accent`, `[hidden]` → `display: none`). `.output` ohne `border-top` neben der Trennlinie, `.output.collapsed { flex: 0 0 auto !important; border-top: 1px solid var(--line) }`, auch in der Media-Query für schmale Fenster. Verifizieren manuell: Die Trennlinie ist in beiden Breiten sichtbar und färbt sich beim Hover. Die ausgeblendete Ausgabe zeigt nur die Kopfzeile mit oberer Linie

## 2. Verhalten

- [x] 2.1 `js/app.js`: Zieh-Logik der senkrechten Trennlinie in `makeSplitter(el, onMove)` überführen (Pointer-Capture, Klasse `dragging`, `editor.refresh()` bei `pointerup`). Die senkrechte Trennlinie nutzt den Helfer mit unverändertem Verhalten (15–85 %). Verifizieren manuell: Die senkrechte Trennlinie lässt sich wie vorher ziehen und bleibt bei 15 % und 85 % stehen
- [x] 2.2 `js/app.js`: `makeSplitter($('output-splitter'), …)` setzt `out.section.style.flexBasis` als Prozent der Höhe von `els.editorPane`, gemessen vom unteren Rand und begrenzt auf 10–85 %. `setOutputVisible` setzt `hidden` auf die Trennlinie, wenn die Ausgabe ausgeblendet ist. Verifizieren manuell alle Szenarien aus `specs/program-output/spec.md`: Nach oben ziehen vergrößert die Ausgabe, die Grenze liegt bei 85 %. Ausgeblendet ist keine Trennlinie zu sehen. Die halbe Höhe bleibt nach dem Aus- und Einblenden erhalten. Bei 600 px Breite funktioniert das Ziehen. Nach dem Neuladen gilt die Standardhöhe
- [x] 2.3 `README.md`: Im Abschnitt „Ausgabe“ einen Satz ergänzen (die Höhe ist über die Trennlinie oberhalb der Kopfzeile verstellbar und wird nicht gespeichert). Verifizieren: Die README beschreibt das Verhalten wie in `specs/program-output/spec.md`

## 3. Gesamtprüfung

- [x] 3.1 `node tests/run.js` und `python3 -m unittest discover tests` sind grün, `openspec validate resize-output --strict` ist gültig. Zusammenspiel im Browser: Ein eingeklapptes Diagramm, die gezogene Ausgabehöhe und die senkrechte Trennlinie beeinflussen sich nicht gegenseitig

## Workflow follow-up

- Nach der Umsetzung mit `/opsx:archive` archivieren.
