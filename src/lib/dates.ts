const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` → meia-noite UTC desse dia (só para contas de calendário). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return formatDay(new Date(parseDay(day).getTime() + n * DAY_MS));
}

/** 0 = domingo … 6 = sábado. */
export function weekday(day: string): number {
  return parseDay(day).getUTCDay();
}

/** `2026-11-12` → `12/11/2026`. */
export function displayDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Dias de um calendário de `weeks` semanas (domingo a sábado) que termina em
 * `today`: começa no domingo de `weeks - 1` semanas atrás.
 */
export function calendarDays(today: string, weeks: number): string[] {
  const start = addDays(today, -(weekday(today) + (weeks - 1) * 7));
  const total = weekday(today) + (weeks - 1) * 7 + 1;
  return Array.from({ length: total }, (_, i) => addDays(start, i));
}
