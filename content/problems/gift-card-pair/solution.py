def gift_card_pair(prices: list[int], balance: int) -> list[int]:
    # seen[price] = index of an earlier item with that price.
    # For each item we ask: did we already pass the partner that completes the balance?
    seen: dict[int, int] = {}
    for i, price in enumerate(prices):
        partner = balance - price
        if partner in seen:
            return [seen[partner], i]
        seen[price] = i
    return []
