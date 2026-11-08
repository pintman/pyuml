# Spec Delta

## Purpose

Stellt das Klassenmodell als UML-2.5-konformes Klassendiagramm dar und ordnet es automatisch so an, dass der Aufbau des Diagramms dem Aufbau des Quelltexts ähnelt.

## ADDED Requirements

### Requirement: Klassensymbol
Jede Klasse SHALL als Rechteck mit drei durch Linien getrennten Bereichen dargestellt werden: Name (zentriert, fett), Attribute, Methoden. Leere Attribut- oder Methodenbereiche SHALL als leere Bereiche erhalten bleiben; Klassen ohne Inhalt aus externen Basisklassen SHALL nur den Namensbereich zeigen.

#### Scenario: Klasse mit Inhalt
- **WHEN** die Klasse `Auto` ein Attribut und eine Methode hat
- **THEN** zeigt das Diagramm ein Rechteck mit `Auto` oben, dem Attribut in der Mitte und der Methode unten

#### Scenario: Externe Basisklasse
- **WHEN** das Modell die inhaltslose Klasse `Exception` enthält
- **THEN** zeigt das Diagramm für `Exception` nur ein Rechteck mit dem Namen

### Requirement: Notation von Attributen
Alle Attribute des Modells SHALL im Attributbereich erscheinen, auch wenn zusätzlich eine Beziehungslinie für sie gezeichnet wird. Attribute SHALL als `<Sichtbarkeit> <name>: <Typ>` dargestellt werden, mit `+` öffentlich, `-` privat, `#` geschützt. Ohne Typ SHALL `: <Typ>` entfallen. Statische Attribute SHALL unterstrichen sein. Typen SHALL in Python-Schreibweise erscheinen (`list[Konto]`).

#### Scenario: Privates typisiertes Attribut
- **WHEN** das Attribut `__kontostand` vom Typ `float` privat ist
- **THEN** wird `- __kontostand: float` angezeigt

#### Scenario: Statisches Attribut
- **WHEN** `anzahl: int` ein Klassenattribut ist
- **THEN** wird `+ anzahl: int` unterstrichen angezeigt

#### Scenario: Attribut mit Beziehung
- **WHEN** `Bank` das Attribut `konten: list[Konto]` hat
- **THEN** steht `+ konten: list[Konto]` im Attributbereich von `Bank` und zusätzlich führt eine Linie zu `Konto`

### Requirement: Notation von Methoden
Methoden SHALL als `<Sichtbarkeit> <name>(<param>: <Typ> = <Standard>, …): <Rückgabetyp>` erscheinen; fehlende Typen, Standardwerte bzw. Rückgabetypen SHALL entfallen. Abstrakte Methoden SHALL kursiv, statische unterstrichen sein. Der Konstruktor SHALL als `__init__` erscheinen.

#### Scenario: Methode mit Rückgabe
- **WHEN** die Methode `fahren(km: int = 10) -> float` öffentlich ist
- **THEN** wird `+ fahren(km: int = 10): float` angezeigt

#### Scenario: Abstrakte Methode
- **WHEN** `flaeche` abstrakt ist
- **THEN** wird `+ flaeche(): float` kursiv angezeigt

### Requirement: Klassenarten darstellen
Abstrakte Klassen SHALL mit kursivem Namen und dem Stereotyp `«abstract»` über dem Namen erscheinen. Interfaces SHALL das Stereotyp `«interface»`, Aufzählungen `«enumeration»` über dem Namen zeigen; bei Aufzählungen SHALL der mittlere Bereich die Werte ohne Sichtbarkeit und Typ auflisten.

#### Scenario: Interface
- **WHEN** `Fahrbar` ein Interface ist
- **THEN** steht `«interface»` über dem Namen `Fahrbar`

#### Scenario: Enum
- **WHEN** `Farbe` eine Aufzählung mit `ROT` und `BLAU` ist
- **THEN** zeigt das Symbol `«enumeration»`, `Farbe` und darunter `ROT` und `BLAU`

### Requirement: Beziehungslinien
Beziehungen SHALL in UML-Notation gezeichnet werden: Generalisierung durchgezogen mit hohlem Dreieck an der Oberklasse; Realisierung gestrichelt mit hohlem Dreieck; gerichtete Assoziation durchgezogen mit offener Pfeilspitze am Ziel; Aggregation mit hohler, Komposition mit gefüllter Raute am Ganzen und offener Pfeilspitze am Teil; Abhängigkeit gestrichelt mit offener Pfeilspitze.

#### Scenario: Komposition
- **WHEN** `Auto` per Komposition einen `Motor` hat
- **THEN** führt eine durchgezogene Linie von `Auto` zu `Motor` mit gefüllter Raute bei `Auto`

#### Scenario: Realisierung
- **WHEN** `Auto` das Interface `Fahrbar` realisiert
- **THEN** führt eine gestrichelte Linie mit hohlem Dreieck von `Auto` zu `Fahrbar`

### Requirement: Beschriftung von Beziehungen
Linien SHALL als einzige Beschriftung Multiplizitäten tragen: Assoziationen, Aggregationen und Kompositionen am Zielende, eine angegebene Quell-Multiplizität am Quellende. Rollennamen, Sichtbarkeiten, Assoziationsnamen oder Stereotype SHALL an Linien nicht erscheinen. Generalisierung, Realisierung und Abhängigkeit SHALL unbeschriftet sein. Beschriftungen SHALL sich nicht mit Klassensymbolen überlappen.

#### Scenario: Nur Multiplizität
- **WHEN** `Bank` das Attribut `konten: list[Konto]` hat
- **THEN** steht am `Konto`-Ende der Linie nur `*`, ohne `konten`

#### Scenario: Abhängigkeit unbeschriftet
- **WHEN** `Fahrer` von `Auto` abhängt
- **THEN** trägt die gestrichelte Linie keine Beschriftung, insbesondere kein `«use»`

### Requirement: Quelltextnahes Layout
Das Diagramm SHALL automatisch angeordnet werden: Oberklassen und Interfaces SHALL oberhalb ihrer Unterklassen stehen. Innerhalb derselben Ebene SHALL die Reihenfolge von links nach rechts der Reihenfolge im Quelltext folgen. Linien SHALL Klassensymbole nicht durchqueren.

#### Scenario: Vererbung vertikal
- **WHEN** `Elektroauto` von `Auto` erbt
- **THEN** steht `Auto` oberhalb von `Elektroauto`

#### Scenario: Reihenfolge wie im Quelltext
- **WHEN** `Hund`, `Katze`, `Maus` in dieser Reihenfolge von `Tier` erben
- **THEN** stehen sie in dieser Reihenfolge von links nach rechts unterhalb von `Tier`

#### Scenario: Unabhängige Klassen
- **WHEN** drei Klassen ohne Beziehungen nacheinander definiert sind
- **THEN** stehen sie in Quelltext-Reihenfolge nebeneinander bzw. zeilenweise

### Requirement: Stabiles Layout bei kleinen Änderungen
Ändert sich nur der Inhalt einer Klasse (Attribute, Methoden), nicht aber Klassen oder Beziehungen, SHALL die relative Anordnung der Klassen erhalten bleiben.

#### Scenario: Attribut hinzufügen
- **WHEN** der Nutzer in `Auto` ein Attribut ergänzt
- **THEN** behalten alle Klassen ihre relative Anordnung zueinander

### Requirement: Navigation im Diagramm
Der Diagrammbereich SHALL das Diagramm initial vollständig sichtbar einpassen, Zoomen per Mausrad/Pinch und Verschieben per Ziehen erlauben und eine Schaltfläche „Einpassen“ bieten. Ein Klick auf eine Klasse SHALL den Editor zur Definitionszeile der Klasse springen lassen.

#### Scenario: Großes Diagramm
- **WHEN** das Diagramm größer als der Diagrammbereich ist
- **THEN** wird es verkleinert vollständig angezeigt

#### Scenario: Klick auf Klasse
- **WHEN** der Nutzer im Diagramm auf `Motor` klickt
- **THEN** springt der Editor zur Zeile `class Motor` und markiert sie

#### Scenario: Zoom bleibt bei Neuberechnung
- **WHEN** der Nutzer gezoomt hat und danach im Editor tippt, ohne Klassen hinzuzufügen oder zu entfernen
- **THEN** bleiben Zoomstufe und Ausschnitt erhalten

### Requirement: Leerer Quelltext
Enthält der Quelltext keine Klasse, SHALL der Diagrammbereich den Hinweis „Keine Klassen gefunden“ anzeigen.

#### Scenario: Nur Funktionen
- **WHEN** der Quelltext nur `def main(): pass` enthält
- **THEN** zeigt der Diagrammbereich „Keine Klassen gefunden“
