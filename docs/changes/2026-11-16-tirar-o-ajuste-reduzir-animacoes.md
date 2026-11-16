# Tirar o ajuste "Reduzir animações"

- **Data:** 2026-11-16
- **Autor:** agente (Claude Opus 5.5) a pedido de Leticia
- **Tipo:** interface

## O que mudou

- `src/ui/MainMenu.tsx`, `src/data/ui.pt-BR.json` — o botão "Reduzir animações"
  saiu de Ajustes.
- `src/store/gameStore.ts` — `Settings.reduceMotion` deixou de existir.
- `src/App.tsx` — a raiz não recebe mais a classe `.reduce-motion`.
- `src/styles/global.css`, `src/styles/fx.css`, `src/styles/app.css` — saíram as
  regras de `.reduce-motion` e de `@media (prefers-reduced-motion: reduce)` que
  zeravam duração, atraso e transição.
- `src/ui/WorldScreen.tsx` — o laço do mapa sempre roda; saíram o desenho parado,
  o "teleporte" do Bit e a fala que aparecia inteira de uma vez.
- `src/ui/MenuBanner.tsx`, `src/ui/MissionRunner.tsx`, `src/ui/MissionResult.tsx`,
  `src/fx/useCountUp.ts` — a prop `reduceMotion` e o parâmetro `enabled` saíram.
- `tests/e2e/smoke.spec.ts` — saiu o teste do ajuste, e `reduceMotion` dos saves
  semeados.
- `CLAUDE.md`, `DECISIONS.md` (D68) — a regra que citava o ajuste foi atualizada.

## Por que

Pedido de Leticia: "Vamos tirar essa redução de animações do jogo não faz mais
sentido".

## O que isso quebra

Save antigo com `settings.reduceMotion: true` continua abrindo; a chave fica
ignorada e o jogo passa a animar. `useCountUp` perdeu o terceiro parâmetro
(`enabled`): quem o chamava com quatro argumentos passa a chamar com três.

## Decisoes que tomei sozinho

Tirei também a resposta a `prefers-reduced-motion` do sistema, não só o botão.
Sem isso, quem tem a opção ligada no celular continuaria vendo o jogo parado e
sem ter como mudar dentro dele. Registrado em `DECISIONS.md` (D68).

## Como conferir

```bash
npm run ci
npm run test:e2e
```

Em Ajustes não aparece mais "Reduzir animações", e o mapa, as estrelas e a
pontuação animam mesmo com "reduzir movimento" ligado no sistema.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 141 testes (47 por dispositivo)
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — nao mexi
