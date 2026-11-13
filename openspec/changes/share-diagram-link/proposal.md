# Proposal

## Why

Lehrkräfte und Lernende wollen ein Klassendiagramm samt Quelltext schnell weitergeben (z. B. im Kurs-Chat oder auf einem Arbeitsblatt). Bisher geht das nur über den Umweg „Speichern → Datei verschicken → Öffnen“. Da die Anwendung serverlos ist, soll der Quelltext selbst im Link stecken.

## What Changes

- Neue Schaltfläche „Teilen“ in der Kopfzeile: erzeugt einen Link, der den aktuellen Quelltext kodiert (UTF-8 → Base64url) im URL-Fragment (`#code=…`) enthält, und kopiert ihn in die Zwischenablage.
- Beim Öffnen eines solchen Links wird der Quelltext dekodiert, in den Editor geladen und das Diagramm erzeugt; der Link-Code hat Vorrang vor dem lokal gespeicherten Quelltext.
- Nach dem Laden wird das Fragment aus der Adresszeile entfernt, damit spätere Änderungen beim Neuladen nicht vom Link-Inhalt überschrieben werden.
- Ungültiger oder beschädigter Link-Code führt zu einer Meldung; der lokal gespeicherte Quelltext bleibt dann erhalten.
- Präzisierung der bisherigen Aussage „Der Quelltext SHALL den Browser nicht verlassen“: Er verlässt den Browser nur, wenn der Nutzer aktiv einen Link teilt. Das Fragment wird nicht an den Webserver übertragen.

## Capabilities

### New Capabilities
- `share-link`: Kodieren des Quelltexts in einen teilbaren Link und Wiederherstellen von Quelltext und Diagramm beim Öffnen des Links.

### Modified Capabilities
- `source-editor`: Requirement „Quelltext lokal speichern“ – Vorrang des Link-Codes beim Start und präzisierte Datenschutzaussage; Requirement „Beispiel wiederherstellen und Datei laden/speichern“ – zusätzliche Schaltfläche „Teilen“.

## Impact

- Neues DOM-freies Modul `js/share.js` (Kodieren/Dekodieren, URL-Fragment lesen/bauen) inkl. Tests in `tests/share.test.js`; Eintrag in `tests/run.js` und `index.html`.
- `js/app.js`: Startlogik (Link vor localStorage vor Beispiel), Teilen-Schaltfläche, Fragment entfernen.
- `index.html`: Schaltfläche „Teilen“, kurze Rückmeldung („Link kopiert“).
- `README.md`: Abschnitt zum Teilen.
- Keine neuen Abhängigkeiten.
