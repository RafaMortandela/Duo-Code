import heapq


def running_medians(values: list[int]) -> list[float]:
    # Split the readings into a lower half and an upper half.
    #   low:  max-heap (stored negated) with the smaller half
    #   high: min-heap with the larger half
    # low is allowed exactly zero or one element more than high, so the
    # median is always sitting at the top of one or both heaps.
    low: list[int] = []
    high: list[int] = []
    medians: list[float] = []
    for value in values:
        if not low or value <= -low[0]:
            heapq.heappush(low, -value)
        else:
            heapq.heappush(high, value)
        # Restore the size rule by moving one element across.
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))

        if len(low) > len(high):
            medians.append(float(-low[0]))
        else:
            medians.append((-low[0] + high[0]) / 2)
    return medians
