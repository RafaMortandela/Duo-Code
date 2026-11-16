"""Graphs, Dynamic Programming."""

import random

from lib import build

R = random.Random(2029)


def random_grid(rng, max_side=5, wall=0.4, open_ends=False):
    rows, cols = rng.randint(1, max_side), rng.randint(1, max_side)
    grid = [[1 if rng.random() < wall else 0 for _ in range(cols)] for _ in range(rows)]
    if open_ends:
        grid[0][0] = grid[-1][-1] = 0
    return grid


def snake(side):
    """Grade com um único corredor em zigue-zague: um componente muito comprido."""
    grid = [[0] * side for _ in range(side)]
    for r in range(side):
        if r % 2 == 0:
            grid[r] = [1] * side
        else:
            grid[r][side - 1 if (r // 2) % 2 == 0 else 0] = 1
    return grid


# ---------------------------------------------------------------- Graphs

build({
    "slug": "count-the-blobs",
    "title": "Count the Blobs",
    "difficulty": "medium",
    "unit": "graphs",
    "tags": ["grid", "flood fill", "connected components"],
    "entry": "count_blobs",
    "params": [("image", "list[list[int]]")],
    "returns": "int",
    "statement": """
A black-and-white image is given as a grid `image`, where `1` is an inked pixel and `0` is blank. A **blob** is a group of inked pixels connected to each other horizontally or vertically (diagonals do not connect).

Return the number of blobs in the image.

> Grids can be as large as 60 × 60. A recursive flood fill can exceed Python's recursion limit on a long, winding blob. Consider an explicit stack or a queue.
""",
    "constraints": """
- `1 <= len(image) <= 60` and `1 <= len(image[0]) <= 60`
- Every row has the same length.
- `image[r][c]` is `0` or `1`.
""",
    "starter": "def count_blobs(image: list[list[int]]) -> int:\n    pass",
    "solution": '''
def count_blobs(image: list[list[int]]) -> int:
    rows, cols = len(image), len(image[0])
    seen = [[False] * cols for _ in range(rows)]
    blobs = 0
    for r in range(rows):
        for c in range(cols):
            if image[r][c] == 0 or seen[r][c]:
                continue
            # An inked pixel nobody has reached yet: it starts a new blob.
            # Flood from it, marking every pixel of the same blob.
            blobs += 1
            seen[r][c] = True
            stack = [(r, c)]
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and image[ny][nx] == 1 and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
    return blobs
''',
    "brute": '''
def count_blobs(image):
    # union-find over the inked pixels
    rows, cols = len(image), len(image[0])
    parent = {(r, c): (r, c) for r in range(rows) for c in range(cols) if image[r][c]}
    def find(p):
        while parent[p] != p:
            p = parent[p]
        return p
    for (r, c) in list(parent):
        for q in ((r + 1, c), (r, c + 1)):
            if q in parent:
                parent[find((r, c))] = find(q)
    return len({find(p) for p in parent})
''',
    "random": lambda rng: [random_grid(rng, wall=0.55)],
    "hints": [
        "Scan the grid. The first time you meet an inked pixel that you have not visited, you have found a new blob.",
        "Before moving on, visit every pixel connected to it, so the rest of that blob is not counted again.",
        "Keep a `seen` grid. From each new pixel, flood with a stack or queue over the four neighbours, marking as you push.",
    ],
    "complexity": ("O(rows * cols)", "O(rows * cols)"),
    "visible": [
        ([[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1], [1, 0, 0, 0]], 3),
        ([[1, 0], [0, 1]], 2, "Diagonal pixels are not connected."),
        ([[0, 0, 0]], 0),
    ],
    "hidden": [
        [[[1]]],
        [[[0]]],
        [[[1, 1, 1], [1, 1, 1]]],
        [[[1, 0, 1, 0, 1]]],
        [[[1], [0], [1], [1]]],
        [[[1, 1, 1], [1, 0, 1], [1, 1, 1]]],
        [snake(60)],
        [[[1] * 60 for _ in range(60)]],
        [[[(r + c) % 2 for c in range(60)] for r in range(60)]],
    ],
})


def random_rules(rng):
    n = rng.randint(1, 6)
    rules = []
    for _ in range(rng.randint(0, 7)):
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            rules.append([a, b])
    return [n, rules]


def layered(n, layers):
    """DAG grande: cada tarefa depende de uma tarefa de camada anterior."""
    rules = []
    size = n // layers
    for t in range(size, n):
        layer = t // size
        before = R.randrange((layer - 1) * size, layer * size)
        rules.append([before, t])
    R.shuffle(rules)
    return [n, rules]


build({
    "slug": "launch-order",
    "title": "Launch Order",
    "difficulty": "medium",
    "unit": "graphs",
    "tags": ["topological sort", "directed graph", "heap"],
    "entry": "launch_order",
    "params": [("n", "int"), ("rules", "list[list[int]]")],
    "returns": "list[int]",
    "statement": """
A product launch has `n` tasks, numbered `0` to `n - 1`. Some tasks have to be finished before others: each rule `[a, b]` means task `a` must be done **before** task `b`.

Return an order in which all tasks can be done. To make the answer unique, whenever several tasks are ready at the same time, do the one with the **smallest number** first.

If the rules contradict each other and no valid order exists, return an empty list.
""",
    "constraints": """
- `1 <= n <= 10_000`
- `0 <= len(rules) <= 30_000`
- `0 <= a, b < n` and `a != b`. The same rule may appear more than once.
""",
    "starter": "def launch_order(n: int, rules: list[list[int]]) -> list[int]:\n    pass",
    "solution": '''
import heapq


def launch_order(n: int, rules: list[list[int]]) -> list[int]:
    # blockers[t]: how many tasks still have to be done before t.
    after: list[list[int]] = [[] for _ in range(n)]
    blockers = [0] * n
    for a, b in rules:
        after[a].append(b)
        blockers[b] += 1

    # A task is ready when nothing blocks it. The heap hands out the
    # smallest-numbered ready task, as the statement asks.
    ready = [task for task in range(n) if blockers[task] == 0]
    heapq.heapify(ready)
    order: list[int] = []
    while ready:
        task = heapq.heappop(ready)
        order.append(task)
        for nxt in after[task]:
            blockers[nxt] -= 1
            if blockers[nxt] == 0:
                heapq.heappush(ready, nxt)

    # Tasks caught in a cycle never become ready.
    return order if len(order) == n else []
''',
    "brute": '''
from itertools import permutations


def launch_order(n, rules):
    # permutations() yields tuples in lexicographic order, so the first valid
    # one is the order that always picks the smallest ready task.
    for order in permutations(range(n)):
        position = {task: i for i, task in enumerate(order)}
        if all(position[a] < position[b] for a, b in rules):
            return list(order)
    return []
''',
    "random": random_rules,
    "hints": [
        "A task can start once every task that must come before it is done. Count, for each task, how many are still pending.",
        "Tasks with a count of zero are ready. Doing one lowers the count of the tasks that were waiting for it.",
        "Keep the ready tasks in a min-heap to always take the smallest. If fewer than n tasks come out, there was a cycle.",
    ],
    "complexity": ("O((n + r) log n)", "O(n + r)"),
    "visible": [
        (4, [[2, 0], [2, 1], [1, 3]], [2, 0, 1, 3], "Only task 2 is ready at first. Then 0 and 1 are ready and 0 goes first."),
        (3, [], [0, 1, 2]),
        (2, [[0, 1], [1, 0]], [], "Each task waits for the other, so there is no valid order."),
    ],
    "hidden": [
        [1, []],
        [3, [[2, 1], [1, 0]]],
        [3, [[0, 1], [0, 1], [1, 2]]],
        [4, [[0, 1], [1, 2], [2, 0]]],
        [5, [[4, 0], [3, 0], [0, 1]]],
        [6, [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]]],
        layered(2_400, 12),
        (lambda big: [big[0], big[1] + [[2_399, 0]]])(layered(2_400, 12)),
    ],
})


def maze(side, seed):
    rng = random.Random(seed)
    grid = [[1 if rng.random() < 0.32 else 0 for _ in range(side)] for _ in range(side)]
    grid[0][0] = grid[-1][-1] = 0
    return grid


def sealed(side):
    """Saída cercada por duas camadas de parede: nem quebrando uma dá para chegar."""
    grid = [[0] * side for _ in range(side)]
    for i in range(side):
        for layer in (side - 3, side - 4):
            grid[layer][i] = 1
    return grid


build({
    "slug": "one-wall-escape",
    "title": "One Wall Escape",
    "difficulty": "hard",
    "unit": "graphs",
    "tags": ["breadth-first search", "shortest path", "state space"],
    "entry": "shortest_escape",
    "params": [("room", "list[list[int]]")],
    "returns": "int",
    "statement": """
An escape room is a grid `room` where `0` is free floor and `1` is a wall. You start in the top-left cell and the exit is the bottom-right cell; both are always free.

Each move takes you one cell up, down, left or right. You carry a hammer that can break **at most one** wall: stepping into a wall cell uses the hammer, and from then on you can only walk on free floor.

Return the smallest number of moves needed to reach the exit, or `-1` if it cannot be reached even with the hammer.
""",
    "constraints": """
- `1 <= len(room) <= 40` and `1 <= len(room[0]) <= 40`
- Every row has the same length.
- `room[0][0]` and the bottom-right cell are `0`.
""",
    "starter": "def shortest_escape(room: list[list[int]]) -> int:\n    pass",
    "solution": '''
from collections import deque


def shortest_escape(room: list[list[int]]) -> int:
    rows, cols = len(room), len(room[0])
    # Being in a cell with the hammer is a different situation from being in
    # the same cell without it. So a BFS state is (row, col, hammer used?).
    seen = [[[False, False] for _ in range(cols)] for _ in range(rows)]
    seen[0][0][0] = True
    queue = deque([(0, 0, 0, 0)])  # row, col, used, moves
    while queue:
        r, c, used, moves = queue.popleft()
        if r == rows - 1 and c == cols - 1:
            return moves  # BFS reaches every state by a shortest path first
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            next_used = used + room[nr][nc]
            if next_used > 1 or seen[nr][nc][next_used]:
                continue
            seen[nr][nc][next_used] = True
            queue.append((nr, nc, next_used, moves + 1))
    return -1
''',
    "brute": '''
from collections import deque


def shortest_escape(room):
    # plain BFS, tried once without the hammer and once per removable wall
    rows, cols = len(room), len(room[0])

    def plain(grid):
        dist = {(0, 0): 0}
        queue = deque([(0, 0)])
        while queue:
            r, c = queue.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in dist:
                    dist[(nr, nc)] = dist[(r, c)] + 1
                    queue.append((nr, nc))
        return dist.get((rows - 1, cols - 1))

    answers = [plain(room)]
    for r in range(rows):
        for c in range(cols):
            if room[r][c] == 1:
                room[r][c] = 0
                answers.append(plain(room))
                room[r][c] = 1
    found = [a for a in answers if a is not None]
    return min(found) if found else -1
''',
    "random": lambda rng: [random_grid(rng, max_side=5, wall=0.45, open_ends=True)],
    "hints": [
        "Without the hammer this is a standard shortest path on a grid: breadth-first search.",
        "With the hammer, the same cell can be worth visiting twice: once still holding the hammer and once after using it.",
        "Run BFS over states (row, col, hammer used). Moving into a wall is allowed only from a state where the hammer is unused.",
    ],
    "complexity": ("O(rows * cols)", "O(rows * cols)"),
    "visible": [
        ([[0, 1, 0], [0, 1, 0], [0, 0, 0]], 4, "The walls are not in the way: down, down, right, right."),
        ([[0, 1, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 1, 0]], 6, "Walking around takes 10 moves. Breaking the wall at row 2, column 3 gives a path of 6."),
        ([[0, 1, 1, 0]], -1, "Two walls in a row cannot both be broken."),
    ],
    "hidden": [
        [[[0]]],
        [[[0, 0]]],
        [[[0, 1, 0]]],
        [[[0], [1], [1], [0]]],
        [[[0, 0, 0], [1, 1, 1], [0, 0, 0]]],
        [[[0, 0, 0], [1, 1, 1], [1, 1, 1], [0, 0, 0]]],
        [[[0, 1, 1, 1], [0, 1, 0, 0], [0, 0, 0, 1], [1, 1, 0, 0]]],
        [maze(40, 1)],
        [maze(40, 2)],
        [sealed(40)],
        [[[0] * 40 for _ in range(40)]],
    ],
})

# ---------------------------------------------------------------- Dynamic Programming

build({
    "slug": "stair-hops",
    "title": "Stair Hops",
    "difficulty": "easy",
    "unit": "dynamic-programming",
    "tags": ["dynamic programming", "1D"],
    "entry": "count_routes",
    "params": [("n", "int")],
    "returns": "int",
    "statement": """
A staircase has `n` steps. On each move you can hop up `1`, `2` or `3` steps.

Return the number of different sequences of hops that take you from the ground exactly to step `n`.
""",
    "constraints": """
- `1 <= n <= 60`

The answer grows quickly: trying every sequence one by one will not finish in time for large `n`.
""",
    "starter": "def count_routes(n: int) -> int:\n    pass",
    "solution": '''
def count_routes(n: int) -> int:
    # The last hop onto step i came from i-1, i-2 or i-3, so
    #   routes(i) = routes(i-1) + routes(i-2) + routes(i-3).
    # Only the last three values are ever needed.
    a, b, c = 0, 0, 1  # routes(-2), routes(-1), routes(0): one way to stand still
    for _ in range(n):
        a, b, c = b, c, a + b + c
    return c
''',
    "naive": '''
def count_routes(n: int) -> int:
    if n < 0:
        return 0
    if n == 0:
        return 1
    return count_routes(n - 1) + count_routes(n - 2) + count_routes(n - 3)
''',
    "random": lambda rng: [rng.randint(1, 16)],
    "hints": [
        "Think about the very last hop. From which steps could it have started?",
        "From n-1, n-2 or n-3. So the number of routes to n is the sum of the routes to those three steps.",
        "Compute the answers from the bottom up, keeping only the last three, so nothing is recomputed.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        (3, 4, "The routes are `1+1+1`, `1+2`, `2+1` and `3`."),
        (1, 1),
        (4, 7),
    ],
    "hidden": [
        [2],
        [5],
        [10],
        [20],
        [36],
        [50],
        [60],
    ],
})

build({
    "slug": "exact-change",
    "title": "Exact Change",
    "difficulty": "medium",
    "unit": "dynamic-programming",
    "tags": ["dynamic programming", "unbounded knapsack"],
    "entry": "fewest_coins",
    "params": [("coins", "list[int]"), ("amount", "int")],
    "returns": "int",
    "statement": """
A vending machine has an unlimited supply of coins of the values listed in `coins`. It must give back exactly `amount` in change.

Return the **fewest** coins that add up to exactly `amount`, or `-1` if no combination of the available coins does.
""",
    "constraints": """
- `1 <= len(coins) <= 12`
- `1 <= coins[i] <= 10_000`, all different
- `0 <= amount <= 5_000`

Always taking the largest coin that fits does **not** work in general: try `coins = [1, 5, 6]`, `amount = 10`.
""",
    "starter": "def fewest_coins(coins: list[int], amount: int) -> int:\n    pass",
    "solution": '''
def fewest_coins(coins: list[int], amount: int) -> int:
    # fewest[x] = fewest coins that add up to exactly x (infinity if impossible).
    # To make x, the last coin was some c, and before it we had made x - c.
    unreachable = float("inf")
    fewest = [0] + [unreachable] * amount
    for x in range(1, amount + 1):
        for coin in coins:
            if coin <= x and fewest[x - coin] + 1 < fewest[x]:
                fewest[x] = fewest[x - coin] + 1
    return -1 if fewest[amount] == unreachable else fewest[amount]
''',
    "brute": '''
from collections import deque


def fewest_coins(coins, amount):
    # breadth-first over reachable totals: the level is the number of coins
    seen = {0}
    queue = deque([(0, 0)])
    while queue:
        total, used = queue.popleft()
        if total == amount:
            return used
        for c in coins:
            if total + c <= amount and total + c not in seen:
                seen.add(total + c)
                queue.append((total + c, used + 1))
    return -1
''',
    "random": lambda rng: [rng.sample(range(1, 12), rng.randint(1, 4)), rng.randint(0, 40)],
    "hints": [
        "Taking the biggest coin first can fail. You need to consider every coin as a possible last coin.",
        "If the last coin is c, the rest of the change is the best way to make amount - c. That is the same problem, smaller.",
        "Fill a table fewest[0..amount] from small to large: fewest[x] = 1 + min(fewest[x - c]) over the coins c that fit.",
    ],
    "complexity": ("O(amount * len(coins))", "O(amount)"),
    "visible": [
        ([1, 5, 6], 10, 2, "`5 + 5`. Starting with the 6 would need `6 + 1 + 1 + 1 + 1`, five coins."),
        ([4, 7], 5, -1),
        ([2], 0, 0, "Nothing to give back, so no coins."),
    ],
    "hidden": [
        [[1], 1],
        [[3], 9],
        [[3], 10],
        [[2, 5, 10], 3],
        [[1, 3, 4], 6],
        [[9, 6, 5, 1], 11],
        [[186, 419, 83, 408], 4_999],
        [[1, 7, 13, 29, 71, 113, 250, 499], 5_000],
    ],
})


def random_words(rng):
    def word():
        return "".join(rng.choice("abc") for _ in range(rng.randint(0, 6)))
    return [word(), word()]


def long_word(n):
    return "".join(R.choice("abcd") for _ in range(n))


build({
    "slug": "typo-fix-cost",
    "title": "Typo Fix Cost",
    "difficulty": "hard",
    "unit": "dynamic-programming",
    "tags": ["dynamic programming", "two sequences", "edit distance"],
    "entry": "fix_cost",
    "params": [("typed", "str"), ("intended", "str")],
    "returns": "int",
    "statement": """
An autocorrect engine measures how far what you `typed` is from the word you `intended`. In one edit it can:

- **insert** one character anywhere,
- **delete** one character, or
- **replace** one character with another.

Return the smallest number of edits that turns `typed` into `intended`.
""",
    "constraints": """
- `0 <= len(typed), len(intended) <= 300`
- Both strings contain only lowercase letters.
""",
    "starter": "def fix_cost(typed: str, intended: str) -> int:\n    pass",
    "solution": '''
def fix_cost(typed: str, intended: str) -> int:
    # cost[j] = edits to turn the first i characters of `typed` into the first
    # j characters of `intended`. Row i only needs row i-1, so one row is kept.
    cost = list(range(len(intended) + 1))  # from an empty prefix: j insertions
    for i in range(1, len(typed) + 1):
        diagonal = cost[0]  # value for (i-1, j-1)
        cost[0] = i         # to an empty target: i deletions
        for j in range(1, len(intended) + 1):
            above = cost[j]  # value for (i-1, j), before it is overwritten
            if typed[i - 1] == intended[j - 1]:
                cost[j] = diagonal                      # last characters agree: free
            else:
                cost[j] = 1 + min(diagonal,             # replace
                                  above,                # delete from typed
                                  cost[j - 1])          # insert into typed
            diagonal = above
    return cost[-1]
''',
    "naive": '''
def fix_cost(typed: str, intended: str) -> int:
    if not typed:
        return len(intended)
    if not intended:
        return len(typed)
    if typed[-1] == intended[-1]:
        return fix_cost(typed[:-1], intended[:-1])
    return 1 + min(
        fix_cost(typed[:-1], intended[:-1]),
        fix_cost(typed[:-1], intended),
        fix_cost(typed, intended[:-1]),
    )
''',
    "random": random_words,
    "hints": [
        "Compare the last characters. If they are equal, they cost nothing and you can drop both.",
        "If they differ, the last edit is a replace, a delete or an insert, each leaving a smaller pair of prefixes to fix.",
        "Fill a table cost[i][j] for prefixes of length i and j, with cost[i][0] = i and cost[0][j] = j. Plain recursion repeats the same prefixes exponentially.",
    ],
    "complexity": ("O(n * m)", "O(m)"),
    "visible": [
        ("kitten", "sitting", 3, "Replace `k` with `s`, replace `e` with `i`, insert `g`."),
        ("flaw", "lawn", 2),
        ("", "abc", 3),
    ],
    "hidden": [
        ["", ""],
        ["a", ""],
        ["same", "same"],
        ["abc", "cba"],
        ["sunday", "saturday"],
        ["aaaa", "bbbbbb"],
        ["abcdefghijklmnop", "qrstuvwxyzabcdef"],
        [long_word(300), long_word(300)],
        [long_word(300), long_word(40)],
    ],
})
