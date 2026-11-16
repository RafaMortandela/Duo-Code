def days_until_drop(prices: list[int]) -> list[int]:
    wait = [0] * len(prices)
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            if prices[j] < prices[i]:
                wait[i] = j - i
                break
    return wait
