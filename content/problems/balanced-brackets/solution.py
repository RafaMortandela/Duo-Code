def is_balanced(text: str) -> bool:
    # The stack holds the openers still waiting for their partner.
    # The top is always the one that has to close next.
    partner = {")": "(", "]": "[", "}": "{"}
    open_stack: list[str] = []
    for ch in text:
        if ch in partner:
            if not open_stack or open_stack.pop() != partner[ch]:
                return False
        else:
            open_stack.append(ch)
    return not open_stack
