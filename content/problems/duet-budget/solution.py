def count_duets(prices: list[int], budget: int) -> int:
    # Cheapest on the left, priciest on the right.
    # If that pair fits, the cheapest also fits with every ticket in between,
    # so we count them all at once and are done with the cheapest.
    # If it does not fit, the priciest fits with nobody: drop it.
    pairs = 0
    left, right = 0, len(prices) - 1
    while left < right:
        if prices[left] + prices[right] <= budget:
            pairs += right - left
            left += 1
        else:
            right -= 1
    return pairs
