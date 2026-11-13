# Spec Delta

## Purpose

Ermöglicht es, Quelltext und damit das zugehörige Klassendiagramm über einen Link weiterzugeben, der den Quelltext selbst enthält – ohne Server oder Konto.

## ADDED Requirements

### Requirement: Link zum Teilen erzeugen
Die Anwendung SHALL eine Schaltfläche „Teilen“ bieten. Sie SHALL einen Link auf die aktuelle Seite erzeugen, der den vollständigen aktuellen Editorinhalt verlustfrei kodiert enthält, und diesen in die Zwischenablage kopieren. Der Erfolg SHALL kurz sichtbar bestätigt werden.

#### Scenario: Link kopieren
- **WHEN** der Nutzer „Teilen“ wählt
- **THEN** liegt ein Link in der Zwischenablage und die Anwendung zeigt kurz „Link kopiert“

#### Scenario: Zwischenablage nicht verfügbar
- **WHEN** der Browser das Schreiben in die Zwischenablage verweigert
- **THEN** zeigt die Anwendung den Link so an, dass der Nutzer ihn manuell kopieren kann

### Requirement: Kodierung im URL-Fragment
Der Quelltext SHALL als UTF-8 in URL-sicherem Base64 (ohne Auffüllzeichen) im URL-Fragment mit dem Schlüssel `code` stehen (`#code=…`). Er SHALL nicht im Pfad oder in Query-Parametern stehen, damit er nicht an den Webserver übertragen wird. Umlaute, Emojis, Tabs und Zeilenumbrüche SHALL unverändert erhalten bleiben.

#### Scenario: Sonderzeichen
- **WHEN** der Quelltext `# Größe 🚗` und ein Tab-Zeichen enthält und geteilt wird
- **THEN** steht nach dem Öffnen des Links exakt derselbe Text im Editor

#### Scenario: Aufbau des Links
- **WHEN** die Anwendung unter `https://example.org/pyuml/` läuft und der Nutzer teilt
- **THEN** beginnt der Link mit `https://example.org/pyuml/#code=` und enthält nur die Zeichen `A–Z a–z 0–9 - _` nach `code=`

#### Scenario: Leerer Quelltext
- **WHEN** der Editor leer ist und der Nutzer teilt
- **THEN** öffnet der Link die Anwendung mit leerem Editor

### Requirement: Geteilten Link öffnen
Beim Öffnen einer Adresse mit gültigem `#code=…` SHALL die Anwendung den dekodierten Quelltext in den Editor laden und das Diagramm dafür erzeugen. Der Link-Inhalt SHALL Vorrang vor lokal gespeichertem Quelltext und dem Beispielprogramm haben und SHALL lokal gespeichert werden wie eine Eingabe.

#### Scenario: Link öffnen
- **WHEN** der Nutzer einen geteilten Link mit den Klassen `Auto` und `Motor` öffnet
- **THEN** zeigt der Editor diesen Quelltext und das Diagramm die Klassen `Auto` und `Motor`

#### Scenario: Vorrang vor lokalem Stand
- **WHEN** im Browser bereits anderer Quelltext gespeichert ist und der Nutzer einen geteilten Link öffnet
- **THEN** steht der Quelltext aus dem Link im Editor

### Requirement: Fragment nach dem Laden entfernen
Nach dem Übernehmen des Link-Inhalts SHALL die Anwendung das Fragment aus der Adresszeile entfernen, ohne die Seite neu zu laden oder einen Verlaufseintrag anzulegen. Spätere Änderungen SHALL beim Neuladen erhalten bleiben.

#### Scenario: Neuladen nach Bearbeitung
- **WHEN** der Nutzer einen geteilten Link öffnet, den Code ändert und die Seite neu lädt
- **THEN** steht der geänderte Code im Editor, nicht der ursprüngliche Link-Inhalt

### Requirement: Ungültiger Link
Ist der Inhalt von `#code=` nicht dekodierbar, SHALL die Anwendung eine verständliche Meldung anzeigen und wie ohne Link starten (lokal gespeicherter Quelltext bzw. Beispielprogramm). Lokal gespeicherter Quelltext SHALL dabei nicht überschrieben werden.

#### Scenario: Abgeschnittener Link
- **WHEN** der Nutzer einen beschädigten Link mit `#code=%%%` öffnet
- **THEN** erscheint eine Meldung, dass der Link nicht gelesen werden konnte, und der zuvor gespeicherte Quelltext steht im Editor
