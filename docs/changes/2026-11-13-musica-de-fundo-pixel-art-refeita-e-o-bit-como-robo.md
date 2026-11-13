# Musica de fundo, pixel art refeita e o Bit como robo

- **Data:** 2026-11-13
- **Autor:** agente (Claude Fable 5.2) a pedido de Leticia
- **Tipo:** arte

## O que mudou

**Musica:**

- `src/fx/music.ts` (novo) — nove faixas em partitura (menu, seis eras, prova,
  chefao) e o sequenciador que as toca com a Web Audio API. Sem arquivo de audio.
- `src/fx/sound.ts` — o contexto de audio passou a ser exportado
  (`audioContext`), para efeitos e musica dividirem o mesmo.
- `src/App.tsx` — escolhe a faixa pela tela e a expoe em `data-music`.
- `src/store/gameStore.ts` — ajuste novo `settings.music` (nasce ligado).
- `src/ui/MainMenu.tsx`, `src/data/ui.pt-BR.json` — botao "Música de fundo" nos
  ajustes, desabilitado enquanto o som esta desligado.

**Arte:**

- `tools/make-sprites.mjs` — paletas novas por era; arvore, pinheiro, parede,
  piso, agua, terminal e porta redesenhados; personagens com traco proprio
  (`look`: cabelo comprido, barba, oculos, bone, gravata); o Bit virou robo; o
  BUG ganhou contorno e brilho. `npm run sprites` regenerou os 26 PNG de
  `public/sprites/`. O formato das folhas nao mudou.
- `src/ui/worldArt.ts` — `buildGround`: o chao da zona desenhado uma vez, com
  borda no caminho, margem na agua, sombra de parede e arvore, e flores.
- `src/ui/WorldScreen.tsx` — usa essa camada em vez de redesenhar os tiles a
  cada quadro.

**Resto:**

- `src/styles/global.css` — em tela larga o jogo fica na coluna de 560 px (a
  regra ja existia e era ignorada por causa de um `flex: 1`).
- `src/styles/fx.css` — com pouca altura, o painel de objetivos corta a frase do
  proximo passo, e nao as fichas.
- `tests/e2e/smoke.spec.ts` — teste novo da musica (faixa por tela e os dois
  ajustes).
- `docs/img/` — as capturas do `README.md` refeitas, e tres novas (07 a 09).
- `README.md`, `ASSETS.md`, `CLAUDE.md`, `DECISIONS.md` (D63 a D67).

## Por que

Pedido de Leticia: "Pode adicionar musica de fundo, alteração na pixel arte par
deixar mais bonito toda a arte do jogo e melhorar tudo ainda mais que achar
necessario, atualize o readme tambem".

A iteracao anterior deu movimento e som de efeito, mas deixou escrito o que
ficou de fora: a pixel art era a mesma, nao havia musica e as capturas do README
estavam velhas. Esta fecha esses tres pontos.

O Bit como robo nao foi pedido com essas palavras. Entrou porque "deixar a arte
mais bonita" esbarrava nisso: o protagonista e descrito como maquina desde o
briefing e era desenhado como uma pessoa igual aos outros dezoito personagens.

## O que isso quebra

- **Nao quebra save.** `settings.music` e chave nova; save antigo e lido como
  musica ligada (que so toca se o som estiver ligado).
- **Nao quebra contrato.** Nenhum arquivo de `tests/contract/` foi tocado, e os
  sprites continuam com os mesmos nomes e tamanhos.
- **Quem tinha os PNG antigos em cache** (PWA instalada) ve a arte nova depois
  que o service worker atualizar.
- **Quem estiver desenhando arte a mao em cima dos PNG:** eles sao gerados.
  Mudanca de arte entra em `tools/make-sprites.mjs` (CLAUDE.md, secao 4).

## Decisoes que tomei sozinho

Registradas em `DECISIONS.md`:

- **D63** — musica como partitura em codigo, sem arquivo de audio; um ajuste
  proprio, ligado por padrao, que depende do som estar ligado.
- **D64** — o Bit e um robo.
- **D65** — a arte foi refeita no gerador, nao trocada por pack de terceiros.
- **D66** — o chao do mapa e desenhado uma vez; as flores ficam nessa camada, nao
  no tile.
- **D67** — coluna de 560 px em tela larga.

Fora delas: as nove melodias foram escritas por mim, em graus de escala. Sao
temas curtos de chip, e **eu nao as ouvi** — o que foi conferido e que o
sequenciador roda sem erro e troca de faixa na hora certa. Vale alguem do grupo
ouvir cada uma e ajustar andamento e volume em `music.ts`.

## Como conferir

```bash
npm run ci
npm run test:e2e
npm run dev
```

No jogo: ligar o som no canto do menu (a musica comeca); entrar numa zona e
ouvir a faixa mudar; em Ajustes, desligar "Música de fundo" e conferir que os
efeitos continuam. Andar pelas seis zonas (modo desenvolvedor abre todas) para
ver a arte de cada era.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build) — 431 testes
- [x] `npm run test:e2e` passou — 141 testes (47 por dispositivo)
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — nao mexi
