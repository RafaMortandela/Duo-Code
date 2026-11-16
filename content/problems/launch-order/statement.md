A product launch has `n` tasks, numbered `0` to `n - 1`. Some tasks have to be finished before others: each rule `[a, b]` means task `a` must be done **before** task `b`.

Return an order in which all tasks can be done. To make the answer unique, whenever several tasks are ready at the same time, do the one with the **smallest number** first.

If the rules contradict each other and no valid order exists, return an empty list.

### Example 1

```
Input:  n = 4, rules = [[2, 0], [2, 1], [1, 3]]
Output: [2, 0, 1, 3]
```

Only task 2 is ready at first. Then 0 and 1 are ready and 0 goes first.

### Example 2

```
Input:  n = 3, rules = []
Output: [0, 1, 2]
```

### Example 3

```
Input:  n = 2, rules = [[0, 1], [1, 0]]
Output: []
```

Each task waits for the other, so there is no valid order.

### Constraints

- `1 <= n <= 10_000`
- `0 <= len(rules) <= 30_000`
- `0 <= a, b < n` and `a != b`. The same rule may appear more than once.
