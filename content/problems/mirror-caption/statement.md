A photo caption is a *mirror caption* if it reads the same forwards and backwards once you ignore everything that is not a letter or a digit, and treat uppercase and lowercase as equal.

Given the string `caption`, return `True` if it is a mirror caption and `False` otherwise.

A caption with no letters or digits at all counts as a mirror caption.

### Example 1

```
Input:  caption = "Was it a car or a cat I saw?"
Output: True
```

### Example 2

```
Input:  caption = "Brunch at noon"
Output: False
```

### Example 3

```
Input:  caption = ""
Output: True
```

### Constraints

- `0 <= len(caption) <= 200_000`
- `caption` contains only printable ASCII characters.

**Follow-up:** can you do it without building a cleaned-up copy of the string?
