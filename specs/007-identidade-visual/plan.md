# 007 — Identidade visual "IT girl" · plano técnico

Implementa [spec.md](spec.md). Os tokens de cor, as fontes e o modo escuro já existem desde a 001; esta etapa fecha o que faltava.

## Decisões

- **Contraste medido, não estimado.** Um teste lê `tokens.css`, calcula a razão de contraste WCAG de cada par texto/fundo realmente usado, nos dois modos, e falha abaixo de 4,5:1 (3:1 para ícones). A medição reprovou três cores da paleta original, que foram ajustadas:
  - `--primary-strong` `#E6337A` → `#D81B68` (texto branco dos botões: 4,1 → 4,9);
  - verde de "aceito" em texto `#1F8A63` → `#187452` (4,0 → 5,4);
  - `--error` no modo claro `#D7264F` → `#C81C45` (4,1 → 4,7 sobre rosa-claro).
- **Novos tokens:** `--on-accent` (texto/ícone sobre lavanda, menta e pêssego, que são claros nos dois modos) e `--accent-text` (rosa legível como texto em cada modo).
- **Ícones em dois tons:** cada ícone tem um traço arredondado e, opcionalmente, uma camada de preenchimento suave na mesma cor (`currentColor` a 18%). Continuam herdando a cor do contexto.
- **Mascote:** componente `Mascot` em SVG com quatro poses (`happy`, `celebrating`, `sleepy`, `sad`), colorido só por tokens. É decorativo (`aria-hidden`): nenhuma informação depende dele.
- **Movimento:** `MotionProvider` combina `prefers-reduced-motion` com a opção "Animações" de Ajustes e grava `data-motion="off"` em `<html>`. Com movimento desligado, o CSS zera animações e transições e o confete nem é renderizado.
- **Confete:** corações e estrelas em CSS puro, só quando a submissão rende XP.
- **Editor:** dois temas registrados, `duo-rose` e `duo-rose-noir`, montados a partir dos tokens.
- **Ícone do app e da bandeja:** desenhado em `src-tauri/icons/source.svg` (laço + `</>`) e convertido para todos os tamanhos com `tauri icon`.

## Mapeamento critério → verificação

| Critério | Verificação |
|---|---|
| CA-1 | Vitest: `tokens.test.ts` |
| CA-2 | Vitest (tema troca na hora) + conferência no navegador (editor) |
| CA-3 | Vitest existentes (veredito e dificuldade têm ícone + rótulo) |
| CA-4 | Vitest: confete não renderiza com movimento reduzido |
| CA-5, CA-6 | `npm run check:literals` |
| CA-7 | Conferência no navegador nos dois modos; revisão final pela usuária |
