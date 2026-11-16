"""Trees, Heap."""

import random

from lib import TREE_NODE_NOTE, build, harness

R = random.Random(2028)
TreeNode = harness.TreeNode


def to_array(root):
    return harness.tree_to_array(root)


def random_tree(rng, n, values=None):
    """Árvore aleatória de n nós, como array em ordem de nível."""
    if n == 0:
        return []
    nodes = [TreeNode(values() if values else rng.randint(0, 9))]
    for _ in range(n - 1):
        while True:
            parent = rng.choice(nodes)
            side = rng.choice(["left", "right"])
            if getattr(parent, side) is None:
                child = TreeNode(values() if values else rng.randint(0, 9))
                setattr(parent, side, child)
                nodes.append(child)
                break
    return to_array(nodes[0])


def chain(n, side="left"):
    """Árvore degenerada de altura n."""
    root = TreeNode(1)
    node = root
    for i in range(2, n + 1):
        setattr(node, side, TreeNode(i))
        node = getattr(node, side)
    return to_array(root)


def bst_from(keys):
    root = None
    for k in keys:
        if root is None:
            root = TreeNode(k)
            continue
        node = root
        while True:
            side = "left" if k < node.val else "right"
            if getattr(node, side) is None:
                setattr(node, side, TreeNode(k))
                break
            node = getattr(node, side)
    return root


def random_bst(rng, n, corrupt):
    keys = rng.sample(range(0, 40), n)
    arr = to_array(bst_from(keys))
    if corrupt and n >= 2:
        slots = [i for i, v in enumerate(arr) if v is not None]
        i = rng.choice(slots)
        arr[i] = rng.randint(0, 40)
    return arr


FULL = list(range(1, 4096))  # árvore completa de 12 níveis

# ---------------------------------------------------------------- Trees

build({
    "slug": "tallest-branch",
    "title": "Tallest Branch",
    "difficulty": "easy",
    "unit": "trees",
    "tags": ["binary tree", "depth-first search", "recursion"],
    "entry": "tree_height",
    "params": [("root", "TreeNode")],
    "returns": "int",
    "statement": """
Given the `root` of a binary tree, return its **height**: the number of nodes on the longest path from the root down to a leaf. An empty tree has height `0`.

Trees are shown level by level, left to right, with `None` where a child is missing. So `[3, 9, 20, None, None, 15, 7]` is a root `3` with children `9` and `20`, and `20` has children `15` and `7`.
""",
    "constraints": """
- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000 <= node.val <= 1_000`
""",
    "starter": TREE_NODE_NOTE + '''

def tree_height(root: "TreeNode | None") -> int:
    pass''',
    "solution": '''
def tree_height(root: "TreeNode | None") -> int:
    # The height of a tree is one (the root itself) plus the height of its
    # taller side. An empty tree contributes nothing.
    if root is None:
        return 0
    return 1 + max(tree_height(root.left), tree_height(root.right))
''',
    "brute": '''
def tree_height(root):
    # counts levels with a queue instead of recursion
    level = [root] if root is not None else []
    height = 0
    while level:
        height += 1
        level = [c for n in level for c in (n.left, n.right) if c is not None]
    return height
''',
    "random": lambda rng: [random_tree(rng, rng.randint(0, 9))],
    "hints": [
        "If you already knew the height of the left subtree and of the right subtree, what would the height of the whole tree be?",
        "It is 1 + max(left height, right height). That is a recursive definition.",
        "The recursion stops at a missing child: an empty tree has height 0.",
    ],
    "complexity": ("O(n)", "O(h), h = height"),
    "visible": [
        ([3, 9, 20, None, None, 15, 7], 3),
        ([1, None, 2], 2),
        ([], 0),
    ],
    "hidden": [
        [[5]],
        [[1, 2, 3, 4, 5, 6, 7]],
        [[1, 2, None, 3, None, 4]],
        [chain(400, "left")],
        [chain(400, "right")],
        [FULL],
        [random_tree(R, 3_000)],
    ],
})

build({
    "slug": "floor-by-floor",
    "title": "Floor by Floor",
    "difficulty": "medium",
    "unit": "trees",
    "tags": ["binary tree", "breadth-first search", "queue"],
    "entry": "floors",
    "params": [("root", "TreeNode")],
    "returns": "list[list[int]]",
    "statement": """
An organisation chart is stored as a binary tree: the root is the director, its children report to it, and so on.

Given the `root`, return the values **floor by floor**: one list per level of the tree, from the top down, each level listed from left to right. An empty tree gives an empty list.

Trees are shown level by level with `None` where a child is missing.
""",
    "constraints": """
- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000 <= node.val <= 1_000`
""",
    "starter": TREE_NODE_NOTE + '''

def floors(root: "TreeNode | None") -> list[list[int]]:
    pass''',
    "solution": '''
from collections import deque


def floors(root: "TreeNode | None") -> list[list[int]]:
    if root is None:
        return []
    result: list[list[int]] = []
    queue = deque([root])
    while queue:
        # Everything in the queue right now is exactly one floor.
        floor = []
        for _ in range(len(queue)):
            node = queue.popleft()
            floor.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(floor)
    return result
''',
    "brute": '''
def floors(root):
    # depth-first, filing each value under its depth
    out = []
    def visit(node, depth):
        if node is None:
            return
        if depth == len(out):
            out.append([])
        out[depth].append(node.val)
        visit(node.left, depth + 1)
        visit(node.right, depth + 1)
    visit(root, 0)
    return out
''',
    "random": lambda rng: [random_tree(rng, rng.randint(0, 9))],
    "hints": [
        "Visiting a tree level by level is breadth-first search, and breadth-first search uses a queue.",
        "The difficulty is knowing where one floor ends. Look at how many nodes are in the queue before you start a floor.",
        "Take len(queue) at the start of each round and process exactly that many nodes, adding their children for the next round.",
    ],
    "complexity": ("O(n)", "O(w), w = widest floor"),
    "visible": [
        ([3, 9, 20, None, None, 15, 7], [[3], [9, 20], [15, 7]]),
        ([1, None, 2, 3], [[1], [2], [3]]),
        ([], []),
    ],
    "hidden": [
        [[8]],
        [[1, 2, 3, 4, 5, 6, 7]],
        [[1, 2, 3, None, 4, 5, None]],
        [chain(300, "right")],
        [list(range(1, 1024))],
        [random_tree(R, 2_500)],
    ],
})

build({
    "slug": "catalog-check",
    "title": "Catalog Check",
    "difficulty": "medium",
    "unit": "trees",
    "tags": ["binary search tree", "depth-first search", "bounds"],
    "entry": "is_valid_catalog",
    "params": [("root", "TreeNode")],
    "returns": "bool",
    "statement": """
A library stores its catalog numbers in a binary tree that is supposed to be a **binary search tree**, so lookups are fast. For that to hold, at **every** node:

- every number in its left subtree is **strictly smaller** than the node's number;
- every number in its right subtree is **strictly larger**.

Given the `root`, return `True` if the tree is a valid binary search tree and `False` otherwise. An empty tree is valid.

Trees are shown level by level with `None` where a child is missing.
""",
    "constraints": """
- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000_000 <= node.val <= 1_000_000`
""",
    "starter": TREE_NODE_NOTE + '''

def is_valid_catalog(root: "TreeNode | None") -> bool:
    pass''',
    "solution": '''
def is_valid_catalog(root: "TreeNode | None") -> bool:
    # Comparing a node only with its own children is not enough: a value deep
    # in the left subtree must still be smaller than the root. So each node
    # carries the open interval (low, high) it is allowed to be in.
    def within(node, low, high) -> bool:
        if node is None:
            return True
        if (low is not None and node.val <= low) or (high is not None and node.val >= high):
            return False
        return within(node.left, low, node.val) and within(node.right, node.val, high)

    return within(root, None, None)
''',
    "brute": '''
def is_valid_catalog(root):
    # in-order traversal of a BST is strictly increasing
    values = []
    def walk(node):
        if node is not None:
            walk(node.left)
            values.append(node.val)
            walk(node.right)
    walk(root)
    return all(a < b for a, b in zip(values, values[1:]))
''',
    "random": lambda rng: [random_bst(rng, rng.randint(0, 8), rng.random() < 0.6)],
    "hints": [
        "Checking left child < node < right child at every node is not enough. Try [5, 1, 8, None, None, 3, 9].",
        "Every node must respect all of its ancestors, which amounts to an allowed range (low, high) for its value.",
        "Going left narrows the upper limit to the current value; going right raises the lower limit. Pass both limits down the recursion.",
    ],
    "complexity": ("O(n)", "O(h), h = height"),
    "visible": [
        ([8, 3, 10, 1, 6, None, 14], True),
        ([5, 1, 8, None, None, 3, 9], False, "The `3` is in the right subtree of `5`, but it is smaller than `5`."),
        ([2, 2, 3], False, "Equal numbers are not allowed."),
    ],
    "hidden": [
        [[]],
        [[7]],
        [[2, 1, 3]],
        [[1, 2, 3]],
        [[10, 5, 15, None, None, 6, 20]],
        [[3, 1, 5, 0, 4]],
        [[5, 5]],
        [chain(400, "right")],
        [to_array(bst_from(R.sample(range(100_000), 3_000)))],
        [(lambda a: a[:-1] + [0])(to_array(bst_from(R.sample(range(1, 100_000), 3_000))))],
    ],
})

# ---------------------------------------------------------------- Heap

build({
    "slug": "top-scores",
    "title": "Top Scores",
    "difficulty": "medium",
    "unit": "heap",
    "tags": ["heap", "top k"],
    "entry": "top_scores",
    "params": [("scores", "list[int]"), ("k", "int")],
    "returns": "list[int]",
    "statement": """
A game keeps every score ever recorded in the list `scores`, in no particular order. The leaderboard shows only the best `k`.

Return the `k` highest scores, from highest to lowest. Repeated scores count separately.
""",
    "constraints": """
- `1 <= k <= len(scores) <= 100_000`
- `0 <= scores[i] <= 1_000_000`

**Follow-up:** sorting everything takes `O(n log n)`. When `k` is much smaller than `n`, can you do it in `O(n log k)`?
""",
    "starter": "def top_scores(scores: list[int], k: int) -> list[int]:\n    pass",
    "solution": '''
import heapq


def top_scores(scores: list[int], k: int) -> list[int]:
    # A min-heap that never grows past k holds the k best scores seen so far.
    # Its smallest element is the entry bar: a new score has to beat it.
    best: list[int] = []
    for score in scores:
        if len(best) < k:
            heapq.heappush(best, score)
        elif score > best[0]:
            heapq.heapreplace(best, score)
    return sorted(best, reverse=True)
''',
    "brute": '''
def top_scores(scores, k):
    return sorted(scores, reverse=True)[:k]
''',
    "random": lambda rng: (lambda s: [s, rng.randint(1, len(s))])([rng.randint(0, 9) for _ in range(rng.randint(1, 9))]),
    "hints": [
        "You only ever need to remember k scores. Which of them is the first to be thrown out when a better one arrives?",
        "The smallest of the kept scores. A min-heap gives you the smallest element instantly.",
        "Keep a min-heap of size k: push while it is not full, otherwise replace the top when the new score is larger. Sort the heap at the end.",
    ],
    "complexity": ("O(n log k)", "O(k)"),
    "visible": [
        ([40, 95, 60, 95, 10], 3, [95, 95, 60]),
        ([7, 3], 2, [7, 3]),
        ([5, 1, 9, 2], 1, [9]),
    ],
    "hidden": [
        [[4], 1],
        [[1, 2, 3, 4, 5], 5],
        [[5, 4, 3, 2, 1], 2],
        [[8, 8, 8, 8], 3],
        [[0, 0, 1], 2],
        [[R.randint(0, 1_000_000) for _ in range(12_000)], 50],
    ],
})

build({
    "slug": "merge-the-timelines",
    "title": "Merge the Timelines",
    "difficulty": "medium",
    "unit": "heap",
    "tags": ["heap", "k-way merge"],
    "entry": "merge_timelines",
    "params": [("timelines", "list[list[int]]")],
    "returns": "list[int]",
    "statement": """
You follow several accounts, and each one gives you its posts as a list of timestamps in non-decreasing order. `timelines[i]` is the list for account `i`.

Merge them all into a single feed: one list with every timestamp, in non-decreasing order.
""",
    "constraints": """
- `0 <= len(timelines) <= 1_000`
- `0 <= len(timelines[i]) <= 10_000`
- The total number of timestamps is at most `100_000`.
- `0 <= timelines[i][j] <= 1_000_000_000`, each list in non-decreasing order.

**Follow-up:** with `k` lists and `n` timestamps in total, aim for `O(n log k)`.
""",
    "starter": "def merge_timelines(timelines: list[list[int]]) -> list[int]:\n    pass",
    "solution": '''
import heapq


def merge_timelines(timelines: list[list[int]]) -> list[int]:
    # The next post of the feed is always the earliest among the "front" post
    # of each account. A heap holds one front per account:
    # (timestamp, which account, position inside that account's list).
    heap = [(posts[0], i, 0) for i, posts in enumerate(timelines) if posts]
    heapq.heapify(heap)
    feed: list[int] = []
    while heap:
        timestamp, account, position = heapq.heappop(heap)
        feed.append(timestamp)
        if position + 1 < len(timelines[account]):
            following = timelines[account][position + 1]
            heapq.heappush(heap, (following, account, position + 1))
    return feed
''',
    "brute": '''
def merge_timelines(timelines):
    return sorted(t for posts in timelines for t in posts)
''',
    "random": lambda rng: [[sorted(rng.randint(0, 9) for _ in range(rng.randint(0, 4))) for _ in range(rng.randint(0, 5))]],
    "hints": [
        "At any moment, the next timestamp of the feed is the smallest among the first unused timestamp of each account.",
        "Finding the smallest among k candidates over and over is what a min-heap is for.",
        "Keep one entry per account in the heap: (timestamp, account index, position). After popping, push that account's next timestamp.",
    ],
    "complexity": ("O(n log k)", "O(k)"),
    "visible": [
        ([[1, 4, 9], [2, 4], [3]], [1, 2, 3, 4, 4, 9]),
        ([[], [5, 6], []], [5, 6]),
        ([], []),
    ],
    "hidden": [
        [[[]]],
        [[[7]]],
        [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
        [[[7, 8, 9], [4, 5, 6], [1, 2, 3]]],
        [[[1, 1], [1, 1], [1]]],
        [[[i] for i in range(50, 0, -1)]],
        [[sorted(R.randint(0, 100_000) for _ in range(40)) for _ in range(250)]],
    ],
})

build({
    "slug": "running-median",
    "title": "Running Median",
    "difficulty": "hard",
    "unit": "heap",
    "tags": ["heap", "two heaps", "streaming"],
    "entry": "running_medians",
    "params": [("values", "list[int]")],
    "returns": "list[float]",
    "comparator": "float",
    "statement": """
A sensor sends one reading at a time. After **each** reading arrives you must report the median of all readings received so far.

The median is the middle value once the readings are sorted. With an even number of readings it is the average of the two middle values.

Given the list `values` in arrival order, return the list of medians, one per reading, as floats.
""",
    "constraints": """
- `0 <= len(values) <= 50_000`
- `-1_000_000 <= values[i] <= 1_000_000`

Sorting everything again after each reading is too slow. Aim for `O(log n)` per reading.
""",
    "starter": "def running_medians(values: list[int]) -> list[float]:\n    pass",
    "solution": '''
import heapq


def running_medians(values: list[int]) -> list[float]:
    # Split the readings into a lower half and an upper half.
    #   low:  max-heap (stored negated) with the smaller half
    #   high: min-heap with the larger half
    # low is allowed exactly zero or one element more than high, so the
    # median is always sitting at the top of one or both heaps.
    low: list[int] = []
    high: list[int] = []
    medians: list[float] = []
    for value in values:
        if not low or value <= -low[0]:
            heapq.heappush(low, -value)
        else:
            heapq.heappush(high, value)
        # Restore the size rule by moving one element across.
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))

        if len(low) > len(high):
            medians.append(float(-low[0]))
        else:
            medians.append((-low[0] + high[0]) / 2)
    return medians
''',
    "brute": '''
def running_medians(values):
    out = []
    for i in range(1, len(values) + 1):
        s = sorted(values[:i])
        mid = i // 2
        out.append(float(s[mid]) if i % 2 else (s[mid - 1] + s[mid]) / 2)
    return out
''',
    "random": lambda rng: [[rng.randint(-9, 9) for _ in range(rng.randint(0, 10))]],
    "hints": [
        "The median only depends on the one or two values in the middle. You do not need the rest fully sorted.",
        "Keep the smaller half and the larger half separately. The median sits at the boundary: the largest of the small half and the smallest of the large half.",
        "Use a max-heap for the lower half and a min-heap for the upper half, and rebalance after each insert so their sizes differ by at most one.",
    ],
    "complexity": ("O(n log n)", "O(n)"),
    "visible": [
        ([5, 3, 8, 1], [5.0, 4.0, 5.0, 4.0], "After `5, 3` the median is `(3 + 5) / 2 = 4.0`; after `5, 3, 8, 1` it is `(3 + 5) / 2 = 4.0`."),
        ([2, 2, 2], [2.0, 2.0, 2.0]),
        ([10, 20], [10.0, 15.0]),
    ],
    "hidden": [
        [[]],
        [[7]],
        [[1, 2, 3, 4, 5, 6]],
        [[6, 5, 4, 3, 2, 1]],
        [[-5, 5, -5, 5]],
        [[1, 2]],
        [[0, 0, 1, 1, 0]],
        [[R.randint(-1_000_000, 1_000_000) for _ in range(5_000)]],
    ],
})
