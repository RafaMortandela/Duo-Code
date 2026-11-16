def favorite_color(colors: list[str]) -> str:
    # One pass to count, one pass over the distinct colors to pick the winner.
    counts: dict[str, int] = {}
    for color in colors:
        counts[color] = counts.get(color, 0) + 1
    # Highest count first; among equals, the alphabetically smallest name.
    return min(counts, key=lambda color: (-counts[color], color))
