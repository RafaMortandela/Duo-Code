def best_stretch(steps: list[int], k: int) -> int:
    # Total of the first window, then slide it one day at a time:
    # the new day enters, the day that fell off the back leaves.
    window = sum(steps[:k])
    best = window
    for day in range(k, len(steps)):
        window += steps[day] - steps[day - k]
        best = max(best, window)
    return best
