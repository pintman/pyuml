# Spec Delta

## Purpose

Erlaubt es, Mehrdeutigkeiten im Quelltext durch Kommentare der Form `# uml: …` aufzulösen, etwa Aggregation vs. Komposition oder Interface vs. abstrakte Klasse, ohne den Python-Code zu verändern.

## ADDED Requirements

### Requirement: Annotationssyntax
Eine Annotation SHALL ein Kommentar sein, der mit `# uml:` beginnt (Groß-/Kleinschreibung und Leerzeichen um `:` egal), gefolgt von durch Leerzeichen oder Komma getrennten Schlüsselwörtern. Sie SHALL für das Element gelten, in dessen Zeile sie steht, oder – als eigene Zeile – für das Element in der unmittelbar folgenden Codezeile. Andere Kommentare SHALL ignoriert werden.

#### Scenario: Am Zeilenende
- **WHEN** `self.motor = motor  # uml: komposition` steht
- **THEN** gilt die Annotation für das Attribut `motor`

#### Scenario: Zeile darüber
- **WHEN** direkt über `class Fahrbar(ABC):` die Zeile `# uml: interface` steht
- **THEN** gilt die Annotation für die Klasse `Fahrbar`

#### Scenario: Normaler Kommentar
- **WHEN** `# Das ist ein Auto` über einer Klasse steht
- **THEN** hat dies keine Wirkung auf das Diagramm

### Requirement: Deutsche und englische Schlüsselwörter
Jedes Schlüsselwort SHALL auf Deutsch und Englisch akzeptiert werden, unabhängig von Groß-/Kleinschreibung: `komposition`/`composition`, `aggregation`, `assoziation`/`association`, `abhaengigkeit`/`abhängigkeit`/`dependency`, `attribut`/`attribute`, `interface`/`schnittstelle`, `abstrakt`/`abstract`, `ausblenden`/`hide`.

#### Scenario: Englisch
- **WHEN** `# uml: composition` annotiert ist
- **THEN** wirkt es wie `# uml: komposition`

### Requirement: Beziehungsart an Attributen festlegen
An einem Attribut SHALL `komposition`, `aggregation`, `assoziation` oder `abhaengigkeit` die per Heuristik ermittelte Beziehungsart ersetzen. `attribut` SHALL bewirken, dass für das Attribut keine Beziehungslinie entsteht; es bleibt wie alle Attribute im Attributbereich.

#### Scenario: Aggregation statt Assoziation
- **WHEN** `self.spieler = spieler  # uml: aggregation` in `Mannschaft` steht
- **THEN** ist die Beziehung von `Mannschaft` zu `Spieler` eine Aggregation

#### Scenario: Nur als Attribut darstellen
- **WHEN** `self.datum = Datum()  # uml: attribut` steht
- **THEN** steht `datum: Datum` im Attributbereich und es gibt keine Linie zu `Datum`

### Requirement: Multiplizitäten festlegen
An einem Attribut SHALL eine Multiplizität (`1`, `0..1`, `*`, `0..*`, `1..*`, `n..m` mit Zahlen) die ermittelte Multiplizität am Zielende ersetzen. Die Form `x -> y` SHALL zusätzlich die Multiplizität am Quellende festlegen (`x` Quelle, `y` Ziel).

#### Scenario: Mindestens ein Spieler
- **WHEN** `self.spieler: list[Spieler] = []  # uml: aggregation 1..*` steht
- **THEN** zeigt das Zielende der Aggregation `1..*`

#### Scenario: Beide Enden
- **WHEN** `self.konten = []  # uml: 1 -> 0..*` in `Kunde` steht und die Konten vom Typ `Konto` sind
- **THEN** zeigt das Ende bei `Kunde` `1` und das Ende bei `Konto` `0..*`

### Requirement: Zieltyp festlegen
Mit `typ=<Klassenname>` bzw. `type=<Klassenname>` SHALL der Typ eines Attributs festgelegt werden, wenn er sich nicht aus dem Quelltext ergibt. Die Beziehungsermittlung SHALL dann diesen Typ verwenden.

#### Scenario: Leere Liste typisieren
- **WHEN** `self.konten = []  # uml: typ=Konto` in `Bank` steht
- **THEN** gibt es eine Beziehung von `Bank` zu `Konto` mit Multiplizität `*`

### Requirement: Klassenart festlegen
An einer Klasse SHALL `interface` sie als Interface und `abstrakt` sie als abstrakte Klasse darstellen, unabhängig von der Heuristik. Unterklassen eines per Annotation festgelegten Interface SHALL es realisieren statt von ihm zu erben.

#### Scenario: ABC als Interface
- **WHEN** `class Fahrbar(ABC):  # uml: interface` nur abstrakte Methoden hat und `Auto(Fahrbar)` existiert
- **THEN** erscheint `Fahrbar` als Interface und `Auto` realisiert `Fahrbar`

#### Scenario: Abstrakt ohne abstrakte Methoden
- **WHEN** `class Tier:  # uml: abstrakt` steht
- **THEN** erscheint `Tier` als abstrakte Klasse

### Requirement: Elemente ausblenden
`ausblenden` SHALL an einer Klasse die Klasse samt ihrer Beziehungen, an einem Attribut oder einer Methode das jeweilige Element aus dem Diagramm entfernen.

#### Scenario: Hilfsklasse ausblenden
- **WHEN** `class _Logger:  # uml: ausblenden` steht
- **THEN** erscheint `_Logger` nicht im Diagramm und keine Linie führt zu ihr

#### Scenario: Methode ausblenden
- **WHEN** `def __repr__(self):  # uml: ausblenden` steht
- **THEN** erscheint `__repr__` nicht im Diagramm

### Requirement: Unbekannte oder unpassende Annotationen melden
Unbekannte Schlüsselwörter oder Annotationen, die zum Element nicht passen (z. B. `komposition` an einer Klasse), SHALL als Warnung mit Zeilennummer unterhalb des Editors angezeigt werden. Das Diagramm SHALL trotzdem erzeugt werden; die Annotation SHALL ignoriert werden.

#### Scenario: Tippfehler
- **WHEN** `# uml: kompositon` an einem Attribut in Zeile 7 steht
- **THEN** erscheint die Warnung „Zeile 7: unbekannte UML-Annotation ‚kompositon‘“ und das Diagramm wird erzeugt

#### Scenario: Unpassendes Ziel
- **WHEN** `# uml: aggregation` an einer Klasse steht
- **THEN** erscheint eine Warnung und die Klasse wird ohne diese Annotation dargestellt
