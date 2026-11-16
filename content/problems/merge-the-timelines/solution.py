import heapq


def merge_timelines(timelines: list[list[int]]) -> list[int]:
    # The next post of the feed is always the earliest among the "front" post
    # of each account. A heap holds one front per account:
    # (timestamp, which account, position inside that account's list).
    heap = [(posts[0], i, 0) for i, posts in enumerate(timelines) if posts]
    heapq.heapify(heap)
    feed: list[int] = []
    while heap:
        timestamp, account, position = heapq.heappop(heap)
        feed.append(timestamp)
        if position + 1 < len(timelines[account]):
            following = timelines[account][position + 1]
            heapq.heappush(heap, (following, account, position + 1))
    return feed
