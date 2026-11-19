# Spec Delta

## ADDED Requirements

### Requirement: Diagrammbereich ein- und ausklappen
Der Diagrammbereich SHALL eine Kopfzeile „Diagramm“ mit einem Umschalter zum Ein- und Ausklappen haben. Eingeklappt SHALL nur ein schmaler Streifen mit dem Umschalter sichtbar bleiben. Der Zustand SHALL im Browser gespeichert und beim nächsten Öffnen wiederhergestellt werden; beim ersten Start SHALL das Diagramm ausgeklappt sein. Analyse sowie Fehler- und Warnungsanzeige SHALL eingeklappt weiterlaufen.

#### Scenario: Einklappen
- **WHEN** der Nutzer bei ausgeklapptem Diagramm den Umschalter betätigt
- **THEN** ist vom Diagrammbereich nur noch der Streifen mit dem Umschalter sichtbar

#### Scenario: Ausklappen zeigt aktuellen Stand
- **WHEN** der Nutzer bei eingeklapptem Diagramm die Klasse `Fahrrad` ergänzt und danach den Umschalter betätigt
- **THEN** zeigt das Diagramm `Fahrrad`

#### Scenario: Syntaxfehler bei eingeklapptem Diagramm
- **WHEN** das Diagramm eingeklappt ist und der Nutzer in Zeile 3 einen Syntaxfehler macht
- **THEN** erscheint die Fehlermeldung mit „Zeile 3“ unter dem Editor und Zeile 3 ist markiert

#### Scenario: Zustand bleibt erhalten
- **WHEN** der Nutzer das Diagramm einklappt und die Seite neu lädt
- **THEN** ist das Diagramm weiterhin eingeklappt

#### Scenario: Erster Start
- **WHEN** die Anwendung zum ersten Mal in diesem Browser geöffnet wird
- **THEN** ist das Diagramm ausgeklappt
