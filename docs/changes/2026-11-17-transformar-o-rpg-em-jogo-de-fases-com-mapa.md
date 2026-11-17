# Transformar o RPG em jogo de fases com mapa

- **Data:** 2026-11-17
- **Autor:** agente (Claude Opus 5.5) a pedido de Leticia
- **Tipo:** regra de jogo | interface | conteudo

## O que mudou

Núcleo (puro, testado):

- `src/core/stage.ts` (novo): a fase de plataforma vista de lado. Planta em texto, física em
  passo fixo, auto-corrida, pulo, tiro, inimigos (engrenagem, voador, torre, programa),
  espinho, buraco, checkpoint, corações, fragmentos, placas, portões e o robô de referência
  (`botInput`, `referenceRun`).
- `src/core/gadgets.ts` (novo): a regra dos seis portões de conceito (padrão, circuito, bits,
  rota, cifra, detector), com a referência que abre cada um sem erro.
- `src/core/campaign.ts` (novo): ordem das 12 fases e do chefão, o que abre, o que fecha e que
  habilidade o Bit tem.
- `src/core/progress.ts` (novo, sucessor de `rpg.ts`): só estrelas, pontuação e nível da
  habilidade.
- `src/core/boss.ts`: reescrito sobre corações (D77).
- `src/core/constants.ts`: novos `STAGE` e `ABILITY`; `BOSS` refeito; saem `RPG`, `QUIZ`,
  `ITEMS`, `WORLD` e `ERA_YEARS`; `STORAGE.VERSION` = 2.
- `src/core/types.ts`: `PlayerState` virou `{ missions }`; `Attack` sem `damage`.
- `src/core/powers.ts`: saem `POWER_REQUIRES`, `missingPowers`, `eraUnlocked`, `previousEra`
  e `unlockedPowers`.
- Removidos: `src/core/rpg.ts`, `quiz.ts`, `items.ts`, `world.ts` e os testes deles.

Conteúdo:

- `tools/make-stages.py` (novo, `npm run stages`) gera `src/data/stages.json` e
  `src/data/stages.pt-BR.json`: 12 fases montadas por trechos, com placas, abertura e resumo.
- `src/data/fragments.pt-BR.json`: três curiosidades novas por era (seis por era, três por fase).
- `src/data/ui.pt-BR.json`: seções `map`, `stage`, `gate` e `abilities`; saem `hud`, `quiz`,
  `items`, `tutorial`, `status` e quase toda a `world`.
- Removidos: `worlds.json`, `npcs.pt-BR.json`, `quizzes.pt-BR.json`, os módulos que os tipavam e
  os scripts `make-worlds.py`, `make-npcs.py` e `make-quizzes.py`.

Interface:

- `src/ui/OverworldScreen.tsx` (novo): o mapa da jornada.
- `src/ui/StageScreen.tsx`, `src/ui/stageArt.ts`, `src/ui/GatePanel.tsx` (novos): a fase, o
  desenho dela e o painel do portão. `src/styles/stage.css` (novo).
- `src/App.tsx`: fluxo menu → mapa → fase → minijogo → mapa.
- `src/ui/MainMenu.tsx`, `MenuBanner.tsx`, `MissionRunner.tsx`, `MissionResult.tsx`,
  `BossScreen.tsx`: sem XP, nível, zonas nem mochila. A faixa do menu passou a ser de lado.
- `src/ui/worldArt.ts`: ficou só com o fragmento e o balão de "!".
- Removidos: `WorldScreen`, `ZoneTracker`, `Quiz`, `Tutorial`, `tutorialSteps`, `Hud`,
  `itemText`, `xp`.
- `src/fx/music.ts`: a faixa `quiz` virou `map`.
- `src/store/gameStore.ts`: save v2 com migração do v1 (`migrateSave`).

Testes e documentos:

- `tests/contract/progression.test.ts`, `content.test.ts`, `api-surface.test.ts`: reescritos
  para o jogo de fases (ver abaixo). `architecture.test.ts`: a checagem de "há arquivos"
  aponta para `stage.ts` em vez de `world.ts`, que deixou de existir.
- `tests/e2e/smoke.spec.ts`: reescrito.
- `DECISIONS.md`: D73 a D86.

Ajustes pedidos depois de jogar (D80), na mesma iteração:

- Botões ◀ ■ ▶ de direção por toque simples (`move` em `RunInput`, `dir`/`facing` em
  `RunState`), com as setas do teclado fazendo o mesmo.
- O fragmento de memória pausa a fase até o "Entendi".
- Três inimigos novos em `core/stage.ts` e `ui/stageArt.ts` (saltador, blindado, pingo),
  espalhados pelas fases pelo gerador, com placa na primeira aparição. `enemyPosition` virou
  exportado (a tela usava uma cópia da conta do voador).

Depois, a pedido dela de novo (D81): controle de Mega Man e Mario.

- `core/stage.ts`: sem auto-corrida. `RunInput` passou a ter `left`, `right` e `jumpHeld`
  (botões segurados) no lugar de `move`; soltar Pular cedo corta a subida
  (`STAGE.JUMP_CUT_SPEED`). O robô de referência segura ▶ e o pulo.
- `ui/StageScreen.tsx`: controle tipo gamepad, ◀ ▶ à esquerda e Atirar/Pular à direita, com
  `HoldButton` (captura de ponteiro, vários dedos ao mesmo tempo) e setas do teclado segurando.
- `CLAUDE.md` §5: segurar passa a ser permitido para andar e pular na fase.

E por último (D82 e D83), também a pedido dela:

- Munição limitada com baterias, mínimo devolvido no checkpoint e pisão (`core/stage.ts`).
- Terreno: degraus, pedras, chão que cai (`x`), mola (`j`) e estilo de superfície por fase, no
  gerador (`tools/make-stages.py`, que agora guarda a altura do chão) e no desenho
  (`ui/stageArt.ts`).
- Dificuldade Fácil/Normal/Difícil (`DIFFICULTY`, `GameDifficulty`, `settings.difficulty`,
  `ui/DifficultyPicker.tsx` no mapa e em Ajustes; o chefão também usa).
- Placas viram balão sem pausa, fragmento vira aviso curto e as curiosidades vão para o fim da
  fase; placas mais curtas e em menor número.
- Contrato: as 12 fases têm de fechar nas três dificuldades.
- Cartão de fim de fase redesenhado em três blocos: fragmentos, o que aprendeu e terminal (D84).
- Kit visual em pixel art para o jogo inteiro (`src/styles/pixel.css`, ícones em pixel em
  `ui/icons.tsx`): botões de fliperama, janelas com moldura, HUD em placas, controles de gamepad
  com ícone (D85).
- O balão com os exemplos da Era 6 deixou de ficar fixo e some sozinho, e os exemplos aparecem
  só na placa logo antes de cada detector (D86). `README.md` e `CLAUDE.md` atualizados.

## Por que

Pedido da Leticia: "tirar a cara de RPG e transformar em um jogo educacional de fases como
Snipperclips, Mega Man X e Super Mario World, colocando um mapa para ir progredindo de fases e
tirando aquela interface de pré-jogo para algo mais divertido", com o minijogo no fim de cada
fase e os conceitos da era apresentados durante a fase, "para no fim o jogador saber do que se
trata o minijogo e como jogar". Os minijogos ficaram como estavam, porque o grupo gosta deles.

Antes de começar, quatro escolhas foram feitas com ela: auto-corrida com toque simples (depois
trocada, a pedido dela, pelo controle de segurar da D81), duas fases por era, o RPG saindo inteiro
(com uma habilidade por era no lugar dos poderes) e a mecânica da fase sendo o próprio conceito.

## O que isso quebra

- **Save:** sobe para a versão 2. Quem já jogou mantém as **estrelas** (cada missão virou o
  minijogo da fase de mesmo id) e os ajustes; perde XP, nível, itens, fragmentos e a vitória no
  chefão, que não existem mais ou não têm correspondência (D78).
- **Contratos mudados, com motivo:**
  - `progression.test.ts`: a promessa é a mesma ("o jogo é zerável do início ao fim"), mas o
    caminho mudou: em vez de andar até terminais, abrir a porta e passar na prova, ele **corre
    cada fase com o robô de referência**, joga o minijogo do fim e confere que a próxima fase
    abre e que a habilidade chega. Ficou mais exigente: também prova que toda fase fecha sem
    habilidade nenhuma e com as seis, e que o robô abre todo portão sem erro.
  - `content.test.ts`: zonas, personagens, itens e banco de perguntas deixaram de existir; no
    lugar entram as fases (planta válida, missão existente, portão da era certa, uma frase por
    placa, plantas diferentes entre si, curiosidade suficiente para os três fragmentos de cada
    fase). O teste "plantas diferentes" pegou de verdade três pares de fases com o mesmo
    terreno, que foram corrigidos no gerador.
  - `api-surface.test.ts`: saem os nomes de `rpg`, `quiz`, `items`, `world` e as funções de
    `powers` e `boss` que dependiam do RPG; entram `stage`, `gadgets`, `campaign` e `progress`.
    Todos os pontos de uso foram atualizados antes, e a suíte inteira foi rodada.
- **Decisões revogadas:** a lista está na D73.
- **Scripts:** `npm run worlds`, `npm run npcs` e `npm run quizzes` deixaram de existir; entra
  `npm run stages`.
- **Arte sem uso:** os 18 `npc-*.png` continuam em `public/sprites` e no `make-sprites.mjs`, mas
  nenhuma tela os desenha mais. Ficaram para o grupo decidir se os personagens voltam (por
  exemplo, nas placas) ou se saem do gerador.

## Decisoes que tomei sozinho

- O BUG Day 0 virou luta por corações com micro-minijogos (D77), e não uma arena de plataforma
  com tiros entre os ataques, como o plano chegou a prever. A luta fecha a campanha e está no
  contrato; a versão de plataforma fica como próximo passo.
- O mapa da jornada é HTML com botões, não canvas (D79), por causa do alvo de 44 px, do leitor
  de tela e do e2e.
- As placas fora de portão pausam a fase até o "Entendi" (D75).
- O espinho fere só na metade de baixo do tile (D76): é o que o desenho mostra, e foi preciso
  para o Salto de nó não cair no espinho ao pular cedo.
- "Piloto automático" no modo desenvolvedor (D79).
- A primeira versão dos botões de direção era um modo por toque (D80); ela foi trocada pelo
  controle de segurar quando a Leticia explicou que queria Mega Man e Mario (D81).
- As seis habilidades e os efeitos delas (D76).
- O Bit da fase reaproveita a linha "direita" do `bit.png`, e chão, porta e terminal saem do
  tileset da era; inimigos, espinhos e programas são pintados em código (`stageArt.ts`).
- Três curiosidades novas por era, todas de fatos bem estabelecidos, mas que, como as outras,
  ainda pedem a conferência em fonte primária que o README lista como pendente.

## Como conferir

```bash
npm run ci          # lint, tipos, testes com cobertura, notas, build
npm run test:e2e    # Playwright nos 3 dispositivos
npm run dev         # e jogue a fase 1-A no celular ou no DevTools em modo móvel
```

No jogo: Novo jogo abre o mapa só com a 1-A; a fase abre com o cartão da era, a primeira placa
explica Pular e Atirar, o portão-tear para o Bit e pede a próxima cor, e no fim o terminal abre
o Tear de Engrenagens. Concluído o minijogo, o mapa avisa "Nova fase aberta!". Com o modo
desenvolvedor ligado, "Piloto automático" corre a fase sozinho e "Ir ao terminal" pula a ação.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado
