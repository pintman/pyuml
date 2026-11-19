# Spec Delta

## MODIFIED Requirements

### Requirement: Zweispaltige Oberfläche
Die Anwendung SHALL links einen Editor für Python-Quelltext und rechts das zugehörige Klassendiagramm anzeigen. Die Trennlinie zwischen beiden Bereichen SHALL per Maus verschiebbar sein. Bei Fensterbreiten unter 800 px SHALL der Diagrammbereich unter dem Editor stehen. Ist das Diagramm eingeklappt, SHALL der Editor den frei werdenden Platz nutzen und die Trennlinie ausgeblendet sein; nach dem Ausklappen SHALL der Editor wieder die vorherige Breite haben.

#### Scenario: Startansicht
- **WHEN** der Nutzer die Anwendung öffnet
- **THEN** sieht er links den Editor und rechts den Diagrammbereich

#### Scenario: Trennlinie verschieben
- **WHEN** der Nutzer die Trennlinie nach rechts zieht
- **THEN** wird der Editor breiter und der Diagrammbereich schmaler

#### Scenario: Schmales Fenster
- **WHEN** das Fenster 600 px breit ist
- **THEN** steht der Diagrammbereich unterhalb des Editors

#### Scenario: Diagramm eingeklappt
- **WHEN** der Nutzer das Diagramm einklappt
- **THEN** reicht der Editor bis auf den schmalen Streifen des Diagrammbereichs über die ganze Breite und die Trennlinie ist nicht sichtbar

#### Scenario: Breite nach dem Ausklappen
- **WHEN** der Nutzer die Trennlinie auf 60 % gezogen, das Diagramm ein- und wieder ausgeklappt hat
- **THEN** nimmt der Editor wieder 60 % der Breite ein
