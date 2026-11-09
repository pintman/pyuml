"""Statische Analyse von Python-Quelltext zu einem UML-Klassenmodell.

Der Quelltext wird ausschließlich mit ``ast`` und ``tokenize`` gelesen und
niemals ausgeführt (kein ``exec``/``eval``/``compile``-Ausführungspfad).

Einstieg: ``analyze(source) -> dict`` (JSON-fähig, Format siehe design.md D3)
bzw. ``analyze_json(source) -> str`` für den Web Worker.
"""
import ast
import io
import json
import re
import tokenize

__all__ = ["analyze", "analyze_json"]

# --------------------------------------------------------------------------
# Konstanten
# --------------------------------------------------------------------------

BUILTIN_TYPES = {"int", "float", "str", "bool", "list", "dict", "set", "tuple",
                 "frozenset", "bytes", "complex"}
TYPING_ALIASES = {"List": "list", "Dict": "dict", "Set": "set", "FrozenSet": "frozenset",
                  "Tuple": "tuple", "Type": "type", "DefaultDict": "defaultdict",
                  "Deque": "deque"}
SEQUENCE_TYPES = {"list", "set", "frozenset", "Sequence", "MutableSequence", "Iterable",
                  "Iterator", "Collection", "deque", "MutableSet", "AbstractSet"}
MAPPING_TYPES = {"dict", "Mapping", "MutableMapping", "defaultdict", "OrderedDict"}
CONTAINER_LITERALS = {"list", "set", "frozenset", "tuple", "dict"}
ENUM_BASES = {"Enum", "IntEnum", "StrEnum", "Flag", "IntFlag", "ReprEnum"}
EXCLUDED_BASES = {"object", "ABC", "Protocol", "Generic", "NamedTuple", "TypedDict",
                  "Any"} | ENUM_BASES
ABSTRACT_DECORATORS = {"abstractmethod", "abstractclassmethod", "abstractstaticmethod",
                       "abstractproperty"}
PROPERTY_DECORATORS = {"property", "cached_property", "abstractproperty"}
ADD_METHODS = {"append", "add", "insert", "appendleft"}

# Rang der Typquellen (kleiner = höherer Vorrang), siehe Spec „Typen ermitteln“
RANK_ANNOTATION, RANK_PARAM, RANK_LITERAL, RANK_CONSTRUCTOR = 0, 1, 2, 3

# Annotationen
ANNOTATION_RE = re.compile(r"^#\s*uml\s*:(.*)$", re.IGNORECASE)
MULT_RE = re.compile(r"^(\*|\d+|\d+\.\.(\d+|\*))$")
IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
KEYWORDS = {
    "komposition": "composition", "composition": "composition",
    "aggregation": "aggregation",
    "assoziation": "association", "association": "association",
    "abhaengigkeit": "dependency", "abhängigkeit": "dependency", "dependency": "dependency",
    "attribut": "attribute", "attribute": "attribute",
    "interface": "interface", "schnittstelle": "interface",
    "abstrakt": "abstract", "abstract": "abstract",
    "ausblenden": "hide", "hide": "hide",
}
RELATION_KEYWORDS = {"composition", "aggregation", "association", "dependency"}
ALLOWED = {
    "class": {"interface", "abstract", "hide"},
    "attribute": RELATION_KEYWORDS | {"attribute", "hide", "mult", "type"},
    "method": {"hide"},
    "literal": {"hide"},
}
ELEMENT_NAMES = {"class": "einer Klasse", "attribute": "einem Attribut",
                 "method": "einer Methode", "literal": "einem Aufzählungswert"}


# --------------------------------------------------------------------------
# Hilfsfunktionen für AST
# --------------------------------------------------------------------------

def _name(node):
    """Einfacher Name eines Ausdrucks: ``X``, ``modul.X`` → ``X``, ``X[...]`` → ``X``."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Subscript):
        return _name(node.value)
    return None


def _decorator_names(func):
    return [_name(d.func if isinstance(d, ast.Call) else d) for d in func.decorator_list]


def visibility(name):
    if name.startswith("__") and not name.endswith("__"):
        return "-"
    if name.startswith("_") and not name.startswith("__"):
        return "#"
    return "+"


def _is_none(node):
    return isinstance(node, ast.Constant) and node.value is None


def _bitor(left, right):
    return ast.BinOp(left=left, op=ast.BitOr(), right=right)


def normalize(node):
    """Typ-Ausdruck in eingebaute Schreibweise bringen.

    ``"X"`` → ``X``, ``typing.List[X]`` → ``list[X]``, ``Optional[X]`` → ``X | None``,
    ``Union[A, B]`` → ``A | B``.
    """
    if node is None:
        return None
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        try:
            parsed = ast.parse(node.value.strip(), mode="eval").body
        except SyntaxError:
            return ast.Name(id=node.value)
        return normalize(parsed)
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) \
            and node.value.id in ("typing", "t", "collections", "abc"):
        return normalize(ast.Name(id=node.attr))
    if isinstance(node, ast.Name):
        return ast.Name(id=TYPING_ALIASES.get(node.id, node.id))
    if isinstance(node, ast.Subscript):
        base = _name(node.value)
        is_tuple = isinstance(node.slice, ast.Tuple)
        elts = [normalize(e) for e in (node.slice.elts if is_tuple else [node.slice])]
        if base == "Optional" and elts:
            return _bitor(elts[0], ast.Constant(value=None))
        if base == "Union" and elts:
            result = elts[0]
            for e in elts[1:]:
                result = _bitor(result, e)
            return result
        if base == "ClassVar" and elts:
            return elts[0]
        if base in TYPING_ALIASES:
            value = ast.Name(id=TYPING_ALIASES[base])
        else:
            value = normalize(node.value)
        sl = ast.Tuple(elts=elts) if is_tuple else elts[0]
        return ast.Subscript(value=value, slice=sl)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        return _bitor(normalize(node.left), normalize(node.right))
    if isinstance(node, (ast.List, ast.Tuple)):
        return type(node)(elts=[normalize(e) for e in node.elts])
    return node


def type_str(node):
    return None if node is None else ast.unparse(node)


def _union_members(node):
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        return _union_members(node.left) + _union_members(node.right)
    return [node]


def resolve(node, known):
    """Normalisierten Typ auf (Zielklasse, Multiplizität) abbilden oder ``None``."""
    if node is None:
        return None
    if isinstance(node, ast.Name):
        return (node.id, "1") if node.id in known else None
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
        members = _union_members(node)
        rest = [m for m in members if not _is_none(m)]
        if len(rest) != 1:
            return None
        r = resolve(rest[0], known)
        if r and len(rest) < len(members) and r[1] == "1":
            return (r[0], "0..1")
        return r
    if isinstance(node, ast.Subscript):
        base = _name(node.value)
        elts = node.slice.elts if isinstance(node.slice, ast.Tuple) else [node.slice]
        target = None
        if base in SEQUENCE_TYPES:
            target = resolve(elts[0], known)
        elif base in MAPPING_TYPES:
            target = resolve(elts[-1], known)
        elif base == "tuple" and len(elts) == 2 and isinstance(elts[1], ast.Constant) \
                and elts[1].value is Ellipsis:
            target = resolve(elts[0], known)
        return (target[0], "*") if target else None
    return None


def referenced_classes(node, known):
    """Alle Modellklassen, die in einem normalisierten Typ vorkommen (Reihenfolge)."""
    out = []
    if node is None:
        return out
    for n in ast.walk(node):
        if isinstance(n, ast.Name) and n.id in known and n.id not in out:
            out.append(n.id)
    return out


def _call_class(node, known):
    """Name der Modellklasse, wenn ``node`` ein Konstruktoraufruf ``Klasse(...)`` ist."""
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in known:
        return node.func.id
    return None


def _literal(value, known):
    """Literal-Typ eines Werts → (Typknoten, erzeugte Klasse oder None) oder None."""
    if isinstance(value, ast.Constant):
        v = value.value
        for py_type, name in ((bool, "bool"), (int, "int"), (float, "float"), (str, "str"),
                              (complex, "complex"), (bytes, "bytes")):
            if isinstance(v, py_type):
                return ast.Name(id=name), None
        return None
    if isinstance(value, ast.UnaryOp) and isinstance(value.op, (ast.USub, ast.UAdd)):
        return _literal(value.operand, known)
    if isinstance(value, ast.JoinedStr):
        return ast.Name(id="str"), None
    containers = {ast.List: "list", ast.ListComp: "list", ast.Set: "set", ast.SetComp: "set",
                  ast.Tuple: "tuple", ast.Dict: "dict", ast.DictComp: "dict"}
    for cls, name in containers.items():
        if isinstance(value, cls):
            if isinstance(value, (ast.ListComp, ast.SetComp)):
                elts = [value.elt]
            elif isinstance(value, (ast.List, ast.Set, ast.Tuple)):
                elts = value.elts
            else:
                elts = []
            made = {_call_class(e, known) for e in elts}
            if elts and len(made) == 1 and None not in made:
                target = made.pop()
                if name == "tuple":
                    sl = ast.Tuple(elts=[ast.Name(id=target), ast.Constant(value=Ellipsis)])
                else:
                    sl = ast.Name(id=target)
                return ast.Subscript(value=ast.Name(id=name), slice=sl), target
            return ast.Name(id=name), None
    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) \
            and value.func.id in BUILTIN_TYPES:
        return ast.Name(id=value.func.id), None
    return None


# --------------------------------------------------------------------------
# Modell-Bausteine
# --------------------------------------------------------------------------

class Attr:
    def __init__(self, name, line, static):
        self.name = name
        self.line = line
        self.static = static
        self.candidates = []     # (rang, reihenfolge, typknoten)
        self.none_assigned = False
        self.created = set()     # selbst erzeugte Modellklassen
        self.elements = []       # Element-Typknoten aus append()/add()
        self.is_property = False
        self.hidden = False
        self.no_relation = False
        self.rel_kind = None
        self.mult = None         # (quelle, ziel)
        self.type_override = None
        self.annotation_line = None
        self.type_node = None
        self.relation = None     # (ziel, multiplizität)

    def add_candidate(self, rank, node):
        if node is not None:
            self.candidates.append((rank, len(self.candidates), node))


class Method:
    def __init__(self, data, node):
        self.data = data
        self.node = node
        self.hidden = False


class ClassInfo:
    def __init__(self, node):
        self.node = node
        self.name = node.name
        self.line = node.lineno
        self.bases = [b for b in (_name(b) for b in node.bases) if b]
        self.kind = "class"
        self.attrs = {}          # name → Attr
        self.methods = []
        self.literals = []       # (name, zeile, verborgen)
        self.hidden = False
        self.dataclass = any(n == "dataclass" for n in _decorator_names(node))


class Analyzer:
    def __init__(self, source):
        self.source = source
        self.warnings = []
        self.elements = []       # (start, ende, priorität, art, ziel)

    # ---- Durchlauf 1: Klassen und externe Basisklassen ----

    def collect_classes(self, tree):
        self.classes = [ClassInfo(n) for n in tree.body if isinstance(n, ast.ClassDef)]
        self.defined = {c.name for c in self.classes}
        self.externals = []
        for c in self.classes:
            for b in c.bases:
                if b not in self.defined and b not in EXCLUDED_BASES and b not in self.externals:
                    self.externals.append(b)
        self.known = self.defined | set(self.externals)

    # ---- Durchlauf 2: Inhalt je Klasse ----

    def analyze_class(self, c):
        node = c.node
        start = min([d.lineno for d in node.decorator_list] + [node.lineno])
        self.elements.append((start, node.end_lineno, 0, "class", c))

        is_enum = any(b in ENUM_BASES for b in c.bases)
        if is_enum:
            c.kind = "enum"
        elif "Protocol" in c.bases:
            c.kind = "interface"
        elif "ABC" in c.bases or any(
                isinstance(k.value, ast.AST) and _name(k.value) == "ABCMeta"
                for k in node.keywords if k.arg == "metaclass"):
            c.kind = "abstract"

        for stmt in node.body:
            if isinstance(stmt, (ast.Assign, ast.AnnAssign)):
                self.class_body_assignment(c, stmt, is_enum)
            elif isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.method(c, stmt)

        if c.kind == "class" and any(m.data["abstract"] for m in c.methods):
            c.kind = "abstract"
        if c.kind == "class" and any(getattr(a, "abstract", False) for a in c.attrs.values()):
            c.kind = "abstract"

    def attr(self, c, name, line, static):
        a = c.attrs.get(name)
        if a is None:
            a = c.attrs[name] = Attr(name, line, static)
        else:
            a.line = min(a.line, line)
        return a

    def class_body_assignment(self, c, stmt, is_enum):
        if isinstance(stmt, ast.Assign):
            targets = [t.id for t in stmt.targets if isinstance(t, ast.Name)]
            annotation, value = None, stmt.value
        else:
            targets = [stmt.target.id] if isinstance(stmt.target, ast.Name) else []
            annotation, value = stmt.annotation, stmt.value
        for name in targets:
            if name.startswith("__") and name.endswith("__"):
                continue
            if is_enum:
                if not name.startswith("_"):
                    lit = [name, stmt.lineno, False]
                    c.literals.append(lit)
                    self.elements.append((stmt.lineno, stmt.end_lineno, 2, "literal", lit))
                continue
            is_classvar = annotation is not None and _name(annotation) == "ClassVar"
            if annotation is not None and not is_classvar and (c.dataclass or value is None):
                static = False   # Dataclass-Feld bzw. reine Deklaration
            else:
                static = True
            a = self.attr(c, name, stmt.lineno, static)
            a.add_candidate(RANK_ANNOTATION, normalize(annotation))
            self.add_value(a, value, {})
            self.elements.append((stmt.lineno, stmt.end_lineno, 2, "attribute", a))

    def method(self, c, func):
        decos = _decorator_names(func)
        start = min([d.lineno for d in func.decorator_list] + [func.lineno])
        is_setter = any(isinstance(d, ast.Attribute) and d.attr in ("setter", "deleter", "getter")
                        for d in func.decorator_list)
        is_static = "staticmethod" in decos or "abstractstaticmethod" in decos
        is_class = "classmethod" in decos or "abstractclassmethod" in decos
        is_abstract = any(d in ABSTRACT_DECORATORS for d in decos)
        is_property = any(d in PROPERTY_DECORATORS for d in decos)

        args = func.args
        positional = args.posonlyargs + args.args
        self_name = None
        if positional and not is_static:
            self_name = positional[0].arg
            params_nodes = positional[1:]
        else:
            params_nodes = positional
        n_def = len(args.defaults)
        defaults = [None] * (len(positional) - n_def) + list(args.defaults)
        defaults = defaults[len(positional) - len(params_nodes):]

        params = []
        param_types = {}
        for p, d in zip(params_nodes, defaults):
            params.append(self.param(p.arg, p.annotation, d))
            param_types[p.arg] = normalize(p.annotation)
        if args.vararg:
            params.append(self.param("*" + args.vararg.arg, args.vararg.annotation, None))
        for p, d in zip(args.kwonlyargs, args.kw_defaults):
            params.append(self.param(p.arg, p.annotation, d))
            param_types[p.arg] = normalize(p.annotation)
        if args.kwarg:
            params.append(self.param("**" + args.kwarg.arg, args.kwarg.annotation, None))

        returns = normalize(func.returns)

        if is_property or is_setter:
            a = self.attr(c, func.name, func.lineno, False)
            if is_property:
                a.is_property = True
                a.abstract = is_abstract
                a.add_candidate(RANK_ANNOTATION, returns)
            self.elements.append((start, func.end_lineno, 1, "attribute", a))
        else:
            data = {"name": func.name, "params": params, "returns": type_str(returns),
                    "visibility": visibility(func.name), "static": is_static or is_class,
                    "abstract": is_abstract, "constructor": func.name == "__init__",
                    "line": func.lineno}
            m = Method(data, func)
            m.param_types = [t for t in param_types.values() if t is not None]
            m.returns = returns
            c.methods.append(m)
            self.elements.append((start, func.end_lineno, 1, "method", m))

        if self_name:
            self.self_assignments(c, func, self_name, param_types, static=is_class)

    def param(self, name, annotation, default):
        return {"name": name, "type": type_str(normalize(annotation)),
                "default": None if default is None else ast.unparse(default)}

    def self_assignments(self, c, func, self_name, param_types, static):
        found = []

        def is_self_attr(t):
            return isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) \
                and t.value.id == self_name

        def targets(t, value, stmt, annotation=None):
            if is_self_attr(t):
                found.append((stmt, t.attr, value, annotation))
            elif isinstance(t, (ast.Tuple, ast.List)):
                values = value.elts if isinstance(value, (ast.Tuple, ast.List)) \
                    and len(value.elts) == len(t.elts) else [None] * len(t.elts)
                for sub, v in zip(t.elts, values):
                    targets(sub, v, stmt)

        appends = []
        for n in ast.walk(func):
            if isinstance(n, ast.Assign):
                for t in n.targets:
                    targets(t, n.value, n)
            elif isinstance(n, ast.AnnAssign):
                targets(n.target, n.value, n, n.annotation)
            elif isinstance(n, ast.AugAssign):
                targets(n.target, None, n)
            elif isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) \
                    and n.func.attr in ADD_METHODS and is_self_attr(n.func.value) and n.args:
                appends.append((n.func.value.attr, n.args[-1]))

        found.sort(key=lambda f: (f[0].lineno, f[0].col_offset))
        for stmt, name, value, annotation in found:
            a = self.attr(c, name, stmt.lineno, static)
            a.add_candidate(RANK_ANNOTATION, normalize(annotation))
            self.add_value(a, value, param_types)
            self.elements.append((stmt.lineno, stmt.end_lineno, 2, "attribute", a))

        for name, arg in appends:
            a = c.attrs.get(name)
            if a is None:
                continue
            made = _call_class(arg, self.known)
            if made:
                a.elements.append(ast.Name(id=made))
                a.created.add(made)
            elif isinstance(arg, ast.Name) and param_types.get(arg.id) is not None:
                a.elements.append(param_types[arg.id])

    def add_value(self, a, value, param_types):
        if value is None:
            return
        if _is_none(value):
            a.none_assigned = True
            return
        if isinstance(value, ast.Name) and param_types.get(value.id) is not None:
            a.add_candidate(RANK_PARAM, param_types[value.id])
            return
        lit = _literal(value, self.known)
        if lit:
            node, made = lit
            a.add_candidate(RANK_LITERAL, node)
            if made:
                a.created.add(made)
            return
        made = _call_class(value, self.known)
        if made:
            a.add_candidate(RANK_CONSTRUCTOR, ast.Name(id=made))
            a.created.add(made)

    # ---- Annotationen ----

    def comments(self):
        """(zeile, text, eigene_zeile) aller ``# uml:``-Kommentare und Menge der Codezeilen."""
        result, code_lines = [], set()
        skip = {tokenize.COMMENT, tokenize.NL, tokenize.NEWLINE, tokenize.INDENT,
                tokenize.DEDENT, tokenize.ENCODING, tokenize.ENDMARKER}
        try:
            for tok in tokenize.generate_tokens(io.StringIO(self.source).readline):
                if tok.type == tokenize.COMMENT:
                    m = ANNOTATION_RE.match(tok.string)
                    if m:
                        own_line = tok.line[:tok.start[1]].strip() == ""
                        result.append((tok.start[0], m.group(1), own_line))
                elif tok.type not in skip:
                    code_lines.add(tok.start[0])
        except (tokenize.TokenError, SyntaxError):
            pass
        return result, code_lines

    def element_at(self, line):
        best = None
        for start, end, prio, kind, ref in self.elements:
            if start <= line <= end:
                key = (prio, -(end - start))
                if best is None or key > best[0]:
                    best = (key, kind, ref)
        return (best[1], best[2]) if best else (None, None)

    def warn(self, line, message):
        self.warnings.append({"line": line, "message": message})

    def parse_tokens(self, text, line):
        text = re.sub(r"\s*->\s*", "->", text.strip())
        text = re.sub(r"\s*=\s*", "=", text)
        out = []
        for token in re.split(r"[\s,]+", text):
            if not token:
                continue
            key = token.casefold()
            if key in KEYWORDS:
                out.append((KEYWORDS[key], None, token))
            elif "->" in token:
                src, _, dst = token.partition("->")
                if MULT_RE.match(src) and MULT_RE.match(dst):
                    out.append(("mult", (src, dst), token))
                else:
                    self.warn(line, "unbekannte UML-Annotation ‚%s‘" % token)
            elif MULT_RE.match(token):
                out.append(("mult", (None, token), token))
            elif key.startswith(("typ=", "type=")) and IDENT_RE.match(token.split("=", 1)[1]):
                out.append(("type", token.split("=", 1)[1], token))
            else:
                self.warn(line, "unbekannte UML-Annotation ‚%s‘" % token)
        return out

    def apply_annotations(self):
        comments, code_lines = self.comments()
        for line, text, own_line in comments:
            tokens = self.parse_tokens(text, line)
            if not tokens:
                continue
            target_line = line
            if own_line:
                following = [l for l in code_lines if l > line]
                target_line = min(following) if following else None
            kind, ref = self.element_at(target_line) if target_line else (None, None)
            if kind is None:
                self.warn(line, "UML-Annotation ohne zugehörige Klasse, Methode oder Attribut")
                continue
            for what, value, token in tokens:
                if what not in ALLOWED[kind]:
                    self.warn(line, "UML-Annotation ‚%s‘ passt nicht zu %s"
                              % (token, ELEMENT_NAMES[kind]))
                    continue
                if what == "hide":
                    if kind == "literal":
                        ref[2] = True
                    else:
                        ref.hidden = True
                elif kind == "class":
                    ref.kind = what
                    ref.kind_annotated = True
                elif what == "attribute":
                    ref.no_relation = True
                elif what in RELATION_KEYWORDS:
                    ref.rel_kind = what
                    ref.annotation_line = line
                elif what == "mult":
                    ref.mult = value
                    ref.annotation_line = line
                elif what == "type":
                    ref.type_override = value

    # ---- Durchlauf 3: Typen und Beziehungen ----

    def finalize_attr(self, a):
        node = min(a.candidates, key=lambda c: (c[0], c[1]))[2] if a.candidates else None
        base = _name(node) if isinstance(node, ast.Name) else None
        if a.type_override:
            t = ast.Name(id=a.type_override)
            if base in ("list", "set", "frozenset"):
                node = ast.Subscript(value=ast.Name(id=base), slice=t)
            elif base == "tuple":
                node = ast.Subscript(value=ast.Name(id="tuple"),
                                     slice=ast.Tuple(elts=[t, ast.Constant(value=Ellipsis)]))
            elif base == "dict":
                pass
            else:
                node = t
            many = base in CONTAINER_LITERALS
            a.relation = (a.type_override, "*" if many else "1") \
                if a.type_override in self.known else None
        else:
            if base in ("list", "set", "frozenset") and a.elements:
                names = {ast.unparse(e) for e in a.elements}
                if len(names) == 1:
                    node = ast.Subscript(value=ast.Name(id=base), slice=a.elements[0])
            a.relation = resolve(node, self.known)
        if a.relation and a.none_assigned and a.relation[1] == "1":
            a.relation = (a.relation[0], "0..1")
        a.type_node = node

    def class_data(self, c):
        attrs = sorted((a for a in c.attrs.values() if not a.hidden), key=lambda a: a.line)
        return {
            "name": c.name, "line": c.line, "kind": c.kind,
            "attributes": [{"name": a.name, "type": type_str(a.type_node),
                            "visibility": visibility(a.name), "static": a.static,
                            "line": a.line} for a in attrs],
            "methods": [m.data for m in c.methods if not m.hidden],
            "literals": [lit[0] for lit in c.literals if not lit[2]],
        }

    def run(self, tree):
        self.collect_classes(tree)
        for c in self.classes:
            self.analyze_class(c)
        self.apply_annotations()
        by_name = {c.name: c for c in self.classes}

        relations = []
        for c in self.classes:
            for b in c.bases:
                if b in self.known:
                    base_kind = by_name[b].kind if b in by_name else "external"
                    kind = "realization" if base_kind == "interface" and c.kind != "interface" \
                        else "generalization"
                    relations.append(self.relation(kind, c.name, b, None, None, c.line))

            linked = set()
            for a in sorted(c.attrs.values(), key=lambda a: a.line):
                self.finalize_attr(a)
                if a.relation is None:
                    if a.rel_kind or a.mult:
                        self.warn(a.annotation_line, "UML-Annotation an ‚%s‘ ohne Zielklasse "
                                  "wird ignoriert" % a.name)
                    continue
                target, mult = a.relation
                linked.add(target)
                if a.hidden or a.no_relation:
                    continue
                kind = a.rel_kind or ("composition" if target in a.created else "association")
                source_mult = None
                if a.mult:
                    source_mult = a.mult[0]
                    mult = a.mult[1]
                if kind == "dependency":
                    mult = source_mult = None
                relations.append(self.relation(kind, c.name, target, mult, source_mult, a.line))

            deps = []
            for m in c.methods:
                if m.hidden:
                    continue
                used = []
                for t in m.param_types + [m.returns]:
                    used += referenced_classes(t, self.known)
                for n in ast.walk(m.node):
                    made = _call_class(n, self.known)
                    if made:
                        used.append(made)
                for target in used:
                    if target not in linked and target not in deps:
                        deps.append(target)
                        relations.append(self.relation("dependency", c.name, target, None, None,
                                                       m.data["line"]))

        # Ausblenden: Klassen samt Beziehungen entfernen
        hidden = {c.name for c in self.classes if c.hidden}
        relations = [r for r in relations if r["source"] not in hidden and r["target"] not in hidden]
        used_externals = {r["target"] for r in relations}

        classes = []
        placed = set()
        for c in self.classes:
            if c.hidden:
                continue
            for b in c.bases:
                if b in self.externals and b in used_externals and b not in placed:
                    placed.add(b)
                    classes.append({"name": b, "line": None, "kind": "external",
                                    "attributes": [], "methods": [], "literals": []})
            classes.append(self.class_data(c))

        self.warnings.sort(key=lambda w: w["line"] or 0)
        return {"classes": classes, "relations": relations, "warnings": self.warnings}

    @staticmethod
    def relation(kind, source, target, target_mult, source_mult, line):
        return {"kind": kind, "source": source, "target": target,
                "targetMult": target_mult, "sourceMult": source_mult, "line": line}


# --------------------------------------------------------------------------
# Öffentliche Schnittstelle
# --------------------------------------------------------------------------

def analyze(source):
    """Quelltext analysieren (nicht ausführen).

    → Modell ``{"classes", "relations", "warnings"}`` oder
      ``{"error": {"line", "col", "message"}}`` bei Syntaxfehlern.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return {"error": {"line": e.lineno, "col": e.offset, "message": e.msg}}
    except ValueError as e:   # z. B. Nullbytes
        return {"error": {"line": 1, "col": None, "message": str(e)}}
    return Analyzer(source).run(tree)


def analyze_json(source):
    return json.dumps(analyze(source), ensure_ascii=False)
