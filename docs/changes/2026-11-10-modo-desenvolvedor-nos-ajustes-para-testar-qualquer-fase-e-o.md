# Modo desenvolvedor nos ajustes para testar qualquer fase e o chefao

- **Data:** 2026-11-10
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** interface

## O que mudou

- `src/store/gameStore.ts` — `Settings.devMode` (persistido junto com os outros
  ajustes). `isEraUnlocked` e `canFaceBoss` devolvem `true` quando ele esta
  ligado; nada mais no store muda.
- `src/ui/MainMenu.tsx` — botao **Modo desenvolvedor** no painel de Ajustes, com
  o texto do que ele abre, e a lista de zonas passou a perguntar ao store
  (`isEraUnlocked`) em vez de chamar `eraUnlocked` direto. O botao "Continuar"
  continua levando a era mais avancada **concluida de verdade**, para quem liga o
  modo so para espiar nao ser jogado na Era 6.
- `src/ui/WorldScreen.tsx` — a porta da prova abre sem cobrar as duas missoes
  quando o modo esta ligado.
- `src/ui/BossScreen.tsx` — no modo desenvolvedor os seis poderes entram na luta
  no nivel maximo (`POWERS.DAMAGE_MULTIPLIER.length - 1`). Sem isso nao daria
  para testar o chefao num save sem poder nenhum: a tela nao teria nenhuma
  resposta para oferecer.
- `src/data/ui.pt-BR.json` — `settings.devMode`, `settings.devModeText` (o que
  acontece se ligar) e `settings.devModeOn` (o que esta valendo agora).
- `src/styles/app.css` — `.menu__dev--on` (borda de aviso) e `.menu__devText`.
- `tests/e2e/smoke.spec.ts` — 3 testes: destranca as seis zonas e o chefao; a
  zona abre direto e a porta leva a prova com as missoes em aberto; e o save
  continua zerado depois de abrir o combate com os seis poderes. Alem disso, o
  teste de 44 px das quatro telas novas virou um teste por era: junto, no iPhone
  12 emulado, ele chegava perto do limite de 30 s e falhava por tempo.

## Por que

Pedido de Leticia: "pode adicionar um botão em ajuste para modo desenvolvedor que
posso testar todas as fases e boss sem precisar passar por todas elas".

Com as seis eras prontas, testar a Era 5 ou o chefao a mao custava zerar as
anteriores — ou colar um save no console, que e o que os testes de ponta a ponta
fazem (`seedCleared`) e que nao serve para quem so quer abrir o jogo e olhar.

## O que isso quebra

Nada. O ajuste nasce desligado, e save gravado antes desta mudanca nao tem a
chave `devMode`: fica indefinido, que e falso para todos os usos. Por isso
`STORAGE.VERSION` nao subiu.

Um ponto de atencao para quem for mexer: a lista de zonas do menu nao usa mais
`eraUnlocked` direto. Quem precisar da regra **pura** de liberacao continua
chamando `eraUnlocked`; quem quiser a regra **com o atalho de teste** usa
`isEraUnlocked` do store.

## Decisoes que tomei sozinho

Registrada em `DECISIONS.md` como **D53**. Em resumo:

- O modo **destranca telas, nao concede progresso**. Ele nao marca era como
  concluida, nao da estrela, nao da XP e nao enche a mochila. Progresso falso
  mentiria no `clearedEras`, e o save ficaria contando uma historia que nao
  aconteceu — teste de ponta a ponta inclusive confere que o save segue zerado.
- A consequencia disso: no chefao, os poderes valem no nivel maximo (senao nao da
  para lutar), mas a mochila continua vazia. Para testar item de combate, o
  caminho e jogar a era que entrega o item, ou colar o save de teste.
- O ajuste fica junto dos outros, visivel, com o texto dizendo o que faz. Nao
  escondi atras de atalho de teclado nem de parametro de URL: o jogo e de
  celular e nao pode exigir teclado, e um parametro de URL ninguem do grupo
  lembraria.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

No navegador:

```bash
npm run dev
```

Menu > **Ajustes** > **Modo desenvolvedor** > **Voltar**. O menu passa a mostrar
"Enfrentar o BUG Day 0", e em **Zonas** as seis ficam tocaveis. Dentro de
qualquer zona, a porta de cima leva a prova mesmo sem as missoes feitas.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 117 testes nos 3 dispositivos
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu ter
      afrouxado nenhum deles**
- [x] Nao mexi em `tests/contract/`: o modo desenvolvedor vive na camada de
      interface, e os contratos seguem cobrando a regra pura de liberacao.
