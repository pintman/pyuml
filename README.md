# PyUML

Python-Quelltext links, UML-Klassendiagramm rechts – live im Browser.

Für den OOP-Unterricht mit Python: Jede Änderung am Code erscheint nach einer kurzen Tipp-Pause im Klassendiagramm (UML 2.5). Für das Diagramm wird der Code mit Pythons `ast`-Modul (Pyodide im Browser) **analysiert, nicht ausgeführt**; ausgeführt wird er nur getrennt davon für den [Ausgabe-Bereich](#ausgabe). Kein Server, keine Installation; der Quelltext bleibt im Browser (localStorage) – außer du teilst ihn aktiv per Link (siehe [Teilen](#teilen)).

## Starten

Rein statische Seite ohne Build-Schritt. Lokal über einen einfachen Webserver starten (über `file://` starten Web Worker nicht):

```sh
python3 -m http.server
```

Danach <http://localhost:8000/> öffnen. Beim ersten Laden wird Pyodide (~10 MB) per CDN geladen; eine Internetverbindung ist nötig.

GitHub Pages: Repository-Root aus `main` veröffentlichen – alle Pfade sind relativ.

## Ausgabe

Unter dem Quelltext zeigt der Bereich „Ausgabe“, was das Programm tut: `print`-Ausgaben und Fehlermeldungen (Tracebacks mit Zeilennummer, rot). Solange der Bereich eingeblendet ist, wird das Programm **nach jeder Tipp-Pause automatisch ausgeführt** – ebenso nach dem Laden, Öffnen einer Datei und Einblenden. Jeder Lauf startet frisch (`__name__ == "__main__"`) und ersetzt die vorige Ausgabe. Ein Klick auf „Ausgabe“ blendet den Bereich aus (der Zustand wird im Browser gespeichert); ausgeblendet wird nichts ausgeführt und kein zweiter Python-Interpreter geladen.

- **Zeitlimit 5 s:** Längere Läufe (z. B. Endlosschleifen) werden abgebrochen; die bisherige Ausgabe bleibt stehen.
- **`input()`** öffnet einen Browser-Dialog – bei jeder Ausführung erneut. Abbrechen beendet den Lauf. Die Zeit im Dialog zählt nicht zum Zeitlimit.
- **Einschränkung:** Für jede Eingabe wird das Programm von vorn wiederholt und erhält die bisherigen Eingaben erneut. Programme mit Zufall (`random`) oder Zeitabfragen können dabei vor einem `input()` andere Ausgaben zeigen als im ersten Durchlauf.
- Ausgaben über 100.000 Zeichen werden gekürzt.
- Die Ausführung läuft in einem eigenen Web Worker. Das Diagramm hängt nicht davon ab: Laufzeitfehler, Endlosschleifen oder Abbrüche verzögern es nicht.

## Teilen

„Teilen“ kopiert einen Link auf die aktuelle Seite in die Zwischenablage, der den vollständigen Quelltext enthält (UTF-8, URL-sicheres Base64 im Fragment `#code=…`). Das Fragment wird vom Browser nicht an den Webserver übertragen; der Quelltext landet nur dort, wo der Link eingefügt wird. Verweigert der Browser die Zwischenablage, erscheint der Link zum manuellen Kopieren.

Beim Öffnen eines solchen Links steht dessen Quelltext im Editor und das Diagramm wird erzeugt. Der Link-Inhalt **ersetzt den lokal gespeicherten Stand** und wird selbst gespeichert; anschließend wird das Fragment aus der Adresszeile entfernt, damit spätere Änderungen beim Neuladen erhalten bleiben. Ist der Link beschädigt, erscheint „Link konnte nicht gelesen werden“ und der bisherige Stand bleibt unverändert. Sehr lange Links (> 8.000 Zeichen) werden von manchen Programmen gekürzt – dann lieber „Speichern“ und die Datei weitergeben.

## Was erkannt wird

- Klassen auf Modulebene (in Quelltext-Reihenfolge), Attribute aus `self.x = …`, Klassenattribute (statisch, unterstrichen), Dataclass-Felder, Enum-Werte, `@property` als Attribut.
- Typen aus Annotation → Parameter-Annotation → Literal → Konstruktoraufruf.
- Sichtbarkeit: `__x` privat (`-`), `_x` geschützt (`#`), sonst öffentlich (`+`).
- Klassenart: abstrakt (`ABC` oder `@abstractmethod`), Interface (`Protocol`), Aufzählung (`Enum`).
- Beziehungen: Vererbung/Realisierung, Assoziation (Objekt übergeben), Komposition (Objekt selbst erzeugt), Abhängigkeit (nur Parameter-/Rückgabetyp oder lokal erzeugt). Multiplizität `1`, `0..1` (`| None`), `*` (Container).

## Annotationen `# uml: …`

Wo die Heuristik nicht trifft, legt ein Kommentar fest, was gemeint ist. Er gilt für das Element in **derselben Zeile** oder – als eigene Zeile – für das Element in der **nächsten Codezeile**. Mehrere Schlüsselwörter durch Leerzeichen oder Komma trennen; Groß-/Kleinschreibung egal. Andere Kommentare wirken nicht.

| Schlüsselwort (de / en) | Element | Wirkung |
|---|---|---|
| `komposition` / `composition` | Attribut | Komposition (gefüllte Raute) |
| `aggregation` | Attribut | Aggregation (hohle Raute) |
| `assoziation` / `association` | Attribut | gerichtete Assoziation |
| `abhaengigkeit`, `abhängigkeit` / `dependency` | Attribut | Abhängigkeit (gestrichelt) |
| `attribut` / `attribute` | Attribut | keine Linie, nur im Attributbereich |
| `1`, `0..1`, `*`, `0..*`, `1..*`, `2..5` | Attribut | Multiplizität am Ziel |
| `x -> y`, z. B. `1 -> 0..*` | Attribut | Multiplizität an Quelle (`x`) und Ziel (`y`) |
| `typ=Klasse` / `type=Klasse` | Attribut | Typ festlegen, z. B. für leere Listen |
| `interface` / `schnittstelle` | Klasse | als Interface; Unterklassen realisieren es |
| `abstrakt` / `abstract` | Klasse | als abstrakte Klasse |
| `ausblenden` / `hide` | Klasse, Attribut, Methode | nicht im Diagramm |

Unbekannte oder unpassende Annotationen erscheinen als Warnung mit Zeilennummer unter dem Editor; das Diagramm wird trotzdem erzeugt.

Beispiel:

```python
from abc import ABC, abstractmethod


class Fahrbar(ABC):  # uml: interface
    @abstractmethod
    def fahren(self) -> None: ...


class Tier:  # uml: abstrakt
    pass


class Motor:
    pass


class Auto(Fahrbar):
    def __init__(self, motor: Motor):
        self.motor = motor  # uml: komposition

    def fahren(self) -> None:
        pass

    def __repr__(self) -> str:  # uml: ausblenden
        return "Auto"


class Spieler:
    pass


class Mannschaft:
    def __init__(self):
        self.spieler: list[Spieler] = []  # uml: aggregation 1..*


class Konto:
    pass


class Kunde:
    def __init__(self):
        self.konten = []  # uml: typ=Konto, 1 -> 0..*


class Datum:
    pass


class Termin:
    def __init__(self):
        self.datum = Datum()  # uml: attribut


# uml: ausblenden
class _Logger:
    pass
```

Ergebnis: `Fahrbar` ist ein Interface, das `Auto` realisiert; `Tier` ist abstrakt; `Auto` ◆→ `Motor` (Komposition); `Mannschaft` ◇→ `Spieler` mit `1..*`; `Kunde` → `Konto` mit `1` an `Kunde` und `0..*` an `Konto`; `Termin` hat das Attribut `datum: Datum` ohne Linie; `_Logger` und `__repr__` fehlen im Diagramm.

## Tests

```sh
node tests/run.js                    # JS-Module (Notation, Layout, Renderer, Analyse-/Runner-Client, Storage, Share)
python3 -m unittest discover tests   # py/uml_model.py (Analyse) und py/run_program.py (Ausführung), CPython ≥ 3.11
```

Keine npm-Abhängigkeiten.

## Aufbau

```
index.html, css/style.css
js/   app.js editor.js analyzer-client.js worker.js runner-client.js run-worker.js notation.js layout.js render.js viewport.js storage.js share.js example.js
py/   uml_model.py      Analyse: analyze(source) -> Klassenmodell (dict)
      run_program.py    Ausführung: run(source, inputs, write) -> Status (ok / error / input)
tests/
```
