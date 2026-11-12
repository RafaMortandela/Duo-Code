import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";
import type { CodeEditorProps } from "../components/CodeEditor";

// O Monaco não roda no jsdom: nos testes o editor é uma <textarea> com a mesma API.
vi.mock("../components/CodeEditor", () => ({
  CodeEditor: ({ value, resetKey, onChange, ariaLabel }: CodeEditorProps) =>
    createElement("textarea", {
      key: resetKey,
      "aria-label": ariaLabel,
      defaultValue: value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    }),
}));

// jsdom não implementa matchMedia. Cada teste pode trocar `systemDark`.
export const system = { dark: false };

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("dark") ? system.dark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

afterEach(() => {
  cleanup();
  system.dark = false;
  localStorage.clear();
  window.location.hash = "";
  delete document.documentElement.dataset.theme;
});
