# Proposal

## Why

Bisher wird der Quelltext nur analysiert, aber nie ausgeführt. Lernende sehen deshalb nicht, was ihr Programm tatsächlich tut (`print`, Fehler). Ein Ausgabe-Bereich direkt unter dem Editor verbindet Klassendiagramm und Programmverhalten, ohne dass man ein anderes Werkzeug braucht.

## What Changes

- Neuer, ein- und ausblendbarer **Ausgabe-Bereich** unterhalb des Quelltextes. Der Zustand (ein/aus) wird lokal gespeichert. Beim ersten Start ist der Bereich eingeblendet.
- Der Quelltext wird **automatisch nach jeder Tipp-Pause ausgeführt**, solange der Ausgabe-Bereich eingeblendet ist. Die Ausgabe von `print` (stdout) und Fehlermeldungen/Tracebacks (stderr) erscheinen im Bereich.
- Die Ausführung läuft **getrennt von der Diagramm-Analyse** in einem eigenen Worker. Das Diagramm wird unabhängig von Laufzeit, Fehlern oder Abbruch des Programms erzeugt.
- **Festes Zeitlimit** (5 s): Länger laufende Programme (z. B. Endlosschleifen) werden abgebrochen, und es erscheint ein Hinweis.
- `input()` wird unterstützt: Jeder Aufruf öffnet einen Browser-Dialog. Bei jeder automatischen Ausführung wird erneut gefragt. Bricht der Nutzer den Dialog ab, wird die Ausführung beendet.
- **BREAKING (Spec)**: Die Anforderung „Quelltext wird nicht ausgeführt“ aus `source-editor` entfällt. Für die Analyse gilt weiterhin, dass sie nicht ausführt. Das regelt die neue Capability.

## Capabilities

### New Capabilities
- `program-output`: Ausführung des Quelltextes im Browser (Auslösung, Zeitlimit, `input()`, Isolation von der Diagramm-Analyse) und der ein-/ausblendbare Ausgabe-Bereich unter dem Editor.

### Modified Capabilities
- `source-editor`: Die Anforderung „Quelltext wird nicht ausgeführt“ wird entfernt. Eine eigene Ausführung beeinflusst das Diagramm nicht. Dieses Verhalten wird in `program-output` spezifiziert.

## Impact

- `index.html`, `css/style.css`: Ausgabe-Bereich im Editor-Bereich (Kopfzeile mit Umschalter, Ausgabefläche).
- `js/app.js`: Verdrahtung von Editor, Ausführung und Ausgabe-Bereich, Sichtbarkeit speichern.
- Neu: `js/run-worker.js` (zweite Pyodide-Instanz), `js/runner-client.js` (Entprellung, Zeitlimit, Neustart, `input()`-Ablauf), `py/run_program.py` (Ausführung mit umgeleitetem stdout/stderr und `input()`).
- `js/storage.js`: wird für den Sichtbarkeitszustand mit eigenem Schlüssel wiederverwendet.
- Tests: `tests/runner-client.test.js`, `tests/test_run_program.py`. `tests/run.js` lädt das neue Modul.
- Ressourcen: Eine zweite Pyodide-Instanz kostet zusätzlichen Speicher und Ladezeit (aus dem Browser-Cache). Es kommen keine neuen externen Abhängigkeiten hinzu.
- `README.md`: Abschnitt zur Ausgabe ergänzen.
