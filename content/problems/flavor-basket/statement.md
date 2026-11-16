A row of candy jars is described by the list `flavors`, where `flavors[i]` is the flavor of jar `i`. You walk along the row taking one candy from each jar of a **consecutive** stretch, but your basket can hold at most `k` different flavors.

Return the largest number of candies you can take.

### Example 1

```
Input:  flavors = [1, 2, 1, 2, 3, 3], k = 2
Output: 4
```

Jars 0 to 3 hold only flavors 1 and 2.

### Example 2

```
Input:  flavors = [4, 4, 4, 4], k = 1
Output: 4
```

### Example 3

```
Input:  flavors = [1, 2, 3, 4], k = 2
Output: 2
```

### Constraints

- `0 <= len(flavors) <= 100_000`
- `0 <= flavors[i] <= 1_000_000`
- `1 <= k <= 100_000`
