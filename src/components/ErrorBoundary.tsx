import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportFrontendError } from "../api/diagnostics";
import { copy } from "../copy";

type State = { error: Error | null };

/**
 * Sem isto, qualquer erro durante a renderização desmonta a árvore inteira do
 * React e a janela fica em branco. Aqui o erro aparece na tela, com um jeito
 * de voltar, e vai para o log do app.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportFrontendError("render", error, info.componentStack ?? undefined);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>{copy.crash.title}</h1>
        <p>{copy.crash.note}</p>
        <pre className="result-value" data-tone="error">
          {error.stack ?? String(error)}
        </pre>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            window.location.hash = "#/";
            window.location.reload();
          }}
        >
          {copy.crash.reload}
        </button>
      </div>
    );
  }
}
