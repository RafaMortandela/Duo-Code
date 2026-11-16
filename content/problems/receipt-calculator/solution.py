def evaluate_receipt(tokens: list[str]) -> int:
    # Numbers wait on the stack. An operator always applies to the two most
    # recent values, and its result goes back to wait for the next operator.
    stack: list[int] = []
    for token in tokens:
        if token in ("+", "-", "*", "/"):
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                # int() truncates toward zero; // would round down instead.
                stack.append(int(left / right))
        else:
            stack.append(int(token))
    return stack[0]
