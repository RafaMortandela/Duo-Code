def longest_basket(flavors: list[int], k: int) -> int:
    # Grow the window to the right. While it holds more than k flavors,
    # shrink it from the left until one flavor disappears completely.
    in_basket: dict[int, int] = {}
    start = 0
    best = 0
    for end, flavor in enumerate(flavors):
        in_basket[flavor] = in_basket.get(flavor, 0) + 1
        while len(in_basket) > k:
            leaving = flavors[start]
            in_basket[leaving] -= 1
            if in_basket[leaving] == 0:
                del in_basket[leaving]
            start += 1
        best = max(best, end - start + 1)
    return best
