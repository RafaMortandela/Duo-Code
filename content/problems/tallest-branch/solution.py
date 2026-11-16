def tree_height(root: "TreeNode | None") -> int:
    # The height of a tree is one (the root itself) plus the height of its
    # taller side. An empty tree contributes nothing.
    if root is None:
        return 0
    return 1 + max(tree_height(root.left), tree_height(root.right))
