# Design

## Context

- Der Ausgabe-Bereich ist schon einklappbar (`.output.collapsed`, `#btn-output` mit `aria-expanded`, Speicherung über `P.createStorage(localStorage, 'pyuml.outputVisible')`). Das Diagramm übernimmt dieses Muster.
- Die Trennlinie setzt `editorPane.style.flexBasis` inline (15–85 %). In der schmalen Ansicht überschreibt CSS das mit `flex: 0 0 50% !important`.
- `viewport.js` arbeitet nur über die `viewBox`. Ein ausgeblendetes SVG stört Zoom und Ausschnitt nicht, und `getBoundingClientRect` wird nur bei Zeigeraktionen benutzt.
- „Einpassen“ liegt heute absolut positioniert oben rechts (`.diagram-tools`).

## Goals / Non-Goals

**Goals:**
- Ein- und Ausklappen ohne Neuberechnung: Analyse, Layout und Rendering laufen unverändert weiter, nur die Darstellung ändert sich.
- Gleiche Bedienung wie beim Ausgabe-Bereich (Pfeil, `aria-expanded`, gespeicherter Zustand).

**Non-Goals:**
- Kein Einklappen des Editors.
- Keine Animation beim Ein- und Ausklappen.
- Kein Sparen von Rechenzeit im eingeklappten Zustand.

## Decisions

1. **Kopfzeile statt schwebender Werkzeugleiste.** `diagram-pane` bekommt eine Kopfzeile `.diagram-head` mit `#btn-diagram` („▾ Diagramm“, `aria-expanded`, `aria-controls="diagram"`) und rechts „Einpassen“. `.diagram-tools` entfällt. Das ist konsistent mit `.output-head`. Verworfen wurde ein Umschalter in der Topbar, weil er räumlich nicht beim Diagramm liegt.

2. **Eingeklappt: Klasse `diagram-collapsed` auf `#panes`.** Darüber steuert CSS beide Layouts:
   - Breit: `diagram-pane` wird `flex: 0 0 auto` und eine senkrechte Leiste (ca. 32 px). Der Umschalter steht mit `writing-mode: vertical-rl` senkrecht, und der Pfeil zeigt nach links (◂). `#diagram`, `#diagram-message` und „Einpassen“ sind ausgeblendet. `.splitter` ist ausgeblendet und `editor-pane` bekommt `flex: 1 1 0 !important`. Das überschreibt die Inline-`flexBasis`, ohne sie zu löschen, deshalb ist nach dem Ausklappen automatisch die vorherige Breite wieder da.
   - Schmal (< 800 px): Es bleibt nur die waagerechte Kopfzeile unter dem Editor, und der Editor bekommt `flex: 1 1 0 !important`.
   Verworfen: `flexBasis` in JS sichern und wiederherstellen, weil die CSS-Überschreibung einfacher ist und den Zustand nicht dupliziert.

3. **Rendering läuft eingeklappt weiter.** `showModel` bleibt unverändert, `display: none` auf `#diagram` reicht aus. Beim Ausklappen ist das SVG schon aktuell, und Zoom und Ausschnitt sind erhalten. Verworfen wurde, das Layout eingeklappt auszusetzen und beim Ausklappen nachzuholen: Das wäre mehr Zustand (letztes Modell, `renderSeq`) für eine geringe Ersparnis, weil ELK nur nach der Tipp-Pause rechnet.

4. **Speicherung:** `P.createStorage(G.localStorage, 'pyuml.diagramVisible')`, `'0'` = eingeklappt, alles andere = ausgeklappt. Ohne `localStorage` wird immer ausgeklappt gestartet.

5. **Nach jedem Umschalten `editor.refresh()`**, damit CodeMirror die neue Breite übernimmt.

## Risks / Trade-offs

- [Lade- oder Fehlermeldung im Diagrammbereich ist eingeklappt nicht sichtbar, z. B. „Python konnte nicht geladen werden“] → Das ist akzeptabel, weil die Meldung beim Ausklappen erscheint. Syntaxfehler und Warnungen stehen ohnehin unter dem Editor.
- [Gestapelte Ausnahmen mit `!important` in der schmalen Ansicht] → Die Regeln für `diagram-collapsed` stehen nach den bestehenden Media-Query-Regeln und werden in beiden Breiten manuell geprüft.
- [Senkrechter Text wird je nach Browser unterschiedlich dargestellt] → `writing-mode` ist in allen aktuellen Browsern verfügbar. Im Notfall zeigt die Leiste nur den Pfeil mit `title`.
