An escape room is a grid `room` where `0` is free floor and `1` is a wall. You start in the top-left cell and the exit is the bottom-right cell; both are always free.

Each move takes you one cell up, down, left or right. You carry a hammer that can break **at most one** wall: stepping into a wall cell uses the hammer, and from then on you can only walk on free floor.

Return the smallest number of moves needed to reach the exit, or `-1` if it cannot be reached even with the hammer.

### Example 1

```
Input:  room = [[0, 1, 0], [0, 1, 0], [0, 0, 0]]
Output: 4
```

The walls are not in the way: down, down, right, right.

### Example 2

```
Input:  room = [[0, 1, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 1, 0]]
Output: 6
```

Walking around takes 10 moves. Breaking the wall at row 2, column 3 gives a path of 6.

### Example 3

```
Input:  room = [[0, 1, 1, 0]]
Output: -1
```

Two walls in a row cannot both be broken.

### Constraints

- `1 <= len(room) <= 40` and `1 <= len(room[0]) <= 40`
- Every row has the same length.
- `room[0][0]` and the bottom-right cell are `0`.
