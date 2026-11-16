import heapq


def top_scores(scores: list[int], k: int) -> list[int]:
    # A min-heap that never grows past k holds the k best scores seen so far.
    # Its smallest element is the entry bar: a new score has to beat it.
    best: list[int] = []
    for score in scores:
        if len(best) < k:
            heapq.heappush(best, score)
        elif score > best[0]:
            heapq.heapreplace(best, score)
    return sorted(best, reverse=True)
