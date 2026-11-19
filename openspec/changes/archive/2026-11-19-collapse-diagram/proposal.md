# Proposal

## Why

Wer gerade nur programmiert oder die Ausgabe beobachtet, braucht das Klassendiagramm oft nicht. Es belegt dann mehr als die Hälfte der Fensterbreite, auf kleinen Bildschirmen (Beamer, Laptop im Unterricht) sogar die untere Hälfte. Der Ausgabe-Bereich ist schon ein- und ausblendbar, das Diagramm noch nicht.

## What Changes

- Der Diagrammbereich bekommt eine Kopfzeile „Diagramm“ mit Umschalter (Pfeil wie beim Ausgabe-Bereich) und der Schaltfläche „Einpassen“.
- Eingeklappt bleibt nur ein schmaler Streifen mit dem Umschalter sichtbar: im breiten Layout rechts am Rand als senkrechte Leiste, im schmalen Layout (< 800 px) als Kopfzeile unter dem Editor. Der Editor nutzt den frei werdenden Platz. Die Trennlinie ist dann ausgeblendet.
- Beim Ausklappen hat der Editor wieder die Breite von vorher.
- Der Zustand wird im Browser gespeichert (`localStorage`) und beim nächsten Öffnen wiederhergestellt. Beim ersten Start ist das Diagramm ausgeklappt.
- Analyse, Syntaxfehler- und Warnungsanzeige unter dem Editor laufen eingeklappt unverändert weiter. Beim Ausklappen zeigt das Diagramm den aktuellen Quelltext.

## Capabilities

### New Capabilities

_keine_

### Modified Capabilities

- `class-diagram`: neue Anforderung „Diagrammbereich ein- und ausklappen“.
- `source-editor`: „Zweispaltige Oberfläche“ erhält den Fall des eingeklappten Diagramms (Editor über die volle Breite, Trennlinie ausgeblendet).

## Impact

- `index.html`: Kopfzeile im `diagram-pane` mit Umschalter `#btn-diagram`, „Einpassen“ wandert in die Kopfzeile.
- `css/style.css`: Kopfzeile, eingeklappter Zustand für breites und schmales Layout.
- `js/app.js`: Umschalter, Speicherung unter `pyuml.diagramVisible`, Trennlinie und Editorbreite beim Ein-/Ausklappen, `editor.refresh()`.
- `README.md`: kurzer Hinweis auf das Einklappen.
- Keine neuen Abhängigkeiten, keine Änderung an Analyse, Layout oder Rendering.
