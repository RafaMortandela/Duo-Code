import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
