An organisation chart is stored as a binary tree: the root is the director, its children report to it, and so on.

Given the `root`, return the values **floor by floor**: one list per level of the tree, from the top down, each level listed from left to right. An empty tree gives an empty list.

Trees are shown level by level with `None` where a child is missing.

### Example 1

```
Input:  root = [3, 9, 20, None, None, 15, 7]
Output: [[3], [9, 20], [15, 7]]
```

### Example 2

```
Input:  root = [1, None, 2, 3]
Output: [[1], [2], [3]]
```

### Example 3

```
Input:  root = []
Output: []
```

### Constraints

- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000 <= node.val <= 1_000`
