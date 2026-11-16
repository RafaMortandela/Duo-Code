def find_on_shelf(shelf: list[int], code: int) -> int:
    # Cut the range in two: at least one half is in plain sorted order.
    # In a sorted half we can tell for sure whether the code lies inside it.
    low, high = 0, len(shelf) - 1
    while low <= high:
        mid = (low + high) // 2
        if shelf[mid] == code:
            return mid
        if shelf[low] <= shelf[mid]:                # left half is sorted
            if shelf[low] <= code < shelf[mid]:
                high = mid - 1
            else:
                low = mid + 1
        else:                                       # right half is sorted
            if shelf[mid] < code <= shelf[high]:
                low = mid + 1
            else:
                high = mid - 1
    return -1
