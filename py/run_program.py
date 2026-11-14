"""Führt den Quelltext aus dem Editor aus (für den Ausgabe-Bereich).

run(source, inputs, write) -> {"status": "ok"} | {"status": "error"} | {"status": "input", "prompt": str}

- write(stream, text) mit stream "out" (stdout), "err" (stderr) oder "note" (Hinweis der Anwendung)
- inputs: bereits bekannte Eingaben für input() (Replay); ist die Liste erschöpft, endet der Lauf mit
  status "input" und dem Eingabetext.
Läuft unter CPython (Tests) und Pyodide (write ist dort ein JS-Proxy).
"""
import builtins
import linecache
import sys
import traceback
import types

FILENAME = "<programm>"
OUTPUT_LIMIT = 100_000
TRUNCATED = "… Ausgabe gekürzt\n"


class _NeedInput(BaseException):
    """Interner Abbruch: input() ohne bekannten Wert (BaseException, damit `except Exception` sie nicht fängt)."""

    def __init__(self, prompt):
        super().__init__(prompt)
        self.prompt = prompt


class _Sink:
    """Zeilenweise Pufferung und gemeinsame Ausgabegrenze für stdout und stderr."""

    def __init__(self, write, limit):
        self._write = write
        self.left = limit
        self.truncated = False
        self._stream = None
        self._buf = ""

    def add(self, stream, text):
        """Puffert bis zum letzten Zeilenumbruch; Wechsel des Streams leert den Puffer (Reihenfolge bleibt)."""
        if not text:
            return
        if stream != self._stream:
            self.flush()
            self._stream = stream
        self._buf += text
        cut = self._buf.rfind("\n") + 1
        if cut:
            self.emit(stream, self._buf[:cut])
            self._buf = self._buf[cut:]

    def flush(self):
        if self._buf:
            self.emit(self._stream, self._buf)
            self._buf = ""

    def emit(self, stream, text):
        if not text:
            return
        if self.left <= 0:
            self._truncate()
            return
        if len(text) > self.left:
            part, self.left = text[: self.left], 0
            self._write(stream, part)
            self._truncate(newline=not part.endswith("\n"))
            return
        self.left -= len(text)
        self._write(stream, text)

    def _truncate(self, newline=False):
        if not self.truncated:
            self.truncated = True
            self._write("note", ("\n" if newline else "") + TRUNCATED)

    def raw(self, stream, text):
        """Ohne Grenze – für die abschließende Fehlermeldung."""
        self.flush()
        if text:
            self._write(stream, text)


class _Writer:
    def __init__(self, sink, stream):
        self._sink = sink
        self._stream = stream
        self.encoding = "utf-8"
        self.errors = "strict"

    def write(self, text):
        text = str(text)
        self._sink.add(self._stream, text)
        return len(text)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        self._sink.flush()

    def isatty(self):
        return False

    def writable(self):
        return True


def _filter(te):
    """Nur Frames des Nutzerprogramms behalten (auch in verketteten Ausnahmen)."""
    seen = set()
    while te is not None and id(te) not in seen:
        seen.add(id(te))
        te.stack = traceback.StackSummary.from_list([f for f in te.stack if f.filename == FILENAME])
        _filter(te.__cause__)
        te = te.__context__


def _format_error(exc):
    if isinstance(exc, SyntaxError):
        return "".join(traceback.format_exception_only(type(exc), exc))
    te = traceback.TracebackException(type(exc), exc, exc.__traceback__)
    _filter(te)
    return "".join(te.format())


def run(source, inputs, write):
    inputs = list(inputs or [])
    sink = _Sink(write, OUTPUT_LIMIT)
    out, err = _Writer(sink, "out"), _Writer(sink, "err")
    pos = [0]

    def replay_input(prompt=""):
        prompt = str(prompt)
        if pos[0] >= len(inputs):
            raise _NeedInput(prompt)
        value = str(inputs[pos[0]])
        pos[0] += 1
        out.write(prompt + value + "\n")
        return value

    lines = source.splitlines(True)
    linecache.cache[FILENAME] = (len(source), None, lines, FILENAME)

    try:
        code = compile(source, FILENAME, "exec")
    except SyntaxError as e:
        sink.raw("err", _format_error(e))
        return {"status": "error"}

    module = types.ModuleType("__main__")
    ns = module.__dict__
    own_builtins = dict(builtins.__dict__)
    own_builtins["input"] = replay_input
    ns["__builtins__"] = own_builtins

    saved = sys.stdout, sys.stderr, sys.modules.get("__main__")
    sys.stdout, sys.stderr = out, err
    sys.modules["__main__"] = module
    try:
        exec(code, ns)
        return {"status": "ok"}
    except _NeedInput as e:
        return {"status": "input", "prompt": e.prompt}
    except SystemExit as e:
        code_ = e.code
        if code_ is None or code_ == 0:
            return {"status": "ok"}
        if isinstance(code_, int):
            sink.raw("note", "Programm beendet mit Code %d\n" % code_)
        else:
            sink.raw("err", str(code_) + "\n")
        return {"status": "error"}
    except BaseException as e:  # noqa: BLE001 – Nutzerfehler aller Art anzeigen
        sink.raw("err", _format_error(e))
        return {"status": "error"}
    finally:
        sink.flush()
        sys.stdout, sys.stderr = saved[0], saved[1]
        if saved[2] is not None:
            sys.modules["__main__"] = saved[2]
        else:
            sys.modules.pop("__main__", None)
