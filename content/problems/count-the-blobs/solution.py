def count_blobs(image: list[list[int]]) -> int:
    rows, cols = len(image), len(image[0])
    seen = [[False] * cols for _ in range(rows)]
    blobs = 0
    for r in range(rows):
        for c in range(cols):
            if image[r][c] == 0 or seen[r][c]:
                continue
            # An inked pixel nobody has reached yet: it starts a new blob.
            # Flood from it, marking every pixel of the same blob.
            blobs += 1
            seen[r][c] = True
            stack = [(r, c)]
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and image[ny][nx] == 1 and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
    return blobs
