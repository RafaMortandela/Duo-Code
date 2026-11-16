A label printer went haywire and shuffled the letters of every label it printed. Two labels belong to the same product when one can be rearranged into the other, using every letter exactly once.

Given the list `labels`, group together the labels of the same product.

To make the answer unique:

- sort the labels **inside each group** alphabetically;
- order the **groups** by their first label.

Repeated labels are kept (they appear as many times as in the input).

### Example 1

```
Input:  labels = ["tea", "ate", "bat", "eat", "tab"]
Output: [["ate", "eat", "tea"], ["bat", "tab"]]
```

### Example 2

```
Input:  labels = ["one", "two", "neo"]
Output: [["neo", "one"], ["two"]]
```

### Example 3

```
Input:  labels = ["aa", "aa"]
Output: [["aa", "aa"]]
```

Repeated labels stay in the group.

### Constraints

- `1 <= len(labels) <= 10_000`
- `0 <= len(labels[i]) <= 30`
- Labels contain only lowercase letters.
