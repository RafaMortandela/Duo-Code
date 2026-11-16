// Monaco empacotado localmente: núcleo + recursos de edição + Python.
// Nada é carregado de CDN (constitution: offline-first).

import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/features/register.all";
import "monaco-editor/languages/definitions/python/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import type { ResolvedTheme } from "../theme/ThemeProvider";
import { toFullHex } from "./colors";

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

/** Tema do editor para cada modo do app (spec 007). */
export const EDITOR_THEMES: Record<ResolvedTheme, string> = {
  light: "duo-rose",
  dark: "duo-rose-noir",
};

/** Valor de um token CSS do tema atual, sempre como `#rrggbb`. */
function token(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return toFullHex(raw);
}

/** Monaco quer a cor das regras de sintaxe sem o `#`. */
function bare(name: string): string {
  return token(name).slice(1);
}

/** (Re)define o tema do editor a partir dos tokens CSS do tema atual. */
export function applyEditorTheme(resolved: ResolvedTheme) {
  const name = EDITOR_THEMES[resolved];
  monaco.editor.defineTheme(name, {
    base: resolved === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: bare("--syntax-keyword"), fontStyle: "bold" },
      { token: "string", foreground: bare("--syntax-string") },
      { token: "number", foreground: bare("--syntax-number") },
      { token: "comment", foreground: bare("--text-muted"), fontStyle: "italic" },
      { token: "type", foreground: bare("--syntax-number") },
    ],
    colors: {
      "editor.background": token("--surface"),
      "editor.foreground": token("--text"),
      "editorLineNumber.foreground": token("--text-muted"),
      "editorLineNumber.activeForeground": token("--accent-text"),
      "editor.lineHighlightBackground": token("--surface-alt"),
      "editor.lineHighlightBorder": token("--surface-alt"),
      "editorCursor.foreground": token("--primary"),
      "editor.selectionBackground": token("--selection"),
      "editorIndentGuide.background1": token("--border"),
      "editorWidget.background": token("--surface"),
      "editorWidget.border": token("--border"),
    },
  });
  monaco.editor.setTheme(name);
}

export { monaco };
