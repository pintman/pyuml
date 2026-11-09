# Proposal

## Why

Im Unterricht (OOP mit Python) fehlt ein Werkzeug, das Python-Quelltext und UML-Klassendiagramm direkt nebeneinander zeigt. Lernende sollen sehen, wie sich jede Änderung am Code im Diagramm niederschlägt – ohne Installation, ohne Server, im Browser, analog zu den bestehenden Anwendungen `grader` und den CS-Circles-Seiten (it.tbs1.de/csc.html).

## What Changes

- Neue, rein statische Web-Anwendung (HTML/CSS/Vanilla-JS, kein Build-Schritt), hostbar über GitHub Pages.
- Zweispaltige Oberfläche: links Python-Editor, rechts UML-Klassendiagramm (SVG).
- Python-Interpreter im Browser (Pyodide); der Quelltext wird mit Pythons eigenem `ast`-Modul analysiert, **nicht ausgeführt**.
- Aus dem Quelltext wird ein Klassenmodell abgeleitet: Klassen, Attribute (Klassen- und Instanzattribute), Methoden mit Parametern, Sichtbarkeit (Namenskonvention `_`/`__`), Typ-Hinweise, statische/abstrakte Elemente, Vererbung, Assoziationen, Aggregation, Komposition, Abhängigkeiten.
- Darstellung gemäß UML-2.5-Notation (Klassenrechteck mit drei Abschnitten, Stereotype, Kursivschrift für abstrakt, Unterstreichung für statisch, standardisierte Pfeilspitzen/Rauten, Multiplizitäten).
- Automatische Neugenerierung bei Eingabe (entprellt); bei Syntaxfehlern bleibt das letzte gültige Diagramm stehen, der Fehler wird mit Zeilennummer angezeigt.
- Automatisches Layout, das die Reihenfolge im Quelltext widerspiegelt (früher definierte Klassen weiter oben/links; Oberklassen über Unterklassen).
- Kommentar-Annotationen (`# uml: …`), mit denen Mehrdeutigkeiten aufgelöst werden: Aggregation vs. Komposition, Interface vs. abstrakte Klasse, Multiplizitäten, Ausblenden von Elementen.
- Quelltext bleibt lokal im Browser gespeichert (localStorage); Beispielcode beim ersten Start.

## Capabilities

### New Capabilities
- `source-editor`: Eingabe des Python-Quelltexts, Persistenz im Browser, Fehleranzeige, Auslösen der Neuberechnung.
- `class-model-extraction`: Analyse des Python-Quelltexts zu einem sprachneutralen Klassenmodell (Klassen, Member, Beziehungen) inkl. Heuristiken für Beziehungsarten.
- `uml-annotations`: Kommentar-Syntax `# uml: …` zur expliziten Festlegung von Beziehungsart, Klassenart, Multiplizität und Sichtbarkeit im Diagramm.
- `class-diagram`: Standardkonforme Darstellung des Klassenmodells als SVG und automatisches, quelltextnahes Layout.

### Modified Capabilities
- keine (Projekt ist neu)

## Impact

- Neues Repository-Layout: `index.html`, `css/`, `js/`, `py/` (Analyse-Skript für Pyodide), `tests/`.
- Externe Laufzeit-Abhängigkeiten per CDN: Pyodide (wie in CS Circles, v0.26.x), Layout-Bibliothek ELK.js. Ohne Netz beim ersten Laden nicht nutzbar.
- Ladezeit: Pyodide (~10 MB) wird einmalig geladen; die UI zeigt den Ladezustand.
- Keine Server-Komponente, keine Nutzerdaten verlassen den Browser.
