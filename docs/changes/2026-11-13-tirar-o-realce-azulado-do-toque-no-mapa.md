# Tirar o realce azulado do toque no mapa

- **Data:** 2026-11-13
- **Autor:** agente (Claude Fable 5.2) a pedido de Leticia
- **Tipo:** correcao

## O que mudou

- `src/styles/app.css` — `.world__canvas` ganhou
  `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`,
  `user-select: none` e `outline: none`.
- `tests/e2e/smoke.spec.ts` — teste novo: o canvas do mapa tem o realce de toque
  transparente e nao e selecionavel.

## Por que

Relato de Leticia: "Quando uso no mobile e clico para o personagem andar a tela
fica azulada por um periodo queria tirar isso".

E o realce de toque do navegador do celular: todo elemento "clicavel" pisca com
uma pelicula azulada quando tocado. O canvas do mapa e clicavel e ocupa a tela
quase toda, entao cada passo do Bit piscava o mapa inteiro. `global.css` ja
desligava esse realce para botao e `.game-surface`, mas a tela da zona nao leva
essa classe e o canvas ficava de fora.

## O que isso quebra

Nada.

## Decisoes que tomei sozinho

Aproveitei para impedir selecao e o menu de toque longo ("salvar imagem") no
canvas. E o mesmo tratamento que os botoes ja tinham; nao virou decisao em
`DECISIONS.md`.

**Nao testei em celular de verdade.** O teste automatico confere que a regra
chega ao canvas nos navegadores emulados, mas a pelicula so aparece em aparelho
real — quem relatou precisa confirmar que sumiu.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

No celular: abrir uma zona e tocar no mapa varias vezes. Nao deve aparecer
pelicula azulada.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 144 testes (48 por dispositivo)
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — nao mexi
