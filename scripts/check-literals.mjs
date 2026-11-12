#!/usr/bin/env node
// Verifica os critérios 001 CA-6/CA-7 (e 007 CA-5/CA-6) em src/ e index.html:
//   - cor literal só em src/styles/tokens.css
//   - texto de interface só em src/copy.ts
//   - nenhuma URL externa (o app é offline)
// Uso: node scripts/check-literals.mjs   (sai com código 1 se achar algo)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const TOKENS = join("src", "styles", "tokens.css");
const COPY = join("src", "copy.ts");

const LETTER = "A-Za-zÀ-ÿ";
const rules = [
  {
    name: "cor literal (use um token de tokens.css)",
    applies: (f) => /\.(tsx?|css)$/.test(f) && f !== TOKENS,
    regex: /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/,
  },
  {
    name: "texto de interface literal (mova para src/copy.ts)",
    applies: (f) => f.endsWith(".tsx"),
    // texto entre tags JSX; `(?<![=-])` evita `=>` e `->`
    regex: new RegExp(`(?<![=-])>[^<>{}]*[${LETTER}][^<>{}]*</`),
  },
  {
    name: "texto de interface literal em atributo (mova para src/copy.ts)",
    applies: (f) => f.endsWith(".tsx"),
    regex: new RegExp(
      `\\b(?:aria-label|title|placeholder|alt)="[^"]*[${LETTER}][^"]*"`,
    ),
  },
  {
    name: "URL externa (o app precisa funcionar offline)",
    applies: (f) => f !== COPY,
    regex: /https?:\/\/(?!www\.w3\.org\/)/,
  },
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = [...walk(join(root, "src")), join(root, "index.html")]
  .map((f) => relative(root, f))
  .filter((f) => !/\.test\.tsx?$/.test(f) && !f.startsWith(join("src", "test") + sep))
  .filter((f) => /\.(tsx?|css|html)$/.test(f));

const problems = [];
for (const file of files) {
  const lines = readFileSync(join(root, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\/?\*)/.test(line)) return; // comentário
    for (const rule of rules) {
      if (rule.applies(file) && rule.regex.test(line)) {
        problems.push(`${file}:${i + 1}  ${rule.name}\n    ${line.trim()}`);
      }
    }
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problema(s) em ${files.length} arquivo(s).`);
  process.exit(1);
}
console.log(`ok — ${files.length} arquivos sem cor, texto ou URL literal.`);
