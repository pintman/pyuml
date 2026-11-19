# Design

## Context

- Die Editorspalte `#editor-pane` ist eine Flex-Spalte: `#editor` (flex 1), `#status` (höchstens 30 %, scrollbar) und `#output` (`flex: 0 0 30%`, schmal 35 %, ausgeblendet `flex: 0 0 auto`).
- Die senkrechte Trennlinie (`#splitter`) setzt `editorPane.style.flexBasis` per Pointer-Events mit `setPointerCapture` und begrenzt den Wert auf 15–85 %. Danach ruft sie `editor.refresh()` auf. Der Wert wird nicht gespeichert.
- Das Einklappen des Diagramms (`collapse-diagram`) überdeckt die Inline-Breite per `!important`, statt sie zu löschen. Dieses Muster gilt auch hier.

## Goals / Non-Goals

**Goals:**
- Gleiches Bedienverhalten und gleiche Optik wie die senkrechte Trennlinie, nur waagerecht.

**Non-Goals:**
- Die Höhe wird nicht gespeichert, konsistent mit der senkrechten Trennlinie.
- Keine Tastaturbedienung der Trennlinie. Die senkrechte Trennlinie hat auch keine.
- Keine Trennlinie zwischen Editor und Fehler- und Warnungsanzeige.

## Decisions

1. **Eigenes Element `<div class="splitter-h" id="output-splitter" role="separator" aria-orientation="horizontal">`** liegt direkt vor `#output`, also zwischen `#status` und `#output`. Die Fehlerzeile bleibt dadurch beim Editor, zu dem sie inhaltlich gehört. Verworfen wurde, die Kopfzeile „Ausgabe“ selbst ziehbar zu machen: Sie enthält schon den Umschalter, Klick und Ziehen würden sich in die Quere kommen.

2. **Höhe als Prozentwert:** `out.section.style.flexBasis = pct + '%'`, mit `pct = (paneBottom − clientY) / paneHeight × 100`, begrenzt auf 10–85 %. Prozent statt Pixel, damit die Aufteilung beim Ändern der Fenstergröße erhalten bleibt. Das Inline-`flexBasis` überdeckt im schmalen Layout die 35 %, wie bei der senkrechten Trennlinie gewollt.

3. **Ausgeblendet:** `.output.collapsed { flex: 0 0 auto !important; }` überdeckt die Inline-Höhe, ohne sie zu löschen. Beim Einblenden gilt sie automatisch wieder. Die Trennlinie wird ausgeblendet, wenn die Ausgabe ausgeblendet ist. Dafür steht sie als Geschwister vor `#output`, und die Regel `#editor-pane:has(> .output.collapsed) .splitter-h { display: none }` blendet sie aus. Alternative ohne `:has()`: `setOutputVisible` setzt zusätzlich `hidden` auf die Trennlinie. Entscheidung: die JS-Variante, weil sie robuster ist und die Sichtbarkeit an einer Stelle steuert.

4. **Gemeinsamer Zieh-Helfer:** Die bestehende Zieh-Logik der senkrechten Trennlinie wird in eine kleine Funktion `makeSplitter(el, onMove)` in `app.js` überführt (Pointer-Capture, Klasse `dragging`, `editor.refresh()` am Ende). Beide Trennlinien nutzen sie. Das vermeidet doppelten Code, die senkrechte Trennlinie verhält sich danach unverändert.

5. **Optik:** `.splitter-h { flex: 0 0 6px; cursor: row-resize; background: var(--line); touch-action: none; }`, Hover und Ziehen in `var(--accent)` wie bei `.splitter`. Die bisherige `border-top` von `.output` entfällt, solange die Trennlinie sichtbar ist. Im ausgeblendeten Zustand bleibt sie als Abgrenzung der Kopfzeile.

## Risks / Trade-offs

- [`.splitter` ist im schmalen Layout per Media-Query ausgeblendet. Eine gemeinsame Klasse würde die neue Trennlinie mit ausblenden] → Die neue Trennlinie bekommt die eigene Klasse `splitter-h`, die keine Media-Query ausblendet.
- [Der Editor könnte bei 85 % Ausgabe zu klein werden] → Bei 85 % bleiben im schmalen Layout (Editorspalte 50 % Fensterhöhe) nur wenige Zeilen. Das ist akzeptabel, weil die Grenze nur erreicht wird, wenn der Nutzer sie zieht.
- [Das Refactoring der senkrechten Trennlinie könnte ihr Verhalten ändern] → Grenzen und Ablauf bleiben gleich. Die Prüfung im Browser ist eine eigene Task.
