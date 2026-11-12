# 002 — Questões e runner Python · plano técnico

Implementa [spec.md](spec.md).

## Decisões

- **Conteúdo:** `content/problems/<slug>/` na raiz do repositório. Em desenvolvimento é lido direto dali; no app empacotado vai como recurso do Tauri (`bundle.resources`). Carregado uma vez na inicialização e mantido em memória.
- **`id`:** é o próprio slug e precisa ser igual ao nome da pasta.
- **Harness único:** `src-tauri/src/runner/harness.py` é embutido no binário (`include_str!`) e também usado por `scripts/validate_content.py`, para que o validador e o app julguem do mesmo jeito.
- **Protocolo:** o runner grava `solution.py`, `harness.py` e `job.json` em um diretório temporário e executa `python3 -I harness.py job.json` com esse diretório como cwd. O harness emite uma linha JSON por evento (`loading`, `loaded`, `start`, `result`, `fatal`, `done`), prefixada por um token aleatório do job — assim um `print` da usuária nunca é confundido com o protocolo. `stdout`/`stderr` do código são capturados por caso de teste.
- **Tempo limite:** quem controla é o Rust. Uma thread lê os eventos; se depois de um `start` o `result` não chega em `time_limit_ms` + folga, o processo é morto, o caso corrente vira `time_limit` e os seguintes `not_run`. Funciona mesmo que o código capture exceções ou trave em chamada nativa.
- **Comparadores:** `exact` (bool só é igual a bool; tupla equivale a lista), `unordered` (ordem do nível externo ignorada), `float` (tolerância `1e-6`, recursiva).
- **`ListNode` / `TreeNode`:** definidos pelo harness e injetados no módulo da solução; conversão de/para array conforme o tipo declarado em `params`/`returns`.
- **Comandos fora da thread principal:** `run_code` e `submit_code` usam `#[tauri::command(async)]`; a trava do banco não fica presa durante a execução.
- **Regra de negócio testável:** `core.rs` (`Core`) concentra listar, detalhar, executar, enviar, rascunho e solução, sem depender do Tauri. `commands.rs` só repassa.
- **Banco (migração 2):** `submissions`, `drafts`, `give_ups`.
- **Editor:** `monaco-editor` importado direto (núcleo + Python + recursos de edição escolhidos), com worker empacotado pelo Vite — nada vem de CDN. As cores do tema do editor são lidas dos tokens CSS.
- **Enunciado:** `react-markdown` (não interpreta HTML bruto).
- **Acesso às questões:** até a spec 004 existir, a tela Trilha mostra uma lista simples das questões por unidade.
- **Fixtures de desenvolvimento:** fora do Tauri e só em modo dev, `api/devFixtures.ts` responde aos comandos de questão com dados de demonstração, para conferir a interface no navegador. Não entra no build de produção.

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1 a CA-8 | `cargo test` em `runner/` (executa `python3` de verdade) |
| CA-9 | `cargo test` em `core.rs` |
| CA-10 | `cargo test` (rascunho sobrevive a reabrir o banco) + Vitest (editor restaura o rascunho) |
| CA-11 | `cargo test` em `content/` |
| CA-12 | `cargo test` chama `scripts/validate_content.py` com conteúdo bom e com conteúdo quebrado |
| RF-11 | `cargo test`: interpretador inexistente → erro `python_missing` |
