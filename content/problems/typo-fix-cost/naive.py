def fix_cost(typed: str, intended: str) -> int:
    if not typed:
        return len(intended)
    if not intended:
        return len(typed)
    if typed[-1] == intended[-1]:
        return fix_cost(typed[:-1], intended[:-1])
    return 1 + min(
        fix_cost(typed[:-1], intended[:-1]),
        fix_cost(typed[:-1], intended),
        fix_cost(typed, intended[:-1]),
    )
