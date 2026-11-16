"""Arrays & Hashing, Two Pointers, Sliding Window."""

import random
import string

from lib import build

R = random.Random(2026)

# ---------------------------------------------------------------- Arrays & Hashing

WORDS = ["rose", "sage", "navy", "plum", "teal", "gold", "onyx", "lime", "ruby", "mint"]

build({
    "slug": "wardrobe-favorite",
    "title": "Wardrobe Favorite",
    "difficulty": "easy",
    "unit": "arrays-hashing",
    "tags": ["hash map", "counting"],
    "entry": "favorite_color",
    "params": [("colors", "list[str]")],
    "returns": "str",
    "statement": """
You keep a diary of the main color you wore each day. Given the list `colors`, return the color you wore **most often**.

If several colors are tied for first place, return the one that comes first alphabetically.
""",
    "constraints": """
- `1 <= len(colors) <= 100_000`
- Each color is a non-empty string of lowercase letters.
""",
    "starter": "def favorite_color(colors: list[str]) -> str:\n    pass",
    "solution": '''
def favorite_color(colors: list[str]) -> str:
    # One pass to count, one pass over the distinct colors to pick the winner.
    counts: dict[str, int] = {}
    for color in colors:
        counts[color] = counts.get(color, 0) + 1
    # Highest count first; among equals, the alphabetically smallest name.
    return min(counts, key=lambda color: (-counts[color], color))
''',
    "brute": '''
def favorite_color(colors):
    best = None
    for c in sorted(set(colors)):
        if best is None or colors.count(c) > colors.count(best):
            best = c
    return best
''',
    "random": lambda rng: [[rng.choice(WORDS[: rng.randint(1, 5)]) for _ in range(rng.randint(1, 12))]],
    "hints": [
        "You need to know how many times each color appears. What structure maps a color to a number?",
        "Count everything in one pass with a dictionary, then look only at the distinct colors.",
        "To break ties, compare by (-count, name): the largest count wins, then the smallest name.",
    ],
    "complexity": ("O(n)", "O(k), k = distinct colors"),
    "visible": [
        (["rose", "navy", "rose", "sage", "navy", "rose"], "rose"),
        (["teal", "plum", "plum", "teal"], "plum", "Both appear twice; `plum` comes first alphabetically."),
        (["gold"], "gold"),
    ],
    "hidden": [
        [["mint", "lime", "ruby"]],
        [["onyx"] * 7],
        [["sage", "rose"] * 50 + ["sage"]],
        [["b", "a", "c", "a", "b", "c"]],
        [["zz", "z", "zz", "z", "zzz"]],
        [[R.choice(WORDS) for _ in range(10_000)]],
    ],
})

build({
    "slug": "scrambled-labels",
    "title": "Scrambled Labels",
    "difficulty": "medium",
    "unit": "arrays-hashing",
    "tags": ["hash map", "canonical key", "sorting"],
    "entry": "group_labels",
    "params": [("labels", "list[str]")],
    "returns": "list[list[str]]",
    "statement": """
A label printer went haywire and shuffled the letters of every label it printed. Two labels belong to the same product when one can be rearranged into the other, using every letter exactly once.

Given the list `labels`, group together the labels of the same product.

To make the answer unique:

- sort the labels **inside each group** alphabetically;
- order the **groups** by their first label.

Repeated labels are kept (they appear as many times as in the input).
""",
    "constraints": """
- `1 <= len(labels) <= 10_000`
- `0 <= len(labels[i]) <= 30`
- Labels contain only lowercase letters.
""",
    "starter": "def group_labels(labels: list[str]) -> list[list[str]]:\n    pass",
    "solution": '''
def group_labels(labels: list[str]) -> list[list[str]]:
    # Two labels are the same product exactly when their sorted letters match,
    # so the sorted letters work as a dictionary key for the group.
    groups: dict[str, list[str]] = {}
    for label in labels:
        key = "".join(sorted(label))
        groups.setdefault(key, []).append(label)
    # Lists compare element by element, so sorting the groups orders them by first label.
    return sorted(sorted(group) for group in groups.values())
''',
    "brute": '''
def group_labels(labels):
    groups = []
    for label in labels:
        for g in groups:
            if sorted(g[0]) == sorted(label):
                g.append(label)
                break
        else:
            groups.append([label])
    return sorted(sorted(g) for g in groups)
''',
    "random": lambda rng: [["".join(rng.choice("abc") for _ in range(rng.randint(0, 3))) for _ in range(rng.randint(1, 8))]],
    "hints": [
        "You need something that is identical for two labels exactly when they are rearrangements of each other.",
        "The letters of a label in sorted order are such a signature. Use it as a dictionary key.",
        "Append each label to groups[signature]. At the end sort each group, then sort the list of groups.",
    ],
    "complexity": ("O(n * L log L)", "O(n * L)"),
    "visible": [
        (["tea", "ate", "bat", "eat", "tab"], [["ate", "eat", "tea"], ["bat", "tab"]]),
        (["one", "two", "neo"], [["neo", "one"], ["two"]]),
        (["aa", "aa"], [["aa", "aa"]], "Repeated labels stay in the group."),
    ],
    "hidden": [
        [["solo"]],
        [[""]],
        [["", "a", ""]],
        [["ab", "ba", "abc", "cab", "bca", "a"]],
        [["listen", "silent", "enlist", "tinsel", "google", "elgoog"]],
        [["".join(R.choice("abc") for _ in range(6)) for _ in range(4_000)]],
    ],
})

# ---------------------------------------------------------------- Two Pointers

build({
    "slug": "mirror-caption",
    "title": "Mirror Caption",
    "difficulty": "easy",
    "unit": "two-pointers",
    "tags": ["two pointers", "string"],
    "entry": "is_mirror",
    "params": [("caption", "str")],
    "returns": "bool",
    "statement": """
A photo caption is a *mirror caption* if it reads the same forwards and backwards once you ignore everything that is not a letter or a digit, and treat uppercase and lowercase as equal.

Given the string `caption`, return `True` if it is a mirror caption and `False` otherwise.

A caption with no letters or digits at all counts as a mirror caption.
""",
    "constraints": """
- `0 <= len(caption) <= 200_000`
- `caption` contains only printable ASCII characters.

**Follow-up:** can you do it without building a cleaned-up copy of the string?
""",
    "starter": "def is_mirror(caption: str) -> bool:\n    pass",
    "solution": '''
def is_mirror(caption: str) -> bool:
    # One pointer walks in from each end. Each skips what does not count,
    # then the two characters they land on must match.
    left, right = 0, len(caption) - 1
    while left < right:
        if not caption[left].isalnum():
            left += 1
        elif not caption[right].isalnum():
            right -= 1
        elif caption[left].lower() != caption[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True
''',
    "brute": '''
def is_mirror(caption):
    kept = [c.lower() for c in caption if c.isalnum()]
    return kept == kept[::-1]
''',
    "random": lambda rng: ["".join(rng.choice("aAbB1 ,!") for _ in range(rng.randint(0, 7)))],
    "hints": [
        "Comparing the first counted character with the last, then the second with the second-to-last, is all you need.",
        "Keep one index at each end and move them toward each other.",
        "When an index points at something that is not a letter or digit, advance just that index and compare again.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        ("Was it a car or a cat I saw?", True),
        ("Brunch at noon", False),
        ("", True),
    ],
    "hidden": [
        ["a"],
        ["?!... "],
        ["0P"],
        ["No lemon, no melon"],
        ["ab_a"],
        ["Aa"],
        ["x" * 10_000 + "y" + "x" * 10_000],
        ["x" * 10_000 + "yz" + "x" * 10_000],
    ],
})

build({
    "slug": "sold-out-to-the-back",
    "title": "Sold Out to the Back",
    "difficulty": "easy",
    "unit": "two-pointers",
    "tags": ["two pointers", "in-place"],
    "entry": "push_sold_out",
    "params": [("stock", "list[int]")],
    "returns": "list[int]",
    "statement": """
A shop shelf is described by the list `stock`, where `stock[i]` is how many units of product `i` are left. A `0` means the product is sold out.

Rearrange the shelf **in place** so that every sold-out product goes to the back, while the products that are still available keep their original relative order. Return the same list.
""",
    "constraints": """
- `0 <= len(stock) <= 100_000`
- `0 <= stock[i] <= 1_000_000`

**Follow-up:** do it with `O(1)` extra space and a single pass.
""",
    "starter": "def push_sold_out(stock: list[int]) -> list[int]:\n    pass",
    "solution": '''
def push_sold_out(stock: list[int]) -> list[int]:
    # `write` is where the next available product belongs. Everything before it
    # is already in its final place.
    write = 0
    for read in range(len(stock)):
        if stock[read] != 0:
            stock[write], stock[read] = stock[read], stock[write]
            write += 1
    return stock
''',
    "brute": '''
def push_sold_out(stock):
    kept = [x for x in stock if x != 0]
    return kept + [0] * (len(stock) - len(kept))
''',
    "random": lambda rng: [[rng.choice([0, 0, 1, 2, 3]) for _ in range(rng.randint(0, 8))]],
    "hints": [
        "Think of two positions: where you are reading, and where the next available product should be written.",
        "The write position only advances when you place an available product there.",
        "Swapping stock[write] with stock[read] moves the product forward and pushes a zero back in one step.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        ([3, 0, 5, 0, 0, 2], [3, 5, 2, 0, 0, 0]),
        ([0, 0, 7], [7, 0, 0]),
        ([4, 1], [4, 1]),
    ],
    "hidden": [
        [[]],
        [[0]],
        [[9]],
        [[0, 0, 0, 0]],
        [[1, 2, 3, 0]],
        [[0, 1, 0, 2, 0, 3, 0]],
        [[R.choice([0, 0, 1, 5, 9]) for _ in range(20_000)]],
    ],
})

build({
    "slug": "duet-budget",
    "title": "Duet Budget",
    "difficulty": "medium",
    "unit": "two-pointers",
    "tags": ["two pointers", "sorted array", "counting"],
    "entry": "count_duets",
    "params": [("prices", "list[int]"), ("budget", "int")],
    "returns": "int",
    "statement": """
Two friends want to buy one concert ticket each and split a shared `budget`. The list `prices` holds the price of every available ticket, **sorted from cheapest to most expensive**.

Return how many different pairs of tickets they could buy, that is, the number of pairs of positions `i < j` with `prices[i] + prices[j] <= budget`.
""",
    "constraints": """
- `0 <= len(prices) <= 100_000`
- `1 <= prices[i] <= 1_000_000`, in non-decreasing order
- `0 <= budget <= 2_000_000`
""",
    "starter": "def count_duets(prices: list[int], budget: int) -> int:\n    pass",
    "solution": '''
def count_duets(prices: list[int], budget: int) -> int:
    # Cheapest on the left, priciest on the right.
    # If that pair fits, the cheapest also fits with every ticket in between,
    # so we count them all at once and are done with the cheapest.
    # If it does not fit, the priciest fits with nobody: drop it.
    pairs = 0
    left, right = 0, len(prices) - 1
    while left < right:
        if prices[left] + prices[right] <= budget:
            pairs += right - left
            left += 1
        else:
            right -= 1
    return pairs
''',
    "naive": '''
def count_duets(prices: list[int], budget: int) -> int:
    pairs = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[i] + prices[j] <= budget:
                pairs += 1
    return pairs
''',
    "random": lambda rng: [sorted(rng.randint(1, 9) for _ in range(rng.randint(0, 8))), rng.randint(0, 18)],
    "hints": [
        "The list is sorted. Look at the cheapest and the most expensive ticket together: what does their sum tell you?",
        "If cheapest + priciest fits, the cheapest ticket fits with every ticket between them too. Count them in one step.",
        "If it does not fit, the priciest ticket cannot pair with anything left. Move that pointer inward and repeat.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        ([20, 35, 50, 80], 90, 3, "The pairs are (20, 35), (20, 50) and (35, 50)."),
        ([10, 10, 10], 20, 3),
        ([40, 60], 99, 0),
    ],
    "hidden": [
        [[], 10],
        [[5], 100],
        [[1, 2, 3, 4, 5], 0],
        [[1, 2, 3, 4, 5], 100],
        [[3, 3, 3, 3], 5],
        [[1, 1, 2, 2, 9], 3],
        [sorted(R.randint(1, 9_999) for _ in range(24_000)), 9_999],
    ],
})

# ---------------------------------------------------------------- Sliding Window

build({
    "slug": "best-k-day-stretch",
    "title": "Best K-Day Stretch",
    "difficulty": "easy",
    "unit": "sliding-window",
    "tags": ["sliding window", "fixed size"],
    "entry": "best_stretch",
    "params": [("steps", "list[int]"), ("k", "int")],
    "returns": "int",
    "statement": """
Your fitness tracker recorded how many steps you took each day in the list `steps`. Return the largest total number of steps over any `k` **consecutive** days.
""",
    "constraints": """
- `1 <= k <= len(steps) <= 100_000`
- `0 <= steps[i] <= 100_000`
""",
    "starter": "def best_stretch(steps: list[int], k: int) -> int:\n    pass",
    "solution": '''
def best_stretch(steps: list[int], k: int) -> int:
    # Total of the first window, then slide it one day at a time:
    # the new day enters, the day that fell off the back leaves.
    window = sum(steps[:k])
    best = window
    for day in range(k, len(steps)):
        window += steps[day] - steps[day - k]
        best = max(best, window)
    return best
''',
    "naive": '''
def best_stretch(steps: list[int], k: int) -> int:
    best = 0
    for start in range(len(steps) - k + 1):
        total = 0
        for day in range(start, start + k):
            total += steps[day]
        best = max(best, total)
    return best
''',
    "random": lambda rng: (lambda s: [s, rng.randint(1, len(s))])([rng.randint(0, 9) for _ in range(rng.randint(1, 8))]),
    "hints": [
        "Two neighbouring windows of k days share k - 1 days. You do not need to add them up again.",
        "Moving the window one day forward changes the total by: plus the day that enters, minus the day that leaves.",
        "Compute the first window with sum(steps[:k]), then update it for each later day and track the maximum.",
    ],
    "complexity": ("O(n)", "O(1)"),
    "visible": [
        ([4, 2, 9, 7, 1, 8], 3, 18, "Days 2 to 4 give `2 + 9 + 7 = 18`."),
        ([5, 5, 5], 1, 5),
        ([1, 2, 3, 4], 4, 10),
    ],
    "hidden": [
        [[7], 1],
        [[0, 0, 0, 0], 2],
        [[9, 1, 1, 1, 9], 2],
        [[1, 1, 1, 1, 50], 2],
        [[50, 1, 1, 1, 1], 3],
        [[R.randint(0, 99) for _ in range(30_000)], 15_000],
    ],
})

build({
    "slug": "fresh-playlist-run",
    "title": "Fresh Playlist Run",
    "difficulty": "medium",
    "unit": "sliding-window",
    "tags": ["sliding window", "hash map", "variable size"],
    "entry": "longest_fresh_run",
    "params": [("songs", "list[int]")],
    "returns": "int",
    "statement": """
A radio station logs the id of every song it plays in the list `songs`. A *fresh run* is a stretch of consecutive plays in which **no song is repeated**.

Return the length of the longest fresh run.
""",
    "constraints": """
- `0 <= len(songs) <= 100_000`
- `0 <= songs[i] <= 1_000_000`
""",
    "starter": "def longest_fresh_run(songs: list[int]) -> int:\n    pass",
    "solution": '''
def longest_fresh_run(songs: list[int]) -> int:
    # The window [start, i] never contains a repeat.
    # When song i was already played inside the window, the window has to
    # restart right after that earlier play.
    last_played: dict[int, int] = {}
    start = 0
    best = 0
    for i, song in enumerate(songs):
        if song in last_played and last_played[song] >= start:
            start = last_played[song] + 1
        last_played[song] = i
        best = max(best, i - start + 1)
    return best
''',
    "brute": '''
def longest_fresh_run(songs):
    best = 0
    for i in range(len(songs)):
        for j in range(i, len(songs)):
            if len(set(songs[i:j + 1])) == j - i + 1:
                best = max(best, j - i + 1)
    return best
''',
    "random": lambda rng: [[rng.randint(0, 4) for _ in range(rng.randint(0, 9))]],
    "hints": [
        "Grow a window to the right one play at a time. When does it stop being fresh?",
        "It breaks exactly when the new song is already inside the window. Then the left edge has to jump past the earlier play.",
        "Remember the last index of each song in a dictionary. Only move the left edge if that index is inside the current window.",
    ],
    "complexity": ("O(n)", "O(k), k = distinct songs"),
    "visible": [
        ([3, 7, 3, 5, 9, 7], 4, "The run `3, 5, 9, 7` has four different songs."),
        ([8, 8, 8], 1),
        ([1, 2, 3], 3),
    ],
    "hidden": [
        [[]],
        [[4]],
        [[1, 2, 1, 2, 1]],
        [[1, 2, 3, 1, 2, 3, 4]],
        [[5, 1, 5, 2, 5, 3, 5]],
        [[2, 2, 3, 4, 3]],
        [[R.randint(0, 999) for _ in range(20_000)]],
    ],
})

build({
    "slug": "flavor-basket",
    "title": "Flavor Basket",
    "difficulty": "medium",
    "unit": "sliding-window",
    "tags": ["sliding window", "hash map", "at most k distinct"],
    "entry": "longest_basket",
    "params": [("flavors", "list[int]"), ("k", "int")],
    "returns": "int",
    "statement": """
A row of candy jars is described by the list `flavors`, where `flavors[i]` is the flavor of jar `i`. You walk along the row taking one candy from each jar of a **consecutive** stretch, but your basket can hold at most `k` different flavors.

Return the largest number of candies you can take.
""",
    "constraints": """
- `0 <= len(flavors) <= 100_000`
- `0 <= flavors[i] <= 1_000_000`
- `1 <= k <= 100_000`
""",
    "starter": "def longest_basket(flavors: list[int], k: int) -> int:\n    pass",
    "solution": '''
def longest_basket(flavors: list[int], k: int) -> int:
    # Grow the window to the right. While it holds more than k flavors,
    # shrink it from the left until one flavor disappears completely.
    in_basket: dict[int, int] = {}
    start = 0
    best = 0
    for end, flavor in enumerate(flavors):
        in_basket[flavor] = in_basket.get(flavor, 0) + 1
        while len(in_basket) > k:
            leaving = flavors[start]
            in_basket[leaving] -= 1
            if in_basket[leaving] == 0:
                del in_basket[leaving]
            start += 1
        best = max(best, end - start + 1)
    return best
''',
    "brute": '''
def longest_basket(flavors, k):
    best = 0
    for i in range(len(flavors)):
        for j in range(i, len(flavors)):
            if len(set(flavors[i:j + 1])) <= k:
                best = max(best, j - i + 1)
    return best
''',
    "random": lambda rng: [[rng.randint(0, 4) for _ in range(rng.randint(0, 9))], rng.randint(1, 4)],
    "hints": [
        "Keep a window and the count of each flavor inside it.",
        "Add the next jar on the right. If the window now has more than k flavors, remove jars from the left until it is valid again.",
        "A flavor leaves the basket only when its count reaches zero: delete the key then, so len(counts) is the number of flavors.",
    ],
    "complexity": ("O(n)", "O(k)"),
    "visible": [
        ([1, 2, 1, 2, 3, 3], 2, 4, "Jars 0 to 3 hold only flavors 1 and 2."),
        ([4, 4, 4, 4], 1, 4),
        ([1, 2, 3, 4], 2, 2),
    ],
    "hidden": [
        [[], 3],
        [[7], 1],
        [[1, 2, 3], 5],
        [[1, 2, 1, 3, 1, 2, 1], 2],
        [[5, 5, 6, 7, 7, 7, 8], 2],
        [[1, 2, 3, 2, 2, 2, 1, 1], 1],
        [[R.randint(0, 30) for _ in range(20_000)], 5],
    ],
})
