"""Unittests für py/run_program.py (CPython ≥ 3.11, ohne Pyodide)."""
import os
import sys
import textwrap
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "py"))

from run_program import OUTPUT_LIMIT, TRUNCATED, run  # noqa: E402


def execute(src, inputs=None):
    chunks = []
    res = run(textwrap.dedent(src), inputs or [], lambda stream, text: chunks.append((stream, text)))
    return res, chunks


def text(chunks, stream=None):
    return "".join(t for s, t in chunks if stream is None or s == stream)


class RunTest(unittest.TestCase):
    def test_print(self):
        res, chunks = execute('print("Hallo")')
        self.assertEqual(res, {"status": "ok"})
        self.assertEqual(chunks, [("out", "Hallo\n")])

    def test_main_guard(self):
        res, chunks = execute('if __name__ == "__main__":\n    print("start")\n')
        self.assertEqual(res["status"], "ok")
        self.assertEqual(text(chunks, "out"), "start\n")

    def test_stdout_restored(self):
        before = sys.stdout, sys.stderr
        execute("print(1)")
        execute("1/0")
        self.assertEqual((sys.stdout, sys.stderr), before)

    def test_stderr(self):
        res, chunks = execute('import sys\nprint("x", file=sys.stderr)')
        self.assertEqual(res["status"], "ok")
        self.assertEqual(chunks, [("err", "x\n")])

    def test_runtime_error(self):
        res, chunks = execute('print("a")\nprint(1 / 0)\n')
        self.assertEqual(res["status"], "error")
        self.assertEqual(chunks[0], ("out", "a\n"))
        err = text(chunks, "err")
        self.assertIn("ZeroDivisionError", err)
        self.assertIn("line 2", err)
        self.assertIn("<programm>", err)
        self.assertNotIn("run_program", err)
        self.assertLess(err.index("Traceback"), err.index("ZeroDivisionError"))

    def test_error_in_function_shows_user_frames(self):
        res, chunks = execute("def f():\n    return 1 / 0\n\nf()\n")
        err = text(chunks, "err")
        self.assertIn("line 4", err)
        self.assertIn("line 2", err)
        self.assertNotIn("run_program", err)

    def test_syntax_error(self):
        res, chunks = execute("class A\n    pass\n")
        self.assertEqual(res["status"], "error")
        err = text(chunks, "err")
        self.assertIn("SyntaxError", err)
        self.assertIn("line 1", err)
        self.assertNotIn("run_program", err)

    def test_exit_zero_silent(self):
        res, chunks = execute('print("a")\nexit()\nprint("b")\n')
        self.assertEqual(res["status"], "ok")
        self.assertEqual(chunks, [("out", "a\n")])

    def test_exit_code(self):
        res, chunks = execute("import sys\nsys.exit(3)\n")
        self.assertEqual(res["status"], "error")
        self.assertIn("3", text(chunks, "note"))
        self.assertNotIn("Traceback", text(chunks))

    def test_input_needed(self):
        res, chunks = execute('name = input("Name? ")\nprint("Hallo", name)\n')
        self.assertEqual(res, {"status": "input", "prompt": "Name? "})
        self.assertEqual(chunks, [])

    def test_input_replay(self):
        res, chunks = execute('name = input("Name? ")\nprint("Hallo", name)\n', ["Ada"])
        self.assertEqual(res["status"], "ok")
        self.assertEqual(text(chunks), "Name? Ada\nHallo Ada\n")

    def test_input_not_caught_by_user_except(self):
        res, _ = execute("try:\n    input()\nexcept Exception:\n    print('gefangen')\n")
        self.assertEqual(res, {"status": "input", "prompt": ""})

    def test_output_limit(self):
        res, chunks = execute("for i in range(10**5):\n    print(i)\n")
        self.assertEqual(res["status"], "ok")
        self.assertLessEqual(len(text(chunks, "out")), OUTPUT_LIMIT)
        notes = [t for s, t in chunks if s == "note"]
        self.assertEqual(len(notes), 1)
        self.assertIn(TRUNCATED.strip(), notes[0])

    def test_error_after_limit_still_shown(self):
        res, chunks = execute("for i in range(10**5):\n    print(i)\n1/0\n")
        self.assertIn("ZeroDivisionError", text(chunks, "err"))

    def test_fresh_state(self):
        execute("x = 1")
        res, chunks = execute("print(x)")
        self.assertEqual(res["status"], "error")
        self.assertIn("NameError", text(chunks, "err"))

    def test_dataclass(self):
        res, chunks = execute(
            """
            from dataclasses import dataclass

            @dataclass
            class P:
                x: int

            print(P(1))
            """
        )
        self.assertEqual(res["status"], "ok", text(chunks))
        self.assertEqual(text(chunks), "P(x=1)\n")


if __name__ == "__main__":
    unittest.main()
