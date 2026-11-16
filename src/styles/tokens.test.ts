/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// 007 CA-1: contraste medido a partir do próprio tokens.css.

// Lido do disco: os testes rodam com o processamento de CSS desligado.
const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  const body = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const ICON = 3;

// [cor da frente, fundo, mínimo]: os pares que a interface realmente usa.
const pairs: [string, string, number][] = [
  // texto corrido em todos os fundos
  ["--text", "--bg", TEXT],
  ["--text", "--surface", TEXT],
  ["--text", "--surface-alt", TEXT],
  ["--text-muted", "--bg", TEXT],
  ["--text-muted", "--surface", TEXT],
  ["--text-muted", "--surface-alt", TEXT],
  ["--accent-text", "--bg", TEXT],
  ["--accent-text", "--surface", TEXT],
  // texto de erro e de sucesso, dentro dos cartões
  ["--error", "--surface", TEXT],
  ["--error", "--bg", TEXT],
  ["--success-text", "--surface", TEXT],
  ["--success-text", "--surface-alt", TEXT],
  // botões e destaques
  ["--on-primary", "--primary-strong", TEXT],
  ["--on-accent", "--lavender", TEXT],
  ["--on-accent", "--success", TEXT],
  ["--on-accent", "--peach", TEXT],
  // código: o fundo do editor é --surface
  ["--syntax-keyword", "--surface", TEXT],
  ["--syntax-string", "--surface", TEXT],
  ["--syntax-number", "--surface", TEXT],
  // ícones (elementos gráficos)
  ["--accent", "--bg", ICON],
  ["--accent", "--surface", ICON],
  ["--accent", "--surface-alt", ICON],
  ["--primary-strong", "--peach", ICON],
  ["--error", "--surface-alt", ICON],
];

describe.each([
  ["claro", light],
  ["escuro", dark],
])("contraste no modo %s (007 CA-1)", (_name, tokens) => {
  it.each(pairs)("%s sobre %s ≥ %s:1", (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined();
    expect(tokens[bg], bg).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("tokens", () => {
  it("o modo escuro redefine as cores de fundo e de texto", () => {
    for (const name of ["--bg", "--surface", "--surface-alt", "--text", "--text-muted"]) {
      expect(dark[name]).not.toBe(light[name]);
    }
  });
});
