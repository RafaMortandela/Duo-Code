You have a gift card and you want to spend **exactly** its whole balance on **two different items** from a shop.

You are given a list `prices`, where `prices[i]` is the price of item `i`, and an integer `balance`. Return the indices of the two items whose prices add up to `balance`.

Each input has **exactly one** valid pair. You may return the two indices in any order, but you cannot pick the same item twice.

### Example 1

```
Input:  prices = [4, 9, 2, 6], balance = 10
Output: [0, 3]
```

Items `0` and `3` cost `4 + 6 = 10`.

### Example 2

```
Input:  prices = [5, 5, 12], balance = 10
Output: [0, 1]
```

Two different items can have the same price.

### Constraints

- `2 <= len(prices) <= 100_000`
- `-1_000_000 <= prices[i] <= 1_000_000` (a negative price is a discount coupon)
- `-2_000_000 <= balance <= 2_000_000`
- Exactly one valid pair exists.
