import heapq


def launch_order(n: int, rules: list[list[int]]) -> list[int]:
    # blockers[t]: how many tasks still have to be done before t.
    after: list[list[int]] = [[] for _ in range(n)]
    blockers = [0] * n
    for a, b in rules:
        after[a].append(b)
        blockers[b] += 1

    # A task is ready when nothing blocks it. The heap hands out the
    # smallest-numbered ready task, as the statement asks.
    ready = [task for task in range(n) if blockers[task] == 0]
    heapq.heapify(ready)
    order: list[int] = []
    while ready:
        task = heapq.heappop(ready)
        order.append(task)
        for nxt in after[task]:
            blockers[nxt] -= 1
            if blockers[nxt] == 0:
                heapq.heappush(ready, nxt)

    # Tasks caught in a cycle never become ready.
    return order if len(order) == n else []
