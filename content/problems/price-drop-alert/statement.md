You are watching the price of a jacket. `prices[i]` is its price on day `i`.

For every day, work out how many days you would have to wait until the price is **strictly lower** than it is on that day. If the price never drops below that day's price, the answer for that day is `0`.

Return the list of answers, one per day.

### Example 1

```
Input:  prices = [50, 60, 55, 40, 70]
Output: [3, 1, 1, 0, 0]
```

Day 0 waits until day 3; days 3 and 4 never see a lower price.

### Example 2

```
Input:  prices = [9, 8, 7]
Output: [1, 1, 0]
```

### Example 3

```
Input:  prices = [5, 5, 5]
Output: [0, 0, 0]
```

An equal price is not a drop.

### Constraints

- `0 <= len(prices) <= 100_000`
- `1 <= prices[i] <= 1_000_000`
