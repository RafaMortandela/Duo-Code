# 002 — Questões e runner Python

## Objetivo

Permitir ler uma questão, escrever a solução em Python em um editor decente, executá-la contra casos de teste e saber se foi aceita. É o núcleo do app: sem isso não há o que gamificar.

## Histórias

- Como usuária, abro uma questão e vejo enunciado, exemplos e restrições de um lado e o editor do outro.
- Como usuária, clico em **Executar** para rodar os testes visíveis e ver, caso a caso, o que era esperado e o que meu código devolveu.
- Como usuária, clico em **Enviar** para rodar também os testes ocultos e receber o veredito.
- Como usuária, se travar, peço uma dica; se desistir, vejo a solução de referência.
- Como usuária, saio da questão e volto depois: meu código continua lá.

## Formato de questão

Cada questão é uma pasta `content/problems/<slug>/`:

| Arquivo | Conteúdo |
|---|---|
| `meta.json` | `id`, `title`, `difficulty` (`easy`/`medium`/`hard`), `unit`, `tags`, `entrypoint` (nome da função), `params` (`[{name, type}]`), `returns`, `comparator` (`exact` \| `unordered` \| `float`), `time_limit_ms` (padrão 2000), `hints` (até 3), `complexity` (tempo/espaço esperados) |
| `statement.md` | Enunciado em inglês, com exemplos e restrições |
| `starter.py` | Assinatura da função com corpo vazio |
| `solution.py` | Solução de referência |
| `tests.json` | `[{ "args": [...], "expected": ..., "hidden": bool }]` |

Tipos aceitos em `params`/`returns`: `int`, `float`, `str`, `bool`, `list[T]`, `ListNode`, `TreeNode`. Listas ligadas e árvores são escritas em JSON como arrays (árvore em ordem de nível, com `null`) e o harness converte na ida e na volta.

## Requisitos

- **RF-1** Carregar e validar todas as questões na inicialização; questão inválida é ignorada e registrada em log, sem derrubar o app.
- **RF-2** Tela de questão com enunciado renderizado (Markdown), editor Monaco com realce de Python, e painel de resultados.
- **RF-3** **Executar** roda só os testes com `hidden: false`. **Enviar** roda todos.
- **RF-4** O runner grava o código e um harness em diretório temporário e executa `python3 -I` em subprocesso; o diretório é removido ao final.
- **RF-5** Vereditos: `accepted`, `wrong_answer`, `runtime_error`, `time_limit`, `syntax_error`.
- **RF-6** Por caso de teste, o resultado traz: passou ou não, entrada, esperado, obtido, `stdout` capturado, mensagem de erro com traceback (linhas relativas ao código da usuária) e tempo em ms. Em caso oculto, entrada, esperado, obtido e `stdout` não são mostrados enquanto a questão não é vencida. Quando uma submissão é **aceita**, os casos ocultos são revelados por completo, para a usuária ver o que cada um testava.
- **RF-7** Estourado o tempo limite, o processo é morto; um loop infinito não trava a interface.
- **RF-8** Toda submissão (**Enviar**) é gravada em `submissions` com código, veredito, data local e duração.
- **RF-9** O rascunho do editor é salvo automaticamente por questão e restaurado ao reabrir. Há um botão para voltar ao código inicial.
- **RF-10** Dicas são reveladas uma por vez. **Ver solução** só fica disponível depois de aceita ou após a usuária confirmar que desistiu; desistir não rende XP nem conta para o streak.
- **RF-11** Se `python3` não for encontrado, o app mostra uma mensagem clara de como instalar, em vez de um erro genérico.
- **RF-12** `scripts/validate_content.py` verifica, para cada questão, que o esquema é válido, que `solution.py` passa em todos os testes e que `starter.py` não passa.
- **RF-13** As sugestões de autocompletar do editor aparecem legíveis. Nenhum estilo do app pode vazar para dentro do editor: classes CSS do app não usam os nomes genéricos que o Monaco usa (`main`, `icon`, `toggle`, `contents`…), o que é conferido por `npm run check:literals`.

## Critérios de aceitação

- **CA-1** Solução correta + **Enviar** → veredito `accepted`, todos os casos marcados como aprovados.
- **CA-2** Solução que erra um caso → `wrong_answer`, com esperado e obtido do primeiro caso visível que falhou.
- **CA-3** Código que lança exceção → `runtime_error` com o tipo da exceção e o número da linha no código da usuária.
- **CA-4** Código com erro de sintaxe → `syntax_error` com linha e coluna, sem executar nenhum teste.
- **CA-5** `while True: pass` → `time_limit` em até o limite + 1 s, e nenhum processo `python3` órfão permanece.
- **CA-6** `print()` no código aparece no `stdout` do caso e não interfere no veredito.
- **CA-7** Com `comparator: unordered`, `[1,2]` e `[2,1]` são considerados iguais; com `float`, diferença menor que `1e-6` é aceita.
- **CA-8** Questão com `ListNode`: entrada `[1,2,3]` chega à função como lista ligada e o retorno é comparado como array.
- **CA-9** **Executar** não cria registro em `submissions`; **Enviar** cria exatamente um.
- **CA-10** Digitar código, fechar o app e reabrir a questão → o código digitado está no editor.
- **CA-11** Pasta de questão sem `tests.json` → a questão não aparece e o app abre normalmente.
- **CA-12** O validador falha (código de saída ≠ 0) se alguma solução de referência não passar.
- **CA-13** Submissão aceita → os casos ocultos vêm com entrada, esperado e obtido. Submissão não aceita → os casos ocultos vêm sem nenhum desses dados, inclusive os que passaram.
- **CA-14** Com o cursor depois de uma palavra já digitada, abrir as sugestões mostra o texto de cada item dentro da lista. (Conferência no navegador e no build de produção.)

## Segurança

O código roda com as permissões da própria usuária, sem sandbox além de `-I`, diretório temporário e timeout. É aceitável porque o código executado é o que ela mesma escreveu, na máquina dela. Importar questões de terceiros não é um caso de uso do MVP.

## Fora de escopo

Outras linguagens, depurador, medição de memória, comparação de desempenho com outras pessoas.
