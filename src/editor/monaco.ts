// Monaco empacotado localmente: núcleo + recursos de edição + Python.
// Nada é carregado de CDN (constitution: offline-first).

import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/features/register.all";
import "monaco-editor/languages/definitions/python/register";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import type { ResolvedTheme } from "../theme/ThemeProvider";

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

/** Tema do editor para cada modo do app (spec 007). */
export const EDITOR_THEMES: Record<ResolvedTheme, string> = {
  light: "duo-rose",
  dark: "duo-rose-noir",
};

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Monaco quer a cor das regras de sintaxe sem o `#`. */
function bare(name: string): string {
  return token(name).replace("#", "");
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
