Two friends want to buy one concert ticket each and split a shared `budget`. The list `prices` holds the price of every available ticket, **sorted from cheapest to most expensive**.

Return how many different pairs of tickets they could buy, that is, the number of pairs of positions `i < j` with `prices[i] + prices[j] <= budget`.

### Example 1

```
Input:  prices = [20, 35, 50, 80], budget = 90
Output: 3
```

The pairs are (20, 35), (20, 50) and (35, 50).

### Example 2

```
Input:  prices = [10, 10, 10], budget = 20
Output: 3
```

### Example 3

```
Input:  prices = [40, 60], budget = 99
Output: 0
```

### Constraints

- `0 <= len(prices) <= 100_000`
- `1 <= prices[i] <= 1_000_000`, in non-decreasing order
- `0 <= budget <= 2_000_000`
