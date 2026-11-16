import { call } from "./client";

/** Chaves de `settings` usadas pelo lembrete (as mesmas de `reminder.rs`). */
export const REMINDER_ENABLED = "reminder_enabled";
export const REMINDER_TIME = "reminder_time";
export const DEFAULT_REMINDER_TIME = "19:00";

export function testNotification(): Promise<void> {
  return call("test_notification");
}

export function getAutostart(): Promise<boolean> {
  return call("get_autostart");
}

export function setAutostart(enabled: boolean): Promise<void> {
  return call("set_autostart", { enabled });
}
