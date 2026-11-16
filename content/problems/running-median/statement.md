A sensor sends one reading at a time. After **each** reading arrives you must report the median of all readings received so far.

The median is the middle value once the readings are sorted. With an even number of readings it is the average of the two middle values.

Given the list `values` in arrival order, return the list of medians, one per reading, as floats.

### Example 1

```
Input:  values = [5, 3, 8, 1]
Output: [5.0, 4.0, 5.0, 4.0]
```

After `5, 3` the median is `(3 + 5) / 2 = 4.0`; after `5, 3, 8, 1` it is `(3 + 5) / 2 = 4.0`.

### Example 2

```
Input:  values = [2, 2, 2]
Output: [2.0, 2.0, 2.0]
```

### Example 3

```
Input:  values = [10, 20]
Output: [10.0, 15.0]
```

### Constraints

- `0 <= len(values) <= 50_000`
- `-1_000_000 <= values[i] <= 1_000_000`

Sorting everything again after each reading is too slow. Aim for `O(log n)` per reading.
