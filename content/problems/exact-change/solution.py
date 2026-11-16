def fewest_coins(coins: list[int], amount: int) -> int:
    # fewest[x] = fewest coins that add up to exactly x (infinity if impossible).
    # To make x, the last coin was some c, and before it we had made x - c.
    unreachable = float("inf")
    fewest = [0] + [unreachable] * amount
    for x in range(1, amount + 1):
        for coin in coins:
            if coin <= x and fewest[x - coin] + 1 < fewest[x]:
                fewest[x] = fewest[x - coin] + 1
    return -1 if fewest[amount] == unreachable else fewest[amount]
