# Design

## Context

- Die Analyse läuft in `js/worker.js`. Dort steckt eine Pyodide-Instanz, die `py/uml_model.py` lädt. `js/analyzer-client.js` übernimmt Entprellung (400 ms) und verwirft veraltete Antworten. `js/app.js` verdrahtet alles.
- Das Hosting läuft über GitHub Pages: statisch, ohne eigene HTTP-Header. COOP/COEP und damit `SharedArrayBuffer`/`Atomics.wait` stehen ohne Zusatztricks nicht zur Verfügung.
- In Web Workern gibt es kein `prompt()`. Pyodide-Code im Worker kann also nicht synchron auf eine Nutzereingabe warten.
- Tests: `node tests/run.js` für DOM-freie JS-Module (mit Fake-Worker und Fake-Timern, siehe `tests/analyzer-client.test.js`), `python3 -m unittest discover tests` für Python unter CPython.

## Goals / Non-Goals

**Goals:**
- Die Ausführung ist vollständig von der Diagramm-Analyse isoliert (siehe Spec „Diagramm unabhängig von der Ausführung“).
- Das Zeitlimit greift verlässlich, auch bei reinen CPU-Schleifen ohne Ausgabe.
- `input()` funktioniert ohne besondere Server-Header.
- Die Logik (Entprellung, Zeitlimit, Neustart, `input()`-Ablauf) ist ohne Browser testbar.

**Non-Goals:**
- Kein Ausführen-/Stopp-Button und kein konfigurierbares Zeitlimit.
- Keine Eingabezeile direkt im Ausgabe-Bereich.
- Kein in der Höhe verschiebbarer Ausgabe-Bereich (feste Höhe, ca. 30 % des Editor-Bereichs).
- Keine Unterstützung für `turtle`, Grafik, Dateisystem-Persistenz oder Paketinstallation (`micropip`).
- Keine Übersetzung von Python-Fehlermeldungen. Lernende sehen echte Tracebacks.

## Decisions

### 1. Eigener Worker mit eigener Pyodide-Instanz (`js/run-worker.js`)
Die Ausführung läuft in einem zweiten Worker. Nur so lässt sich ein laufendes Programm per `worker.terminate()` hart abbrechen, ohne die Analyse zu treffen.
- *Alternative: derselbe Worker wie die Analyse.* Abgelehnt: Eine Endlosschleife würde die Analyse blockieren, und `terminate()` würde auch den Analyse-Interpreter beenden.
- *Alternative: `pyodide.setInterruptBuffer` für einen weichen Abbruch.* Abgelehnt, weil es `SharedArrayBuffer` braucht (siehe Context).
- Kosten: zusätzlicher Speicher und Ladezeit. Pyodide-Dateien kommen beim zweiten Laden aus dem Browser-Cache.

### 2. Zeitlimit und Neustart im Client
`js/runner-client.js` startet beim Signal `started` des Workers für einen Lauf einen 5-s-Timer. Bei `done` wird der Timer gelöscht. Läuft der Timer ab, beendet der Client den Worker per `terminate()`, meldet „abgebrochen nach 5 s“ und erzeugt sofort einen neuen Worker über eine übergebene Fabrik `createWorker()`. Bis der neue Worker `ready` meldet, gilt der Status `loading`. Danach wird ein zwischenzeitlich angeforderter Lauf ausgeführt.
- Kommt eine neue Ausführung, während noch ein Lauf aktiv ist, beendet der Client den Worker ebenso und startet ihn neu. Veraltete Läufe enden so sofort. Antworten mit fremder `id` werden zusätzlich verworfen (wie im Analyse-Client).
- Der Timer startet erst bei `started`, nicht beim Absenden. Die Ladezeit nach einem Neustart zählt also nicht zum Limit.

### 3. `input()` per Wiederholung (Replay)
Python bekommt eine Liste bereits bekannter Eingaben. Ruft das Programm `input()` auf und ist die Liste erschöpft, wirft die überschriebene Funktion eine interne Ausnahme. Der Worker meldet `{id, needInput, prompt}`. Der Client zeigt die bisherige Ausgabe, öffnet `prompt(promptText)` (im Hauptthread, injizierbar für Tests) und startet den Lauf mit der um den Wert verlängerten Liste neu. Die neue Ausgabe ersetzt die alte.
- Liefert `prompt` `null` (Abbrechen), endet der Lauf mit dem Hinweis „Eingabe abgebrochen“.
- Die Eingabeliste gilt nur innerhalb einer Ausführung. Jede neue automatische Ausführung beginnt leer, so wie gewünscht („immer fragen“).
- Das Zeitlimit gilt pro Teil-Lauf. Die Zeit im Dialog zählt nicht, weil dabei kein Lauf aktiv ist.
- Ein Echo wie im Terminal: `input()` schreibt Eingabetext und eingegebenen Wert plus Zeilenumbruch nach stdout.
- *Alternative: `SharedArrayBuffer` + `Atomics.wait`.* Das bräuchte COOP/COEP-Header oder einen Service-Worker-Hack (`coi-serviceworker`). Abgelehnt wegen Komplexität auf GitHub Pages.
- *Alternative: synchrones XHR an einen Service Worker.* Ebenfalls abgelehnt, zu viel Infrastruktur.

### 4. Python-Seite in `py/run_program.py`
`run(source, inputs, write)` kompiliert mit dem Dateinamen `<programm>` und führt in einem frischen Namespace aus (`{"__name__": "__main__", "__builtins__": …}`). Dabei ist `input` durch die Replay-Variante ersetzt. Während des Laufs werden `sys.stdout`/`sys.stderr` auf Writer umgeleitet, die `write(stream, text)` aufrufen. Danach werden sie wiederhergestellt. Rückgabe ist ein Dict: `{"status": "ok"}`, `{"status": "error"}` (Traceback wurde schon nach stderr geschrieben) oder `{"status": "input", "prompt": …}`.
- Tracebacks: Es werden nur Frames mit Dateiname `<programm>` gezeigt. `SyntaxError` erscheint per `traceback.format_exception_only`. Auch `SystemExit` wird abgefangen: `exit()` beendet still, ein Code ungleich 0 wird angezeigt.
- Der Modul-Cache (`sys.modules`) bleibt zwischen Läufen erhalten. Das ist unkritisch, weil Nutzerprogramme aus einer einzigen Datei bestehen.
- Das Modul ist unter CPython testbar. `write` ist dort eine Python-Funktion, in Pyodide ein JS-Proxy.

### 5. Ausgabe streamen und begrenzen
Der Worker schickt Ausgaben als `{id, stream: 'out'|'err', text}`, sobald sie geschrieben werden. So bleibt bei einem Zeitlimit-Abbruch die bisherige Ausgabe sichtbar. Damit eine Ausgabeschleife Hauptthread und DOM nicht überlastet, leitet `run_program.py` nach 100 000 Zeichen nichts mehr weiter und meldet einmal „… Ausgabe gekürzt“. Der Lauf selbst geht weiter bis zum Ende oder Zeitlimit. Der Client sammelt Text und rendert gebündelt (per `requestAnimationFrame` in `app.js`).

### 6. Oberfläche
- Im `editor-pane` unter `.status` sitzt `<section class="output">` mit einer Kopfzeile. Die Kopfzeile ist ein `<button aria-expanded>` „Ausgabe“ mit Pfeil und daneben ein Statustext: „läuft …“, „Python wird geladen …“, „abgebrochen nach 5 s“, „Eingabe abgebrochen“. Darunter folgt ein `<pre class="output-body">`. stderr wird als `<span class="err">` in Fehlerfarbe dargestellt, Hinweise als `<span class="note">` gedämpft.
- Eingeblendet hat der Bereich eine feste Höhe (`flex: 0 0 30%`), ausgeblendet ist nur die Kopfzeile sichtbar. Nach dem Umschalten wird `editor.refresh()` aufgerufen. Automatisches Scrollen ans Ende erfolgt nur, wenn der Nutzer schon unten war.
- Der Sichtbarkeitszustand wird mit `P.createStorage(localStorage, 'pyuml.outputVisible')` gespeichert, als `'1'`/`'0'`. Fehlt ein Wert, gilt der Bereich als eingeblendet.
- Ausgeblendet ruft `app.js` `runner.cancel()` auf (beendet einen laufenden Lauf, keine neuen). Beim Einblenden folgt `runner.runNow(editor.getValue())`.
- Ausgelöst wird beides aus `editor.onChange`: Analyse und Ausführung haben je einen eigenen Client mit 400 ms Entprellung. Beim ersten `ready` des Run-Workers läuft der aktuelle Quelltext.

### 7. Protokoll Run-Worker
```
→ {id, source, inputs}
← {type:'ready'} | {type:'failed', message}
← {id, started:true}
← {id, stream:'out'|'err', text}
← {id, done:true} | {id, needInput:true, prompt}
```

## Risks / Trade-offs

- [Doppelter Speicherbedarf durch zwei Pyodide-Instanzen, auf schwachen Schulrechnern spürbar] → Der Run-Worker wird erst erzeugt, wenn der Ausgabe-Bereich eingeblendet ist. Ist er ausgeblendet, läuft kein zweiter Interpreter.
- [Neustart nach Zeitlimit oder veraltetem Lauf kostet Ladezeit (ca. 1–3 s aus dem Cache)] → Das betrifft nur Läufe, die zum Zeitpunkt der Änderung noch aktiv sind. Typische Programme enden in Millisekunden.
- [Replay bei nicht deterministischen Programmen (`random`, Zeit): Die Ausgabe vor einem `input()` kann sich beim Wiederholen ändern] → Das wird im README als Einschränkung dokumentiert. Für Lernprogramme ist es meist unkritisch.
- [Programme mit vielen `input()`-Aufrufen laufen quadratisch oft an] → Eingaben sind menschlich langsam, die Teil-Läufe sind kurz. Das ist akzeptiert.
- [Automatische Ausführung mit `input()` öffnet bei jeder Tipp-Pause einen Dialog, das ist beim Tippen störend] → So hat es der Nutzer bewusst gewählt. Ausweg: den Ausgabe-Bereich ausblenden.
- [`prompt()` blockiert den Hauptthread, das Diagramm wird erst nach dem Schließen gezeichnet] → So ist es in der Spec festgehalten.
- [Seiteneffekte im Nutzerprogramm wie `import js` oder Zugriffe auf Worker-APIs] → Das Programm läuft im Worker ohne DOM-Zugriff und ohne Zugriff auf den Quelltext anderer Nutzer. Das ist für diese Anwendung akzeptabel.

## Migration Plan

Rein clientseitig. Nach dem Deploy auf GitHub Pages ist der Bereich bei allen Nutzern eingeblendet (kein gespeicherter Wert). Rollback: den Commit zurücknehmen. Der localStorage-Schlüssel `pyuml.outputVisible` bleibt dann folgenlos liegen.
