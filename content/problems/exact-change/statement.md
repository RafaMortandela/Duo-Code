A vending machine has an unlimited supply of coins of the values listed in `coins`. It must give back exactly `amount` in change.

Return the **fewest** coins that add up to exactly `amount`, or `-1` if no combination of the available coins does.

### Example 1

```
Input:  coins = [1, 5, 6], amount = 10
Output: 2
```

`5 + 5`. Starting with the 6 would need `6 + 1 + 1 + 1 + 1`, five coins.

### Example 2

```
Input:  coins = [4, 7], amount = 5
Output: -1
```

### Example 3

```
Input:  coins = [2], amount = 0
Output: 0
```

Nothing to give back, so no coins.

### Constraints

- `1 <= len(coins) <= 12`
- `1 <= coins[i] <= 10_000`, all different
- `0 <= amount <= 5_000`

Always taking the largest coin that fits does **not** work in general: try `coins = [1, 5, 6]`, `amount = 10`.
