A music player stores a playlist as a **singly linked list**: each node holds a track id and a pointer to the next track.

Given the `head` of the playlist, reverse it so it plays from the last track to the first, and return the new head.

The list is shown below as an array from head to tail. An empty playlist is `[]` (your function receives `None`).

### Example 1

```
Input:  head = [3, 8, 5, 1]
Output: [1, 5, 8, 3]
```

### Example 2

```
Input:  head = [42]
Output: [42]
```

### Constraints

- The playlist has between `0` and `50_000` tracks.
- `-10_000 <= node.val <= 10_000`

**Follow-up:** can you do it without creating any new nodes?
