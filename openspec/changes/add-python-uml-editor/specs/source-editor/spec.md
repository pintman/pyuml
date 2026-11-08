# Spec Delta

## Purpose

Stellt den Python-Editor auf der linken Seite bereit: Eingabe und lokale Speicherung des Quelltexts, Anzeige von Lade- und Fehlerzuständen und automatisches Anstoßen der Diagrammberechnung.

## ADDED Requirements

### Requirement: Zweispaltige Oberfläche
Die Anwendung SHALL links einen Editor für Python-Quelltext und rechts das zugehörige Klassendiagramm anzeigen. Die Trennlinie zwischen beiden Bereichen SHALL per Maus verschiebbar sein. Bei Fensterbreiten unter 800 px SHALL der Diagrammbereich unter dem Editor stehen.

#### Scenario: Startansicht
- **WHEN** der Nutzer die Anwendung öffnet
- **THEN** sieht er links den Editor und rechts den Diagrammbereich

#### Scenario: Trennlinie verschieben
- **WHEN** der Nutzer die Trennlinie nach rechts zieht
- **THEN** wird der Editor breiter und der Diagrammbereich schmaler

#### Scenario: Schmales Fenster
- **WHEN** das Fenster 600 px breit ist
- **THEN** steht der Diagrammbereich unterhalb des Editors

### Requirement: Python-Editor
Der Editor SHALL Zeilennummern und Python-Syntaxhervorhebung anzeigen. Die Tab-Taste SHALL vier Leerzeichen einrücken; nach einer Zeile mit abschließendem `:` SHALL die nächste Zeile automatisch eine Stufe tiefer eingerückt werden.

#### Scenario: Einrückung nach Doppelpunkt
- **WHEN** der Nutzer `class Auto:` tippt und Enter drückt
- **THEN** beginnt die neue Zeile mit vier Leerzeichen

#### Scenario: Tab-Taste
- **WHEN** der Nutzer am Zeilenanfang Tab drückt
- **THEN** werden vier Leerzeichen eingefügt und der Fokus bleibt im Editor

### Requirement: Automatische Neuberechnung
Die Anwendung SHALL das Diagramm nach jeder Änderung des Quelltexts automatisch neu erzeugen, sobald 400 ms lang keine weitere Eingabe erfolgt ist. Ein manuelles Auslösen SHALL nicht nötig sein.

#### Scenario: Klasse hinzufügen
- **WHEN** der Nutzer eine neue Klasse `Fahrrad` eintippt und kurz pausiert
- **THEN** erscheint `Fahrrad` im Diagramm, ohne dass ein Knopf gedrückt wird

#### Scenario: Schnelles Tippen
- **WHEN** der Nutzer zehn Zeichen in schneller Folge tippt
- **THEN** wird das Diagramm erst nach der Tipp-Pause einmal neu erzeugt

### Requirement: Quelltext wird nicht ausgeführt
Die Anwendung SHALL den Quelltext ausschließlich syntaktisch analysieren und ihn nicht ausführen. Seiteneffekte im Quelltext (Ausgaben, Endlosschleifen, Eingaben) SHALL keine Wirkung haben.

#### Scenario: Endlosschleife im Quelltext
- **WHEN** der Quelltext `while True: pass` auf Modulebene enthält
- **THEN** bleibt die Anwendung bedienbar und das Diagramm wird erzeugt

#### Scenario: Ausgabe im Quelltext
- **WHEN** der Quelltext `print("Hallo")` enthält
- **THEN** erscheint keine Ausgabe und das Diagramm wird normal erzeugt

### Requirement: Syntaxfehler anzeigen
Bei einem Syntaxfehler SHALL die Anwendung die Fehlermeldung mit Zeilennummer unterhalb des Editors anzeigen, die betroffene Zeile im Editor markieren und das zuletzt gültige Diagramm ausgegraut stehen lassen. Nach Behebung SHALL Meldung und Markierung verschwinden.

#### Scenario: Fehlender Doppelpunkt
- **WHEN** der Nutzer in Zeile 3 `class Auto` ohne Doppelpunkt schreibt
- **THEN** zeigt die Anwendung eine Fehlermeldung mit „Zeile 3“, markiert Zeile 3 und das vorherige Diagramm bleibt ausgegraut sichtbar

#### Scenario: Fehler behoben
- **WHEN** der Nutzer den Doppelpunkt ergänzt
- **THEN** verschwinden Meldung und Markierung und das Diagramm wird aktuell und normal dargestellt

### Requirement: Ladezustand des Interpreters
Solange der Python-Interpreter lädt, SHALL der Diagrammbereich einen Ladehinweis zeigen und der Editor SHALL bereits bearbeitbar sein. Nach dem Laden SHALL das Diagramm für den aktuellen Quelltext erzeugt werden. Schlägt das Laden fehl, SHALL eine verständliche Fehlermeldung erscheinen.

#### Scenario: Erster Start
- **WHEN** die Seite geladen wird und der Interpreter noch nicht bereit ist
- **THEN** zeigt der Diagrammbereich „Python wird geladen …“ und der Nutzer kann bereits tippen

#### Scenario: Keine Netzverbindung
- **WHEN** der Interpreter nicht geladen werden kann
- **THEN** zeigt der Diagrammbereich eine Meldung, dass Python nicht geladen werden konnte

### Requirement: Quelltext lokal speichern
Die Anwendung SHALL den Quelltext bei jeder Änderung im Browser speichern und beim nächsten Öffnen wiederherstellen. Beim allerersten Start SHALL ein Beispielprogramm geladen werden, das Vererbung, Assoziation, Komposition und eine abstrakte Klasse zeigt. Der Quelltext SHALL den Browser nicht verlassen.

#### Scenario: Neuladen der Seite
- **WHEN** der Nutzer Code eingibt und die Seite neu lädt
- **THEN** steht derselbe Code wieder im Editor

#### Scenario: Erster Start
- **WHEN** die Anwendung zum ersten Mal in diesem Browser geöffnet wird
- **THEN** enthält der Editor das Beispielprogramm und das Diagramm zeigt dessen Klassen

### Requirement: Beispiel wiederherstellen und Datei laden/speichern
Die Anwendung SHALL Schaltflächen bieten, um das Beispielprogramm (nach Bestätigung) zu laden, eine lokale `.py`-Datei in den Editor zu öffnen und den Editorinhalt als `.py`-Datei herunterzuladen.

#### Scenario: Datei öffnen
- **WHEN** der Nutzer `fahrzeuge.py` über „Öffnen“ wählt
- **THEN** steht deren Inhalt im Editor und das Diagramm wird erzeugt

#### Scenario: Datei speichern
- **WHEN** der Nutzer „Speichern“ wählt
- **THEN** lädt der Browser den Editorinhalt als `.py`-Datei herunter

#### Scenario: Beispiel laden abbrechen
- **WHEN** der Nutzer „Beispiel“ wählt und die Rückfrage abbricht
- **THEN** bleibt der bisherige Quelltext unverändert
