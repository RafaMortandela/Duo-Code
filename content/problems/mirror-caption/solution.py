def is_mirror(caption: str) -> bool:
    # One pointer walks in from each end. Each skips what does not count,
    # then the two characters they land on must match.
    left, right = 0, len(caption) - 1
    while left < right:
        if not caption[left].isalnum():
            left += 1
        elif not caption[right].isalnum():
            right -= 1
        elif caption[left].lower() != caption[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True
