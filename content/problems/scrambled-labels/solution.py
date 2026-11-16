def group_labels(labels: list[str]) -> list[list[str]]:
    # Two labels are the same product exactly when their sorted letters match,
    # so the sorted letters work as a dictionary key for the group.
    groups: dict[str, list[str]] = {}
    for label in labels:
        key = "".join(sorted(label))
        groups.setdefault(key, []).append(label)
    # Lists compare element by element, so sorting the groups orders them by first label.
    return sorted(sorted(group) for group in groups.values())
