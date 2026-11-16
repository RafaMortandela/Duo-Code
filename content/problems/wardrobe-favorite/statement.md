You keep a diary of the main color you wore each day. Given the list `colors`, return the color you wore **most often**.

If several colors are tied for first place, return the one that comes first alphabetically.

### Example 1

```
Input:  colors = ["rose", "navy", "rose", "sage", "navy", "rose"]
Output: "rose"
```

### Example 2

```
Input:  colors = ["teal", "plum", "plum", "teal"]
Output: "plum"
```

Both appear twice; `plum` comes first alphabetically.

### Example 3

```
Input:  colors = ["gold"]
Output: "gold"
```

### Constraints

- `1 <= len(colors) <= 100_000`
- Each color is a non-empty string of lowercase letters.
