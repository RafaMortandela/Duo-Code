def count_duets(prices: list[int], budget: int) -> int:
    pairs = 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[i] + prices[j] <= budget:
                pairs += 1
    return pairs
