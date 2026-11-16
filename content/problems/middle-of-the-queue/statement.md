A music queue is stored as a singly linked list. You want to jump to the middle of it.

Given the `head` of the queue, return the **middle node**. The list shown as output starts at that node. If the queue has an even number of tracks there are two middle nodes: return the **second** one.

Lists are shown as arrays from head to tail.

### Example 1

```
Input:  head = [4, 8, 15, 16, 23]
Output: [15, 16, 23]
```

### Example 2

```
Input:  head = [1, 2, 3, 4]
Output: [3, 4]
```

Two middle nodes (2 and 3): the second one is returned.

### Example 3

```
Input:  head = [7]
Output: [7]
```

### Constraints

- The queue has between `1` and `50_000` tracks.
- `-10_000 <= node.val <= 10_000`

**Follow-up:** can you find the middle in a single pass, without counting the tracks first?
