# Tasks

## 1. Python-Ausführung (`py/run_program.py`)

- [x] 1.1 `py/run_program.py` mit `run(source, inputs, write)` anlegen: kompilieren als `<programm>`, frischer Namespace mit `__name__ == "__main__"`, stdout/stderr während des Laufs auf `write(stream, text)` umleiten und danach wiederherstellen, Rückgabe `{"status": "ok"|"error"|"input", …}`. Verifizieren: `tests/test_run_program.py` prüft `print("Hallo")` → `('out', 'Hallo\n')`, `__name__`-Guard und `status == "ok"`, `python3 -m unittest discover tests` ist grün
- [x] 1.2 Fehlerbehandlung: Tracebacks nur mit `<programm>`-Frames nach stderr, `SyntaxError` per `format_exception_only`, `SystemExit` (0 still, ≠0 als Hinweis). Verifizieren: Tests für `print("a")` + `1/0` (Ausgabe `a`, dann `ZeroDivisionError`, `line 2`, kein `run_program` im Text), Syntaxfehler und `exit(3)`
- [x] 1.3 `input()`-Replay: Werte aus `inputs` mit Echo `prompt + wert + "\n"` nach stdout zurückgeben, bei erschöpfter Liste `{"status": "input", "prompt": …}`. Verifizieren: Tests mit `inputs=[]` → Status `input` und Prompt `"Name? "`, mit `["Ada"]` → Ausgabe `Name? Ada\nHallo Ada\n`
- [x] 1.4 Ausgabegrenze 100 000 Zeichen mit einmaligem Hinweis „… Ausgabe gekürzt“, Lauf geht weiter. Verifizieren: Test mit `for i in range(10**5): print(i)` liefert ≤ 100 000 Zeichen plus Hinweis und `status == "ok"`
- [x] 1.5 Frischer Zustand: zwei aufeinanderfolgende `run`-Aufrufe teilen keine Variablen. Verifizieren: Test `x = 1` und danach `print(x)` → `NameError`

## 2. Run-Worker und Client (DOM-frei)

- [x] 2.1 `js/run-worker.js` nach dem Protokoll aus design.md (Abschnitt 7): Pyodide und `py/run_program.py` laden, `ready`/`failed` melden, pro Auftrag `started`, gestreamte `stream`-Nachrichten, `done` oder `needInput`. Verifizieren manuell: In der Browser-Konsole liefert `new Worker('js/run-worker.js')` mit `{id:1, source:'print(1)', inputs:[]}` die Nachrichten `started`, `{stream:'out', text:'1\n'}` und `done`
- [x] 2.2 `js/runner-client.js` mit `P.createRunnerClient({createWorker, delay, timeout, prompt, onOutput, onRunStart, onRunEnd, onStatus, setTimeout, clearTimeout})` → `{update, runNow, cancel, status}`: Entprellung, veraltete `id` verwerfen, ein `runNow`, das erst nach `ready` kommt, wird nachgeholt. In `tests/run.js` eintragen. Verifizieren: `tests/runner-client.test.js` (Fake-Worker-Fabrik, Fake-Timer) prüft Entprellung (10× `update` → 1 Auftrag), Verwerfen veralteter Antworten und das Nachholen nach `ready`, `node tests/run.js` ist grün
- [x] 2.3 Zeitlimit: Timer ab `started`, bei Ablauf `terminate()`, `onRunEnd('timeout')`, neuer Worker über `createWorker()`, Status `loading` bis `ready`. Ein neuer Auftrag während eines aktiven Laufs beendet und startet den Worker neu. Verifizieren: Tests für Ablauf nach 5000 ms (Worker beendet, zweiter Worker erzeugt), Timer nicht vor `started`, Neustart bei neuem Auftrag während des Laufs
- [x] 2.4 `input()`-Ablauf: bei `needInput` `prompt(text)` aufrufen. Bei einem Wert denselben Quelltext mit verlängerter `inputs`-Liste neu senden (`onRunStart` signalisiert, dass die Ausgabe geleert wird), bei `null` `onRunEnd('input-cancelled')`. Neue `update`/`runNow` beginnen mit leerer Liste. Kein Timer, solange auf `prompt` gewartet wird. Verifizieren: Tests für Wert → zweiter Auftrag mit `inputs:['Ada']`, Abbrechen → Ende ohne weiteren Auftrag, neuer Lauf → `inputs:[]`
- [x] 2.5 `cancel()`: beendet einen aktiven Lauf (`terminate` + Neustart nur bei Bedarf) und verwirft ausstehende Entprellung. Verifizieren: Test, dass nach `cancel()` kein Auftrag mehr gesendet wird und Antworten des alten Laufs ignoriert werden

## 3. Ausgabe-Bereich und Verdrahtung

- [x] 3.1 `index.html`: `<section class="output" id="output">` unter `#status` im `editor-pane` mit Kopfzeilen-Button `#btn-output` (`aria-expanded`, „Ausgabe“ mit Pfeil), Statustext `#output-state` und `<pre id="output-body">`, `<script src="js/runner-client.js">` vor `app.js`. Stile in `css/style.css`: feste Höhe 30 %, eingeklappt nur Kopfzeile, Festbreitenschrift mit `white-space: pre-wrap`, `.err` in Fehlerfarbe, `.note` gedämpft, auch für die schmale Ansicht. Verifizieren: Seite lädt über `python3 -m http.server` ohne Konsolenfehler, der Bereich ist unter dem Editor sichtbar
- [x] 3.2 `js/app.js`: Sichtbarkeit mit `P.createStorage(localStorage, 'pyuml.outputVisible')` (Standard eingeblendet), Umschalter setzt Klasse und `aria-expanded`, ruft `editor.refresh()` auf und speichert. Verifizieren manuell: ausblenden → nur die Kopfzeile ist sichtbar und der Editor größer, nach dem Neuladen weiterhin ausgeblendet, in einem frischen Profil eingeblendet
- [x] 3.3 `js/app.js`: Runner-Client erst beim (ersten) Einblenden erzeugen. `editor.onChange` ruft zusätzlich `runner.update`, Einblenden ruft `runNow`, Ausblenden ruft `cancel`. Ausgabe gebündelt per `requestAnimationFrame` rendern, Auto-Scroll nur, wenn der Nutzer unten war. Statustexte und Hinweise („Python wird geladen …“, „läuft …“, „Keine Ausgabe“, „abgebrochen nach 5 s“, „Eingabe abgebrochen“, Ladefehler) setzen. Verifizieren manuell: alle Szenarien aus `specs/program-output/spec.md` zu Anzeige, automatischer Ausführung, Fehlern, Zeitlimit, `input()` und Ladezustand im Browser durchspielen
- [x] 3.4 Isolation prüfen. Verifizieren manuell: Klasse `Auto` + `while True: pass` → Diagramm zeigt `Auto` sofort, die Ausgabe bricht nach 5 s ab. Laufzeitfehler → Diagramm nicht ausgegraut. Syntaxfehler → Diagramm ausgegraut und `SyntaxError` in der Ausgabe
- [x] 3.5 `README.md`: Abschnitt „Ausgabe“ (automatische Ausführung bei eingeblendetem Bereich, Zeitlimit 5 s, `input()` per Dialog bei jeder Ausführung, Einschränkung bei Zufall/Zeit durch Wiederholung), Hinweis „Quelltext wird nicht ausgeführt“ anpassen, Testliste ergänzen (`runner-client`, `test_run_program.py`), Kommentar in `js/worker.js` unverändert korrekt lassen. Verifizieren: README beschreibt das Verhalten wie in `specs/program-output/spec.md`

## 4. Gesamtprüfung

- [x] 4.1 `node tests/run.js` und `python3 -m unittest discover tests` sind grün, `openspec validate add-program-output --strict` ist gültig, ein Durchlauf mit dem Beispielprogramm (keine Ausgabe → „Keine Ausgabe“, Diagramm unverändert) funktioniert im Browser

## Workflow follow-up

- Nach der Umsetzung mit `/opsx:archive` archivieren. Dabei entfällt „Quelltext wird nicht ausgeführt“ aus `openspec/specs/source-editor/spec.md`, und `openspec/specs/program-output/spec.md` entsteht.
