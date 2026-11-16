Given the `root` of a binary tree, return its **height**: the number of nodes on the longest path from the root down to a leaf. An empty tree has height `0`.

Trees are shown level by level, left to right, with `None` where a child is missing. So `[3, 9, 20, None, None, 15, 7]` is a root `3` with children `9` and `20`, and `20` has children `15` and `7`.

### Example 1

```
Input:  root = [3, 9, 20, None, None, 15, 7]
Output: 3
```

### Example 2

```
Input:  root = [1, None, 2]
Output: 2
```

### Example 3

```
Input:  root = []
Output: 0
```

### Constraints

- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000 <= node.val <= 1_000`
