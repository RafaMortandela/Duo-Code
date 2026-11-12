# 001 — Fundação · tarefas

- [x] T1 Gerar scaffold Tauri 2 + React + TS e ajustar nome, janela e identificador
- [x] T2 `error.rs`: `AppError` serializável
- [x] T3 `db/mod.rs`: abrir banco e aplicar migrações por `user_version` (CA-1, CA-2)
- [x] T4 `db/settings.rs` + comandos `get_setting`/`set_setting` (CA-3)
- [x] T5 `tokens.css` (claro e escuro), `base.css`, fontes empacotadas (RF-5)
- [x] T6 `copy.ts` com todos os textos (RF-6)
- [x] T7 `api/client.ts`, `api/settings.ts`, fallback de navegador (RF-7, RF-8)
- [x] T8 `ToastProvider` e `ThemeProvider` (CA-5)
- [x] T9 Sidebar, rotas e telas vazias; seletor de tema em Ajustes (CA-4)
- [x] T10 `scripts/check-literals.mjs` (CA-6, CA-7)
- [x] T11 Testes: `cargo test`, Vitest
- [x] T12a Binário real executado: cria `~/.local/share/com.duocode.app/duo-code.db` com `user_version = 1` e a tabela `settings`
- [x] T12b Interface conferida no navegador (`npm run dev`) nos temas claro e escuro, fontes empacotadas carregadas, sem erros no console
- [ ] T12c Conferência visual dentro da janela do Tauri (`npm run tauri dev`) — pendente, a fazer pela usuária
