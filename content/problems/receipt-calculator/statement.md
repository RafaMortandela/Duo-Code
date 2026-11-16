An old cash register writes its calculations in **postfix** order: the two operands come first and the operator comes after them. For example `["2", "3", "+"]` means `2 + 3`, and `["2", "3", "4", "*", "+"]` means `2 + (3 * 4)`.

Given the list `tokens`, where each token is an integer or one of `"+"`, `"-"`, `"*"`, `"/"`, return the value of the expression.

- For `-` and `/`, the operand that appeared **first** goes on the left: `["7", "2", "-"]` is `7 - 2`.
- Division **truncates toward zero**: `7 / 2` is `3` and `-7 / 2` is `-3`.

The expression is always valid and never divides by zero.

### Example 1

```
Input:  tokens = ["2", "3", "4", "*", "+"]
Output: 14
```

### Example 2

```
Input:  tokens = ["7", "2", "-"]
Output: 5
```

### Example 3

```
Input:  tokens = ["-7", "2", "/"]
Output: -3
```

Division truncates toward zero, so the result is `-3`, not `-4`.

### Constraints

- `1 <= len(tokens) <= 100_000`
- Numbers are integers between `-1000` and `1000`, written like `"12"` or `"-3"`.
- Every intermediate result fits comfortably in a Python integer.
