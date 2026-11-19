# Spec Delta

## ADDED Requirements

### Requirement: Höhe des Ausgabe-Bereichs anpassen
Zwischen Editor und Ausgabe-Bereich SHALL eine waagerechte Trennlinie liegen, die per Maus oder Touch verschiebbar ist. Die Ausgabe SHALL dabei zwischen 10 % und 85 % der Höhe der Editorspalte einnehmen. Ist die Ausgabe ausgeblendet, SHALL die Trennlinie nicht sichtbar sein. Nach dem Einblenden SHALL die zuvor gezogene Höhe gelten. Nach dem Neuladen SHALL die Standardhöhe gelten.

#### Scenario: Ausgabe vergrößern
- **WHEN** der Nutzer die Trennlinie über der Ausgabe nach oben zieht
- **THEN** wird der Ausgabe-Bereich höher und der Editor niedriger

#### Scenario: Grenzen
- **WHEN** der Nutzer die Trennlinie bis ganz nach oben zieht
- **THEN** bleibt der Editor sichtbar und die Ausgabe nimmt höchstens 85 % der Höhe ein

#### Scenario: Ausgeblendet
- **WHEN** der Ausgabe-Bereich ausgeblendet ist
- **THEN** ist keine Trennlinie über der Kopfzeile „Ausgabe“ sichtbar

#### Scenario: Höhe nach dem Einblenden
- **WHEN** der Nutzer die Ausgabe auf etwa die halbe Höhe gezogen, aus- und wieder eingeblendet hat
- **THEN** nimmt die Ausgabe wieder etwa die halbe Höhe ein

#### Scenario: Schmales Fenster
- **WHEN** das Fenster 600 px breit ist und der Nutzer die Trennlinie nach oben zieht
- **THEN** wird der Ausgabe-Bereich höher
