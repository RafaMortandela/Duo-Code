import { copy } from "../copy";

// Quando a interface roda só no navegador (`npm run dev`, sem o Tauri),
// os comandos de settings são atendidos com localStorage e, em modo de
// desenvolvimento, os de questão usam dados de demonstração. Serve apenas
// para conferir a interface; o app real sempre usa o backend Rust.

const PREFIX = "duo-code:setting:";

type Handler = (args: Record<string, unknown>) => unknown;

const handlers: Record<string, Handler> = {
  get_setting: ({ key }) => localStorage.getItem(PREFIX + String(key)),
  set_setting: ({ key, value }) => {
    localStorage.setItem(PREFIX + String(key), String(value));
    return null;
  },
};

export async function browserFallback<T>(
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  let handler = handlers[command];
  if (!handler && import.meta.env.DEV) {
    const { devHandlers } = await import("./devFixtures");
    handler = devHandlers[command];
  }
  if (!handler) {
    throw { code: "unavailable", message: copy.errors.unavailable };
  }
  return handler(args) as T;
}
