# 005 — Revisão espaçada e lembrete diário · plano técnico

Implementa [spec.md](spec.md).

## Revisão

- **Regras puras** em `domain/srs.rs`: `initial`, `next_review(estágio, avaliação, hoje)`, `failed`, `due_queue`.
- **Banco (migração 5):** `reviews (problem_slug, stage, due_date, last_reviewed, awaiting_rating, stage_before)`. A migração inclui as questões já resolvidas antes desta spec, com vencimento no dia seguinte à primeira aceitação.
- **Entrada na fila:** a primeira submissão aceita de uma questão cria a linha (estágio 0, vence amanhã).
- **Modo revisão:** `submit_code` ganha o parâmetro `review`. Com `review = true` e a questão vencida, uma submissão aceita credita 5 XP (evento `review`), reagenda como "ok" e marca `awaiting_rating`. `rate_review` recalcula a partir do estágio anterior com a avaliação escolhida. `fail_review` ("Não consegui") volta ao estágio 0 sem XP.
- **Tela:** a tela de questão aceita `?review=1`: começa do código inicial, não lê nem grava rascunho, troca "desistir" por "Não consegui" e, depois de aceita, pede a avaliação.
- **Progresso:** `get_progress` passa a informar `reviews_due`, usado na Home.

## Lembrete, bandeja e início com o sistema

- **Regra pura** em `domain/reminder.rs`: `should_notify(agora, config, dia_ativo, já_notificou_hoje)`.
- **Agendador:** uma thread verifica a cada 30 s. Como a condição é "já passou do horário e ainda não notificou hoje", um computador que estava desligado às 19:00 notifica assim que o app voltar a rodar no mesmo dia (RF-7).
- **Notificação:** `notify-rust` direto. No Linux a notificação leva a ação padrão, e clicar nela mostra a janela na Home.
- **Texto do lembrete:** fica em `reminder.rs`, porque é montado no backend sem a interface aberta. É a única exceção a "todo texto em `copy.ts`".
- **Bandeja:** recurso `tray-icon` do Tauri, com "Abrir" e "Sair". Fechar a janela só a esconde.
- **Instância única:** `tauri-plugin-single-instance`; abrir o app de novo mostra a janela que já existe, em vez de criar um segundo processo no mesmo banco.
- **Iniciar com o sistema:** `tauri-plugin-autostart`, com o argumento `--minimized` para subir direto na bandeja.
- **Configurações:** `reminder_enabled`, `reminder_time` e `last_notified_date` na tabela `settings`.

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1 a CA-6, CA-8 | `cargo test` em `domain/srs.rs` |
| CA-7, CA-9, CA-14, CA-15 | `cargo test` em `core.rs` |
| CA-10, CA-11 | `cargo test` em `domain/reminder.rs` |
| CA-12, CA-13 | Manual, pela usuária |
| RF-2 a RF-4, RF-6 | Vitest |
