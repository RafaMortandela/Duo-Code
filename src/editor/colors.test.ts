import { describe, expect, it } from "vitest";
import { toFullHex } from "./colors";

describe("toFullHex", () => {
  // O build de produção encurta #ffffff para #fff; o Monaco só aceita 6 dígitos.
  it("expande as formas curtas que o minificador de CSS gera", () => {
    expect(toFullHex("#fff")).toBe("#ffffff");
    expect(toFullHex("#F0a")).toBe("#ff00aa");
    expect(toFullHex("#abcd")).toBe("#aabbccdd");
  });

  it("mantém as formas completas e tolera espaços e falta de #", () => {
    expect(toFullHex("#4A1F36")).toBe("#4a1f36");
    expect(toFullHex("  #c2185b ")).toBe("#c2185b");
    expect(toFullHex("2e1724")).toBe("#2e1724");
    expect(toFullHex("#11223344")).toBe("#11223344");
  });

  it("recusa o que não é hexadecimal, com uma mensagem clara", () => {
    for (const bad of ["", "red", "rgb(0, 0, 0)", "#12", "#12345", "#ggg"]) {
      expect(() => toFullHex(bad), bad).toThrow(/not a hexadecimal colour/);
    }
  });
});
