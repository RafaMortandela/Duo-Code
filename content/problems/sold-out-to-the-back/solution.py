def push_sold_out(stock: list[int]) -> list[int]:
    # `write` is where the next available product belongs. Everything before it
    # is already in its final place.
    write = 0
    for read in range(len(stock)):
        if stock[read] != 0:
            stock[write], stock[read] = stock[read], stock[write]
            write += 1
    return stock
