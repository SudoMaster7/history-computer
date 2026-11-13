# Dar vida ao jogo: mapa animado, fragmentos de memoria, som, telas dos minijogos e resultado com recompensa

- **Data:** 2026-11-13
- **Autor:** agente (Claude Fable 5.2) a pedido de Leticia
- **Tipo:** interface

## O que mudou

**Regra de jogo (nucleo, com teste):**

- `src/core/world.ts` — `fragmentsOf` e `fragmentAt` (onde ficam os fragmentos de
  memoria de cada zona, por seed sobre a planta); `isOccupied` e `approachPath`
  (o Bit nao atravessa terminal, personagem nem porta, e para ao lado deles).
  `findPath` nao mudou. `validateWorld` acusa zona em que um personagem tampa a
  passagem.
- `src/core/rpg.ts` — `collectFragment`: fragmento novo rende conhecimento uma
  vez so.
- `src/core/constants.ts` — `RPG.FRAGMENT_XP`, `WORLD.FRAGMENTS_PER_ZONE`,
  `WORLD.FRAGMENT_MIN_GAP`, `WORLD.FRAGMENT_TOP_MARGIN`.
- `src/store/gameStore.ts` — lista `fragments` no save e a acao
  `collectFragment`.

**Conteudo:**

- `src/data/fragments.pt-BR.json` + `fragments.ts` — 18 curiosidades, 3 por era.
- `src/data/ui.pt-BR.json` — textos novos em `world`, `mission`, `hud`,
  `settings`, `quiz`, `menu` e `boss`. Nenhuma chave antiga saiu nem mudou.

**Som e efeitos (`src/fx/`, pasta nova):**

- `sound.ts` — 16 efeitos sintetizados com a Web Audio API, sem arquivo de audio.
- `Burst.tsx` — estouro de particulas em CSS. `useCountUp.ts` — numero que sobe.

**Telas:**

- `src/ui/WorldScreen.tsx` — laco de animacao proprio (agua, personagens que
  respiram e olham para o Bit, poeira no passo, ciscos no ar por era);
  marcadores ("!" no terminal por fazer, estrelas no concluido, balao de fala,
  cadeado e seta na porta); fragmentos recolhiveis com a curiosidade; cartao de
  chegada na zona; fala com retrato e texto digitado; canvas com 3 px por pixel
  do mapa.
- `src/ui/worldArt.ts` (novo) — o desenho dos marcadores e das particulas.
- `src/ui/ZoneTracker.tsx` (novo) — objetivos da zona sempre a vista.
- `src/ui/MissionResult.tsx` (novo) + `MissionRunner.tsx` — estrelas uma a uma,
  pontuacao subindo, e o que a missao rendeu (conhecimento, nivel, poder,
  recorde).
- `src/ui/Hud.tsx` — aviso de conhecimento ganho e de nivel novo, em toda tela.
- `src/ui/MainMenu.tsx` + `MenuBanner.tsx` (novo) — faixa animada, linha do
  tempo das seis eras, totais de estrelas e fragmentos, botao de som.
- `src/ui/Quiz.tsx` — bolinhas de progresso, acertos seguidos, selo de resultado.
- `src/ui/BossScreen.tsx` — numero de dano subindo, tremor, barra com sombra
  atrasada, som por golpe, celulas de carga do Patch.
- `src/minigames/*/Screen.tsx` — arte por era: fita tecida e cartao perfurado
  (Tear), simbolos de porta e valvulas na tabela (Circuitos), transistores e
  fita colorida (Bits), mapa da rede em SVG (Rota e Cofre), lampadas de sinal
  (Detector). `src/ui/Gauge.tsx` (novo) e a barra de orcamento de todos.
- `src/styles/fx.css` (novo), `app.css`, `global.css` — os estilos disso tudo, e
  a variavel `--muted`, que varias regras usavam sem ela existir.

**Testes e documentos:**

- `src/core/world.test.ts`, `src/core/rpg.test.ts` — 20 testes novos.
- `tests/contract/api-surface.test.ts` — nomes novos **acrescentados** as listas.
- `tests/contract/content.test.ts` — contrato novo: toda era tem uma curiosidade
  por fragmento.
- `tests/e2e/smoke.spec.ts` — 6 testes novos; ajustes descritos abaixo.
- `docs/MULTIPLAYER.md` (novo) — proposta de ranking, duelo e batalha entre
  jogadores. So documento.
- `DECISIONS.md` (D56 a D62), `README.md`, `CLAUDE.md`, `ASSETS.md`.

## Por que

Pedido de Leticia: "Melhore tudo isso e deixe o jogo mais divertido, com
jogabilidade dos games melhor e animações e tudo de melhor [...] foque em deixar
o jogo bonito, interessante e que prenda quem esta jogando para completar os
desafios e aprender a história da tecnologia". O multiplayer, no mesmo pedido,
era para "só documentar em .md para fazermos depois".

O jogo fechava a campanha, mas quase nada respondia ao jogador: o mapa era
parado, os minijogos eram formularios de quadrados e botoes, concluir uma missao
rendia uma linha de texto, nao havia som, e nao havia o que achar no mapa. O que
foi feito ataca cada um desses pontos sem inventar regra de combate nem trocar o
que os minijogos ensinam.

Os fragmentos sao a unica mecanica nova. Entraram porque juntam as duas coisas
que o pedido queria: da motivo para explorar a zona, e cada um entrega um fato
da historia da computacao.

## O que isso quebra

- **Teste de ponta a ponta que tocava num terminal ou personagem e esperava o
  Bit naquela celula exata.** O Bit agora para ao lado. Os testes existentes
  foram trocados por `goToStation` / `goToNpc`, que esperam o botao do terminal
  ou a caixa de fala. Quem tiver teste local nesse molde precisa do mesmo ajuste.
- **Quem calculava posicao de toque supondo canvas de 16 px por tile.** O canvas
  tem 48. O lado do tile sai de `canvas.width / data-cols` (ver `tapCell`).
- **Nao quebra save.** O campo `fragments` e novo, com valor inicial vazio;
  `STORAGE.VERSION` nao subiu e save antigo abre normalmente.
- **Nao revoga decisao anterior.** A D10 (nenhuma biblioteca fora da stack)
  continua valendo: nao entrou dependencia.
- **Nenhum teste de contrato foi afrouxado.** `api-surface` so ganhou nomes;
  `content` so ganhou um contrato; `progression` e `architecture` nao foram
  tocados.

## Decisoes que tomei sozinho

Todas registradas em `DECISIONS.md`:

- **D56** — sem biblioteca nova: CSS, canvas e Web Audio. Eu tinha sugerido
  Motion e ZzFX antes de comecar; ao implementar, o ganho nao pagava o risco
  (animacao de saida duplica elementos na tela e derruba teste por rotulo).
- **D57** — laco de animacao no mapa e canvas com 3 px por pixel do mapa.
- **D58** — o Bit para ao lado de terminal, personagem e porta (`approachPath`).
- **D59** — fragmentos saem da planta por seed; o texto e escrito a mao e
  **ainda nao foi conferido em fonte primaria**.
- **D60** — som continua desligado por padrao, com botao no menu.
- **D61** — o HUD avisa o ganho; o resultado mede o jogador antes e depois.
- **D62** — multiplayer so documentado.

Fora das decisoes, tres coisas que alguem poderia querer diferente:

- 15 de conhecimento por fragmento (270 no jogo todo). E chute de balanceamento;
  mora em `RPG.FRAGMENT_XP`.
- Com o Bit parado o mapa e desenhado a uns 12 quadros por segundo, para poupar
  bateria. Andando, volta ao ritmo cheio.
- `three`, `@react-three/fiber` e `@react-three/drei` continuam no
  `package.json` sem uso em `src/`. Nao removi porque mexe no `package-lock` e
  nao era o pedido.

## Como conferir

```bash
npm run ci
npm run test:e2e
npm run dev
```

No jogo: ligar o som no botao do canto do menu; entrar na primeira zona; andar
ate um losango (fragmento) e ler a curiosidade; tocar num terminal com "!" e
ver o Bit parar ao lado; concluir a missao e ver as estrelas, o conhecimento
ganho e o aviso no canto; conversar com um personagem. Em Ajustes, "Reduzir
animações" deve deixar tudo parado e ainda jogavel.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build) — 431
      testes, cobertura do nucleo em 99,66% das linhas
- [x] `npm run test:e2e` passou — 138 testes (46 por dispositivo, em Pixel 5,
      iPhone 12 e desktop)
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — nao estava: so acrescentei nomes e um contrato novo
