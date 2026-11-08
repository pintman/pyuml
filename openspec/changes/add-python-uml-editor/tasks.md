# Tasks

## 1. Grundgerüst

- [ ] 1.1 Verzeichnisstruktur gemäß design.md D9 anlegen (`index.html`, `css/`, `js/`, `py/`, `tests/`), `.gitignore`; prüfen: `python3 -m http.server` liefert leere zweispaltige Seite ohne Konsolenfehler
- [ ] 1.2 Testinfrastruktur: `tests/runner.js` + `tests/run.js` (Node, Muster aus grader) und `tests/test_uml_model.py` (unittest) mit je einem Platzhaltertest; prüfen: `node tests/run.js` und `python3 -m unittest discover tests` laufen grün
- [ ] 1.3 README mit Zweck, lokalem Start (`python3 -m http.server`), Testbefehlen; prüfen: Befehle laufen wie beschrieben

## 2. Klassenmodell (Python, `py/uml_model.py`)

- [ ] 2.1 `analyze(source)` mit Klassenerkennung in Quelltext-Reihenfolge, Zeilennummern, Ignorieren von Modul-Code/verschachtelten Klassen und Syntaxfehler-Rückgabe `{line, col, message}`; prüfen: Unittests für Szenarien „Zwei Klassen“, „Freie Funktion“, Syntaxfehler
- [ ] 2.2 Instanz-, Klassen-, Dataclass-Attribute und Enum-Werte; prüfen: Unittests der Requirements „Instanzattribute“, „Klassenattribute“
- [ ] 2.3 Typermittlung (Annotation → Parameter-Annotation → Literal → Konstruktor) inkl. Normalisierung `typing.List/Optional`, String-Annotationen; prüfen: Unittests „Typen ermitteln“, „Typnamen in Zeichenketten“
- [ ] 2.4 Methoden (Parameter, Defaults, Rückgabe, static/classmethod/abstract), Properties als Attribute, Sichtbarkeit; prüfen: Unittests „Methoden“, „Properties“, „Sichtbarkeit“
- [ ] 2.5 Klassenart (abstract/interface/enum/external) und Generalisierung/Realisierung inkl. externer Basisklassen und Ausschlussliste; prüfen: Unittests „Klassenart“, „Vererbung und Realisierung“
- [ ] 2.6 Attributbeziehungen mit Multiplizität, Heuristik Komposition/Assoziation, Selbstreferenz, Attribut bleibt in Attributliste; prüfen: Unittests „Assoziationen aus Attributen“ inkl. „Attribut bleibt in der Attributliste“, „Beziehungsart per Heuristik“
- [ ] 2.7 Abhängigkeiten aus Parameter-/Rückgabetypen und lokalen Konstruktoraufrufen, dedupliziert; prüfen: Unittests „Abhängigkeiten“
- [ ] 2.8 Sicherstellen, dass kein `exec`/`eval`/`compile`-Ausführungspfad existiert; prüfen: Unittest mit `while True` und `print` auf Modulebene terminiert ohne Ausgabe

## 3. Annotationen (`# uml: …`)

- [ ] 3.1 Kommentarextraktion per `tokenize`, Zuordnung zu Element (gleiche Zeile / nächste Codezeile, Decorator-Bereich); prüfen: Unittests „Annotationssyntax“
- [ ] 3.2 Alias-Tabelle de/en und Anwendung auf Beziehungsart, `attribut`, Multiplizität (`x -> y`), `typ=`; prüfen: Unittests „Deutsche und englische Schlüsselwörter“, „Beziehungsart festlegen“, „Multiplizitäten festlegen“, „Zieltyp festlegen“
- [ ] 3.3 Klassenart `interface`/`abstrakt` inkl. Realisierung bei Unterklassen, `ausblenden` für Klasse/Attribut/Methode; prüfen: Unittests „Klassenart festlegen“, „Elemente ausblenden“
- [ ] 3.4 Warnungen für unbekannte/unpassende Annotationen mit Zeilennummer; prüfen: Unittests „Unbekannte oder unpassende Annotationen melden“
- [ ] 3.5 Annotationssyntax im README dokumentieren (Tabelle Schlüsselwörter, Beispiele); prüfen: README-Beispiele als Unittest-Eingaben liefern das beschriebene Ergebnis

## 4. Pyodide-Anbindung

- [ ] 4.1 `js/worker.js`: Pyodide 0.26.4 laden, `py/uml_model.py` per fetch laden, Nachrichtenprotokoll `{id, source}` → `{id, model|error}`; prüfen: im Browser liefert Worker für Beispielcode ein Modell (Konsole)
- [ ] 4.2 `js/analyzer-client.js`: Entprellung 400 ms, Verwerfen veralteter Antworten, Lade-/Fehlerstatus-Callbacks; prüfen: Node-Test mit Fake-Worker für Entprellung und veraltete IDs

## 5. Editor und Oberfläche

- [ ] 5.1 `index.html`/`css/style.css`: Zweispaltenlayout, verschiebbare Trennlinie, Umbruch unter 800 px, Statusleiste für Fehler/Warnungen; prüfen: manuell Szenarien „Zweispaltige Oberfläche“
- [ ] 5.2 `js/editor.js` mit CodeMirror 5 (Python-Mode, Zeilennummern, Tab = 4 Leerzeichen, Auto-Einrückung, Fehlerzeilen-Markierung, `gotoLine`); prüfen: manuell Szenarien „Python-Editor“
- [ ] 5.3 `js/storage.js` + `js/example.js`: Speichern in localStorage, Beispielprogramm (Vererbung, Assoziation, Komposition, abstrakte Klasse) beim ersten Start; prüfen: Node-Test für Storage mit Fake-localStorage; Beispielcode als Unittest-Eingabe in Python liefert alle vier Konzepte
- [ ] 5.4 Schaltflächen „Beispiel“ (mit Bestätigung), „Öffnen“ (.py), „Speichern“ (.py-Download); prüfen: manuell Szenarien „Beispiel wiederherstellen und Datei laden/speichern“
- [ ] 5.5 `js/app.js`: Verdrahtung Editor → Client → Renderer, Ladehinweis, Syntaxfehler (Meldung, Zeilenmarkierung, Diagramm ausgegraut), Warnungsliste; prüfen: manuell Szenarien „Syntaxfehler anzeigen“, „Ladezustand“, „Automatische Neuberechnung“

## 6. Diagramm

- [ ] 6.1 `js/notation.js`: Textzeilen für Attribute, Methoden, Stereotype, Enum-Werte, Multiplizitätslabels; prüfen: Node-Tests der Szenarien „Notation von Attributen“, „Notation von Methoden“, „Klassenarten darstellen“
- [ ] 6.2 `js/layout.js`: Modell → ELK-Graph (Größen per Textmessung, umgedrehte Vererbungskanten, Modellreihenfolge, Labels), ELK-Aufruf; prüfen: Node-Test des Graphaufbaus (Kantenrichtung, Knotenreihenfolge, Labels) mit Fake-Messfunktion
- [ ] 6.3 `js/render.js`: SVG mit Klassensymbolen (3 Bereiche, kursiv/unterstrichen), Markern für alle Beziehungsarten, nur Multiplizitäten als Linienbeschriftung, `data-line`; prüfen: Node-Test auf SVG-String (Marker-IDs je Beziehungsart, Unterstreichung statischer Member, keine Rollennamen/Stereotype an Linien) und manueller Sichtvergleich mit UML-Notation
- [ ] 6.4 `js/viewport.js`: Einpassen, Zoom (Rad/Pinch), Pan, „Einpassen“-Knopf, Erhalt des Ausschnitts bei gleicher Klassenmenge; Klick auf Klasse → Editor-Sprung; prüfen: manuell Szenarien „Navigation im Diagramm“
- [ ] 6.5 Hinweis „Keine Klassen gefunden“; prüfen: manuell Szenario „Leerer Quelltext“

## 7. Integration

- [ ] 7.1 End-to-End im Browser mit Beispielprogramm und den Spec-Szenarien „Quelltextnahes Layout“ und „Stabiles Layout“ (Hund/Katze/Maus, Attribut ergänzen); prüfen: Screenshots/Sichtprüfung stimmen mit Szenarien überein
- [ ] 7.2 GitHub-Pages-Tauglichkeit: relative Pfade, keine `file://`-Abhängigkeit außer dokumentiertem Worker-Hinweis; prüfen: Start über `python3 -m http.server` aus Unterverzeichnis-Pfad funktioniert
- [ ] 7.3 Alle Tests grün; prüfen: `node tests/run.js` und `python3 -m unittest discover tests`

## Workflow follow-up

- Nach Review: Change archivieren (`/opsx:archive`) und Ergebnis prüfen.
- GitHub-Repository und Pages-Hosting einrichten.
