"""Duo Code test harness.

Usage: python3 -I harness.py job.json   (cwd = directory holding the files)

Runs a solution against test cases and reports through a line protocol on the
real stdout: every protocol line is "<token> <json>". Anything the solution
prints is captured per test case and never reaches the real stdout.

Events: loading, loaded, start, result, fatal, done.
The caller (Rust runner or scripts/validate_content.py) enforces the time
limit by killing this process when a "result" does not follow a "start" in time.
"""

import copy
import io
import json
import os
import sys
import time
import traceback
from collections import deque

SOLUTION_FILE = "solution.py"
MAX_NODES = 200_000
MAX_STDOUT = 10_000
MAX_FRAMES = 8
FLOAT_TOLERANCE = 1e-6


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val!r})"


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val!r})"


# ---------- conversions between JSON arrays and linked structures ----------


def list_from_array(values):
    dummy = ListNode()
    tail = dummy
    for v in values or []:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def list_to_array(node):
    out = []
    while node is not None:
        if not isinstance(node, ListNode):
            raise TypeError(f"expected a ListNode or None, got {type(node).__name__}")
        out.append(node.val)
        node = node.next
        if len(out) > MAX_NODES:
            raise ValueError("linked list has a cycle or is too long")
    return out


def tree_from_array(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def tree_to_array(root):
    if root is None:
        return []
    out = []
    queue = deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        if not isinstance(node, TreeNode):
            raise TypeError(f"expected a TreeNode or None, got {type(node).__name__}")
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
        if len(out) > MAX_NODES:
            raise ValueError("tree has a cycle or is too large")
    while out and out[-1] is None:
        out.pop()
    return out


def _inner(type_name):
    if type_name.startswith("list[") and type_name.endswith("]"):
        return type_name[5:-1].strip()
    return None


def decode(value, type_name):
    """JSON value -> argument passed to the solution."""
    type_name = type_name.strip()
    if type_name == "ListNode":
        return list_from_array(value)
    if type_name == "TreeNode":
        return tree_from_array(value)
    inner = _inner(type_name)
    if inner is not None and isinstance(value, list):
        return [decode(v, inner) for v in value]
    return value


def encode(value, type_name):
    """Value returned by the solution -> JSON-comparable value."""
    type_name = type_name.strip()
    if type_name == "ListNode":
        return list_to_array(value)
    if type_name == "TreeNode":
        return tree_to_array(value)
    inner = _inner(type_name)
    if inner is not None and isinstance(value, (list, tuple)):
        return [encode(v, inner) for v in value]
    return value


def normalize(value):
    if isinstance(value, (list, tuple)):
        return [normalize(v) for v in value]
    if isinstance(value, dict):
        return {k: normalize(v) for k, v in value.items()}
    return value


# ---------- comparators ----------


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def exact_eq(a, b, tolerance=None):
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if _is_number(a) and _is_number(b):
        if tolerance is not None:
            return abs(a - b) <= tolerance
        return a == b
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(exact_eq(x, y, tolerance) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(exact_eq(a[k], b[k], tolerance) for k in a)
    return type(a) is type(b) and a == b


def _canonical(x):
    return json.dumps(x, sort_keys=True, default=repr)


def unordered_eq(a, b):
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return False
        return all(
            exact_eq(x, y)
            for x, y in zip(sorted(a, key=_canonical), sorted(b, key=_canonical))
        )
    return exact_eq(a, b)


COMPARATORS = {
    "exact": exact_eq,
    "unordered": unordered_eq,
    "float": lambda a, b: exact_eq(a, b, FLOAT_TOLERANCE),
}


# ---------- error reporting ----------


def error_info(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == SOLUTION_FILE]
    lines = []
    for f in frames[-MAX_FRAMES:]:
        lines.append(f"  line {f.lineno}, in {f.name}")
        if f.line:
            lines.append(f"    {f.line}")
    if len(frames) > MAX_FRAMES:
        lines.insert(0, f"  ... {len(frames) - MAX_FRAMES} more frames")
    message = str(exc)
    lines.append(f"{type(exc).__name__}: {message}" if message else type(exc).__name__)
    return {
        "type": type(exc).__name__,
        "message": message,
        "line": frames[-1].lineno if frames else None,
        "column": None,
        "traceback": "\n".join(lines),
    }


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        job = json.load(f)
    token = job["token"]
    protocol = os.fdopen(os.dup(1), "w", encoding="utf-8")

    def emit(event):
        protocol.write(token + " " + json.dumps(event, default=repr) + "\n")
        protocol.flush()

    with open(job["code_file"], encoding="utf-8") as f:
        source = f.read()

    try:
        code = compile(source, SOLUTION_FILE, "exec")
    except SyntaxError as e:
        emit({
            "event": "fatal",
            "verdict": "syntax_error",
            "error": {
                "type": type(e).__name__,
                "message": e.msg,
                "line": e.lineno,
                "column": e.offset,
                "traceback": f"line {e.lineno}, column {e.offset}\n{type(e).__name__}: {e.msg}",
            },
        })
        return

    sys.stdout = sys.stderr = io.StringIO()
    namespace = {"__name__": "solution", "ListNode": ListNode, "TreeNode": TreeNode}

    emit({"event": "loading"})
    try:
        exec(code, namespace)
    except BaseException as e:  # includes SystemExit raised at import time
        emit({"event": "fatal", "verdict": "runtime_error", "error": error_info(e)})
        return

    entrypoint = job["entrypoint"]
    fn = namespace.get(entrypoint)
    if not callable(fn):
        message = f"function '{entrypoint}' is not defined"
        emit({
            "event": "fatal",
            "verdict": "runtime_error",
            "error": {"type": "NameError", "message": message, "line": None,
                      "column": None, "traceback": f"NameError: {message}"},
        })
        return
    emit({"event": "loaded"})

    params = job["params"]
    returns = job["returns"]
    compare = COMPARATORS[job.get("comparator", "exact")]
    limit_ms = job.get("time_limit_ms", 2000)

    for index, test in enumerate(job["tests"]):
        captured = io.StringIO()
        sys.stdout = sys.stderr = captured
        emit({"event": "start", "index": index})

        args = [decode(copy.deepcopy(v), p["type"]) for v, p in zip(test["args"], params)]
        actual = None
        error = None
        started = time.perf_counter()
        try:
            actual = normalize(encode(fn(*args), returns))
        except BaseException as e:
            error = error_info(e)
        elapsed_ms = int((time.perf_counter() - started) * 1000)

        if error is not None:
            status = "runtime_error"
        elif elapsed_ms > limit_ms:
            status = "time_limit"
        elif compare(actual, test["expected"]):
            status = "passed"
        else:
            status = "wrong_answer"

        emit({
            "event": "result",
            "index": index,
            "status": status,
            "actual": actual,
            "stdout": captured.getvalue()[:MAX_STDOUT],
            "error": error,
            "time_ms": elapsed_ms,
        })

    emit({"event": "done"})


if __name__ == "__main__":
    main()
