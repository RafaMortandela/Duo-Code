A radio station logs the id of every song it plays in the list `songs`. A *fresh run* is a stretch of consecutive plays in which **no song is repeated**.

Return the length of the longest fresh run.

### Example 1

```
Input:  songs = [3, 7, 3, 5, 9, 7]
Output: 4
```

The run `3, 5, 9, 7` has four different songs.

### Example 2

```
Input:  songs = [8, 8, 8]
Output: 1
```

### Example 3

```
Input:  songs = [1, 2, 3]
Output: 3
```

### Constraints

- `0 <= len(songs) <= 100_000`
- `0 <= songs[i] <= 1_000_000`
