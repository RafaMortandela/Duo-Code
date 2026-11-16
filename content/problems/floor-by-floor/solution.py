from collections import deque


def floors(root: "TreeNode | None") -> list[list[int]]:
    if root is None:
        return []
    result: list[list[int]] = []
    queue = deque([root])
    while queue:
        # Everything in the queue right now is exactly one floor.
        floor = []
        for _ in range(len(queue)):
            node = queue.popleft()
            floor.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(floor)
    return result
