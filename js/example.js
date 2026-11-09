/* Beispielprogramm für den ersten Start: Vererbung, Assoziation, Komposition, abstrakte Klasse. */
(function (G) {
  'use strict';
  const P = G.PyUML = G.PyUML || {};

  P.EXAMPLE = String.raw`from abc import ABC, abstractmethod


class Fahrzeug(ABC):
    """Abstrakte Oberklasse aller Fahrzeuge."""

    anzahl = 0

    def __init__(self, marke: str):
        self.marke = marke
        self._km = 0.0
        Fahrzeug.anzahl += 1

    @abstractmethod
    def raeder(self) -> int:
        ...

    def fahren(self, km: float = 10) -> float:
        self._km += km
        return self._km


class Motor:
    def __init__(self, ps: int):
        self.ps = ps


class Auto(Fahrzeug):
    def __init__(self, marke: str, ps: int):
        super().__init__(marke)
        self.motor = Motor(ps)  # Komposition: das Auto erzeugt seinen Motor

    def raeder(self) -> int:
        return 4


class Fahrrad(Fahrzeug):
    def raeder(self) -> int:
        return 2


class Person:
    def __init__(self, name: str):
        self.name = name
        self.fahrzeuge: list[Fahrzeug] = []  # Assoziation

    def kaufen(self, fahrzeug: Fahrzeug) -> None:
        self.fahrzeuge.append(fahrzeug)


class Garage:
    def __init__(self):
        self.autos: list[Auto] = []  # uml: aggregation 0..*

    def einparken(self, auto: Auto) -> None:
        self.autos.append(auto)
`;
})(globalThis);
