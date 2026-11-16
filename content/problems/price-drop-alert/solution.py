def days_until_drop(prices: list[int]) -> list[int]:
    # The stack holds days still waiting for a lower price. Their prices never
    # decrease from bottom to top, so a cheaper day resolves a run from the top.
    wait = [0] * len(prices)
    waiting: list[int] = []
    for day, price in enumerate(prices):
        while waiting and prices[waiting[-1]] > price:
            earlier = waiting.pop()
            wait[earlier] = day - earlier
        waiting.append(day)
    return wait
