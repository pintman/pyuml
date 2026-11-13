# Spec Delta

## MODIFIED Requirements

### Requirement: Quelltext lokal speichern
Die Anwendung SHALL den Quelltext bei jeder Änderung im Browser speichern und beim nächsten Öffnen wiederherstellen. Wird die Anwendung über einen geteilten Link geöffnet, SHALL dessen Quelltext Vorrang vor dem gespeicherten haben. Beim allerersten Start ohne Link SHALL ein Beispielprogramm geladen werden, das Vererbung, Assoziation, Komposition und eine abstrakte Klasse zeigt. Der Quelltext SHALL den Browser nur verlassen, wenn der Nutzer ihn aktiv teilt; er SHALL nie an einen Server gesendet werden.

#### Scenario: Neuladen der Seite
- **WHEN** der Nutzer Code eingibt und die Seite neu lädt
- **THEN** steht derselbe Code wieder im Editor

#### Scenario: Erster Start
- **WHEN** die Anwendung zum ersten Mal in diesem Browser ohne geteilten Link geöffnet wird
- **THEN** enthält der Editor das Beispielprogramm und das Diagramm zeigt dessen Klassen

#### Scenario: Erster Start über Link
- **WHEN** die Anwendung zum ersten Mal in diesem Browser über einen geteilten Link geöffnet wird
- **THEN** enthält der Editor den Quelltext aus dem Link statt des Beispielprogramms

### Requirement: Beispiel wiederherstellen und Datei laden/speichern
Die Anwendung SHALL Schaltflächen bieten, um das Beispielprogramm (nach Bestätigung) zu laden, eine lokale `.py`-Datei in den Editor zu öffnen, den Editorinhalt als `.py`-Datei herunterzuladen und einen Link zum Teilen des Editorinhalts zu erzeugen.

#### Scenario: Datei öffnen
- **WHEN** der Nutzer `fahrzeuge.py` über „Öffnen“ wählt
- **THEN** steht deren Inhalt im Editor und das Diagramm wird erzeugt

#### Scenario: Datei speichern
- **WHEN** der Nutzer „Speichern“ wählt
- **THEN** lädt der Browser den Editorinhalt als `.py`-Datei herunter

#### Scenario: Beispiel laden abbrechen
- **WHEN** der Nutzer „Beispiel“ wählt und die Rückfrage abbricht
- **THEN** bleibt der bisherige Quelltext unverändert

#### Scenario: Teilen
- **WHEN** der Nutzer „Teilen“ wählt
- **THEN** wird ein Link mit dem aktuellen Editorinhalt in die Zwischenablage kopiert
