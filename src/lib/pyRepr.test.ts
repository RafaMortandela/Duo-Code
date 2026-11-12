import { describe, expect, it } from "vitest";
import { pyRepr } from "./pyRepr";

describe("pyRepr", () => {
  it("escreve valores como em Python", () => {
    expect(pyRepr(null)).toBe("None");
    expect(pyRepr(true)).toBe("True");
    expect(pyRepr(false)).toBe("False");
    expect(pyRepr(-3.5)).toBe("-3.5");
    expect(pyRepr('a"b')).toBe('"a\\"b"');
    expect(pyRepr([1, [true, null], "x"])).toBe('[1, [True, None], "x"]');
    expect(pyRepr({ k: [1] })).toBe('{"k": [1]}');
    expect(pyRepr([])).toBe("[]");
  });

  it("trunca valores enormes", () => {
    const text = pyRepr(Array.from({ length: 5000 }, (_, i) => i));
    expect(text.length).toBe(2001);
    expect(text.endsWith("…")).toBe(true);
  });
});
