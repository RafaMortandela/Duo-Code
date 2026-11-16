Your fitness tracker recorded how many steps you took each day in the list `steps`. Return the largest total number of steps over any `k` **consecutive** days.

### Example 1

```
Input:  steps = [4, 2, 9, 7, 1, 8], k = 3
Output: 18
```

Days 2 to 4 give `2 + 9 + 7 = 18`.

### Example 2

```
Input:  steps = [5, 5, 5], k = 1
Output: 5
```

### Example 3

```
Input:  steps = [1, 2, 3, 4], k = 4
Output: 10
```

### Constraints

- `1 <= k <= len(steps) <= 100_000`
- `0 <= steps[i] <= 100_000`
