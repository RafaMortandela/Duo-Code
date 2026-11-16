def longest_fresh_run(songs: list[int]) -> int:
    # The window [start, i] never contains a repeat.
    # When song i was already played inside the window, the window has to
    # restart right after that earlier play.
    last_played: dict[int, int] = {}
    start = 0
    best = 0
    for i, song in enumerate(songs):
        if song in last_played and last_played[song] >= start:
            start = last_played[song] + 1
        last_played[song] = i
        best = max(best, i - start + 1)
    return best
