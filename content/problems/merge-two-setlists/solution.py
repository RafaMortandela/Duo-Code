def merge_setlists(first: "ListNode | None", second: "ListNode | None") -> "ListNode | None":
    # A dummy node in front means the first real node needs no special case.
    dummy = ListNode()
    tail = dummy
    while first is not None and second is not None:
        if first.val <= second.val:
            tail.next = first
            first = first.next
        else:
            tail.next = second
            second = second.next
        tail = tail.next
    # One list ran out; whatever is left of the other is already in order.
    tail.next = first if first is not None else second
    return dummy.next
