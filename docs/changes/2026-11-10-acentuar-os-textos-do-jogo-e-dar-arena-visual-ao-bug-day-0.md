# Acentuar os textos do jogo e dar arena visual ao BUG Day 0

- **Data:** 2026-11-10
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** conteudo

## O que mudou

**Acentuacao (todo texto de jogador):**

- `src/data/ui.pt-BR.json` — 353 campos revisados, 138 com acento ou cedilha
  agora. Nenhuma chave entrou nem saiu (conferido contra a versao anterior).
- `tools/make-npcs.py` — as 57 falas dos 18 personagens, mais nomes e papeis.
  `npm run npcs` regenerou `src/data/npcs.pt-BR.json`.
- `tools/make-quizzes.py` — as 30 perguntas, 120 alternativas e 30 explicacoes.
  `npm run quizzes` regenerou `src/data/quizzes.pt-BR.json`.
- `tests/e2e/smoke.spec.ts` — os seletores casam por rotulo, entao todos os
  textos usados nos testes acompanharam ("Missão concluída!", "Adicionar porta
  NÃO", "Enviar solução", "Ações neste turno", e assim por diante).
- `CLAUDE.md` — a regra de texto de jogador agora diz, em uma linha, que
  portugues no jogo leva acento, e que comentario e identificador nao levam.

`src/data/minigames.pt-BR.json` ja era acentuado desde a iteracao da Era 2 e
ficou como estava — era o unico arquivo de conteudo que ja seguia a regra nova.

**A arena do chefao:**

- `tools/make-sprites.mjs` — `bug.png`: o BUG Day 0 em 3 quadros de 32 px
  (parado, atingido, desfeito), desenhado pixel a pixel como o resto da arte.
- `src/ui/BossScreen.tsx` — componente `BossStage`: o Bit de um lado, o BUG do
  outro, as duas integridades e a frase do que acabou de acontecer. Um estado de
  efeito (`fx`) escolhe o quadro e a animacao, e volta para `idle` em 900 ms.
- `src/styles/app.css` — a cena, as animacoes (golpe, investida, escudo, fim) e
  o desligamento delas em `.reduce-motion`.
- `src/data/ui.pt-BR.json` — `boss.stage*`, `boss.yourHp`, `boss.bitName`.
- `tests/contract/content.test.ts` — contrato novo: `bug.png` existe no disco.
- `tests/e2e/smoke.spec.ts` — teste novo da arena (os dois sprites, as duas
  barras, o PNG certo, o quadro certo e a frase de estado).

## Por que

Pedido de Leticia: "Vamos adicionar os acentos e ç no projeto para que os textos
fiquem melhor e façam mais sentido e no Boss final deve ter algo visual da
batalha".

Os dois lados do pedido tinham o mesmo fundo: o jogo e educacional e e defendido
numa banca. Texto sem acento num jogo que ensina historia da computacao em
portugues conta contra o proprio conteudo. E um chefao que so mostra numeros nao
parece uma batalha — o jogador lia "Dano no BUG: 42" sem nunca ver o BUG.

Antes de converter, conferi a fonte: `Chakra Petch`, nos tres pesos que o jogo
carrega, tem todos os glifos acentuados do portugues. Era o unico motivo tecnico
plausivel para o ASCII, e ele nao se sustentava.

## O que isso quebra

- **Qualquer teste ou script que case texto da interface por string exata.** Os
  de ponta a ponta foram atualizados nesta mesma mudanca; se alguem tiver um
  teste local, e esse o ajuste.
- **Nao quebra save**: nenhum texto de interface e persistido; o save guarda ids
  (`cartao-perfurado`, `mecanica-A`), que continuam sem acento de proposito.
- **Nao quebra dado gerado**: os ids de NPC e de pergunta nao mudaram, so o texto
  visivel. `content.test.ts` continua cobrando ficha, sprite e 4 alternativas.
- A barra de integridade do chefao **saiu** do painel de numeros (`BossMeter`) e
  ficou so na arena. Quem procurar `.boss__bar` no CSS nao acha mais.

## Decisoes que tomei sozinho

Em `DECISIONS.md` como **D54** e **D55**:

- **D54** — texto de jogador leva acento; comentario, identificador e id de dado
  nao. E as falas e provas continuam entrando pelos geradores em `tools/`, nunca
  editando o JSON na mao (secao 4 do CLAUDE.md).
- **D55** — a arena e leitura pura: recebe o estado e desenha. Nenhum calculo de
  combate saiu de `core/boss.ts`. Sem canvas e sem WebGL: os sprites sao PNG
  gerados e recortados por `background-position`, e o efeito e CSS curto, que o
  ajuste "Reduzir animacoes" desliga por inteiro.

Uma escolha de arte que alguem pode querer diferente: desenhei o BUG como um
inseto roxo de olhos vermelhos, com fatias deslocadas e cores de "erro" (ciano e
vermelho) no corpo. A ideia era que ele parecesse feito do proprio defeito, e nao
um monstro generico. Mudar isso e mexer em `bugFrame()` no gerador e rodar
`npm run sprites`.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

No navegador:

```bash
npm run dev
```

Menu > Ajustes > Modo desenvolvedor > Voltar > Enfrentar o BUG Day 0. Responda a
um ataque e veja a arena: o BUG abre os olhos e racha quando leva o golpe, avanca
quando o ataque passa, e se desfaz quando a luta termina. Ligue "Reduzir
animacoes" no mesmo menu para conferir que o movimento some sem a tela perder
informacao.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 120 testes nos 3 dispositivos
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu ter
      afrouxado nenhum deles**
- [x] Mexi em `tests/contract/`: so para **acrescentar** a exigencia de que
      `bug.png` exista no disco, do mesmo jeito que os outros sprites ja eram
      cobrados.
