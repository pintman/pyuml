# Spec Delta

## MODIFIED Requirements

### Requirement: Quelltext lokal speichern
Die Anwendung SHALL den Quelltext bei jeder Änderung im Browser speichern und beim nächsten Öffnen wiederherstellen. Wird die Anwendung über einen geteilten Link geöffnet, SHALL dessen Quelltext Vorrang vor dem gespeicherten haben. Beim allerersten Start ohne Link SHALL ein Beispielprogramm geladen werden, das Vererbung, Assoziation, Komposition, eine abstrakte Klasse und ein Interface mit Realisierung zeigt. Der Quelltext SHALL den Browser nur verlassen, wenn der Nutzer ihn aktiv teilt; er SHALL nie an einen Server gesendet werden.

#### Scenario: Neuladen der Seite
- **WHEN** der Nutzer Code eingibt und die Seite neu lädt
- **THEN** steht derselbe Code wieder im Editor

#### Scenario: Erster Start
- **WHEN** die Anwendung zum ersten Mal in diesem Browser ohne geteilten Link geöffnet wird
- **THEN** enthält der Editor das Beispielprogramm und das Diagramm zeigt dessen Klassen

#### Scenario: Interface im Beispiel
- **WHEN** das Beispielprogramm im Editor steht
- **THEN** zeigt das Diagramm eine Klasse mit `«interface»` über dem Namen und eine gestrichelte Linie mit hohlem Dreieck von einer Klasse zu diesem Interface

#### Scenario: Erster Start über Link
- **WHEN** die Anwendung zum ersten Mal in diesem Browser über einen geteilten Link geöffnet wird
- **THEN** enthält der Editor den Quelltext aus dem Link statt des Beispielprogramms
