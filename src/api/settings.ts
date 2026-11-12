import { call } from "./client";

export function getSetting(key: string): Promise<string | null> {
  return call<string | null>("get_setting", { key });
}

export function setSetting(key: string, value: string): Promise<void> {
  return call<void>("set_setting", { key, value });
}
