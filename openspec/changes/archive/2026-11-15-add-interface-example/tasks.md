# Tasks

Annahme: Interface `Wartbar(Protocol)` mit `def warten(self) -> None: ...`; `Auto` realisiert es zusätzlich (`class Auto(Fahrzeug, Wartbar):`) und implementiert `warten`. Bestehende Klassen und Kommentare bleiben.

## 1. Beispielprogramm

- [x] 1.1 Test zuerst: `tests/test_uml_model.py::Beispielprogramm` prüft zusätzlich `"realization"` in den Beziehungsarten und `"interface"` in den Klassenarten; `python3 -m unittest discover tests` schlägt fehl (rot)
- [x] 1.2 `js/example.js`: `from typing import Protocol` ergänzen, Klasse `Wartbar(Protocol)` vor `Fahrzeug` einfügen, `Auto(Fahrzeug, Wartbar)` mit `warten()` (Kommentar `# Realisierung`), Kopfkommentar um „Interface“ ergänzen; Test aus 1.1 grün, keine Warnungen
- [x] 1.3 Prüfen, dass das Beispiel fehlerfrei läuft: `python3 -I -c` auf den extrahierten Quelltext (kein Laufzeitfehler durch ABC/Protocol-Metaklassen); `node tests/run.js` grün (Share-Round-Trip, `class Fahrzeug(ABC)` weiterhin enthalten)
- [x] 1.4 Im Browser (`python3 -m http.server`, „Beispiel“ laden): `Wartbar` mit `«interface»` oberhalb von `Auto`, gestrichelte Linie mit hohlem Dreieck von `Auto` zu `Wartbar`, keine Linie kreuzt Klassensymbole

## 2. Dokumentation

- [x] 2.1 `README.md`: Abschnitt „Interfaces“ nach „Was erkannt wird“ mit kurzem `Protocol`-Beispiel, Ergebnis (`«interface»`, Realisierung gestrichelt mit hohlem Dreieck) und Hinweis auf `# uml: interface` für ABC-Klassen; Beispielcode im Editor einfügen und Diagramm wie beschrieben prüfen
