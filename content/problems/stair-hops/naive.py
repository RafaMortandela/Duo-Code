def count_routes(n: int) -> int:
    if n < 0:
        return 0
    if n == 0:
        return 1
    return count_routes(n - 1) + count_routes(n - 2) + count_routes(n - 3)
