# Proposal

## Why

Interfaces werden bereits erkannt (`Protocol`, `# uml: interface`) und mit `«interface»` sowie gestrichelter Realisierung gezeichnet, aber das Beispielprogramm beim ersten Start zeigt kein Interface. Lernende sehen das Konzept daher nicht, und die README erklärt Interfaces nur am Rand (Annotation an einer ABC-Klasse), nicht den eigentlichen Weg über `Protocol`.

## What Changes

- Das Beispielprogramm (`js/example.js`) erhält ein Interface als `Protocol`-Klasse mit einer Methode, das von einer bestehenden Klasse realisiert wird. Bestehende Konzepte (Vererbung, abstrakte Klasse, Assoziation, Komposition, Aggregation) bleiben erhalten.
- Die README bekommt einen kurzen Abschnitt „Interfaces“: `Protocol` → `«interface»`, Realisierung (gestrichelt, hohles Dreieck), Alternative `# uml: interface` für ABC-Klassen.
- Tests prüfen, dass das Beispiel ein Interface und eine Realisierung enthält.
- Keine Änderung an Analyse, Notation, Layout oder Renderer.

## Capabilities

### New Capabilities

_keine_

### Modified Capabilities

- `source-editor`: Requirement „Quelltext lokal speichern“ – das Beispielprogramm zeigt zusätzlich ein Interface mit Realisierung.

## Impact

- `js/example.js` (Beispielquelltext, Kopfkommentar)
- `README.md` (neuer Abschnitt)
- `tests/test_uml_model.py` (Beispielprogramm-Test), ggf. `tests/storage.test.js`
- Nutzer mit gespeichertem Quelltext sehen das neue Beispiel nur über „Beispiel“; der gespeicherte Stand bleibt unverändert.
