A game keeps every score ever recorded in the list `scores`, in no particular order. The leaderboard shows only the best `k`.

Return the `k` highest scores, from highest to lowest. Repeated scores count separately.

### Example 1

```
Input:  scores = [40, 95, 60, 95, 10], k = 3
Output: [95, 95, 60]
```

### Example 2

```
Input:  scores = [7, 3], k = 2
Output: [7, 3]
```

### Example 3

```
Input:  scores = [5, 1, 9, 2], k = 1
Output: [9]
```

### Constraints

- `1 <= k <= len(scores) <= 100_000`
- `0 <= scores[i] <= 1_000_000`

**Follow-up:** sorting everything takes `O(n log n)`. When `k` is much smaller than `n`, can you do it in `O(n log k)`?
