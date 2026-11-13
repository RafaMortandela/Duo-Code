# 004 — Trilha de unidades · plano técnico

Implementa [spec.md](spec.md).

## Decisões

- **`content/units.json`** define ordem, título, descrição, ícone e questões de cada unidade. A ordem das questões dentro da unidade é a do arquivo. Por enquanto só entram as três unidades que já têm questão (Arrays & Hashing → Stack → Linked List); a spec 006 acrescenta as outras sete junto com o conteúdo.
- **Regra pura** em `domain/trail.rs`: `trail_state(unidades, resolvidas, já_liberadas)` e `suggest(...)`.
- **"Resolvida" para a trilha** é ter uma submissão aceita, mesmo que sem XP (questão em que houve desistência). Assim ninguém fica presa por ter desistido; XP e conquistas continuam seguindo a regra da spec 003.
- **Liberação persistida** (migração 4, `units_unlocked`): uma unidade liberada fica gravada. Isso garante "nunca volta a ficar bloqueada" mesmo quando o conteúdo cresce — por exemplo, quando a 006 levar Arrays & Hashing de 1 para 3 questões.
- **Acesso:** abrir, executar, enviar ou ver a solução de uma questão de unidade bloqueada devolve o erro `unit_locked`. A tela de questão redireciona para a Trilha, que abre o aviso do que falta.
- **Questão fora de qualquer unidade** não aparece na trilha e o validador acusa; em execução ela continua acessível por link direto.
- **Sem `units.json`:** as unidades são deduzidas do campo `unit` das questões, na ordem em que aparecem, e um aviso vai para o log.
- **Sugestão da Home:** primeira questão não resolvida da unidade liberada mais avançada ainda não concluída. Com tudo concluído não há sugestão, e a Home aponta para a revisão.
- **Recompensas:** o resumo do envio ganha `units_unlocked` (unidades que abriram com aquela submissão).
- **Tela:** caminho vertical de nós em zigue-zague. Nó liberado expande a lista de questões; nó bloqueado expande o aviso. A unidade atual já abre expandida.

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1 a CA-4 | `cargo test` em `domain/trail.rs` |
| CA-5 | `cargo test` em `core.rs` (erro `unit_locked`) + Vitest (redirecionamento e aviso) |
| CA-6, CA-7 | `cargo test` em `domain/trail.rs` e `core.rs` |
| CA-8 | `cargo test` em `content/` (unidade nova no arquivo aparece) |
| RF-7 | `cargo test` (referência inexistente é ignorada) + validador |
