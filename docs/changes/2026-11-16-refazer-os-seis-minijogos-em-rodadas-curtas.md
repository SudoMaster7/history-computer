# Refazer os seis minijogos em rodadas curtas

- **Data:** 2026-11-16
- **Autor:** agente (Claude Fable 5.2 e Claude Opus 5.5) a pedido de Leticia
- **Tipo:** regra de jogo

## O que mudou

- `src/minigames/*/logic.ts` — os seis minijogos foram refeitos no molde da D69:
  rodadas curtas, sempre concluíveis, e a solução é o registro dos toques.
  Tear completa fios de um desenho que se repete; Circuitos arma chaves até a
  lâmpada acender; Mesa de Bits liga bits que somam um número; Rota leva o
  pacote de vizinha em vizinha; Cofre desfaz uma cifra de César; Detector
  descobre a regra por exemplos.
- `src/minigames/shared/` (novo) — `logic.ts` (`byDifficulty`, `replaySequence`),
  `useRounds.ts` (andamento das rodadas na tela) e `Frame.tsx` (moldura comum).
- `src/minigames/*/Screen.tsx` — as seis telas reescritas sobre a moldura comum.
- `src/minigames/*/index.ts` — saíram os tipos que não existem mais
  (`BitsSymbol`, `Gate`, `CircuitRef`, `VaultLink`).
- `src/minigames/*/logic.test.ts` — testes refeitos; novo
  `src/minigames/shared/logic.test.ts`.
- `src/core/constants.ts` — `LOOM`, `CIRCUIT`, `BITS`, `ROUTE`, `VAULT` e
  `MODEL` com as medidas novas; `SCORING.MISTAKE_PENALTY` e `MISTAKE_FLOOR`.
- `src/core/scoring.ts` — nova `mistakeEfficiency`.
- `tests/contract/api-surface.test.ts` — `mistakeEfficiency` entrou na lista
  (só acréscimo).
- `src/data/ui.pt-BR.json` — textos das seis telas refeitos; bloco novo
  `minigame` (rodada, erros, seguir).
- `src/data/minigames.pt-BR.json` — explicação e dicas das seis eras reescritas
  para o desafio novo.
- `src/styles/minigames.css` (novo) — estilo da moldura e das seis peças; os
  estilos das telas antigas saíram de `app.css` e `fx.css`.
- `src/ui/Gauge.tsx` — removido (era a barra de orçamento, que deixou de existir).
- `tests/e2e/smoke.spec.ts` — testes dos minijogos reescritos para as telas
  novas.
- `DECISIONS.md` — D69 a D72. `README.md` — números da suíte.

## Por que

Os minijogos antigos pediam o ótimo de um algoritmo clássico (Huffman, corte
mínimo, seleção de atributos) e podiam travar quem não chegava lá. Para o
público do jogo a missão tinha de sempre fechar, com o capricho decidindo as
estrelas, e cada desafio precisava caber em poucos toques no celular.

## O que isso quebra

- **Revoga D15, D16, D36 a D40, D45, D46 e D47** (ver D69 em `DECISIONS.md`).
- O formato de `instance` e de `solution` dos seis minijogos mudou. Quem chamava
  `generate`/`evaluate` com o formato antigo precisa refazer — no projeto, só os
  testes faziam isso, e foram refeitos.
- O save **não** muda: ele guarda estrelas e melhor pontuação, não instâncias.
  `STORAGE.VERSION` continua 1. Notas antigas ficam como estão; a próxima
  tentativa só sobrescreve se for melhor.
- Os tipos exportados pelos `index.ts` dos minijogos citados acima sumiram.

## Decisoes que tomei sozinho

- D70: as senhas do Cofre ficam no `logic.ts`, não em `data/`.
- D71: Circuitos e Mesa de Bits só mostram o resultado depois de "Testar" e
  "Gravar", para o jogador não acertar por tentativa ao vivo.
- D72: o e2e joga Tear e Circuitos no chute (prova que sempre fecha) e as outras
  eras jogando certo pelo que a tela mostra.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

Em cada terminal o minijogo mostra "Rodada 1 de N", um contador de erros e, ao
fechar a rodada, o botão "Próxima rodada" (na última, "Concluir"). Errar não
reprova: só tira estrela.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 147 testes (49 por dispositivo)
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que — só acrescentei
      `mistakeEfficiency` à superfície do `core/scoring`
