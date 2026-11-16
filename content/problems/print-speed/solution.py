def min_print_speed(jobs: list[int], hours: int) -> int:
    def fits(speed: int) -> bool:
        # A job of p pages takes ceil(p / speed) whole hours.
        return sum((pages + speed - 1) // speed for pages in jobs) <= hours

    # If a speed works, every faster speed works too. So the speeds go
    # "no, no, ..., no, yes, yes, ..." and we binary search for the first yes.
    low, high = 1, max(jobs)
    while low < high:
        mid = (low + high) // 2
        if fits(mid):
            high = mid
        else:
            low = mid + 1
    return low
