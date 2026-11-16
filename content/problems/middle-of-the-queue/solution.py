def middle_track(head: "ListNode") -> "ListNode":
    # `fast` moves two nodes for every one that `slow` moves.
    # When `fast` runs off the end, `slow` has covered half the list.
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow
