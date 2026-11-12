A code formatter needs to check whether the brackets in a snippet are balanced before it tries to indent anything.

You are given a string `text` made only of the characters `(`, `)`, `[`, `]`, `{` and `}`. Return `True` if the brackets are balanced, and `False` otherwise.

Brackets are balanced when:

- every opening bracket is closed by a bracket of the **same kind**;
- brackets are closed in the **reverse order** in which they were opened;
- no closing bracket appears without a matching opener before it.

An empty string is balanced.

### Example 1

```
Input:  text = "{[()]}()"
Output: True
```

### Example 2

```
Input:  text = "([)]"
Output: False
```

The `[` is opened after the `(`, so it must be closed first.

### Example 3

```
Input:  text = "(("
Output: False
```

### Constraints

- `0 <= len(text) <= 200_000`
- `text` contains only `()[]{}`.
