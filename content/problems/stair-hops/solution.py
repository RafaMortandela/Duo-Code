def count_routes(n: int) -> int:
    # The last hop onto step i came from i-1, i-2 or i-3, so
    #   routes(i) = routes(i-1) + routes(i-2) + routes(i-3).
    # Only the last three values are ever needed.
    a, b, c = 0, 0, 1  # routes(-2), routes(-1), routes(0): one way to stand still
    for _ in range(n):
        a, b, c = b, c, a + b + c
    return c
