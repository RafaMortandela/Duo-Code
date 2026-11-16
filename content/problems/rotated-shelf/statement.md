Books on a circular shelf are arranged by increasing catalog code, all codes different. Someone spun the shelf, so the list `shelf` now starts somewhere in the middle of the sequence and wraps around: for example `[20, 30, 40, 5, 10]`.

Return the index of the book with catalog code `code`, or `-1` if it is not on the shelf.

### Example 1

```
Input:  shelf = [20, 30, 40, 5, 10], code = 5
Output: 3
```

### Example 2

```
Input:  shelf = [20, 30, 40, 5, 10], code = 30
Output: 1
```

### Example 3

```
Input:  shelf = [20, 30, 40, 5, 10], code = 25
Output: -1
```

### Constraints

- `0 <= len(shelf) <= 100_000`
- All codes are different and between `0` and `1_000_000`.
- `shelf` is a sorted list rotated by some number of positions (possibly zero).

Your solution should run in `O(log n)`.
