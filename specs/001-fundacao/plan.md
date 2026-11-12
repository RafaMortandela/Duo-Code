# 001 — Fundação · plano técnico

Implementa [spec.md](spec.md).

## Decisões

- **Scaffold:** `create-tauri-app` (template `react-ts`), identificador `com.duocode.app`. Plugin `opener` removido por não ter uso.
- **Banco:** `rusqlite` com SQLite embutido (`bundled`), arquivo `duo-code.db` no diretório de dados do app. Uma única conexão em `Mutex`, guardada no estado do Tauri.
- **Migrações:** lista ordenada de scripts SQL em `db/mod.rs`; a versão aplicada fica em `PRAGMA user_version`. Cada migração roda em transação junto com a atualização da versão. Migrações só são acrescentadas ao fim da lista, nunca editadas.
- **Erros:** `AppError { code, message }` serializável; todo comando devolve `Result<T, AppError>`. No front, `api/client.ts` converte qualquer falha em `ApiError`, e o `ToastProvider` exibe.
- **Rotas:** `HashRouter` (funciona igual em dev e no protocolo customizado do app empacotado).
- **Tema:** preferência `auto | light | dark` na tabela `settings` (chave `theme`). O `ThemeProvider` resolve `auto` com `prefers-color-scheme` e grava `data-theme` em `<html>`; os tokens são redefinidos sob `[data-theme="dark"]`.
- **Fontes:** Nunito e JetBrains Mono via pacotes `@fontsource-variable/*`, empacotadas no build (nada vem da rede).
- **Fora do Tauri:** quando aberto só no navegador (`npm run dev`), `api/browserFallback.ts` atende os comandos de settings com `localStorage`, para permitir conferir a interface sem compilar o Rust.
- **Verificação de literais (CA-7):** `scripts/check-literals.mjs` falha se achar cor literal fora de `tokens.css`, texto de interface literal em `.tsx` ou URL externa em `src/`.

## Estrutura

```
src/
  main.tsx, App.tsx
  copy.ts
  api/         client.ts, browserFallback.ts, settings.ts
  theme/       ThemeProvider.tsx
  components/  Sidebar.tsx, Icon.tsx, Toast.tsx, PageShell.tsx
  pages/       Home, Trail, Problem, Review, Profile, Settings
  styles/      tokens.css, base.css, app.css
src-tauri/src/
  lib.rs       setup: abre o banco, registra comandos
  error.rs     AppError
  commands.rs  get_setting, set_setting
  db/mod.rs    open, migrate
  db/settings.rs
scripts/check-literals.mjs
```

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1, CA-2, CA-3 | `cargo test` em `db/` (arquivo temporário; reabertura simula reinício) |
| CA-4 | Vitest: `App.test.tsx` |
| CA-5 | Vitest: `ThemeProvider.test.tsx` |
| CA-6, CA-7 | `npm run check:literals` (inclui URLs externas) |
| RF-8 | Vitest: `client.test.ts` |
