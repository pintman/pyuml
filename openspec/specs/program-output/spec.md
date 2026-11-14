# program-output Specification

## Purpose

Macht sichtbar, was das Python-Programm im Editor tut: Es wird im Browser ausgeführt, und seine Ausgaben und Fehler erscheinen in einem ein- und ausblendbaren Bereich unter dem Quelltext. Das Klassendiagramm wird davon nicht beeinflusst.

## Requirements

### Requirement: Ausgabe-Bereich unter dem Quelltext
Die Anwendung SHALL unterhalb des Quelltextes einen Ausgabe-Bereich mit Kopfzeile „Ausgabe“ anzeigen. Ausgaben SHALL in Festbreitenschrift und mit erhaltenen Zeilenumbrüchen und Leerzeichen dargestellt werden. Fehlerausgaben SHALL optisch von normalen Ausgaben unterscheidbar sein. Bei viel Ausgabe SHALL der Bereich scrollbar sein und das Ende zeigen.

#### Scenario: Ausgabe anzeigen
- **WHEN** der Quelltext `print("Hallo")` enthält und ausgeführt wurde
- **THEN** zeigt der Ausgabe-Bereich `Hallo`

#### Scenario: Mehrzeilige Ausgabe
- **WHEN** das Programm 200 Zeilen ausgibt
- **THEN** ist der Ausgabe-Bereich scrollbar und zeigt die letzte Zeile

#### Scenario: Keine Ausgabe
- **WHEN** das Programm fehlerfrei endet, ohne etwas auszugeben
- **THEN** ist der Ausgabe-Bereich leer und weist darauf hin, dass es keine Ausgabe gab

### Requirement: Ausgabe-Bereich ein- und ausblenden
Die Anwendung SHALL in der Kopfzeile des Ausgabe-Bereichs einen Umschalter anbieten, mit dem der Bereich ein- und ausgeblendet wird. Ausgeblendet SHALL nur die Kopfzeile sichtbar bleiben und der Editor den frei werdenden Platz nutzen. Der Zustand SHALL im Browser gespeichert und beim nächsten Öffnen wiederhergestellt werden. Beim ersten Start SHALL der Bereich eingeblendet sein.

#### Scenario: Ausblenden
- **WHEN** der Nutzer den Umschalter bei eingeblendetem Bereich betätigt
- **THEN** ist nur noch die Kopfzeile sichtbar und der Editor wird größer

#### Scenario: Zustand bleibt erhalten
- **WHEN** der Nutzer den Bereich ausblendet und die Seite neu lädt
- **THEN** ist der Bereich weiterhin ausgeblendet

#### Scenario: Erster Start
- **WHEN** die Anwendung zum ersten Mal in diesem Browser geöffnet wird
- **THEN** ist der Ausgabe-Bereich eingeblendet

### Requirement: Automatische Ausführung
Solange der Ausgabe-Bereich eingeblendet ist, SHALL die Anwendung den Quelltext nach einer Tipp-Pause sowie nach dem Laden, Öffnen einer Datei oder Einblenden des Bereichs automatisch ausführen. Jede Ausführung SHALL in einem frischen Programmzustand mit `__name__ == "__main__"` beginnen und die vorherige Ausgabe ersetzen. Ist der Bereich ausgeblendet, SHALL nichts ausgeführt werden.

#### Scenario: Ausgabe nach Tipp-Pause
- **WHEN** der Nutzer `print(1 + 2)` eintippt und kurz pausiert
- **THEN** zeigt der Ausgabe-Bereich `3`, ohne dass ein Knopf gedrückt wird

#### Scenario: Main-Guard
- **WHEN** der Quelltext `if __name__ == "__main__": print("start")` enthält
- **THEN** zeigt der Ausgabe-Bereich `start`

#### Scenario: Kein Zustand aus vorherigem Lauf
- **WHEN** ein vorheriger Lauf `x = 1` definiert hat und der Nutzer die Zeile löscht und `print(x)` stehen lässt
- **THEN** zeigt der Ausgabe-Bereich einen `NameError`

#### Scenario: Ausgeblendet
- **WHEN** der Ausgabe-Bereich ausgeblendet ist und der Nutzer den Quelltext ändert
- **THEN** wird das Programm nicht ausgeführt, und beim Einblenden wird es für den aktuellen Quelltext ausgeführt

#### Scenario: Veraltete Läufe
- **WHEN** der Nutzer den Quelltext ändert, während ein vorheriger Lauf noch läuft
- **THEN** erscheint nur die Ausgabe des Laufs für den aktuellen Quelltext

### Requirement: Laufzeit- und Syntaxfehler anzeigen
Bricht das Programm mit einer Ausnahme ab oder enthält es einen Syntaxfehler, SHALL der Ausgabe-Bereich die bis dahin erzeugte Ausgabe und danach die Fehlermeldung mit Fehlertyp und Zeilennummer im Quelltext anzeigen. Die Fehlermeldung SHALL keine internen Zeilen der Anwendung enthalten.

#### Scenario: Division durch null
- **WHEN** der Quelltext in Zeile 2 `print(1 / 0)` nach `print("a")` in Zeile 1 enthält
- **THEN** zeigt der Ausgabe-Bereich `a` und danach einen `ZeroDivisionError` mit Verweis auf Zeile 2

#### Scenario: Syntaxfehler
- **WHEN** der Quelltext einen Syntaxfehler enthält
- **THEN** zeigt der Ausgabe-Bereich einen `SyntaxError` und das zuletzt gültige Diagramm bleibt wie bisher ausgegraut stehen

### Requirement: Zeitlimit für die Ausführung
Die Anwendung SHALL jede Ausführung nach 5 Sekunden abbrechen. Die bis dahin erzeugte Ausgabe SHALL sichtbar bleiben, und es SHALL ein Hinweis auf den Abbruch erscheinen. Danach SHALL die Anwendung bedienbar bleiben und spätere Änderungen wieder ausführen.

#### Scenario: Endlosschleife
- **WHEN** der Quelltext `while True: pass` auf Modulebene enthält
- **THEN** zeigt der Ausgabe-Bereich nach 5 Sekunden einen Hinweis, dass das Programm nach 5 Sekunden abgebrochen wurde

#### Scenario: Weiterarbeiten nach Abbruch
- **WHEN** der Nutzer nach einem Abbruch die Endlosschleife durch `print("ok")` ersetzt
- **THEN** zeigt der Ausgabe-Bereich `ok`

### Requirement: Eingaben per Dialog
Ruft das Programm `input()` auf, SHALL die Anwendung einen Browser-Dialog mit dem Eingabetext von `input()` öffnen. Der eingegebene Wert SHALL als Rückgabe von `input()` gelten und zusammen mit dem Eingabetext in der Ausgabe erscheinen. Bei jeder Ausführung SHALL erneut gefragt werden. Bricht der Nutzer den Dialog ab, SHALL die Ausführung mit einem Hinweis enden. Die Wartezeit auf eine Eingabe SHALL nicht auf das Zeitlimit angerechnet werden.

#### Scenario: Name eingeben
- **WHEN** der Quelltext `name = input("Name? ")` und `print("Hallo", name)` enthält und der Nutzer im Dialog `Ada` eingibt
- **THEN** zeigt der Ausgabe-Bereich `Name? Ada` und `Hallo Ada`

#### Scenario: Erneute Ausführung fragt erneut
- **WHEN** der Nutzer den Quelltext ändert und kurz pausiert
- **THEN** öffnet sich der Dialog erneut

#### Scenario: Dialog abbrechen
- **WHEN** der Nutzer den Dialog abbricht
- **THEN** endet die Ausführung und der Ausgabe-Bereich zeigt einen Hinweis, dass die Eingabe abgebrochen wurde

#### Scenario: Langes Überlegen
- **WHEN** der Nutzer länger als 5 Sekunden mit der Eingabe wartet
- **THEN** wird das Programm nicht wegen des Zeitlimits abgebrochen

### Requirement: Diagramm unabhängig von der Ausführung
Die Erzeugung des Klassendiagramms SHALL von der Programmausführung unberührt bleiben. Sie SHALL den Quelltext weiterhin nur analysieren. Laufzeit, Fehler und Abbruch des Programms SHALL weder verhindern noch verzögern, dass das Diagramm aktualisiert wird. Ein offener Eingabedialog darf die Seite blockieren, bis er geschlossen ist. Danach SHALL das Diagramm dem aktuellen Quelltext entsprechen.

#### Scenario: Endlosschleife und Diagramm
- **WHEN** der Quelltext eine Klasse `Auto` und auf Modulebene `while True: pass` enthält
- **THEN** zeigt das Diagramm `Auto` sofort nach der Tipp-Pause, unabhängig vom laufenden Programm

#### Scenario: Laufzeitfehler und Diagramm
- **WHEN** das Programm mit einem Laufzeitfehler abbricht
- **THEN** wird das Diagramm normal und nicht ausgegraut dargestellt

### Requirement: Ladezustand der Ausführung
Solange der Interpreter für die Ausführung lädt, SHALL der Ausgabe-Bereich einen Ladehinweis zeigen. Danach SHALL der aktuelle Quelltext ausgeführt werden. Schlägt das Laden fehl, SHALL eine verständliche Fehlermeldung im Ausgabe-Bereich erscheinen, und das Diagramm SHALL weiter funktionieren.

#### Scenario: Erster Start
- **WHEN** die Seite geladen wird und der Interpreter für die Ausführung noch nicht bereit ist
- **THEN** zeigt der Ausgabe-Bereich „Python wird geladen …“

#### Scenario: Laden fehlgeschlagen
- **WHEN** der Interpreter für die Ausführung nicht geladen werden kann
- **THEN** zeigt der Ausgabe-Bereich eine Fehlermeldung
