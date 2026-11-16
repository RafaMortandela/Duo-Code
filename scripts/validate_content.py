#!/usr/bin/env python3
"""Valida o conteúdo de content/problems (spec 002 RF-12, CA-12).

Para cada questão:
  - o esquema de meta.json / tests.json é válido;
  - solution.py passa em todos os testes, com folga de tempo;
  - starter.py NÃO passa (senão a questão já nasce resolvida);
  - naive.py, se existir, estoura o tempo limite (spec 006 CA-4).

E para a trilha (content/units.json, spec 004 RF-7): toda questão está em
exatamente uma unidade, na unidade que ela declara, e não há referência a
questão inexistente.

Usa o mesmo harness do app, então julga exatamente como ele.

Uso: python3 scripts/validate_content.py [pasta_content]
Sai com código 1 se houver qualquer problema.
"""

import json
import re
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HARNESS = ROOT / "src-tauri" / "src" / "runner" / "harness.py"
TOKEN = "validate"
# Tempo para o interpretador subir, e entre um caso e o seguinte.
STARTUP_SECONDS = 20
BASE_TYPES = {"int", "float", "str", "bool", "ListNode", "TreeNode"}
DIFFICULTIES = {"easy", "medium", "hard"}
COMPARATORS = {"exact", "unordered", "float"}
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
REQUIRED = ["id", "title", "difficulty", "unit", "entrypoint", "params", "returns"]
FILES = ["meta.json", "tests.json", "statement.md", "starter.py", "solution.py"]


def valid_type(t):
    t = t.strip()
    if t.startswith("list[") and t.endswith("]"):
        return valid_type(t[5:-1])
    return t in BASE_TYPES


def check_schema(folder):
    """Devolve (meta, tests, erros)."""
    errors = [f"missing {name}" for name in FILES if not (folder / name).is_file()]
    if errors:
        return None, None, errors
    try:
        meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
        tests = json.loads((folder / "tests.json").read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return None, None, [f"invalid JSON: {e}"]

    errors += [f"meta.json: missing '{k}'" for k in REQUIRED if k not in meta]
    if errors:
        return None, None, errors

    if meta["id"] != folder.name:
        errors.append(f"meta.json: id '{meta['id']}' must match the folder name")
    if meta["difficulty"] not in DIFFICULTIES:
        errors.append(f"meta.json: unknown difficulty '{meta['difficulty']}'")
    if meta.get("comparator", "exact") not in COMPARATORS:
        errors.append(f"meta.json: unknown comparator '{meta['comparator']}'")
    if not IDENT.match(meta["entrypoint"]):
        errors.append(f"meta.json: entrypoint '{meta['entrypoint']}' is not a valid function name")
    for p in meta["params"]:
        if not IDENT.match(p.get("name", "")):
            errors.append(f"meta.json: invalid param name '{p.get('name')}'")
        if not valid_type(p.get("type", "")):
            errors.append(f"meta.json: unknown type '{p.get('type')}'")
    if not valid_type(meta["returns"]):
        errors.append(f"meta.json: unknown return type '{meta['returns']}'")
    if len(meta.get("hints", [])) > 3:
        errors.append("meta.json: at most 3 hints")
    if not (folder / "statement.md").read_text(encoding="utf-8").strip():
        errors.append("statement.md is empty")

    if not isinstance(tests, list) or not tests:
        errors.append("tests.json: needs at least one test")
    else:
        if all(t.get("hidden", False) for t in tests):
            errors.append("tests.json: needs at least one visible test")
        for i, t in enumerate(tests):
            if "args" not in t or "expected" not in t:
                errors.append(f"tests.json: test {i} needs 'args' and 'expected'")
            elif len(t["args"]) != len(meta["params"]):
                errors.append(f"tests.json: test {i} has {len(t['args'])} args, expected {len(meta['params'])}")
    return meta, tests, errors


def run(meta, tests, code):
    """Roda `code` no harness. Devolve uma lista de status, um por teste,
    ou ("fatal", mensagem)."""
    limit_ms = meta.get("time_limit_ms", 2000)
    with tempfile.TemporaryDirectory(prefix="duo-code-validate-") as tmp:
        tmp = Path(tmp)
        (tmp / "solution.py").write_text(code, encoding="utf-8")
        (tmp / "harness.py").write_text(HARNESS.read_text(encoding="utf-8"), encoding="utf-8")
        (tmp / "job.json").write_text(json.dumps({
            "token": TOKEN,
            "code_file": "solution.py",
            "entrypoint": meta["entrypoint"],
            "params": meta["params"],
            "returns": meta["returns"],
            "comparator": meta.get("comparator", "exact"),
            "time_limit_ms": limit_ms,
            "tests": [{"args": t["args"], "expected": t["expected"]} for t in tests],
        }), encoding="utf-8")

        proc = subprocess.Popen(
            [sys.executable, "-I", "harness.py", "job.json"],
            cwd=tmp, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, encoding="utf-8",
        )
        statuses = ["not_run"] * len(tests)
        times = [None] * len(tests)
        fatal = None
        current = None

        # O harness só marca time_limit em caso que termina atrasado. Um caso
        # que nunca termina precisa ser morto por fora: um temporizador é
        # rearmado a cada evento e mata o processo se o próximo não chegar.
        timer = None

        def arm(seconds):
            nonlocal timer
            if timer is not None:
                timer.cancel()
            timer = threading.Timer(seconds, proc.kill)
            timer.daemon = True
            timer.start()

        case_budget = limit_ms / 1000 + 1.0
        arm(STARTUP_SECONDS)
        try:
            for line in proc.stdout:
                if not line.startswith(TOKEN + " "):
                    continue
                event = json.loads(line[len(TOKEN) + 1:])
                kind = event["event"]
                if kind == "fatal":
                    fatal = f"{event['verdict']}: {event['error']['traceback']}"
                    break
                if kind == "start":
                    current = event["index"]
                    arm(case_budget)
                elif kind == "result":
                    statuses[event["index"]] = event["status"]
                    times[event["index"]] = event["time_ms"]
                    current = None
                    arm(STARTUP_SECONDS)
                elif kind == "loading":
                    arm(case_budget)
                elif kind == "done":
                    break
        finally:
            if timer is not None:
                timer.cancel()
            proc.kill()
            proc.wait()
        if fatal:
            return ("fatal", fatal), times
        if current is not None:
            statuses[current] = "time_limit"
        return statuses, times


def validate(folder):
    meta, tests, errors = check_schema(folder)
    if errors:
        return errors
    limit_ms = meta.get("time_limit_ms", 2000)

    result, times = run(meta, tests, (folder / "solution.py").read_text(encoding="utf-8"))
    if isinstance(result, tuple):
        errors.append(f"solution.py: {result[1]}")
    else:
        for i, status in enumerate(result):
            if status != "passed":
                errors.append(f"solution.py: test {i} -> {status}")
        slow = [(i, t) for i, t in enumerate(times) if t is not None and t > limit_ms / 2]
        for i, t in slow:
            errors.append(f"solution.py: test {i} took {t} ms, more than half of the {limit_ms} ms limit")

    result, _ = run(meta, tests, (folder / "starter.py").read_text(encoding="utf-8"))
    if not isinstance(result, tuple) and all(s == "passed" for s in result):
        errors.append("starter.py: passes every test; it must not solve the problem")

    naive = folder / "naive.py"
    if naive.is_file():
        result, _ = run(meta, tests, naive.read_text(encoding="utf-8"))
        if isinstance(result, tuple):
            errors.append(f"naive.py: {result[1]}")
        elif "time_limit" not in result:
            errors.append("naive.py: expected a time_limit, but no test timed out")
        elif any(s in ("wrong_answer", "runtime_error") for s in result):
            errors.append("naive.py: must be correct, only too slow")
    return errors


def check_units(content, folders):
    """Erros de content/units.json em relação às pastas de questão."""
    path = content / "units.json"
    if not path.is_file():
        return ["units.json is missing"]
    try:
        units = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return [f"units.json: invalid JSON: {e}"]
    if not isinstance(units, list):
        return ["units.json: must be a list of units"]

    declared = {}
    for folder in folders:
        try:
            declared[folder.name] = json.loads((folder / "meta.json").read_text(encoding="utf-8")).get("unit")
        except (OSError, json.JSONDecodeError):
            declared[folder.name] = None

    errors, seen_units, placed = [], set(), {}
    for unit in units:
        unit_id = unit.get("id") if isinstance(unit, dict) else None
        if not unit_id or not unit.get("title") or not isinstance(unit.get("problems"), list):
            errors.append(f"units.json: unit {unit_id!r} needs 'id', 'title' and 'problems'")
            continue
        if unit_id in seen_units:
            errors.append(f"units.json: duplicate unit '{unit_id}'")
        seen_units.add(unit_id)
        for slug in unit["problems"]:
            if slug not in declared:
                errors.append(f"units.json: unit '{unit_id}' references unknown problem '{slug}'")
            elif slug in placed:
                errors.append(f"units.json: problem '{slug}' is in both '{placed[slug]}' and '{unit_id}'")
            else:
                placed[slug] = unit_id
                if declared[slug] != unit_id:
                    errors.append(f"units.json: '{slug}' is listed under '{unit_id}' but its meta.json says '{declared[slug]}'")
    for slug in declared:
        if slug not in placed:
            errors.append(f"units.json: problem '{slug}' is not in any unit")
    return errors


def main():
    content = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "content"
    problems = content / "problems"
    if not problems.is_dir():
        print(f"error: {problems} does not exist", file=sys.stderr)
        return 1

    folders = sorted(p for p in problems.iterdir() if p.is_dir())
    failed = 0
    for folder in folders:
        errors = validate(folder)
        if errors:
            failed += 1
            print(f"FAIL {folder.name}")
            for e in errors:
                print(f"     {e}")
        else:
            print(f"ok   {folder.name}")

    problems_failed = failed
    unit_errors = check_units(content, folders)
    if unit_errors:
        failed += 1
        print("FAIL units.json")
        for e in unit_errors:
            print(f"     {e}")
    else:
        print("ok   units.json")

    print(f"\n{len(folders) - problems_failed} of {len(folders)} problems valid.")
    if not folders:
        print("error: no problems found", file=sys.stderr)
        return 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
