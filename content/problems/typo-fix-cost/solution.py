def fix_cost(typed: str, intended: str) -> int:
    # cost[j] = edits to turn the first i characters of `typed` into the first
    # j characters of `intended`. Row i only needs row i-1, so one row is kept.
    cost = list(range(len(intended) + 1))  # from an empty prefix: j insertions
    for i in range(1, len(typed) + 1):
        diagonal = cost[0]  # value for (i-1, j-1)
        cost[0] = i         # to an empty target: i deletions
        for j in range(1, len(intended) + 1):
            above = cost[j]  # value for (i-1, j), before it is overwritten
            if typed[i - 1] == intended[j - 1]:
                cost[j] = diagonal                      # last characters agree: free
            else:
                cost[j] = 1 + min(diagonal,             # replace
                                  above,                # delete from typed
                                  cost[j - 1])          # insert into typed
            diagonal = above
    return cost[-1]
