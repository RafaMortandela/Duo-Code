def best_stretch(steps: list[int], k: int) -> int:
    best = 0
    for start in range(len(steps) - k + 1):
        total = 0
        for day in range(start, start + k):
            total += steps[day]
        best = max(best, total)
    return best
