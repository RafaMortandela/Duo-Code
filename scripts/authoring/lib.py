"""Ferramenta de autoria das questões (spec 006).

Cada arquivo `unit_*.py` descreve questões como dicionários e chama `build`.
Para cada questão, `build`:

  - calcula a resposta esperada dos testes ocultos rodando a solução de
    referência, pelo mesmo harness que o app usa;
  - confere que os testes visíveis, escritos à mão, batem com a solução;
  - compara a solução com uma força bruta independente em centenas de
    entradas pequenas aleatórias;
  - gera os exemplos do enunciado a partir dos testes visíveis, para que
    enunciado e testes nunca divirjam;
  - grava a pasta em content/problems/<slug>/.

Uso: python3 scripts/authoring/build_all.py
Depois: python3 scripts/validate_content.py
"""

import copy
import importlib.util
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content" / "problems"

_spec = importlib.util.spec_from_file_location(
    "duo_harness", ROOT / "src-tauri" / "src" / "runner" / "harness.py"
)
harness = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(harness)

CROSS_CHECKS = 300
MIN_VISIBLE = 3
MIN_HIDDEN = 5


def _load(source, entry):
    namespace = {"__name__": "solution", "ListNode": harness.ListNode, "TreeNode": harness.TreeNode}
    exec(compile(source, "solution.py", "exec"), namespace)
    return namespace[entry]


def _call(fn, problem, args):
    params = problem["params"]
    decoded = [harness.decode(copy.deepcopy(v), t) for v, (_, t) in zip(args, params)]
    return harness.normalize(harness.encode(fn(*decoded), problem["returns"]))


def _show(value):
    """Valor JSON escrito como em Python, com aspas duplas em textos."""
    if value is None:
        return "None"
    if value is True:
        return "True"
    if value is False:
        return "False"
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, list):
        return "[" + ", ".join(_show(v) for v in value) + "]"
    return repr(value)


def _visible(problem):
    """Testes visíveis como (args, esperado, nota). No arquivo da unidade cada
    um é escrito como (arg1, ..., argN, esperado[, nota])."""
    n = len(problem["params"])
    out = []
    for row in problem["visible"]:
        assert len(row) in (n + 1, n + 2), f"{problem['slug']}: visible test {row!r} has the wrong shape"
        out.append((list(row[:n]), row[n], row[n + 1] if len(row) > n + 1 else None))
    return out


def _examples(problem):
    blocks = []
    for i, (args, expected, *note) in enumerate(_visible(problem)[: problem.get("examples", 3)], 1):
        inputs = ", ".join(f"{name} = {_show(v)}" for (name, _), v in zip(problem["params"], args))
        block = f"### Example {i}\n\n```\nInput:  {inputs}\nOutput: {_show(expected)}\n```"
        if note and note[0]:
            block += f"\n\n{note[0]}"
        blocks.append(block)
    return "\n\n".join(blocks)


def build(problem):
    slug = problem["slug"]
    compare = harness.COMPARATORS[problem.get("comparator", "exact")]
    solve = _load(problem["solution"], problem["entry"])

    assert len(problem["visible"]) >= MIN_VISIBLE, f"{slug}: needs {MIN_VISIBLE} visible tests"
    assert len(problem["hidden"]) >= MIN_HIDDEN, f"{slug}: needs {MIN_HIDDEN} hidden tests"
    assert 1 <= len(problem["hints"]) <= 3, f"{slug}: 1 to 3 hints"

    tests = []
    for args, expected, _ in _visible(problem):
        got = _call(solve, problem, args)
        assert compare(got, expected), f"{slug}: visible {args!r}: solution gives {got!r}, statement says {expected!r}"
        tests.append({"args": args, "expected": expected, "hidden": False})
    for args in problem["hidden"]:
        assert isinstance(args, list) and len(args) == len(problem["params"]), f"{slug}: hidden test has the wrong shape"
        tests.append({"args": args, "expected": _call(solve, problem, args), "hidden": True})

    brute_source = problem.get("brute") or problem.get("naive")
    if brute_source and problem.get("random"):
        brute = _load(brute_source, problem["entry"])
        rng = random.Random(slug)
        for _ in range(CROSS_CHECKS):
            args = problem["random"](rng)
            a, b = _call(solve, problem, args), _call(brute, problem, args)
            assert compare(a, b), f"{slug}: {args!r}: solution {a!r} != brute force {b!r}"
    else:
        print(f"  (no cross-check for {slug})", file=sys.stderr)

    statement = "\n\n".join(
        [problem["statement"].strip(), _examples(problem), "### Constraints\n\n" + problem["constraints"].strip()]
    )
    meta = {
        "id": slug,
        "title": problem["title"],
        "difficulty": problem["difficulty"],
        "unit": problem["unit"],
        "tags": problem["tags"],
        "entrypoint": problem["entry"],
        "params": [{"name": n, "type": t} for n, t in problem["params"]],
        "returns": problem["returns"],
        "comparator": problem.get("comparator", "exact"),
        "time_limit_ms": problem.get("time_limit_ms", 2000),
        "hints": problem["hints"],
        "complexity": {"time": problem["complexity"][0], "space": problem["complexity"][1]},
    }

    folder = CONTENT / slug
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (folder / "statement.md").write_text(statement + "\n", encoding="utf-8")
    (folder / "starter.py").write_text(problem["starter"].strip() + "\n", encoding="utf-8")
    (folder / "solution.py").write_text(problem["solution"].strip() + "\n", encoding="utf-8")
    (folder / "tests.json").write_text(json.dumps(tests, separators=(",", ":")), encoding="utf-8")
    naive = folder / "naive.py"
    if problem.get("naive"):
        naive.write_text(problem["naive"].strip() + "\n", encoding="utf-8")
    elif naive.exists():
        naive.unlink()
    size = (folder / "tests.json").stat().st_size // 1024
    print(f"built {slug:28} {len(tests):2} tests  {size:4} KB")


LIST_NODE_NOTE = '''# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
'''

TREE_NODE_NOTE = '''# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
'''
