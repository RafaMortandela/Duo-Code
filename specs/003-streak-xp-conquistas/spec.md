# 003 — Streak, XP, níveis e conquistas

## Objetivo

Dar motivo para voltar todo dia. Resolver ao menos uma questão por dia mantém o streak; cada resolução rende XP, que sobe o nível e destrava conquistas.

## Histórias

- Como usuária, vejo na Home quantos dias seguidos estou e se já garanti o dia de hoje.
- Como usuária, ao ter uma solução aceita vejo quanto XP ganhei e, se for o caso, que subi de nível ou destravei uma conquista.
- Como usuária, vejo no Perfil meu nível, XP total, recorde de streak, calendário de atividade e conquistas (destravadas e por destravar).

## Regras

### Streak

- Um dia é **ativo** se houver ao menos uma submissão `accepted` naquela data local — de questão nova ou de revisão (spec 005). Reenviar uma questão já resolvida fora da fila de revisão não conta.
- **Streak atual** = quantidade de dias ativos consecutivos terminando hoje; se hoje ainda não é ativo, terminando ontem.
- Se nem hoje nem ontem são ativos, o streak atual é 0.
- **Recorde** = maior sequência já atingida; nunca diminui.
- Estado do dia: `garantido` (hoje ativo), `em risco` (ontem ativo, hoje não) ou `zerado`.

### XP e níveis

| Evento | XP |
|---|---|
| Primeira resolução — easy | 10 |
| Primeira resolução — medium | 20 |
| Primeira resolução — hard | 40 |
| Revisão aceita | 5 |

- XP de primeira resolução é concedido uma única vez por questão.
- **Desistência:** se a usuária desistiu de uma questão (viu a solução antes de resolvê-la), uma aceitação posterior marca a questão como resolvida, mas não rende XP nem torna o dia ativo. Ela ainda poderá render XP de revisão (spec 005).
- "Questão resolvida", para contagens e conquistas, é a que rendeu XP de primeira resolução.
- XP total necessário para **chegar** ao nível `n`: `50 · n · (n − 1)` (nível 1 = 0, nível 2 = 100, nível 3 = 300, nível 4 = 600…).

### Conquistas

Lista declarativa, avaliada após cada submissão aceita. Conjunto inicial:

| Id | Condição |
|---|---|
| `first-solve` | 1ª questão resolvida |
| `streak-3`, `streak-7`, `streak-30` | Streak atual atinge 3, 7, 30 |
| `solved-10`, `solved-30` | 10 e 30 questões resolvidas |
| `first-medium`, `first-hard` | 1ª medium, 1ª hard |
| `unit-complete` | Todas as questões de uma unidade |
| `trail-complete` | Todas as unidades |
| `first-try` | Aceita na 1ª submissão de uma questão |
| `review-10` | 10 revisões aceitas |
| `level-5` | Atingir o nível 5 |

Cada conquista é destravada uma única vez, com data registrada.

## Requisitos

- **RF-1** Funções puras em `domain/`: `streak(datas_ativas, hoje)`, `xp_for(evento)`, `level(xp_total)`, `evaluate_achievements(estado)`.
- **RF-2** Ao aceitar uma submissão, uma única transação grava: submissão, progresso da questão, atividade do dia, evento de XP e conquistas novas.
- **RF-3** O comando de submissão devolve um resumo de recompensas: XP ganho, nível antes/depois, streak antes/depois, conquistas destravadas.
- **RF-4** Home mostra streak atual, estado do dia, XP/nível com barra de progresso e um atalho para a próxima questão sugerida.
- **RF-5** Perfil mostra nível, XP total, recorde, total resolvido por dificuldade, calendário dos últimos 12 meses e a grade de conquistas.
- **RF-6** Após submissão aceita, a tela de questão mostra o resumo de recompensas; subir de nível e destravar conquista têm destaque próprio.

## Critérios de aceitação

- **CA-1** Dias ativos {seg, ter, qua}, hoje = qua → streak 3, estado `garantido`.
- **CA-2** Dias ativos {seg, ter}, hoje = qua → streak 2, estado `em risco`.
- **CA-3** Dias ativos {seg, ter}, hoje = qui → streak 0, estado `zerado`, recorde 2.
- **CA-4** Duas submissões aceitas no mesmo dia → o streak sobe só 1.
- **CA-5** Submissão aceita às 23:59 e outra às 00:01 → dois dias ativos distintos.
- **CA-6** Sequência que cruza virada de mês e de ano conta como consecutiva.
- **CA-7** Primeira resolução de uma medium → +20 XP; reenviar a mesma questão fora da revisão → +0 XP e o dia não passa a ser ativo por causa disso.
- **CA-8** XP total 99 → nível 1; 100 → nível 2; 299 → nível 2; 300 → nível 3.
- **CA-9** Submissão que leva o streak de 2 para 3 → o resumo inclui a conquista `streak-3`; no dia seguinte, com streak 4, ela não é concedida de novo.
- **CA-10** Submissão não aceita não altera streak, XP nem conquistas.
- **CA-11** Se a gravação falhar no meio, nada é persistido (sem XP sem submissão, nem o contrário).
- **CA-12** Aceita na primeira submissão de uma questão → `first-try`; na segunda → não.
- **CA-13** Desistir de uma questão e depois tê-la aceita → +0 XP, o dia não se torna ativo, e o resumo informa o motivo.

## Fora de escopo

Streak freeze, gemas, loja, metas diárias configuráveis, ranking.
