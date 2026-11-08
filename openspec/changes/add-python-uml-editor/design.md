# Design

## Context

Greenfield-Repository (nur `plan.md`). Vorbilder:
- `proj/grader`: statisch, HTML/CSS/Vanilla-JS, kein Build-Schritt, GitHub Pages, eigener Mini-Testrunner (`tests/runner.js`, `tests/run.js` lädt Module per `vm` in Node).
- CS-Circles-Quellen: Pyodide v0.26.4 per CDN.

Anforderungen: siehe `specs/` (source-editor, class-model-extraction, uml-annotations, class-diagram).

## Goals / Non-Goals

**Goals:**
- Kein Build-Schritt, alles per `<script>` lad- und statisch hostbar.
- Analyse-Logik in reinem Python, ohne Pyodide mit CPython testbar.
- UI bleibt beim Laden von Pyodide und bei der Analyse flüssig.

**Non-Goals:**
- Ausführen des Nutzer-Codes, Laufzeit-Introspektion.
- Mehrere Dateien/Module, Importe auflösen, verschachtelte Klassen, Generics-Darstellung (`T`-Parameter).
- Andere Diagrammarten, Bild-Export, Teilen per Link, Offline-Betrieb (spätere Changes).
- Manuelles Verschieben von Klassen im Diagramm.

## Decisions

### D1: Statische App ohne Build, Abhängigkeiten per CDN
`index.html` lädt `css/style.css` und `js/*.js` als klassische Skripte (globaler Namensraum `PyUML`, wie grader). CDN-Abhängigkeiten mit fester Version:
- Pyodide 0.26.4 (`cdn.jsdelivr.net/pyodide/v0.26.4/full/`) – wie CS Circles.
- CodeMirror 5.65.x (cdnjs, `codemirror.min.js` + `mode/python` + `addon/selection/active-line`).
- ELK.js 0.9.3 (`elk.bundled.js`, jsDelivr).

Alternativen: CodeMirror 6 / Monaco (benötigen Bundler bzw. sind schwergewichtig); `<textarea>` (keine Hervorhebung, kein Zeilen-Marker). Brython/Skulpt statt Pyodide: kein vollständiges `ast`/`tokenize` bzw. abweichende Semantik.

### D2: Analyse mit `ast` + `tokenize` in Pyodide, im Web Worker
`py/uml_model.py` enthält `analyze(source: str) -> dict` (JSON-fähig). `ast.parse` liefert Struktur, `tokenize` die Kommentare mit Zeilennummern (AST verwirft Kommentare). Kein `exec`/`eval` → Spec „Quelltext wird nicht ausgeführt“ ist strukturell erfüllt.

Pyodide läuft in `js/worker.js` (dedizierter Web Worker), der `uml_model.py` per `fetch` lädt und `pyodide.runPython` nur für das Modul ausführt; der Nutzer-Code wird als String an `analyze` übergeben. Nachrichten: `{id, source}` → `{id, model}` | `{id, error:{line, col, message}}`. Der Client verwirft Antworten mit veralteter `id`. Entprellung (400 ms) im Hauptthread.

Alternative: Pyodide im Hauptthread – einfacher, aber blockiert die UI beim Laden (~10 MB) und bei großen Dateien.

### D3: Modellformat (Vertrag Python → JS)
```json
{
  "classes": [{
    "name": "Auto", "line": 3, "kind": "class|abstract|interface|enum|external",
    "attributes": [{"name": "km", "type": "float", "visibility": "+|-|#", "static": false, "line": 5}],
    "methods": [{"name": "fahren", "params": [{"name": "km", "type": "int", "default": "10"}],
                 "returns": "float", "visibility": "+", "static": false, "abstract": false, "line": 7}],
    "literals": ["ROT"]
  }],
  "relations": [{"kind": "generalization|realization|association|aggregation|composition|dependency",
                 "source": "Auto", "target": "Motor",
                 "targetMult": "1", "sourceMult": null, "line": 5}],
  "warnings": [{"line": 7, "message": "unbekannte UML-Annotation 'kompositon'"}]
}
```
Typen werden mit `ast.unparse` als Python-Schreibweise geliefert; `typing.List[X]` → `list[X]`, `Optional[X]` → `X | None` normalisiert.

### D4: Analyse in zwei Durchläufen
1. Klassennamen sammeln (für Vorwärtsreferenzen und Typprüfung).
2. Je Klasse: Basisklassen, Rumpf-Zuweisungen, Methoden; `self.x`-Zuweisungen über `ast.walk` je Methode. Pro Attribut wird gemerkt: Annotation, Herkunft des Werts (Parameter / Konstruktoraufruf einer Modellklasse / Literal / `append(Klasse(...))` / Unbekannt).
3. Beziehungen ableiten: Typ auflösen → Zielklasse + Multiplizität (Container → `*`, `None`-Union → `0..1`, `dict[K, V]` → `V`); Art per Heuristik (selbst erzeugt → Komposition, sonst Assoziation); danach Annotationen anwenden; Abhängigkeiten zuletzt, deduplizieren gegen vorhandene Beziehungen.

### D5: Annotationen
Parser in `uml_model.py`: Regex `#\s*uml\s*:\s*(.*)`, Tokens per `[\s,]+`. Zuordnung: Kommentar auf Codezeile → Knoten, dessen Zeilenbereich (`lineno..end_lineno`) die Zeile enthält, mit Vorrang für das spezifischste Element (Attributzuweisung > Methode > Klasse). Eigenständige Kommentarzeile → nächste Codezeile (Leerzeilen/andere Kommentare übersprungen); steht davor ein Decorator, gilt die Zeile von Decorator bis Definition. Schlüsselwörter über Alias-Tabelle (de/en, Umlaut-/ae-Varianten) auf kanonische Werte; Validierung je Elementart erzeugt Warnungen.

### D6: Layout mit ELK „layered“
Graph: Knoten = Klassen in Quelltext-Reihenfolge, Größe vorab per Textmessung (`canvas.measureText` mit Diagramm-Font) bestimmt. Generalisierung/Realisierung werden für ELK als Kante Oberklasse → Unterklasse eingespeist (Richtung `DOWN`, Oberklasse landet oben), Darstellung behält UML-Richtung. Übrige Beziehungen Quelle → Ziel. Optionen:
- `elk.algorithm: layered`, `elk.direction: DOWN`, `elk.edgeRouting: ORTHOGONAL`
- `elk.layered.considerModelOrder.strategy: NODES_AND_EDGES`, `elk.layered.crossingMinimization.forceNodeModelOrder: true` → Reihenfolge wie im Quelltext, deterministisch (Spec „Stabiles Layout“).
- Multiplizitäten (einzige Linienbeschriftung) als ELK-Kantenlabels (`HEAD`/`TAIL`), damit ELK Platz reserviert.
- Unverbundene Klassen: `elk.separateConnectedComponents` mit `elk.layered.compaction`/Komponenten-Packing in Modellreihenfolge.

Alternativen: dagre (keine Modellreihenfolge, unmaintained), Mermaid/PlantUML (UML-Notation nur teilweise, kein Einfluss auf Labels, PlantUML braucht Server), eigenes Layout (Kantenführung zu aufwendig).

### D7: Eigener SVG-Renderer
`js/render.js` erzeugt SVG aus Modell + ELK-Ergebnis. Pfeilspitzen/Rauten als `<marker>` in `<defs>`. Formatierung der Textzeilen in `js/notation.js` als reine Funktionen (Node-testbar). Klassen-`<g>` trägt `data-line` für den Sprung in den Editor.

### D8: Viewport
`js/viewport.js`: `viewBox`-basiertes Zoomen/Pannen (Wheel, Pointer-Events, Pinch). Zustand bleibt erhalten, solange die Menge der Klassennamen gleich bleibt; sonst „Einpassen“.

### D9: Dateistruktur und Tests
```
index.html, css/style.css
js/  app.js editor.js analyzer-client.js worker.js notation.js layout.js render.js viewport.js storage.js example.js
py/  uml_model.py
tests/ runner.js run.js *.test.js (Node, wie grader)   test_uml_model.py (unittest, CPython ≥ 3.11)
```
`npm`-frei: `node tests/run.js` und `python3 -m unittest discover tests`. Pyodide 0.26 bringt Python 3.12 → Analyse-Code auf 3.11+ beschränken.

## Risks / Trade-offs

- [`file://` startet keine Worker / `fetch` auf `py/`] → README: lokal per `python3 -m http.server`; GitHub Pages funktioniert direkt.
- [Pyodide-Ladezeit/Größe] → Ladehinweis, Editor sofort nutzbar; Browser-Cache.
- [CDN nicht erreichbar] → klare Fehlermeldung (Spec); kein Offline-Modus.
- [Heuristik Komposition/Assoziation trifft didaktisch nicht immer] → bewusst einfache, dokumentierte Regel + Annotationen.
- [Ohne Rollennamen ist bei mehreren Linien zwischen denselben Klassen nicht erkennbar, welche zu welchem Attribut gehört] → Attributbereich zeigt alle Attribute mit Typ; `# uml: attribut` unterdrückt bei Bedarf einzelne Linien.
- [ELK-Layout bei vielen Beziehungen unruhig] → Modellreihenfolge erzwingen; akzeptiert für Unterrichtsgrößen (< 20 Klassen).
- [Textmessung vs. SVG-Rendering weicht ab] → gleiche Font-Familie/Größe; kleiner Innenabstand als Puffer.

## Migration Plan

Neu, keine Migration. Veröffentlichung: GitHub Pages aus `main` (Root). Rollback = vorherigen Commit deployen.

## Open Questions

- Farbschema/Dark Mode des Diagramms – später festlegbar.
- Genaue Formulierung und Umfang des Beispielprogramms – bei Umsetzung.
