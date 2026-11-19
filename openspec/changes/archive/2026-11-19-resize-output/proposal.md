# Proposal

## Why

Der Ausgabe-Bereich hat eine feste Höhe: 30 % im breiten und 35 % im schmalen Layout. Bei langen Ausgaben oder Tracebacks ist das zu wenig, bei kurzen Programmen nimmt er dem Editor unnötig Platz weg. Die Breite zwischen Editor und Diagramm lässt sich schon per Trennlinie anpassen, die Höhe der Ausgabe noch nicht.

## What Changes

- Zwischen Editor (samt Fehler- und Warnungsanzeige) und Ausgabe-Bereich gibt es eine waagerechte, verschiebbare Trennlinie. Sie verhält sich wie die senkrechte Trennlinie zwischen Editor und Diagramm.
- Nach oben ziehen vergrößert die Ausgabe, nach unten ziehen vergrößert den Editor. Die Höhe ist begrenzt, damit weder Editor noch Ausgabe ganz verschwinden.
- Ist die Ausgabe ausgeblendet, ist auch die Trennlinie ausgeblendet. Beim Einblenden hat die Ausgabe wieder die zuvor gezogene Höhe.
- Die Trennlinie funktioniert im breiten und im schmalen Layout.
- Annahme: Wie bei der senkrechten Trennlinie wird die gezogene Höhe nicht gespeichert. Nach dem Neuladen gilt wieder die Standardhöhe.

## Capabilities

### New Capabilities

_keine_

### Modified Capabilities

- `program-output`: neue Anforderung „Höhe des Ausgabe-Bereichs anpassen“.

## Impact

- `index.html`: Trennlinie `#output-splitter` zwischen `#status` und `#output`.
- `css/style.css`: Stile für die waagerechte Trennlinie. Im ausgeblendeten Zustand überdeckt das Ausblenden die gezogene Höhe.
- `js/app.js`: Ziehen per Pointer-Events, die Höhe als Anteil des Editorbereichs, `editor.refresh()` nach dem Ziehen.
- `README.md`: kurzer Hinweis im Abschnitt „Ausgabe“.
- Keine neuen Abhängigkeiten.
