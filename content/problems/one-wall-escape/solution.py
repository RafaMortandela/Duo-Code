from collections import deque


def shortest_escape(room: list[list[int]]) -> int:
    rows, cols = len(room), len(room[0])
    # Being in a cell with the hammer is a different situation from being in
    # the same cell without it. So a BFS state is (row, col, hammer used?).
    seen = [[[False, False] for _ in range(cols)] for _ in range(rows)]
    seen[0][0][0] = True
    queue = deque([(0, 0, 0, 0)])  # row, col, used, moves
    while queue:
        r, c, used, moves = queue.popleft()
        if r == rows - 1 and c == cols - 1:
            return moves  # BFS reaches every state by a shortest path first
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue
            next_used = used + room[nr][nc]
            if next_used > 1 or seen[nr][nc][next_used]:
                continue
            seen[nr][nc][next_used] = True
            queue.append((nr, nc, next_used, moves + 1))
    return -1
