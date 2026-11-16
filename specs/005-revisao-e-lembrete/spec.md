# 005 — Revisão espaçada e lembrete diário

## Objetivo

Resolver uma questão uma vez não basta para lembrar dela na entrevista. A revisão espaçada traz questões antigas de volta em intervalos crescentes; o lembrete diário evita que o streak caia por esquecimento.

## Histórias

- Como usuária, vejo quantas revisões vencem hoje e resolvo a fila.
- Como usuária, depois de acertar uma revisão digo o quanto foi difícil, e isso define quando ela volta.
- Como usuária, recebo uma notificação no horário que escolhi se ainda não resolvi nada hoje.
- Como usuária, posso desligar o lembrete ou mudar o horário.

## Regras de revisão

- Estágios e intervalos: 0 → 1 dia, 1 → 3, 2 → 7, 3 → 14, 4 → 30 dias.
- Na primeira resolução, a questão entra no estágio 0, com vencimento em hoje + 1 dia.
- Uma questão está **vencida** quando a data de vencimento é hoje ou anterior.
- Na revisão, o editor começa do código inicial (não do rascunho nem da solução anterior).
- Ao ter a revisão aceita, a usuária avalia:
  - **Difícil** → volta ao estágio 0.
  - **Ok** → sobe 1 estágio.
  - **Fácil** → sobe 2 estágios.
  - O estágio máximo é 4; nele, a questão continua voltando a cada 30 dias.
- **Não consegui** (desistir e ver a solução) → estágio 0, sem XP, e não conta para o streak.
- O novo vencimento é sempre contado a partir do dia em que a revisão foi feita, não do vencimento original.
- A fila é ordenada da mais atrasada para a menos atrasada.
- Revisão aceita rende 5 XP e torna o dia ativo (spec 003).
- Só conta como revisão a submissão feita **no modo revisão** de uma questão **vencida**. Reenviar pela tela normal, ou revisar o que ainda não venceu, não rende nada.
- **Avaliação pendente:** no momento em que a revisão é aceita, o XP é creditado e a questão é reagendada provisoriamente como **Ok**. A avaliação escolhida em seguida substitui esse agendamento. Assim, fechar o app antes de avaliar não perde o XP nem deixa a questão presa na fila.
- Toda questão com submissão aceita entra na revisão — inclusive aquelas em que houve desistência (spec 003).

## Regras do lembrete

- Configurações: ligado/desligado (padrão ligado) e horário (padrão 19:00).
- No horário configurado, se o dia ainda não é ativo, o app envia uma notificação do sistema. Se o dia já é ativo, não envia nada.
- No máximo uma notificação por dia.
- O texto varia com a situação: streak em risco ("Seu streak de 5 dias tá em risco, diva") ou streak zerado (convite para recomeçar).
- Clicar na notificação abre o app na Home.
- Para o lembrete funcionar com a janela fechada, o app continua na bandeja do sistema; fechar a janela minimiza para a bandeja, e o menu da bandeja tem "Abrir" e "Sair".
- Opção "Iniciar com o sistema" (padrão desligado).

## Requisitos

- **RF-1** Funções puras `next_review(estagio, avaliacao, hoje)` e `due_queue(progresso, hoje)`.
- **RF-2** Tela Revisão mostra a fila do dia e, vazia, uma mensagem com a data da próxima revisão.
- **RF-3** Home mostra o contador de revisões vencidas.
- **RF-4** Após revisão aceita, a avaliação (difícil/ok/fácil) é obrigatória antes de sair da tela de resultado.
- **RF-5** Função pura `should_notify(agora, config, dia_ativo, ja_notificou_hoje)`.
- **RF-6** Ajustes tem os controles do lembrete, de iniciar com o sistema e um botão "Testar notificação".
- **RF-7** Se o computador estava desligado/suspenso no horário, a notificação é enviada na próxima verificação do mesmo dia, se ainda couber.

## Critérios de aceitação

- **CA-1** Questão resolvida pela primeira vez na segunda → vence na terça.
- **CA-2** Estágio 1, avaliação **ok**, feita no dia D → estágio 2, vence em D + 7.
- **CA-3** Estágio 1, avaliação **fácil** → estágio 3, vence em D + 14.
- **CA-4** Estágio 3, avaliação **fácil** → estágio 4 (não ultrapassa), vence em D + 30.
- **CA-5** Estágio 3, avaliação **difícil** → estágio 0, vence em D + 1.
- **CA-6** Revisão vencida há 5 dias, feita hoje com **ok** → novo vencimento contado a partir de hoje.
- **CA-7** **Não consegui** → estágio 0, nenhum XP, o dia não se torna ativo por isso.
- **CA-8** Fila com vencimentos em D−3, D e D−1 → ordem D−3, D−1, D; questão com vencimento em D+1 não aparece.
- **CA-9** Único evento do dia é uma revisão aceita → o streak conta o dia e são creditados 5 XP.
- **CA-10** `should_notify`: 19:00, lembrete ligado, dia inativo, ainda não notificou → `true`; mesmo cenário com dia ativo → `false`; com lembrete desligado → `false`; já notificou hoje → `false`.
- **CA-11** Horário 19:00, app aberto às 21:00 sem atividade no dia → notifica uma vez.
- **CA-12** Fechar a janela mantém o ícone na bandeja; "Sair" encerra o processo. (Verificação manual.)
- **CA-13** "Testar notificação" exibe uma notificação do sistema. (Verificação manual.)
- **CA-14** Revisão aceita e app fechado sem avaliar → 5 XP creditados e a questão reagendada como **ok**; ao reabrir, ela não está mais na fila de hoje.
- **CA-15** Submissão aceita de questão vencida feita fora do modo revisão → não rende XP, não muda o agendamento e a questão continua na fila.

## Fora de escopo

Algoritmos adaptativos (SM-2 completo, FSRS), vários lembretes por dia, notificações push em celular.
