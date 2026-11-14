# Spec Delta

## REMOVED Requirements

### Requirement: Quelltext wird nicht ausgeführt
**Reason**: Das Programm wird jetzt für den Ausgabe-Bereich ausgeführt. `print("Hallo")` soll sichtbar sein. Die Isolation des Diagramms von der Ausführung (Endlosschleifen, Ausgaben, Eingaben) ist erhalten geblieben.
**Migration**: Ersetzt durch die Anforderungen „Diagramm unabhängig von der Ausführung“, „Automatische Ausführung“ und „Zeitlimit für die Ausführung“ in `program-output`. Die Diagramm-Analyse führt den Quelltext weiterhin nicht aus.
