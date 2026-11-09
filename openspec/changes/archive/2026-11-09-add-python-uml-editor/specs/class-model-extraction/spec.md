# Spec Delta

## Purpose

Leitet aus Python-Quelltext ein Klassenmodell (Klassen, Attribute, Methoden, Beziehungen) ab, das genau dem Quelltext entspricht und Grundlage des Klassendiagramms ist.

## ADDED Requirements

### Requirement: Klassen erkennen
Jede `class`-Anweisung auf Modulebene SHALL genau eine Klasse im Modell erzeugen, in der Reihenfolge des Quelltexts und mit ihrer Zeilennummer. Code außerhalb von Klassen (Funktionen, Anweisungen, Importe) und verschachtelte Klassen SHALL ignoriert werden.

#### Scenario: Zwei Klassen
- **WHEN** der Quelltext `class Auto:` und danach `class Motor:` enthält
- **THEN** enthält das Modell die Klassen `Auto` und `Motor` in dieser Reihenfolge

#### Scenario: Freie Funktion
- **WHEN** der Quelltext eine Funktion `def main():` auf Modulebene enthält
- **THEN** erscheint sie nicht im Modell

### Requirement: Instanzattribute erkennen
Zuweisungen an `self.<name>` in beliebigen Methoden einer Klasse SHALL Instanzattribute erzeugen, jedes nur einmal, in der Reihenfolge des ersten Auftretens. Felder einer `@dataclass` (annotierte Klassenvariablen) SHALL ebenfalls Instanzattribute sein.

#### Scenario: Attribute im Konstruktor
- **WHEN** `__init__` die Zuweisungen `self.marke = marke` und `self.km = 0` enthält
- **THEN** hat die Klasse die Attribute `marke` und `km`

#### Scenario: Mehrfache Zuweisung
- **WHEN** `self.km` in `__init__` und in `fahren` zugewiesen wird
- **THEN** erscheint `km` genau einmal

#### Scenario: Dataclass-Feld
- **WHEN** eine `@dataclass`-Klasse `name: str` enthält
- **THEN** hat die Klasse das Instanzattribut `name` vom Typ `str`

### Requirement: Klassenattribute erkennen
Zuweisungen im Klassenrumpf außerhalb von Methoden SHALL bei normalen Klassen statische Attribute (Klassenattribute) erzeugen. Bei Enum-Klassen SHALL sie Aufzählungswerte erzeugen.

#### Scenario: Zähler als Klassenattribute
- **WHEN** der Klassenrumpf `anzahl = 0` enthält
- **THEN** hat die Klasse das statische Attribut `anzahl` vom Typ `int`

#### Scenario: Enum
- **WHEN** `class Farbe(Enum):` die Zuweisungen `ROT = 1` und `BLAU = 2` enthält
- **THEN** ist `Farbe` eine Aufzählung mit den Werten `ROT` und `BLAU`

### Requirement: Typen ermitteln
Der Typ eines Attributs SHALL in dieser Reihenfolge bestimmt werden: Typ-Annotation des Attributs; Annotation des Parameters, dessen Wert direkt zugewiesen wird; Literal (`int`, `float`, `str`, `bool`, `list`, `dict`, `set`, `tuple`); Konstruktoraufruf einer Klasse. Ist kein Typ ermittelbar, SHALL das Attribut ohne Typ erscheinen.

#### Scenario: Typ aus Parameter-Annotation
- **WHEN** `def __init__(self, marke: str)` und `self.marke = marke` vorliegen
- **THEN** hat `marke` den Typ `str`

#### Scenario: Typ aus Literal
- **WHEN** `self.km = 0.0` zugewiesen wird
- **THEN** hat `km` den Typ `float`

#### Scenario: Typ aus Konstruktoraufruf
- **WHEN** `self.motor = Motor(150)` zugewiesen wird
- **THEN** hat `motor` den Typ `Motor`

#### Scenario: Kein Typ ermittelbar
- **WHEN** `self.wert = berechne()` zugewiesen wird und `berechne` keine Klasse ist
- **THEN** erscheint `wert` ohne Typangabe

### Requirement: Methoden erkennen
Jede Funktion im Klassenrumpf SHALL eine Methode mit Parametern (ohne `self`/`cls`), deren Typ-Annotationen, Standardwerten und Rückgabetyp erzeugen. `@staticmethod` und `@classmethod` SHALL als statisch, `@abstractmethod` als abstrakt gelten. `__init__` SHALL als Konstruktor gelten.

#### Scenario: Methode mit Parametern
- **WHEN** die Klasse `def fahren(self, km: int = 10) -> float:` enthält
- **THEN** hat sie die Methode `fahren` mit Parameter `km: int = 10` und Rückgabetyp `float`

#### Scenario: Statische Methode
- **WHEN** eine Methode mit `@staticmethod` dekoriert ist
- **THEN** ist sie im Modell als statisch markiert

### Requirement: Properties als Attribute
Eine mit `@property` dekorierte Methode SHALL als Attribut mit dem Rückgabetyp der Methode erscheinen und nicht als Methode. Zugehörige Setter SHALL nicht separat erscheinen. Ein privates Instanzattribut, das nur hinter dieser Property steht, SHALL erhalten bleiben.

#### Scenario: Property
- **WHEN** die Klasse `@property def preis(self) -> float:` enthält
- **THEN** hat sie das Attribut `preis: float` und keine Methode `preis`

### Requirement: Sichtbarkeit aus Namenskonvention
Namen mit führendem `__` (ohne abschließendes `__`) SHALL privat, Namen mit genau einem führenden `_` geschützt (protected) und alle übrigen Namen einschließlich Dunder-Methoden öffentlich sein.

#### Scenario: Privates Attribut
- **WHEN** `self.__kontostand = 0` zugewiesen wird
- **THEN** ist `__kontostand` privat

#### Scenario: Dunder-Methode
- **WHEN** die Klasse `__str__` definiert
- **THEN** ist `__str__` öffentlich

### Requirement: Klassenart ermitteln
Eine Klasse SHALL abstrakt sein, wenn sie mindestens eine `@abstractmethod` hat oder direkt von `ABC` erbt. Eine Klasse, die von `Protocol` erbt, SHALL ein Interface sein. Eine Klasse, die von `Enum` (oder `IntEnum`, `StrEnum`, `Flag`) erbt, SHALL eine Aufzählung sein. Sonst SHALL sie eine normale Klasse sein.

#### Scenario: Abstrakte Klasse
- **WHEN** `class Form(ABC):` eine `@abstractmethod flaeche` enthält
- **THEN** ist `Form` abstrakt und `flaeche` abstrakt

#### Scenario: Protocol
- **WHEN** `class Fahrbar(Protocol):` definiert ist
- **THEN** ist `Fahrbar` ein Interface

### Requirement: Vererbung und Realisierung
Jede im Quelltext definierte Basisklasse SHALL eine Generalisierung erzeugen; ist die Basisklasse ein Interface, SHALL stattdessen eine Realisierung entstehen. Nicht definierte Basisklassen SHALL als Klasse ohne Inhalt ins Modell aufgenommen werden, ausgenommen `object`, `ABC`, `Protocol`, `Generic`, Enum-Basistypen und `typing`-Konstrukte.

#### Scenario: Unterklasse
- **WHEN** `class Elektroauto(Auto):` definiert ist und `Auto` im Quelltext steht
- **THEN** gibt es eine Generalisierung von `Elektroauto` zu `Auto`

#### Scenario: Externe Basisklasse
- **WHEN** `class KontoFehler(Exception):` definiert ist
- **THEN** enthält das Modell eine leere Klasse `Exception` und eine Generalisierung dorthin

#### Scenario: ABC wird nicht angezeigt
- **WHEN** `class Form(ABC):` definiert ist
- **THEN** enthält das Modell keine Klasse `ABC`

### Requirement: Assoziationen aus Attributen
Ein Attribut, dessen Typ eine Klasse des Modells ist, SHALL eine gerichtete Beziehung zu dieser Klasse erzeugen; das Attribut SHALL zusätzlich unverändert in der Attributliste der Klasse bleiben. Multiplizität: `1` bei einfachem Typ, `0..1` bei `Optional`/`| None`/Wert `None`, `*` bei Containern (`list[...]`, `set[...]`, `dict[..., X]`, `tuple[X, ...]`).

#### Scenario: Einfache Assoziation
- **WHEN** `Kunde` das Attribut `self.konto: Konto` hat
- **THEN** gibt es eine gerichtete Beziehung von `Kunde` zu `Konto` mit Multiplizität `1`

#### Scenario: Attribut bleibt in der Attributliste
- **WHEN** `Kunde` das Attribut `self.konto: Konto` hat
- **THEN** enthält die Attributliste von `Kunde` weiterhin `konto` vom Typ `Konto`

#### Scenario: Liste von Objekten
- **WHEN** `Bank` das Attribut `self.konten: list[Konto] = []` hat
- **THEN** hat die Beziehung von `Bank` zu `Konto` die Multiplizität `*`

#### Scenario: Optionales Objekt
- **WHEN** `self.partner: Person | None = None` zugewiesen wird
- **THEN** hat die Beziehung die Multiplizität `0..1`

### Requirement: Beziehungsart per Heuristik
Ohne Annotation SHALL eine Beziehung aus einem Attribut als Komposition gelten, wenn das Objekt innerhalb der Klasse per Konstruktoraufruf erzeugt und zugewiesen wird (auch als Listen-Literal oder per `append` erzeugter Objekte). Wird das Objekt von außen übergeben, SHALL sie als Assoziation gelten.

#### Scenario: Teil wird selbst erzeugt
- **WHEN** `Auto.__init__` `self.motor = Motor()` enthält
- **THEN** ist die Beziehung von `Auto` zu `Motor` eine Komposition

#### Scenario: Objekt wird übergeben
- **WHEN** `Kunde.__init__(self, konto: Konto)` `self.konto = konto` enthält
- **THEN** ist die Beziehung eine Assoziation

### Requirement: Abhängigkeiten
Wird eine Modellklasse nur als Parameter-/Rückgabetyp einer Methode oder als lokal erzeugtes Objekt verwendet, ohne dass eine Attributbeziehung zu ihr besteht, SHALL eine Abhängigkeit (Dependency) entstehen. Pro Klassenpaar SHALL es höchstens eine Abhängigkeit geben.

#### Scenario: Parametertyp
- **WHEN** `Fahrer` die Methode `def fahre(self, auto: Auto)` hat und kein Attribut vom Typ `Auto`
- **THEN** gibt es eine Abhängigkeit von `Fahrer` zu `Auto`

#### Scenario: Bereits assoziiert
- **WHEN** `Kunde` ein Attribut vom Typ `Konto` hat und eine Methode mit Parameter `Konto`
- **THEN** gibt es nur die Assoziation, keine zusätzliche Abhängigkeit

### Requirement: Typnamen in Zeichenketten und Vorwärtsreferenzen
Typ-Annotationen als Zeichenkette (`"Knoten"`) und Typen aus `typing` (`List`, `Optional`, `Dict`) SHALL wie die entsprechenden eingebauten Schreibweisen behandelt werden. Eine Klasse SHALL auf sich selbst verweisen können.

#### Scenario: Selbstreferenz
- **WHEN** `class Knoten:` das Attribut `self.naechster: "Knoten | None" = None` hat
- **THEN** gibt es eine Beziehung von `Knoten` zu `Knoten` mit Multiplizität `0..1`

#### Scenario: typing.List
- **WHEN** ein Attribut mit `List[Konto]` annotiert ist
- **THEN** wird es wie `list[Konto]` behandelt
