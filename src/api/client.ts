import { invoke, isTauri } from "@tauri-apps/api/core";
import { copy } from "../copy";
import { browserFallback } from "./browserFallback";

/** Erro único que todo comando pode lançar (espelha `AppError` do Rust). */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (typeof e === "object" && e !== null) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    if (typeof code === "string" && typeof message === "string") {
      return new ApiError(code, message);
    }
    if (typeof message === "string") return new ApiError("unknown", message);
  }
  if (typeof e === "string") return new ApiError("unknown", e);
  return new ApiError("unknown", copy.errors.generic);
}

/** Chama um comando do backend. Sempre rejeita com `ApiError`. */
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    if (!isTauri()) return await browserFallback<T>(command, args);
    return await invoke<T>(command, args);
  } catch (e) {
    throw toApiError(e);
  }
}
