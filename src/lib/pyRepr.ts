const MAX_LENGTH = 2000;
const ELLIPSIS = "…";

function repr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(repr).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${repr(v)}`).join(", ")}}`;
  }
  return String(value);
}

/** Mostra um valor JSON como a usuária o escreveria em Python, truncando o que for enorme. */
export function pyRepr(value: unknown): string {
  const text = repr(value);
  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) + ELLIPSIS : text;
}
