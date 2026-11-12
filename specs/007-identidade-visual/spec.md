# 007 — Identidade visual "IT girl"

## Objetivo

O Duo Code deve ter cara própria: rosa, fofo e bem acabado — um app que dá vontade de abrir todo dia. Fofo, mas não infantil, e sem atrapalhar a leitura de código.

## Paleta

### Claro

| Token | Cor | Uso |
|---|---|---|
| `--bg` | `#FFF5F8` | fundo da janela |
| `--surface` | `#FFFFFF` | cartões, painéis |
| `--surface-alt` | `#FFE4EC` | áreas de destaque suave, hover |
| `--primary` | `#FF5C9A` | botões, itens ativos, barras de progresso |
| `--primary-strong` | `#E6337A` | hover/pressionado, links |
| `--pastel` | `#FFB8D2` | bordas, preenchimentos decorativos |
| `--lavender` | `#C9A7F5` | acento secundário (XP, níveis) |
| `--peach` | `#FFC9A8` | acento terciário (streak, calor) |
| `--text` | `#4A1F36` | texto principal |
| `--text-muted` | `#8A5A72` | texto secundário |
| `--success` | `#5CCFA0` | aceito |
| `--error` | `#D7264F` | erro, resposta errada |

### Escuro — "rosé noir"

| Token | Cor |
|---|---|
| `--bg` | `#1F0F18` |
| `--surface` | `#2E1724` |
| `--surface-alt` | `#3D1F30` |
| `--text` | `#FFE9F1` |
| `--text-muted` | `#C99BB0` |

Primária e acentos são os mesmos do modo claro. Dificuldades: easy em menta, medium em pêssego, hard em pink forte — sempre acompanhadas do rótulo em texto.

## Forma e tipografia

- Raios: 12 px (campos), 20 px (cartões), pílula (botões e etiquetas).
- Sombras suaves com tom rosado, nunca cinza puro.
- Títulos e interface: **Nunito**. Código: **JetBrains Mono**. Ambas empacotadas.
- Espaçamento generoso; a tela de questão prioriza a área do editor.

## Ícones

Conjunto próprio em SVG, em `src/assets/icons/`, com traço arredondado de 2 px e preenchimento pastel, coloridos via tokens:

- **Streak:** coração em chamas com brilhinho (apagado e cinza-rosado quando zerado).
- **XP:** estrelinha. **Nível:** coroa. **Conquistas:** medalhas com laço.
- **Unidades:** bolhas com ícone do tópico (pilha de macarons para Stack, árvore com flores para Trees, colar de pérolas para Linked List, e assim por diante).
- **Navegação:** casinha, mapa com coração, espelho de mão (revisão), perfil com laço, engrenagem-flor.
- **App e bandeja:** laço com `</>`.

## Mascote

Personagem original: uma gatinha com laço e notebook. Quatro poses em SVG — animada (Home), comemorando (aceita / conquista), sonolenta (lembrete, fila vazia) e triste (streak perdido).

## Editor

Dois temas do Monaco: `duo-rose` (claro) e `duo-rose-noir` (escuro). Palavras-chave em pink forte, strings em menta escurecida, números em lavanda, comentários em rosa acinzentado. A legibilidade do código tem prioridade sobre a paleta.

## Movimento

- Confete de corações e estrelas quando a solução é aceita.
- Chama do streak pulsa ao garantir o dia.
- Toast de conquista entra com brilho.
- Nó da trilha "desabrocha" ao liberar.
- Durações curtas (150–400 ms). Com `prefers-reduced-motion`, tudo vira transição de opacidade ou é removido.

## Tom de voz

Curto, encorajador, com gírias de internet no estilo "divou". Exemplos:

| Situação | Texto |
|---|---|
| Solução aceita | "Divou! ✨" |
| Streak mantido | "Divou! 🔥 5 dias seguidos" |
| Aceita de primeira | "Serviu demais nessa solução" |
| Unidade concluída | "Ícone! Unidade concluída" |
| Resposta errada | "Quase, diva. Olha esse caso aqui 👀" |
| Streak perdido | "Poxa, diva, o streak caiu… bora recomeçar?" |
| Lembrete | "Seu streak de 5 dias tá em risco, diva" |

Mensagens de erro técnico (traceback, falha do runner) ficam neutras e precisas. Todo texto mora em `src/copy.ts`.

## Requisitos

- **RF-1** Tokens em `src/styles/tokens.css` para os dois modos; seletor de tema em Ajustes: automático, claro, escuro.
- **RF-2** Conjunto de ícones e as quatro poses da mascote como componentes React que herdam cores dos tokens.
- **RF-3** Temas do Monaco registrados e trocados junto com o tema do app.
- **RF-4** Animações implementadas em CSS/SVG, sem biblioteca pesada, desligáveis em Ajustes.
- **RF-5** Ícone do aplicativo e da bandeja gerados nos tamanhos exigidos pelo Tauri.

## Critérios de aceitação

- **CA-1** Todos os pares texto/fundo usados para texto corrido atingem contraste ≥ 4,5:1 nos dois modos (teste automatizado sobre os tokens). Texto branco sobre `--primary` só em tamanho grande/negrito (≥ 3:1); caso contrário usa-se `--primary-strong`.
- **CA-2** Trocar o tema em Ajustes muda interface e editor na hora, sem reiniciar.
- **CA-3** Vereditos e dificuldades são identificáveis sem cor (ícone + rótulo).
- **CA-4** Com `prefers-reduced-motion` ativo, o confete não é renderizado.
- **CA-5** Nenhum componente tem cor literal ou texto literal de interface (mesma verificação da spec 001).
- **CA-6** O app funciona sem rede: nenhuma fonte ou imagem é carregada da internet.
- **CA-7** Revisão manual de todas as telas nos dois modos, em janela de 1024×700 e maximizada.

## Fora de escopo

Temas alternativos, personalização de cores, roupas/acessórios da mascote, efeitos sonoros.
