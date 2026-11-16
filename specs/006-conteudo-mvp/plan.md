# 006 — Conteúdo do MVP · plano técnico

Implementa [spec.md](spec.md).

## Como as questões são escritas

- **Autoria em `scripts/authoring/`**: cada `unit_*.py` descreve as questões de algumas unidades e `build_all.py` gera as pastas em `content/problems/`. As pastas geradas são versionadas e continuam sendo a fonte que o app lê; os scripts só existem para escrevê-las sem erro.
- **Garantias na geração** (`lib.py`):
  - a resposta esperada dos testes ocultos vem da solução de referência, executada pelo mesmo harness do app;
  - os testes visíveis têm a resposta escrita à mão e são conferidos contra a solução;
  - a solução é comparada com uma **força bruta independente** em 300 entradas pequenas aleatórias — é o que protege contra uma solução de referência errada que só concorda consigo mesma;
  - os exemplos do enunciado são gerados a partir dos testes visíveis, então nunca divergem deles.
- **`naive.py`** entra onde existe uma solução ingênua óbvia e mais lenta; o validador confirma que ela estoura o tempo (CA-4).
- **Saída determinística:** onde a resposta natural admitiria várias ordens, o enunciado fixa uma (grupos ordenados, menor id primeiro), para não precisar de comparador novo.
- **Limite de recursão:** árvores de teste têm altura até 500 e as grades até 60×60; o enunciado da questão de grade avisa que um preenchimento recursivo pode estourar a pilha.

## Questões

| Unidade | Questões (dificuldade) |
|---|---|
| Arrays & Hashing | Wardrobe Favorite (E) · Gift Card Pair (E) · Scrambled Labels (M) |
| Two Pointers | Mirror Caption (E) · Sold Out to the Back (E) · Duet Budget (M) |
| Sliding Window | Best K-Day Stretch (E) · Fresh Playlist Run (M) · Flavor Basket (M) |
| Stack | Balanced Brackets (E) · Price Drop Alert (M) · Receipt Calculator (M) |
| Binary Search | First Row At Least (E) · Rotated Shelf (M) · Print Speed (M) |
| Linked List | Rewind the Playlist (E) · Middle of the Queue (E) · Merge Two Setlists (M) |
| Trees | Tallest Branch (E) · Floor by Floor (M) · Catalog Check (M) |
| Heap | Top Scores (M) · Merge the Timelines (M) · Running Median (H) |
| Graphs | Count the Blobs (M) · Launch Order (M) · One Wall Escape (H) |
| Dynamic Programming | Stair Hops (E) · Exact Change (M) · Typo Fix Cost (H) |

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1, CA-3, CA-4 | `python3 scripts/validate_content.py` |
| CA-2 | validador (unidades) + `cargo test` (30 questões, 10 unidades, 3 por unidade) |
| CA-5 | Revisão manual pela usuária |
