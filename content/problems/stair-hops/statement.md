A staircase has `n` steps. On each move you can hop up `1`, `2` or `3` steps.

Return the number of different sequences of hops that take you from the ground exactly to step `n`.

### Example 1

```
Input:  n = 3
Output: 4
```

The routes are `1+1+1`, `1+2`, `2+1` and `3`.

### Example 2

```
Input:  n = 1
Output: 1
```

### Example 3

```
Input:  n = 4
Output: 7
```

### Constraints

- `1 <= n <= 60`

The answer grows quickly: trying every sequence one by one will not finish in time for large `n`.
