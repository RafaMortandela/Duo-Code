# 006 — Conteúdo do MVP

## Objetivo

Preencher a trilha com 30 questões originais que cubram os padrões mais cobrados em entrevistas de bigtech, cada uma com solução de referência e testes confiáveis.

## Princípios de conteúdo

- **Original.** Enunciado, contexto, exemplos e nomes são escritos do zero. O *padrão* algorítmico é clássico; o texto não é cópia nem paráfrase próxima de nenhuma plataforma.
- **Em inglês**, no formato de entrevista: descrição, exemplos com explicação, restrições de tamanho.
- **Foco no padrão.** Cada questão existe para treinar uma técnica específica, declarada em `tags`.
- **Progressão.** Em cada unidade, a primeira questão apresenta o padrão, a segunda o aplica e a terceira o combina com outra ideia.

## Grade (10 unidades × 3 questões)

| Unidade | Padrões treinados | Dificuldades |
|---|---|---|
| Arrays & Hashing | contagem com hash map, complemento em uma passada, agrupamento por chave canônica | E, E, M |
| Two Pointers | ponteiros convergentes, partição in-place, par em array ordenado | E, E, M |
| Sliding Window | janela fixa, janela variável com contagem, janela com restrição de distintos | E, M, M |
| Stack | balanceamento, pilha monotônica, avaliação de expressão | E, M, M |
| Binary Search | busca clássica, busca em array rotacionado, busca na resposta | E, M, M |
| Linked List | inversão, ponteiros rápido/lento, mescla de listas ordenadas | E, E, M |
| Trees | DFS com profundidade, BFS por nível, validação de BST | E, M, M |
| Heap | top-k, mescla de k sequências, mediana em fluxo | M, M, H |
| Graphs | componentes em grade, ordenação topológica, menor caminho em grade (BFS) | M, M, H |
| Dynamic Programming | DP 1D, problema da mochila/troco, DP em duas sequências | E, M, H |

Total: 11 easy, 16 medium, 3 hard. Os títulos e contextos de cada questão são definidos no `plan.md` desta spec.

## Requisitos

- **RF-1** 30 pastas em `content/problems/`, no formato da spec 002, e `content/units.json` com as 10 unidades.
- **RF-2** Cada questão tem ao menos 2 exemplos no enunciado, 3 testes visíveis e 5 ocultos.
- **RF-3** Os testes ocultos cobrem os casos de borda do padrão (entrada mínima, duplicatas, negativos, já ordenado, tamanho máximo quando relevante).
- **RF-4** Ao menos um teste oculto por questão é grande o bastante para reprovar por tempo a solução de complexidade ingênua, quando existir uma solução melhor esperada.
- **RF-5** Cada questão tem de 1 a 3 dicas progressivas (a primeira aponta o padrão, a última quase descreve o algoritmo) e a complexidade esperada.
- **RF-6** `solution.py` é legível e comentada no nível de explicar a ideia central — serve como material de estudo.

## Critérios de aceitação

- **CA-1** `python3 scripts/validate_content.py` termina com sucesso: esquema válido, toda solução passa, todo starter falha.
- **CA-2** O validador confirma 30 questões, 10 unidades, 3 por unidade, sem slug duplicado nem questão órfã.
- **CA-3** Toda solução de referência roda cada teste em menos da metade do `time_limit_ms`.
- **CA-4** Para as questões marcadas com teste de desempenho, uma solução ingênua guardada em `content/problems/<slug>/naive.py` recebe `time_limit` no validador.
- **CA-5** Revisão manual: nenhum enunciado reproduz texto de plataformas existentes.

## Fora de escopo

Questões de system design, SQL, concorrência; editoriais longos; vídeos; mais de uma linguagem.
