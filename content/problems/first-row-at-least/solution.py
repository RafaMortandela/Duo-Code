def first_at_least(rows: list[int], target: int) -> int:
    # The answer is somewhere in [low, high]. high starts at len(rows) because
    # "no such entry" is a valid answer too.
    low, high = 0, len(rows)
    while low < high:
        mid = (low + high) // 2
        if rows[mid] >= target:
            high = mid          # mid could be the answer; keep it
        else:
            low = mid + 1       # mid is too small; the answer is to its right
    return low
