# Constitution — Duo Code

Princípios que valem para todas as specs. Uma spec que contrarie algo daqui precisa justificar a exceção explicitamente.

## Produto

Duo Code é um app desktop para treinar entrevistas de bigtech (foco Google). Junta um banco de questões de código com a motivação diária do Duolingo: resolver pelo menos uma questão por dia mantém o streak e rende recompensas.

## Princípios

1. **Spec antes de código.** Cada feature tem `spec.md` (o quê e por quê, com critérios de aceitação), depois `plan.md` (como) e `tasks.md` (passos). Código só depois da spec aprovada. Se a implementação revelar que a spec está errada, corrige-se a spec primeiro.
2. **Critério de aceitação vira teste.** Todo critério numerado (`CA-n`) tem ao menos um teste automatizado, ou uma verificação manual descrita quando automatizar não for viável (ex.: notificação do sistema).
3. **Offline-first.** O app funciona sem internet, sem conta e sem telemetria. Fontes, ícones e conteúdo vão empacotados.
4. **Regras de domínio puras.** Streak, XP, níveis, conquistas, trilha e revisão espaçada são funções Rust sem I/O em `src-tauri/src/domain/`. Recebem data e estado como argumentos — nunca leem o relógio diretamente — para serem testáveis em qualquer "hoje".
5. **Frontend fino.** A interface exibe estado e dispara comandos; não decide regra de negócio.
6. **Conteúdo como dados.** Questões e trilha são arquivos em `content/`. Adicionar uma questão não exige mexer em código. Um validador garante que toda solução de referência passa nos próprios testes.
7. **Conteúdo original.** Enunciados são escritos do zero; nenhum texto é copiado de LeetCode, NeetCode ou similares.
8. **Os dados são da usuária.** O progresso fica em um arquivo SQLite local. Migrações nunca apagam progresso.
9. **Identidade consistente.** Nenhuma cor, raio ou fonte é escrita direto em componente: tudo vem dos tokens de tema. Nenhum texto de interface fica solto: tudo vem de `src/copy.ts`.
10. **Acessível mesmo sendo fofo.** Contraste AA para texto, estado nunca comunicado só por cor, animações respeitam `prefers-reduced-motion`.

## Convenções

- **Idioma:** interface e specs em português; enunciados das questões em inglês (como na entrevista real); código e identificadores em inglês.
- **Datas:** "dia" é sempre a data local da máquina no momento da submissão, gravada como `YYYY-MM-DD`.
- **Stack:** Tauri 2, React + TypeScript (Vite), Rust, SQLite (rusqlite), Monaco Editor. Exercícios resolvidos em Python 3 com o `python3` da máquina.
- **Testes:** `cargo test` (domínio e runner), Vitest (frontend), `scripts/validate_content.py` (conteúdo).

## Fora do escopo do MVP

Gemas, loja, streak freeze, ranking, contas/sincronização, outras linguagens além de Python, geração de questões por IA.
