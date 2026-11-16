A black-and-white image is given as a grid `image`, where `1` is an inked pixel and `0` is blank. A **blob** is a group of inked pixels connected to each other horizontally or vertically (diagonals do not connect).

Return the number of blobs in the image.

> Grids can be as large as 60 × 60. A recursive flood fill can exceed Python's recursion limit on a long, winding blob. Consider an explicit stack or a queue.

### Example 1

```
Input:  image = [[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1], [1, 0, 0, 0]]
Output: 3
```

### Example 2

```
Input:  image = [[1, 0], [0, 1]]
Output: 2
```

Diagonal pixels are not connected.

### Example 3

```
Input:  image = [[0, 0, 0]]
Output: 0
```

### Constraints

- `1 <= len(image) <= 60` and `1 <= len(image[0]) <= 60`
- Every row has the same length.
- `image[r][c]` is `0` or `1`.
