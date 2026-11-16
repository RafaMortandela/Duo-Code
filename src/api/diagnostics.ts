import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * Manda um erro do frontend para o log do app (stderr do processo). Nunca
 * lança: diagnóstico não pode causar outro erro.
 */
export function reportFrontendError(where: string, error: unknown, extra?: string) {
  // No WebKit, `stack` não traz a mensagem: ela vai sempre na primeira linha.
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ""}`.trim()
      : String(error);
  const message = [`[${where}] ${text}`, extra].filter(Boolean).join("\n");
  console.error(message);
  if (!isTauri()) return;
  invoke("log_frontend_error", { message }).catch(() => undefined);
}

/** Registra erros que escapam de qualquer tratamento. */
export function installGlobalErrorLogging() {
  window.addEventListener("error", (e) =>
    reportFrontendError("window.error", e.error ?? e.message, `${e.filename}:${e.lineno}`),
  );
  window.addEventListener("unhandledrejection", (e) =>
    reportFrontendError("unhandledrejection", e.reason),
  );
}
