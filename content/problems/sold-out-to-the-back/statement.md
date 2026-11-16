A shop shelf is described by the list `stock`, where `stock[i]` is how many units of product `i` are left. A `0` means the product is sold out.

Rearrange the shelf **in place** so that every sold-out product goes to the back, while the products that are still available keep their original relative order. Return the same list.

### Example 1

```
Input:  stock = [3, 0, 5, 0, 0, 2]
Output: [3, 5, 2, 0, 0, 0]
```

### Example 2

```
Input:  stock = [0, 0, 7]
Output: [7, 0, 0]
```

### Example 3

```
Input:  stock = [4, 1]
Output: [4, 1]
```

### Constraints

- `0 <= len(stock) <= 100_000`
- `0 <= stock[i] <= 1_000_000`

**Follow-up:** do it with `O(1)` extra space and a single pass.
