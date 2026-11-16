def is_valid_catalog(root: "TreeNode | None") -> bool:
    # Comparing a node only with its own children is not enough: a value deep
    # in the left subtree must still be smaller than the root. So each node
    # carries the open interval (low, high) it is allowed to be in.
    def within(node, low, high) -> bool:
        if node is None:
            return True
        if (low is not None and node.val <= low) or (high is not None and node.val >= high):
            return False
        return within(node.left, low, node.val) and within(node.right, node.val, high)

    return within(root, None, None)
