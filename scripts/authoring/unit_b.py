"""Stack, Binary Search, Linked List."""

import random

from lib import LIST_NODE_NOTE, build

R = random.Random(2027)

# ---------------------------------------------------------------- Stack

build({
    "slug": "price-drop-alert",
    "title": "Price Drop Alert",
    "difficulty": "medium",
    "unit": "stack",
    "tags": ["monotonic stack"],
    "entry": "days_until_drop",
    "params": [("prices", "list[int]")],
    "returns": "list[int]",
    "statement": """
You are watching the price of a jacket. `prices[i]` is its price on day `i`.

For every day, work out how many days you would have to wait until the price is **strictly lower** than it is on that day. If the price never drops below that day's price, the answer for that day is `0`.

Return the list of answers, one per day.
""",
    "constraints": """
- `0 <= len(prices) <= 100_000`
- `1 <= prices[i] <= 1_000_000`
""",
    "starter": "def days_until_drop(prices: list[int]) -> list[int]:\n    pass",
    "solution": '''
def days_until_drop(prices: list[int]) -> list[int]:
    # The stack holds days still waiting for a lower price. Their prices never
    # decrease from bottom to top, so a cheaper day resolves a run from the top.
    wait = [0] * len(prices)
    waiting: list[int] = []
    for day, price in enumerate(prices):
        while waiting and prices[waiting[-1]] > price:
            earlier = waiting.pop()
            wait[earlier] = day - earlier
        waiting.append(day)
    return wait
''',
    "naive": '''
def days_until_drop(prices: list[int]) -> list[int]:
    wait = [0] * len(prices)
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[j] < prices[i]:
                wait[i] = j - i
                break
    return wait
''',
    "random": lambda rng: [[rng.randint(1, 6) for _ in range(rng.randint(0, 9))]],
    "hints": [
        "When a low price shows up, it answers the question for several earlier days at once. Which ones?",
        "Keep the days that are still waiting. A new price resolves every waiting day whose price is higher.",
        "Use a stack of day indices. Pop while the price at the top is greater than today's, recording today minus that day.",
    ],
    "complexity": ("O(n)", "O(n)"),
    "visible": [
        ([50, 60, 55, 40, 70], [3, 1, 1, 0, 0], "Day 0 waits until day 3; days 3 and 4 never see a lower price."),
        ([9, 8, 7], [1, 1, 0]),
        ([5, 5, 5], [0, 0, 0], "An equal price is not a drop."),
    ],
    "hidden": [
        [[]],
        [[42]],
        [[1, 2, 3, 4]],
        [[3, 1, 3, 1, 3]],
        [[10, 20, 30, 5]],
        [[7, 7, 6, 7, 7, 5]],
        [list(range(1, 18_001))],
        [[R.randint(1, 1000) for _ in range(6_000)]],
    ],
})

OPS = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: int(a / b),
}


def random_receipt(rng, depth=3):
    """Expressão pós-fixa válida, sem divisão por zero."""
    def tree(d):
        if d == 0 or rng.random() < 0.3:
            v = rng.randint(-9, 9)
            return [str(v)], v
        while True:
            lt, lv = tree(d - 1)
            rt, rv = tree(d - 1)
            op = rng.choice("+-*/")
            if op == "/" and rv == 0:
                continue
            return lt + rt + [op], OPS[op](lv, rv)
    return [tree(depth)[0]]


def long_receipt(n):
    tokens = ["1"]
    for i in range(n):
        tokens += [str(R.randint(1, 9)), R.choice("+-")]
    return [tokens]


build({
    "slug": "receipt-calculator",
    "title": "Receipt Calculator",
    "difficulty": "medium",
    "unit": "stack",
    "tags": ["stack", "expression evaluation"],
    "entry": "evaluate_receipt",
    "params": [("tokens", "list[str]")],
    "returns": "int",
    "statement": """
An old cash register writes its calculations in **postfix** order: the two operands come first and the operator comes after them. For example `["2", "3", "+"]` means `2 + 3`, and `["2", "3", "4", "*", "+"]` means `2 + (3 * 4)`.

Given the list `tokens`, where each token is an integer or one of `"+"`, `"-"`, `"*"`, `"/"`, return the value of the expression.

- For `-` and `/`, the operand that appeared **first** goes on the left: `["7", "2", "-"]` is `7 - 2`.
- Division **truncates toward zero**: `7 / 2` is `3` and `-7 / 2` is `-3`.

The expression is always valid and never divides by zero.
""",
    "constraints": """
- `1 <= len(tokens) <= 100_000`
- Numbers are integers between `-1000` and `1000`, written like `"12"` or `"-3"`.
- Every intermediate result fits comfortably in a Python integer.
""",
    "starter": "def evaluate_receipt(tokens: list[str]) -> int:\n    pass",
    "solution": '''
def evaluate_receipt(tokens: list[str]) -> int:
    # Numbers wait on the stack. An operator always applies to the two most
    # recent values, and its result goes back to wait for the next operator.
    stack: list[int] = []
    for token in tokens:
        if token in ("+", "-", "*", "/"):
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                # int() truncates toward zero; // would round down instead.
                stack.append(int(left / right))
        else:
            stack.append(int(token))
    return stack[0]
''',
    "brute": '''
def evaluate_receipt(tokens):
    # reads the expression backwards, recursively
    pos = len(tokens) - 1
    def value():
        nonlocal pos
        t = tokens[pos]
        pos -= 1
        if t not in ("+", "-", "*", "/"):
            return int(t)
        right = value()
        left = value()
        if t == "+":
            return left + right
        if t == "-":
            return left - right
        if t == "*":
            return left * right
        q = abs(left) // abs(right)
        return q if (left >= 0) == (right >= 0) else -q
    return value()
''',
    "random": random_receipt,
    "hints": [
        "An operator always uses the two values that came most recently before it. Which structure gives you the most recent items?",
        "Push numbers. On an operator, pop two values, compute, and push the result back.",
        "The first value you pop is the right-hand operand. For division use int(left / right), because // rounds down for negatives.",
    ],
    "complexity": ("O(n)", "O(n)"),
    "visible": [
        (["2", "3", "4", "*", "+"], 14),
        (["7", "2", "-"], 5),
        (["-7", "2", "/"], -3, "Division truncates toward zero, so the result is `-3`, not `-4`."),
    ],
    "hidden": [
        [["42"]],
        [["-5"]],
        [["6", "3", "/", "2", "*"]],
        [["1", "2", "+", "3", "4", "+", "*"]],
        [["7", "-2", "/"]],
        [["0", "5", "-", "3", "/"]],
        [["10", "3", "/", "3", "*", "10", "3", "/", "-"]],
        long_receipt(8_000),
    ],
})

# ---------------------------------------------------------------- Binary Search

build({
    "slug": "first-row-at-least",
    "title": "First Row At Least",
    "difficulty": "easy",
    "unit": "binary-search",
    "tags": ["binary search", "lower bound"],
    "entry": "first_at_least",
    "params": [("rows", "list[int]"), ("target", "int")],
    "returns": "int",
    "statement": """
A theatre lists the row numbers that still have free seats in `rows`, sorted in non-decreasing order (a row can appear more than once).

Return the **index** of the first entry that is greater than or equal to `target`. If every entry is smaller than `target`, return `len(rows)`.
""",
    "constraints": """
- `0 <= len(rows) <= 100_000`
- `-1_000_000 <= rows[i], target <= 1_000_000`

Your solution should run in `O(log n)`.
""",
    "starter": "def first_at_least(rows: list[int], target: int) -> int:\n    pass",
    "solution": '''
def first_at_least(rows: list[int], target: int) -> int:
    # The answer is somewhere in [low, high]. high starts at len(rows) because
    # "no such entry" is a valid answer too.
    low, high = 0, len(rows)
    while low < high:
        mid = (low + high) // 2
        if rows[mid] >= target:
            high = mid          # mid could be the answer; keep it
        else:
            low = mid + 1       # mid is too small; the answer is to its right
    return low
''',
    "brute": '''
def first_at_least(rows, target):
    for i, r in enumerate(rows):
        if r >= target:
            return i
    return len(rows)
''',
    "random": lambda rng: [sorted(rng.randint(0, 9) for _ in range(rng.randint(0, 8))), rng.randint(-1, 10)],
    "hints": [
        "The list is sorted, so looking at the middle entry tells you which half can be thrown away.",
        "If rows[mid] >= target, the answer is mid or something to its left. Otherwise it is strictly to the right.",
        "Search the range [0, len(rows)] with low < high as the loop condition; when it ends, low is the answer.",
    ],
    "complexity": ("O(log n)", "O(1)"),
    "visible": [
        ([2, 4, 4, 7, 9], 4, 1),
        ([2, 4, 4, 7, 9], 5, 3),
        ([2, 4, 4, 7, 9], 10, 5, "Nothing is large enough, so the answer is the length of the list."),
    ],
    "hidden": [
        [[], 3],
        [[5], 5],
        [[5], 6],
        [[5], 4],
        [[1, 1, 1, 1], 1],
        [[-5, -3, 0, 3], -4],
        [[1, 3, 5, 7, 9, 11], 0],
        [list(range(0, 16_000, 2)), 9_457],
    ],
})


def rotated(rng, n):
    values = sorted(rng.sample(range(0, 60), n))
    k = rng.randrange(n) if n else 0
    return values[k:] + values[:k]


BIG_SHELF = (lambda v: v[3_000:] + v[:3_000])(list(range(3, 24_000, 3)))

build({
    "slug": "rotated-shelf",
    "title": "Rotated Shelf",
    "difficulty": "medium",
    "unit": "binary-search",
    "tags": ["binary search", "rotated array"],
    "entry": "find_on_shelf",
    "params": [("shelf", "list[int]"), ("code", "int")],
    "returns": "int",
    "statement": """
Books on a circular shelf are arranged by increasing catalog code, all codes different. Someone spun the shelf, so the list `shelf` now starts somewhere in the middle of the sequence and wraps around: for example `[20, 30, 40, 5, 10]`.

Return the index of the book with catalog code `code`, or `-1` if it is not on the shelf.
""",
    "constraints": """
- `0 <= len(shelf) <= 100_000`
- All codes are different and between `0` and `1_000_000`.
- `shelf` is a sorted list rotated by some number of positions (possibly zero).

Your solution should run in `O(log n)`.
""",
    "starter": "def find_on_shelf(shelf: list[int], code: int) -> int:\n    pass",
    "solution": '''
def find_on_shelf(shelf: list[int], code: int) -> int:
    # Cut the range in two: at least one half is in plain sorted order.
    # In a sorted half we can tell for sure whether the code lies inside it.
    low, high = 0, len(shelf) - 1
    while low <= high:
        mid = (low + high) // 2
        if shelf[mid] == code:
            return mid
        if shelf[low] <= shelf[mid]:                # left half is sorted
            if shelf[low] <= code < shelf[mid]:
                high = mid - 1
            else:
                low = mid + 1
        else:                                       # right half is sorted
            if shelf[mid] < code <= shelf[high]:
                low = mid + 1
            else:
                high = mid - 1
    return -1
''',
    "brute": '''
def find_on_shelf(shelf, code):
    return shelf.index(code) if code in shelf else -1
''',
    "random": lambda rng: [rotated(rng, rng.randint(0, 8)), rng.randint(0, 60)],
    "hints": [
        "Split the range at the middle. Even though the whole shelf is rotated, one of the two halves is always fully sorted.",
        "You can tell which half is sorted by comparing shelf[low] with shelf[mid].",
        "In the sorted half, check whether code lies between its two ends. If so search there; otherwise search the other half.",
    ],
    "complexity": ("O(log n)", "O(1)"),
    "visible": [
        ([20, 30, 40, 5, 10], 5, 3),
        ([20, 30, 40, 5, 10], 30, 1),
        ([20, 30, 40, 5, 10], 25, -1),
    ],
    "hidden": [
        [[], 1],
        [[7], 7],
        [[7], 8],
        [[1, 2, 3, 4, 5], 4],
        [[2, 1], 1],
        [[2, 1], 2],
        [[5, 6, 7, 1, 2, 3, 4], 4],
        [[5, 6, 7, 1, 2, 3, 4], 0],
        [BIG_SHELF, 3],
        [BIG_SHELF, 14_444],
    ],
})

build({
    "slug": "print-speed",
    "title": "Print Speed",
    "difficulty": "medium",
    "unit": "binary-search",
    "tags": ["binary search on the answer"],
    "entry": "min_print_speed",
    "params": [("jobs", "list[int]"), ("hours", "int")],
    "returns": "int",
    "statement": """
A print shop has a queue of jobs; `jobs[i]` is the number of pages of job `i`. The printer has a speed dial: at speed `s` it prints up to `s` pages per hour.

Each hour the printer works on **one** job only. If a job finishes before the hour is over, the printer idles until the next hour starts.

Everything must be printed within `hours` hours. Return the **smallest** whole-number speed that makes it possible.
""",
    "constraints": """
- `1 <= len(jobs) <= 10_000`
- `1 <= jobs[i] <= 1_000_000_000`
- `len(jobs) <= hours <= 1_000_000_000`
""",
    "starter": "def min_print_speed(jobs: list[int], hours: int) -> int:\n    pass",
    "solution": '''
def min_print_speed(jobs: list[int], hours: int) -> int:
    def fits(speed: int) -> bool:
        # A job of p pages takes ceil(p / speed) whole hours.
        return sum((pages + speed - 1) // speed for pages in jobs) <= hours

    # If a speed works, every faster speed works too. So the speeds go
    # "no, no, ..., no, yes, yes, ..." and we binary search for the first yes.
    low, high = 1, max(jobs)
    while low < high:
        mid = (low + high) // 2
        if fits(mid):
            high = mid
        else:
            low = mid + 1
    return low
''',
    "brute": '''
def min_print_speed(jobs, hours):
    speed = 1
    while sum(-(-p // speed) for p in jobs) > hours:
        speed += 1
    return speed
''',
    "random": lambda rng: (lambda j: [j, rng.randint(len(j), len(j) + 8)])([rng.randint(1, 20) for _ in range(rng.randint(1, 6))]),
    "hints": [
        "Trying every speed from 1 upward is too slow. But notice: if some speed is fast enough, every higher speed is too.",
        "That makes the answer the boundary between speeds that fail and speeds that work. You can binary search for a boundary.",
        "Search speeds in [1, max(jobs)]. For a candidate speed, the hours needed are the sum of ceil(pages / speed) over all jobs.",
    ],
    "complexity": ("O(n log M), M = largest job", "O(1)"),
    "visible": [
        ([30, 11, 23, 4], 6, 15, "At speed 15 the jobs take `2 + 1 + 2 + 1 = 6` hours. At speed 14 they would take 7."),
        ([10, 10, 10], 3, 10),
        ([7], 100, 1),
    ],
    "hidden": [
        [[1], 1],
        [[9], 2],
        [[5, 5, 5, 5], 8],
        [[1, 1, 1, 1000], 4],
        [[1, 1, 1, 1000], 13],
        [[1_000_000_000, 1], 2],
        [[R.randint(1, 1_000_000_000) for _ in range(4_000)], 9_000],
    ],
})

# ---------------------------------------------------------------- Linked List

build({
    "slug": "middle-of-the-queue",
    "title": "Middle of the Queue",
    "difficulty": "easy",
    "unit": "linked-list",
    "tags": ["linked list", "fast and slow pointers"],
    "entry": "middle_track",
    "params": [("head", "ListNode")],
    "returns": "ListNode",
    "statement": """
A music queue is stored as a singly linked list. You want to jump to the middle of it.

Given the `head` of the queue, return the **middle node**. The list shown as output starts at that node. If the queue has an even number of tracks there are two middle nodes: return the **second** one.

Lists are shown as arrays from head to tail.
""",
    "constraints": """
- The queue has between `1` and `50_000` tracks.
- `-10_000 <= node.val <= 10_000`

**Follow-up:** can you find the middle in a single pass, without counting the tracks first?
""",
    "starter": LIST_NODE_NOTE + '''

def middle_track(head: "ListNode") -> "ListNode":
    pass''',
    "solution": '''
def middle_track(head: "ListNode") -> "ListNode":
    # `fast` moves two nodes for every one that `slow` moves.
    # When `fast` runs off the end, `slow` has covered half the list.
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow
''',
    "brute": '''
def middle_track(head):
    nodes = []
    while head is not None:
        nodes.append(head)
        head = head.next
    return nodes[len(nodes) // 2]
''',
    "random": lambda rng: [[rng.randint(0, 9) for _ in range(rng.randint(1, 9))]],
    "hints": [
        "Counting the nodes first and then walking half of them works, but takes two passes.",
        "Imagine two runners on the list, one twice as fast as the other. Where is the slow one when the fast one finishes?",
        "Advance slow by one and fast by two while fast and fast.next exist. Return slow.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        ([4, 8, 15, 16, 23], [15, 16, 23]),
        ([1, 2, 3, 4], [3, 4], "Two middle nodes (2 and 3): the second one is returned."),
        ([7], [7]),
    ],
    "hidden": [
        [[1, 2]],
        [[1, 2, 3]],
        [[5, 5, 5, 5, 5, 5]],
        [[-1, -2, -3, -4, -5, -6, -7]],
        [list(range(3_999))],
        [list(range(4_000))],
    ],
})

build({
    "slug": "merge-two-setlists",
    "title": "Merge Two Setlists",
    "difficulty": "medium",
    "unit": "linked-list",
    "tags": ["linked list", "merge", "dummy node"],
    "entry": "merge_setlists",
    "params": [("first", "ListNode"), ("second", "ListNode")],
    "returns": "ListNode",
    "statement": """
Two DJs each prepared a setlist ordered by tempo, from slowest to fastest. Each setlist is a singly linked list whose values are tempos in non-decreasing order.

Merge the two setlists into **one** list that is still ordered by tempo, and return its head. Build the result by re-linking the existing nodes.

Lists are shown as arrays from head to tail; an empty setlist is `[]` (your function receives `None`).
""",
    "constraints": """
- Each setlist has between `0` and `25_000` tracks.
- `0 <= node.val <= 1_000`
- Both lists are sorted in non-decreasing order.
""",
    "starter": LIST_NODE_NOTE + '''

def merge_setlists(first: "ListNode | None", second: "ListNode | None") -> "ListNode | None":
    pass''',
    "solution": '''
def merge_setlists(first: "ListNode | None", second: "ListNode | None") -> "ListNode | None":
    # A dummy node in front means the first real node needs no special case.
    dummy = ListNode()
    tail = dummy
    while first is not None and second is not None:
        if first.val <= second.val:
            tail.next = first
            first = first.next
        else:
            tail.next = second
            second = second.next
        tail = tail.next
    # One list ran out; whatever is left of the other is already in order.
    tail.next = first if first is not None else second
    return dummy.next
''',
    "brute": '''
def merge_setlists(first, second):
    values = []
    for node in (first, second):
        while node is not None:
            values.append(node.val)
            node = node.next
    dummy = ListNode()
    tail = dummy
    for v in sorted(values):
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next
''',
    "random": lambda rng: [sorted(rng.randint(0, 9) for _ in range(rng.randint(0, 6))), sorted(rng.randint(0, 9) for _ in range(rng.randint(0, 6)))],
    "hints": [
        "At every step the next node of the result is the smaller of the two current heads.",
        "Keep a `tail` pointer to the last node of the merged list and attach the smaller head to it.",
        "Start from a dummy node so the first attachment is not a special case; when one list ends, attach the rest of the other.",
    ],
    "complexity": ("O(n + m)", "O(1)"),
    "visible": [
        ([90, 120, 128], [100, 120, 140], [90, 100, 120, 120, 128, 140]),
        ([], [80, 95], [80, 95]),
        ([110], [], [110]),
    ],
    "hidden": [
        [[], []],
        [[1], [1]],
        [[1, 2, 3], [4, 5, 6]],
        [[4, 5, 6], [1, 2, 3]],
        [[1, 1, 1], [1, 1]],
        [[1, 9], [2, 3, 4, 5, 6, 7, 8]],
        [sorted(R.randint(0, 1000) for _ in range(6_000)), sorted(R.randint(0, 1000) for _ in range(6_000))],
    ],
})
