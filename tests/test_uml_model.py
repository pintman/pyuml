"""Unittests für py/uml_model.py (CPython ≥ 3.11, ohne Pyodide)."""
import contextlib
import io
import os
import re
import sys
import textwrap
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "py"))

from uml_model import analyze  # noqa: E402


def model(src):
    m = analyze(textwrap.dedent(src))
    assert "error" not in m, m
    return m


def cls(m, name):
    return next(c for c in m["classes"] if c["name"] == name)


def attr(m, cname, aname):
    return next(a for a in cls(m, cname)["attributes"] if a["name"] == aname)


def method(m, cname, mname):
    return next(x for x in cls(m, cname)["methods"] if x["name"] == mname)


def rels(m, kind=None, source=None, target=None):
    return [r for r in m["relations"]
            if (kind is None or r["kind"] == kind)
            and (source is None or r["source"] == source)
            and (target is None or r["target"] == target)]


def names(items):
    return [x["name"] for x in items]


# ---------------------------------------------------------------- 2.1 Klassen

class KlassenErkennen(unittest.TestCase):
    def test_zwei_klassen(self):
        m = model("""
            class Auto:
                pass
            class Motor:
                pass
        """)
        self.assertEqual(names(m["classes"]), ["Auto", "Motor"])
        self.assertEqual(cls(m, "Auto")["line"], 2)
        self.assertEqual(cls(m, "Motor")["line"], 4)

    def test_freie_funktion_und_modulcode(self):
        m = model("""
            import math
            def main():
                pass
            x = 3
            class A:
                class Innen:
                    pass
        """)
        self.assertEqual(names(m["classes"]), ["A"])

    def test_syntaxfehler(self):
        r = analyze("x = 1\n\nclass Auto\n    pass\n")
        self.assertIn("error", r)
        self.assertEqual(r["error"]["line"], 3)
        self.assertIsInstance(r["error"]["col"], int)
        self.assertTrue(r["error"]["message"])

    def test_leer(self):
        self.assertEqual(model("")["classes"], [])


# ---------------------------------------------------------------- 2.2 Attribute

class Attribute(unittest.TestCase):
    def test_attribute_im_konstruktor(self):
        m = model("""
            class Auto:
                def __init__(self, marke):
                    self.marke = marke
                    self.km = 0
        """)
        self.assertEqual(names(cls(m, "Auto")["attributes"]), ["marke", "km"])
        self.assertFalse(attr(m, "Auto", "km")["static"])

    def test_mehrfache_zuweisung(self):
        m = model("""
            class Auto:
                def __init__(self):
                    self.km = 0
                def fahren(self, x):
                    self.km = self.km + x
                    self.km += 1
        """)
        self.assertEqual(names(cls(m, "Auto")["attributes"]), ["km"])

    def test_reihenfolge_erstes_auftreten(self):
        m = model("""
            class A:
                def __init__(self, x):
                    if x:
                        if x:
                            self.a = 1
                    self.b = 2
                def f(self):
                    self.c = 3
        """)
        self.assertEqual(names(cls(m, "A")["attributes"]), ["a", "b", "c"])

    def test_dataclass_feld(self):
        m = model("""
            from dataclasses import dataclass
            @dataclass
            class Person:
                name: str
                alter: int = 0
        """)
        self.assertEqual(attr(m, "Person", "name")["type"], "str")
        self.assertFalse(attr(m, "Person", "name")["static"])
        self.assertFalse(attr(m, "Person", "alter")["static"])

    def test_klassenattribut(self):
        m = model("""
            class Auto:
                anzahl = 0
        """)
        a = attr(m, "Auto", "anzahl")
        self.assertTrue(a["static"])
        self.assertEqual(a["type"], "int")

    def test_enum(self):
        m = model("""
            from enum import Enum
            class Farbe(Enum):
                ROT = 1
                BLAU = 2
        """)
        c = cls(m, "Farbe")
        self.assertEqual(c["kind"], "enum")
        self.assertEqual(c["literals"], ["ROT", "BLAU"])
        self.assertEqual(c["attributes"], [])
        self.assertEqual(names(m["classes"]), ["Farbe"])


# ---------------------------------------------------------------- 2.3 Typen

class Typen(unittest.TestCase):
    def test_typ_aus_parameter(self):
        m = model("""
            class Auto:
                def __init__(self, marke: str):
                    self.marke = marke
        """)
        self.assertEqual(attr(m, "Auto", "marke")["type"], "str")

    def test_typ_aus_literal(self):
        m = model("""
            class Auto:
                def __init__(self):
                    self.km = 0.0
                    self.an = True
                    self.name = "x"
                    self.liste = []
                    self.d = {}
                    self.s = {1}
                    self.t = (1, 2)
        """)
        types = {a["name"]: a["type"] for a in cls(m, "Auto")["attributes"]}
        self.assertEqual(types, {"km": "float", "an": "bool", "name": "str", "liste": "list",
                                 "d": "dict", "s": "set", "t": "tuple"})

    def test_typ_aus_konstruktor(self):
        m = model("""
            class Motor:
                pass
            class Auto:
                def __init__(self):
                    self.motor = Motor(150)
        """)
        self.assertEqual(attr(m, "Auto", "motor")["type"], "Motor")

    def test_kein_typ(self):
        m = model("""
            class Auto:
                def __init__(self):
                    self.wert = berechne()
        """)
        self.assertIsNone(attr(m, "Auto", "wert")["type"])

    def test_vorrang_annotation(self):
        m = model("""
            class A:
                def __init__(self, x: int):
                    self.x: float = x
        """)
        self.assertEqual(attr(m, "A", "x")["type"], "float")

    def test_typing_normalisierung(self):
        m = model("""
            from typing import List, Optional, Dict
            class Konto:
                pass
            class Bank:
                def __init__(self):
                    self.konten: List[Konto] = []
                    self.haupt: Optional[Konto] = None
                    self.index: Dict[str, Konto] = {}
        """)
        self.assertEqual(attr(m, "Bank", "konten")["type"], "list[Konto]")
        self.assertEqual(attr(m, "Bank", "haupt")["type"], "Konto | None")
        self.assertEqual(attr(m, "Bank", "index")["type"], "dict[str, Konto]")
        self.assertEqual(rels(m, source="Bank", target="Konto")[0]["targetMult"], "*")

    def test_typing_list_wie_list(self):
        m = model("""
            from typing import List
            class Konto:
                pass
            class Bank:
                konten: List[Konto]
        """)
        r = rels(m, source="Bank", target="Konto")
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]["targetMult"], "*")

    def test_selbstreferenz_als_string(self):
        m = model("""
            class Knoten:
                def __init__(self):
                    self.naechster: "Knoten | None" = None
        """)
        self.assertEqual(attr(m, "Knoten", "naechster")["type"], "Knoten | None")
        r = rels(m, source="Knoten", target="Knoten")
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]["targetMult"], "0..1")


# ---------------------------------------------------------------- 2.4 Methoden

class Methoden(unittest.TestCase):
    def test_methode_mit_parametern(self):
        m = model("""
            class Auto:
                def fahren(self, km: int = 10) -> float:
                    return 0.0
        """)
        f = method(m, "Auto", "fahren")
        self.assertEqual(f["params"], [{"name": "km", "type": "int", "default": "10"}])
        self.assertEqual(f["returns"], "float")
        self.assertFalse(f["static"])
        self.assertFalse(f["abstract"])

    def test_statisch_und_klassenmethode(self):
        m = model("""
            class A:
                @staticmethod
                def s(x):
                    pass
                @classmethod
                def k(cls, y):
                    pass
        """)
        self.assertTrue(method(m, "A", "s")["static"])
        self.assertEqual(method(m, "A", "s")["params"][0]["name"], "x")
        self.assertTrue(method(m, "A", "k")["static"])
        self.assertEqual(names(method(m, "A", "k")["params"]), ["y"])

    def test_konstruktor_und_varargs(self):
        m = model("""
            class A:
                def __init__(self, *args, flag: bool = False, **kw):
                    pass
        """)
        f = method(m, "A", "__init__")
        self.assertTrue(f["constructor"])
        self.assertEqual(names(f["params"]), ["*args", "flag", "**kw"])
        self.assertEqual(f["params"][1]["default"], "False")

    def test_property(self):
        m = model("""
            class Artikel:
                def __init__(self):
                    self._preis = 0.0
                @property
                def preis(self) -> float:
                    return self._preis
                @preis.setter
                def preis(self, wert):
                    self._preis = wert
        """)
        self.assertEqual(names(cls(m, "Artikel")["methods"]), ["__init__"])
        self.assertEqual(attr(m, "Artikel", "preis")["type"], "float")
        self.assertEqual(attr(m, "Artikel", "_preis")["visibility"], "#")

    def test_sichtbarkeit(self):
        m = model("""
            class Konto:
                def __init__(self):
                    self.__kontostand = 0
                    self._x = 1
                    self.y = 2
                def __str__(self):
                    return ""
                def __geheim(self):
                    pass
        """)
        self.assertEqual(attr(m, "Konto", "__kontostand")["visibility"], "-")
        self.assertEqual(attr(m, "Konto", "_x")["visibility"], "#")
        self.assertEqual(attr(m, "Konto", "y")["visibility"], "+")
        self.assertEqual(method(m, "Konto", "__str__")["visibility"], "+")
        self.assertEqual(method(m, "Konto", "__geheim")["visibility"], "-")


# ---------------------------------------------------------------- 2.5 Klassenart, Vererbung

class KlassenartVererbung(unittest.TestCase):
    def test_abstrakte_klasse(self):
        m = model("""
            from abc import ABC, abstractmethod
            class Form(ABC):
                @abstractmethod
                def flaeche(self) -> float:
                    ...
        """)
        self.assertEqual(cls(m, "Form")["kind"], "abstract")
        self.assertTrue(method(m, "Form", "flaeche")["abstract"])
        self.assertEqual(names(m["classes"]), ["Form"])  # ABC nicht im Modell

    def test_abstrakt_durch_abstractmethod_allein(self):
        m = model("""
            import abc
            class Form:
                @abc.abstractmethod
                def f(self):
                    pass
        """)
        self.assertEqual(cls(m, "Form")["kind"], "abstract")

    def test_protocol(self):
        m = model("""
            from typing import Protocol
            class Fahrbar(Protocol):
                def fahren(self) -> None: ...
            class Auto(Fahrbar):
                pass
        """)
        self.assertEqual(cls(m, "Fahrbar")["kind"], "interface")
        self.assertEqual(len(rels(m, "realization", "Auto", "Fahrbar")), 1)
        self.assertEqual(rels(m, "generalization"), [])

    def test_unterklasse(self):
        m = model("""
            class Auto:
                pass
            class Elektroauto(Auto):
                pass
        """)
        self.assertEqual(len(rels(m, "generalization", "Elektroauto", "Auto")), 1)

    def test_externe_basisklasse(self):
        m = model("""
            class KontoFehler(Exception):
                pass
        """)
        self.assertEqual(names(m["classes"]), ["Exception", "KontoFehler"])
        ext = cls(m, "Exception")
        self.assertEqual(ext["kind"], "external")
        self.assertEqual((ext["attributes"], ext["methods"]), ([], []))
        self.assertEqual(len(rels(m, "generalization", "KontoFehler", "Exception")), 1)

    def test_ausschlussliste(self):
        m = model("""
            from typing import Generic, TypeVar
            from enum import IntEnum
            T = TypeVar("T")
            class A(object): pass
            class B(Generic[T]): pass
            class C(IntEnum):
                X = 1
        """)
        self.assertEqual(names(m["classes"]), ["A", "B", "C"])
        self.assertEqual(m["relations"], [])
        self.assertEqual(cls(m, "C")["kind"], "enum")


# ---------------------------------------------------------------- 2.6 Attributbeziehungen

class Assoziationen(unittest.TestCase):
    SRC = """
        class Konto:
            pass
        class Kunde:
            def __init__(self, konto: Konto):
                self.konto = konto
    """

    def test_einfache_assoziation(self):
        m = model(self.SRC)
        r = rels(m, source="Kunde", target="Konto")
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]["kind"], "association")
        self.assertEqual(r[0]["targetMult"], "1")
        self.assertIsNone(r[0]["sourceMult"])

    def test_attribut_bleibt_in_liste(self):
        m = model(self.SRC)
        self.assertEqual(attr(m, "Kunde", "konto")["type"], "Konto")

    def test_liste_von_objekten(self):
        m = model("""
            class Konto: pass
            class Bank:
                def __init__(self):
                    self.konten: list[Konto] = []
        """)
        r = rels(m, source="Bank", target="Konto")
        self.assertEqual(r[0]["targetMult"], "*")
        self.assertEqual(r[0]["kind"], "association")
        self.assertEqual(attr(m, "Bank", "konten")["type"], "list[Konto]")

    def test_container_varianten(self):
        m = model("""
            class K: pass
            class A:
                s: set[K]
                d: dict[str, K]
                t: tuple[K, ...]
                f: tuple[K, int]
        """)
        self.assertEqual([r["targetMult"] for r in rels(m, source="A")], ["*", "*", "*"])

    def test_optional(self):
        m = model("""
            class Person:
                def __init__(self):
                    self.partner: Person | None = None
        """)
        self.assertEqual(rels(m, source="Person")[0]["targetMult"], "0..1")

    def test_wert_none(self):
        m = model("""
            class Motor: pass
            class Auto:
                def __init__(self):
                    self.motor = None
                def einbauen(self):
                    self.motor = Motor()
        """)
        r = rels(m, source="Auto", target="Motor")[0]
        self.assertEqual(r["targetMult"], "0..1")

    def test_komposition_selbst_erzeugt(self):
        m = model("""
            class Motor: pass
            class Auto:
                def __init__(self):
                    self.motor = Motor()
        """)
        self.assertEqual(rels(m, source="Auto", target="Motor")[0]["kind"], "composition")

    def test_komposition_listenliteral_und_append(self):
        m = model("""
            class Rad: pass
            class Sitz: pass
            class Auto:
                def __init__(self):
                    self.raeder = [Rad(), Rad()]
                    self.sitze = []
                    self.sitze.append(Sitz())
        """)
        self.assertEqual(rels(m, source="Auto", target="Rad")[0]["kind"], "composition")
        self.assertEqual(rels(m, source="Auto", target="Rad")[0]["targetMult"], "*")
        self.assertEqual(attr(m, "Auto", "sitze")["type"], "list[Sitz]")
        self.assertEqual(rels(m, source="Auto", target="Sitz")[0]["kind"], "composition")

    def test_assoziation_per_append_eines_parameters(self):
        m = model("""
            class Konto: pass
            class Kunde:
                def __init__(self):
                    self.konten = []
                def eroeffnen(self, k: Konto):
                    self.konten.append(k)
        """)
        r = rels(m, source="Kunde", target="Konto")
        self.assertEqual((r[0]["kind"], r[0]["targetMult"]), ("association", "*"))

    def test_objekt_wird_uebergeben(self):
        m = model(self.SRC)
        self.assertEqual(rels(m, source="Kunde")[0]["kind"], "association")


# ---------------------------------------------------------------- 2.7 Abhängigkeiten

class Abhaengigkeiten(unittest.TestCase):
    def test_parametertyp(self):
        m = model("""
            class Auto: pass
            class Fahrer:
                def fahre(self, auto: Auto) -> None:
                    pass
                def tanke(self, auto: Auto) -> "Auto":
                    return auto
        """)
        r = rels(m, source="Fahrer")
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]["kind"], "dependency")
        self.assertEqual(r[0]["target"], "Auto")
        self.assertIsNone(r[0]["targetMult"])

    def test_lokal_erzeugt(self):
        m = model("""
            class Bericht: pass
            class Drucker:
                def drucke(self):
                    b = Bericht()
        """)
        self.assertEqual(len(rels(m, "dependency", "Drucker", "Bericht")), 1)

    def test_bereits_assoziiert(self):
        m = model("""
            class Konto: pass
            class Kunde:
                def __init__(self, konto: Konto):
                    self.konto = konto
                def wechsel(self, neu: Konto):
                    pass
        """)
        self.assertEqual([r["kind"] for r in rels(m, source="Kunde")], ["association"])


# ---------------------------------------------------------------- 2.8 Keine Ausführung

class KeineAusfuehrung(unittest.TestCase):
    def test_endlosschleife_und_print(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            m = analyze('print("Hallo")\nwhile True:\n    pass\nclass A:\n    pass\n')
        self.assertEqual(out.getvalue(), "")
        self.assertEqual(names(m["classes"]), ["A"])

    def test_kein_exec_eval_compile(self):
        with open(os.path.join(ROOT, "py", "uml_model.py"), encoding="utf-8") as f:
            code = f.read()
        self.assertIsNone(re.search(r"(?<![.\w])(exec|eval|compile)\s*\(", code))


# ---------------------------------------------------------------- 3.1 Annotationssyntax

class AnnotationsSyntax(unittest.TestCase):
    def test_am_zeilenende(self):
        m = model("""
            class Motor: pass
            class Auto:
                def __init__(self, motor: Motor):
                    self.motor = motor  # uml: komposition
        """)
        self.assertEqual(rels(m, source="Auto")[0]["kind"], "composition")

    def test_zeile_darueber(self):
        m = model("""
            from abc import ABC

            # uml: interface
            class Fahrbar(ABC):
                pass
        """)
        self.assertEqual(cls(m, "Fahrbar")["kind"], "interface")

    def test_zeile_darueber_mit_leerzeile_und_decorator(self):
        m = model("""
            class A:
                # uml: ausblenden

                @staticmethod
                def hilfe():
                    pass
                def f(self): pass
        """)
        self.assertEqual(names(cls(m, "A")["methods"]), ["f"])

    def test_schreibweisen(self):
        m = model("""
            class Motor: pass
            class Auto:
                def __init__(self, motor: Motor):
                    self.motor = motor  #UML :Komposition
        """)
        self.assertEqual(rels(m, source="Auto")[0]["kind"], "composition")

    def test_normaler_kommentar(self):
        src = """
            class Motor: pass
            # Das ist ein Auto
            class Auto:
                def __init__(self, motor: Motor):
                    self.motor = motor  # Kommentar
        """
        m = model(src)
        self.assertEqual(cls(m, "Auto")["kind"], "class")
        self.assertEqual(m["warnings"], [])
        self.assertEqual(rels(m, source="Auto")[0]["kind"], "association")


# ---------------------------------------------------------------- 3.2 Schlüsselwörter, Beziehungen

class AnnotationsBeziehungen(unittest.TestCase):
    TEMPLATE = """
        class Spieler: pass
        class Mannschaft:
            def __init__(self, spieler: Spieler):
                self.spieler = spieler  # uml: {}
    """

    def kind(self, keyword):
        m = model(self.TEMPLATE.format(keyword))
        self.assertEqual(m["warnings"], [], keyword)
        r = rels(m, source="Mannschaft")
        return r[0]["kind"] if r else None

    def test_deutsch_und_englisch(self):
        cases = {"komposition": "composition", "composition": "composition",
                 "Aggregation": "aggregation", "assoziation": "association",
                 "association": "association", "abhaengigkeit": "dependency",
                 "abhängigkeit": "dependency", "DEPENDENCY": "dependency"}
        for kw, expected in cases.items():
            self.assertEqual(self.kind(kw), expected, kw)

    def test_attribut(self):
        for kw in ("attribut", "attribute"):
            self.assertIsNone(self.kind(kw), kw)
        m = model("""
            class Datum: pass
            class Termin:
                def __init__(self):
                    self.datum = Datum()  # uml: attribut
        """)
        self.assertEqual(attr(m, "Termin", "datum")["type"], "Datum")
        self.assertEqual(rels(m, source="Termin"), [])

    def test_abhaengigkeit_ohne_multiplizitaet(self):
        m = model(self.TEMPLATE.format("dependency"))
        r = rels(m, source="Mannschaft")[0]
        self.assertEqual((r["targetMult"], r["sourceMult"]), (None, None))

    def test_multiplizitaet_ziel(self):
        m = model("""
            class Spieler: pass
            class Mannschaft:
                def __init__(self):
                    self.spieler: list[Spieler] = []  # uml: aggregation 1..*
        """)
        r = rels(m, source="Mannschaft")[0]
        self.assertEqual((r["kind"], r["targetMult"], r["sourceMult"]), ("aggregation", "1..*", None))

    def test_multiplizitaet_beide_enden(self):
        m = model("""
            class Konto: pass
            class Kunde:
                def __init__(self):
                    self.konten = []  # uml: 1 -> 0..*
                def eroeffnen(self, k: Konto):
                    self.konten.append(k)
        """)
        r = rels(m, source="Kunde", target="Konto")[0]
        self.assertEqual((r["sourceMult"], r["targetMult"]), ("1", "0..*"))

    def test_multiplizitaet_formen(self):
        for mult in ("1", "0..1", "*", "0..*", "1..*", "2..5"):
            m = model(self.TEMPLATE.format(mult))
            self.assertEqual(rels(m, source="Mannschaft")[0]["targetMult"], mult)
        m = model(self.TEMPLATE.format("2->3"))
        r = rels(m, source="Mannschaft")[0]
        self.assertEqual((r["sourceMult"], r["targetMult"]), ("2", "3"))

    def test_zieltyp(self):
        for kw in ("typ=Konto", "type=Konto", "typ = Konto"):
            m = model("""
                class Konto: pass
                class Bank:
                    def __init__(self):
                        self.konten = []  # uml: %s
            """ % kw)
            r = rels(m, source="Bank", target="Konto")
            self.assertEqual(len(r), 1, kw)
            self.assertEqual(r[0]["targetMult"], "*")
            self.assertEqual(attr(m, "Bank", "konten")["type"], "list[Konto]")

    def test_zieltyp_einzeln(self):
        m = model("""
            class Konto: pass
            class Bank:
                def __init__(self):
                    self.haupt = lade()  # uml: typ=Konto, aggregation
        """)
        r = rels(m, source="Bank")[0]
        self.assertEqual((r["kind"], r["targetMult"]), ("aggregation", "1"))


# ---------------------------------------------------------------- 3.3 Klassenart, Ausblenden

class AnnotationsKlassenart(unittest.TestCase):
    def test_abc_als_interface(self):
        m = model("""
            from abc import ABC, abstractmethod
            class Fahrbar(ABC):  # uml: interface
                @abstractmethod
                def fahren(self): ...
            class Auto(Fahrbar):
                def fahren(self): pass
        """)
        self.assertEqual(cls(m, "Fahrbar")["kind"], "interface")
        self.assertEqual(len(rels(m, "realization", "Auto", "Fahrbar")), 1)
        self.assertEqual(rels(m, "generalization"), [])

    def test_schnittstelle(self):
        m = model("""
            class Fahrbar:  # uml: Schnittstelle
                pass
        """)
        self.assertEqual(cls(m, "Fahrbar")["kind"], "interface")

    def test_abstrakt_ohne_abstrakte_methoden(self):
        for kw in ("abstrakt", "abstract"):
            m = model("""
                class Tier:  # uml: %s
                    pass
            """ % kw)
            self.assertEqual(cls(m, "Tier")["kind"], "abstract")

    def test_klasse_ausblenden(self):
        m = model("""
            class _Logger:  # uml: ausblenden
                pass
            class App:
                def __init__(self):
                    self.log = _Logger()
            class Sub(_Logger):
                pass
        """)
        self.assertEqual(names(m["classes"]), ["App", "Sub"])
        self.assertEqual(m["relations"], [])

    def test_methode_ausblenden(self):
        m = model("""
            class A:
                def __repr__(self):  # uml: ausblenden
                    return ""
                def f(self): pass
        """)
        self.assertEqual(names(cls(m, "A")["methods"]), ["f"])

    def test_attribut_ausblenden(self):
        m = model("""
            class B: pass
            class A:
                def __init__(self):
                    self.b = B()  # uml: hide
                    self.x = 1
        """)
        self.assertEqual(names(cls(m, "A")["attributes"]), ["x"])
        self.assertEqual(m["relations"], [])

    def test_externe_basis_einer_verborgenen_klasse(self):
        m = model("""
            class Fehler(Exception):  # uml: ausblenden
                pass
        """)
        self.assertEqual(m["classes"], [])


# ---------------------------------------------------------------- 3.4 Warnungen

class AnnotationsWarnungen(unittest.TestCase):
    def test_tippfehler(self):
        src = "class Motor: pass\n\nclass Auto:\n    def __init__(self):\n" \
              "        self.x = 1\n\n        self.motor = Motor()  # uml: kompositon\n"
        m = analyze(src)
        self.assertEqual(m["warnings"],
                         [{"line": 7, "message": "unbekannte UML-Annotation ‚kompositon‘"}])
        self.assertEqual(rels(m, source="Auto")[0]["kind"], "composition")

    def test_unpassendes_ziel(self):
        m = model("""
            class Fahrbar:  # uml: aggregation
                pass
        """)
        self.assertEqual(len(m["warnings"]), 1)
        self.assertEqual(m["warnings"][0]["line"], 2)
        self.assertIn("aggregation", m["warnings"][0]["message"])
        self.assertEqual(cls(m, "Fahrbar")["kind"], "class")

    def test_methode_mit_beziehungsart(self):
        m = model("""
            class A:
                def f(self):  # uml: komposition
                    pass
        """)
        self.assertEqual(len(m["warnings"]), 1)

    def test_beziehung_ohne_zielklasse(self):
        m = model("""
            class A:
                def __init__(self):
                    self.x = 1  # uml: aggregation
        """)
        self.assertEqual(len(m["warnings"]), 1)
        self.assertEqual(m["warnings"][0]["line"], 4)

    def test_ohne_element(self):
        m = model("""
            # uml: interface
            def main(): pass
        """)
        self.assertEqual(len(m["warnings"]), 1)


# ---------------------------------------------------------------- 3.5 README-Beispiele

class ReadmeBeispiele(unittest.TestCase):
    """Die ```python-Blöcke im Abschnitt „Annotationen“ des README mit erwarteten Ergebnissen."""

    def blocks(self):
        with open(os.path.join(ROOT, "README.md"), encoding="utf-8") as f:
            text = f.read()
        return re.findall(r"```python\n(.*?)```", text, re.S)

    def test_beispiele(self):
        blocks = self.blocks()
        self.assertGreaterEqual(len(blocks), 1)
        m = analyze(blocks[0])
        self.assertEqual(m["warnings"], [])
        self.assertEqual(cls(m, "Fahrbar")["kind"], "interface")
        self.assertEqual(cls(m, "Tier")["kind"], "abstract")
        self.assertEqual(len(rels(m, "realization", "Auto", "Fahrbar")), 1)
        self.assertEqual(rels(m, source="Auto", target="Motor")[0]["kind"], "composition")
        r = rels(m, source="Mannschaft", target="Spieler")[0]
        self.assertEqual((r["kind"], r["targetMult"]), ("aggregation", "1..*"))
        r = rels(m, source="Kunde", target="Konto")[0]
        self.assertEqual((r["sourceMult"], r["targetMult"]), ("1", "0..*"))
        self.assertEqual(rels(m, source="Termin"), [])
        self.assertNotIn("_Logger", names(m["classes"]))
        self.assertNotIn("__repr__", names(cls(m, "Auto")["methods"]))


# ---------------------------------------------------------------- 5.3 Beispielprogramm

class Beispielprogramm(unittest.TestCase):
    def test_beispiel_zeigt_alle_konzepte(self):
        with open(os.path.join(ROOT, "js", "example.js"), encoding="utf-8") as f:
            js = f.read()
        src = re.search(r"String\.raw`(.*?)`", js, re.S).group(1)
        m = analyze(src)
        self.assertNotIn("error", m)
        self.assertEqual(m["warnings"], [])
        kinds = {r["kind"] for r in m["relations"]}
        self.assertTrue({"generalization", "association", "composition"} <= kinds, kinds)
        self.assertIn("abstract", {c["kind"] for c in m["classes"]})


if __name__ == "__main__":
    unittest.main()
