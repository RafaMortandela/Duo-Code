# 004 — Trilha de unidades

## Objetivo

Dar um caminho claro em vez de uma lista solta de questões: unidades por padrão de entrevista, em ordem de dependência, que vão abrindo conforme a usuária avança — como o mapa do Duolingo.

## Histórias

- Como usuária, vejo a trilha inteira e sei onde estou, o que já concluí e o que ainda está bloqueado.
- Como usuária, abro uma unidade liberada e escolho qualquer uma das questões dela.
- Como usuária, sei exatamente o que falta para liberar a próxima unidade.

## Regras

- A trilha é definida em `content/units.json`: lista ordenada de `{ id, title, description, icon, problems: [slug] }`.
- Ordem do MVP: Arrays & Hashing → Two Pointers → Sliding Window → Stack → Binary Search → Linked List → Trees → Heap → Graphs → Dynamic Programming.
- A primeira unidade começa liberada.
- Uma unidade é liberada quando a anterior tem ao menos **2 questões resolvidas** (ou todas, se tiver menos de 2).
- Dentro de uma unidade liberada, todas as questões estão disponíveis, em qualquer ordem.
- Estados da unidade: `bloqueada`, `liberada` (0 resolvidas), `em andamento`, `concluída` (todas resolvidas).
- Estados da questão: `nova`, `tentada` (há submissão, nenhuma aceita), `resolvida`.
- Unidade liberada nunca volta a ficar bloqueada.

## Requisitos

- **RF-1** Função pura `trail_state(units, resolvidas)` que devolve o estado de cada unidade e questão.
- **RF-2** Tela Trilha mostra as unidades como um caminho vertical de nós, cada um com ícone, título, progresso (`2/3`) e estado visual distinto.
- **RF-3** Clicar em unidade liberada abre a lista de questões, com título, dificuldade e estado.
- **RF-4** Clicar em unidade bloqueada explica o que falta ("Resolva mais 1 questão de Stack").
- **RF-5** A Home sugere a próxima questão: a primeira não resolvida da unidade liberada mais avançada que ainda não está concluída.
- **RF-6** Ao liberar uma unidade nova, o resumo de recompensas da submissão avisa.
- **RF-7** `units.json` que referencia questão inexistente é erro de validação de conteúdo (`validate_content.py`); em execução, a referência é ignorada.
- **RF-8** Quando uma submissão é aceita (fora do modo revisão), a tela da questão oferece um botão para o **próximo desafio**: a mesma sugestão da Home (RF-5), já considerando a questão recém-resolvida. Se não sobrar nenhuma questão por resolver, não há botão: aparece uma mensagem parabenizando por ter concluído todos os desafios.

## Critérios de aceitação

- **CA-1** Sem nenhuma questão resolvida: unidade 1 `liberada`, demais `bloqueadas`.
- **CA-2** 1 de 3 resolvidas na unidade 1: unidade 1 `em andamento`, unidade 2 `bloqueada`.
- **CA-3** 2 de 3 resolvidas na unidade 1: unidade 2 `liberada`.
- **CA-4** 3 de 3 resolvidas: unidade 1 `concluída`.
- **CA-5** Abrir `/problem/<slug>` de uma unidade bloqueada redireciona para a Trilha com o aviso do que falta.
- **CA-6** A sugestão da Home, com unidade 1 em 2/3 e unidade 2 em 0/3, é a primeira questão da unidade 2.
- **CA-7** Com todas as unidades concluídas, a Home sugere a fila de revisão em vez de uma questão nova.
- **CA-8** Acrescentar uma unidade ao `units.json` a faz aparecer na trilha sem alteração de código.
- **CA-9** Submissão aceita com questões ainda por resolver → aparece o botão "Próximo desafio", que leva à questão sugerida, nunca à própria questão que acabou de ser resolvida.
- **CA-10** Submissão aceita da última questão que faltava → não há botão, e sim a mensagem de parabéns.
- **CA-11** Submissão não aceita, ou "Executar" → nem botão nem mensagem.

## Fora de escopo

Trilhas alternativas (por empresa, por dificuldade), testes de nivelamento para pular unidades, busca/filtro livre de questões.
