A theatre lists the row numbers that still have free seats in `rows`, sorted in non-decreasing order (a row can appear more than once).

Return the **index** of the first entry that is greater than or equal to `target`. If every entry is smaller than `target`, return `len(rows)`.

### Example 1

```
Input:  rows = [2, 4, 4, 7, 9], target = 4
Output: 1
```

### Example 2

```
Input:  rows = [2, 4, 4, 7, 9], target = 5
Output: 3
```

### Example 3

```
Input:  rows = [2, 4, 4, 7, 9], target = 10
Output: 5
```

Nothing is large enough, so the answer is the length of the list.

### Constraints

- `0 <= len(rows) <= 100_000`
- `-1_000_000 <= rows[i], target <= 1_000_000`

Your solution should run in `O(log n)`.
