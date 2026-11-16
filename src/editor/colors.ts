/**
 * Normaliza uma cor hexadecimal para `#rrggbb` (ou `#rrggbbaa`), que é o único
 * formato que o Monaco aceita nas regras de um tema.
 *
 * Os tokens são escritos com 6 dígitos em `tokens.css`, mas o build de
 * produção minifica o CSS e encurta, por exemplo, `#ffffff` para `#fff`.
 * Sem esta normalização o Monaco lança "Illegal value for token color" e o
 * editor não abre no app empacotado.
 */
export function toFullHex(value: string): string {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3,4}$/.test(hex)) {
    return "#" + [...hex].map((digit) => digit + digit).join("").toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex) || /^[0-9a-fA-F]{8}$/.test(hex)) {
    return "#" + hex.toLowerCase();
  }
  throw new Error(`"${value}" is not a hexadecimal colour the editor theme can use`);
}
