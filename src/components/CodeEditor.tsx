import { useEffect, useRef } from "react";
import { applyEditorTheme, EDITOR_THEMES, monaco } from "../editor/monaco";
import { useTheme } from "../theme/ThemeProvider";

export type CodeEditorProps = {
  /** Conteúdo inicial e o que é recolocado quando `resetKey` muda. */
  value: string;
  /** Mude para substituir o conteúdo do editor por `value`. */
  resetKey: string | number;
  onChange: (code: string) => void;
  /** Ctrl/Cmd + Enter */
  onRun?: () => void;
  /** Ctrl/Cmd + Shift + Enter */
  onSubmit?: () => void;
  ariaLabel: string;
};

export function CodeEditor(props: CodeEditorProps) {
  const { resolved } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Sempre as versões mais recentes, sem recriar o editor a cada render.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!host.current) return;
    applyEditorTheme(resolved);
    const instance = monaco.editor.create(host.current, {
      value: latest.current.value,
      language: "python",
      theme: EDITOR_THEMES[resolved],
      ariaLabel: latest.current.ariaLabel,
      automaticLayout: true,
      fontFamily: getComputedStyle(document.documentElement)
        .getPropertyValue("--font-code")
        .trim(),
      fontLigatures: false,
      fontSize: 14,
      lineHeight: 22,
      tabSize: 4,
      insertSpaces: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      padding: { top: 12, bottom: 12 },
      roundedSelection: true,
      smoothScrolling: true,
    });
    editor.current = instance;

    const sub = instance.onDidChangeModelContent(() =>
      latest.current.onChange(instance.getValue()),
    );
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      latest.current.onRun?.(),
    );
    instance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => latest.current.onSubmit?.(),
    );

    return () => {
      sub.dispose();
      // O editor primeiro: descartar o modelo com o editor ainda vivo faz os
      // recursos dele (sugestões inline) lançarem "Model is disposed!".
      const model = instance.getModel();
      instance.dispose();
      model?.dispose();
      editor.current = null;
    };
    // criado uma vez; tema e conteúdo são atualizados pelos efeitos abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyEditorTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    const instance = editor.current;
    if (instance && instance.getValue() !== latest.current.value) {
      instance.setValue(latest.current.value);
    }
  }, [props.resetKey]);

  return <div ref={host} className="code-editor" />;
}
