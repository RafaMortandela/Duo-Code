Two DJs each prepared a setlist ordered by tempo, from slowest to fastest. Each setlist is a singly linked list whose values are tempos in non-decreasing order.

Merge the two setlists into **one** list that is still ordered by tempo, and return its head. Build the result by re-linking the existing nodes.

Lists are shown as arrays from head to tail; an empty setlist is `[]` (your function receives `None`).

### Example 1

```
Input:  first = [90, 120, 128], second = [100, 120, 140]
Output: [90, 100, 120, 120, 128, 140]
```

### Example 2

```
Input:  first = [], second = [80, 95]
Output: [80, 95]
```

### Example 3

```
Input:  first = [110], second = []
Output: [110]
```

### Constraints

- Each setlist has between `0` and `25_000` tracks.
- `0 <= node.val <= 1_000`
- Both lists are sorted in non-decreasing order.
