def rewind_playlist(head: "ListNode | None") -> "ListNode | None":
    # Walk the list once, turning every arrow around.
    # prev is the already-reversed part; head is what is left to process.
    prev = None
    while head is not None:
        following = head.next  # save the rest before we cut the link
        head.next = prev
        prev = head
        head = following
    return prev
