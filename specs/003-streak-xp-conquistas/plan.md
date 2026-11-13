# 003 — Streak, XP, níveis e conquistas · plano técnico

Implementa [spec.md](spec.md).

## Decisões

- **Domínio puro** em `src-tauri/src/domain/`: `streak.rs`, `xp.rs`, `achievements.rs`. Recebem datas (`chrono::NaiveDate`) e contagens; não leem relógio nem banco.
- **Fonte da verdade:** a tabela `xp_events` (migração 3). Cada evento tem data local, tipo (`solve` ou `review`), questão e quantidade.
  - XP total = soma dos eventos.
  - Dias ativos = datas distintas dos eventos. Não há tabela separada de atividade: só o que rende XP torna o dia ativo, então as duas coisas nunca divergem.
  - "Já recompensada" = existe evento `solve` para a questão.
- **Conquistas:** `achievements_unlocked (id, local_date)`. O catálogo de ids fica em `domain/achievements.rs`; títulos e descrições ficam em `src/copy.ts`.
- **Envio atômico:** `Core::submit_code` executa o código fora da trava e depois, em uma única transação, grava submissão, evento de XP e conquistas novas. Se qualquer gravação falhar, nada fica.
- **Retorno do envio:** `SubmitResult { outcome, rewards }`. `rewards` existe quando a submissão é aceita e traz o motivo (`first_solve`, `already_solved`, `gave_up`), XP ganho, nível e streak antes/depois e conquistas destravadas.
- **Progresso:** comando `get_progress` devolve streak, XP/nível, resolvidas por dificuldade, atividade dos últimos 12 meses, conquistas e a próxima questão sugerida (por enquanto, a primeira não resolvida; a spec 004 refina).
- **Frontend:** `ProgressProvider` guarda o progresso e é atualizado depois de cada envio. Home e Perfil leem dele; a barra lateral mostra o streak.
- **Calendário:** grade de 53 semanas em CSS, montada a partir da data "hoje" que vem do backend.

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1 a CA-6 | `cargo test` em `domain/streak.rs` (CA-4 e CA-5 também em `core.rs`) |
| CA-7, CA-10, CA-12, CA-13 | `cargo test` em `core.rs` |
| CA-8 | `cargo test` em `domain/xp.rs` |
| CA-9 | `cargo test` em `domain/achievements.rs` e `core.rs` |
| CA-11 | `cargo test` em `core.rs` (gatilho SQL força a falha no meio da transação) |
| RF-4 a RF-6 | Vitest: Home, Perfil e resumo de recompensas |
