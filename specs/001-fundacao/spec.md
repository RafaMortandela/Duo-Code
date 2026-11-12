# 001 — Fundação

## Objetivo

Ter o esqueleto do app rodando: janela desktop, navegação entre as telas, banco local com migrações e os tokens do tema aplicados. Nenhuma feature de produto ainda — só a base sobre a qual as outras specs se apoiam.

## Histórias

- Como usuária, abro o Duo Code e vejo uma janela com menu lateral e as telas Home, Trilha, Revisão, Perfil e Ajustes (ainda vazias, mas já com a cara do app).
- Como usuária, fecho e reabro o app e minhas configurações continuam lá.

## Requisitos

- **RF-1** Projeto Tauri 2 + React + TypeScript (Vite) que sobe com `npm run tauri dev` e empacota com `npm run tauri build`.
- **RF-2** Navegação lateral com as rotas: Home, Trilha, Questão (`/problem/:slug`), Revisão, Perfil, Ajustes.
- **RF-3** Banco SQLite criado no diretório de dados do app na primeira execução, com sistema de migrações versionadas e idempotentes.
- **RF-4** Tabela `settings` (chave/valor) e comandos `get_setting` / `set_setting`.
- **RF-5** Tokens de tema (cores, raios, sombras, fontes) em `src/styles/tokens.css`, nos modos claro e escuro, conforme a spec 007. Fontes empacotadas.
- **RF-6** Todos os textos da interface em `src/copy.ts`.
- **RF-7** Camada `src/api/` com wrappers tipados para cada comando Tauri.
- **RF-8** Erros de comando chegam ao frontend em formato único (`{ code, message }`) e aparecem em um toast.

## Critérios de aceitação

- **CA-1** Em uma máquina sem banco, abrir o app cria o arquivo SQLite e aplica todas as migrações.
- **CA-2** Rodar as migrações duas vezes não gera erro nem duplica dados.
- **CA-3** `set_setting("theme","dark")` seguido de reinício do app → `get_setting("theme")` retorna `"dark"`.
- **CA-4** Cada item do menu leva à sua rota, e o item ativo fica destacado.
- **CA-5** Com o sistema em modo escuro e a configuração de tema em "automático", o app abre no tema escuro.
- **CA-6** O app abre e navega com a rede desligada.
- **CA-7** Nenhum componente contém cor hexadecimal ou texto de interface literal (verificado por lint/grep no CI local).

## Fora de escopo

Conteúdo das telas, runner, gamificação, bandeja do sistema.
