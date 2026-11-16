A library stores its catalog numbers in a binary tree that is supposed to be a **binary search tree**, so lookups are fast. For that to hold, at **every** node:

- every number in its left subtree is **strictly smaller** than the node's number;
- every number in its right subtree is **strictly larger**.

Given the `root`, return `True` if the tree is a valid binary search tree and `False` otherwise. An empty tree is valid.

Trees are shown level by level with `None` where a child is missing.

### Example 1

```
Input:  root = [8, 3, 10, 1, 6, None, 14]
Output: True
```

### Example 2

```
Input:  root = [5, 1, 8, None, None, 3, 9]
Output: False
```

The `3` is in the right subtree of `5`, but it is smaller than `5`.

### Example 3

```
Input:  root = [2, 2, 3]
Output: False
```

Equal numbers are not allowed.

### Constraints

- The tree has between `0` and `10_000` nodes.
- Its height is at most `500`.
- `-1_000_000 <= node.val <= 1_000_000`
