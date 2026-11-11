# Fechar o jogo: minijogos das eras 3 a 6, chefao BUG Day 0 e itens de combate

- **Data:** 2026-11-10
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** regra de jogo

## O que mudou

Os quatro minijogos que faltavam, o chefao, e o efeito dos itens que estavam
parados na mochila.

- `src/core/constants.ts` — grupos novos de balanceamento: `BITS`, `ROUTE`,
  `VAULT`, `MODEL` (um por era nova). Nenhum numero de regra saiu daqui.
- `src/minigames/codigo/` — **Mesa de Bits** (Era 3, Codificar): codigo livre de
  prefixo por frequencia. Referencia = Huffman. Eficiencia = bits do codigo
  otimo / bits gastos.
- `src/minigames/redes/` — **Rota dos Pacotes** (Era 4, Conectar): o pacote
  salta de vizinho em vizinho ate o destino. Referencia = Dijkstra. Eficiencia =
  atraso da rota curta / atraso da rota usada.
- `src/minigames/seguranca/` — **Cofre Criptografico** (Era 5, Proteger):
  firewalls fechando todos os caminhos ate o cofre. Referencia = corte minimo
  (fluxo maximo com capacidade 1, Edmonds-Karp). Eficiencia = corte minimo /
  firewalls usados.
- `src/minigames/ia/` — **Treinar o Detector** (Era 6, Aprender): escolher os
  sinais observados e o gatilho. Referencia = menor conjunto de sinais que
  acerta treino **e** exemplos guardados. Eficiencia = sinais do minimo / sinais
  observados.
- `src/minigames/index.ts` — as seis eras passam a estar registradas.
- `src/core/boss.ts` + `src/core/boss.test.ts` — o combate do **BUG Day 0**
  inteiro como funcao pura: ataque anunciado por turno, neutralizacao pelo poder
  certo, dano, cargas e Patch Day 0, itens de combate, vitoria e derrota.
- `src/ui/BossScreen.tsx` — a tela do chefao. Ela nao decide nada: cada toque
  chama `core/boss` e desenha o estado devolvido. O micro-desafio e o minijogo da
  era do poder escolhido, na dificuldade `'micro'`.
- `src/store/gameStore.ts` — `syncPlayer`, `finishBoss`, `canFaceBoss`,
  `bossDefeated`, `bossBestScore`.
- `src/App.tsx`, `src/ui/MainMenu.tsx` — a tela do chefao entra no fluxo: depois
  da prova da Era 6, e pelo menu quando as seis eras estao concluidas.
- `src/ui/Hud.tsx` — os itens de combate agora dizem que ficam guardados **para
  o BUG Day 0**, em vez de so "guardado".
- `src/data/ui.pt-BR.json` — secoes `bits`, `route`, `vault`, `model`, `boss`;
  textos dos seis itens reescritos com o efeito que cada um passou a ter.
- `src/data/minigames.pt-BR.json` — a explicacao historica e as dicas das quatro
  eras novas (exigencia do contrato D41).
- `src/styles/app.css` — as quatro telas novas e a do chefao.
- `tests/contract/progression.test.ts` — a campanha passou a ser jogada pelos
  **minijogos de verdade** (nao mais com resultado fingido) e termina vencendo o
  chefao.
- `tests/contract/content.test.ts` — contrato novo: toda era tem minijogo
  registrado.
- `tests/contract/api-surface.test.ts` — `core/boss` entrou no contrato, e os
  quatro grupos novos de `constants.ts`.
- `tests/e2e/smoke.spec.ts` — 11 testes novos: as quatro telas, o chefao, o item
  de escudo, e 44 px/sem rolagem lateral em todas elas.

## Por que

Pedido do grupo, nas palavras de Leticia: "podemos concluir o desenvolvimento
completo". O que faltava para o jogo deixar de ser um MVP de duas eras era
exatamente isto: quatro terminais mostravam "Terminal em construcao", o chefao
nao existia, e quatro dos seis itens eram enfeite na mochila.

A escolha de qual desafio por era nao foi livre: cada minijogo tinha de ensinar a
**funcionalidade** daquela era, com uma solucao de referencia calculavel (senao
nao ha eficiencia, nem estrela, nem calibragem). Dai Huffman, Dijkstra, corte
minimo e selecao de atributos — todos quatro sao o algoritmo classico do problema
que a era inventou.

## O que isso quebra

**Nada do save.** Os campos novos (`bossDefeated`, `bossBestScore`) tem valor
inicial, e `partialize` so acrescenta chave: save antigo abre igual, por isso
`STORAGE.VERSION` **nao** subiu. Quem ja tinha progresso continua de onde parou.

Mudancas que podem pegar quem estava mexendo em paralelo:

- `tests/contract/progression.test.ts` ficou **mais exigente**: ele agora resolve
  cada minijogo pela referencia dele. Minijogo cuja referencia nao fecha a missao
  reprova ali, na era certa.
- `content.test.ts` passou a exigir minijogo registrado em todas as seis eras.
  Nao da mais para registrar era sem o texto de `minigames.pt-BR.json`.
- `ui.items.held` saiu de uso (trocado por `ui.items.combat`). A chave continua no
  JSON.
- `src/core/boss.ts` entrou no `core/index.ts` e no contrato de superficie.

## Decisoes que tomei sozinho

Registradas em `DECISIONS.md` como **D45 a D52**. As que mais mudariam o jogo se
alguem decidisse diferente:

- **D45** — cada minijogo novo imita o algoritmo classico da era, e a referencia
  e o otimo de verdade (nao uma solucao "boa o bastante").
- **D46** — a Era 5 e a Era 4 de tras para frente, de proposito: na 4 o jogador
  abre um caminho, na 5 fecha todos. Mesma gramatica de tela, licao oposta.
- **D47** — a Era 6 esconde exemplos de teste e planta um sinal-armadilha que
  acerta o treino inteiro e erra o teste. Sem isso a era nao ensina sobreajuste,
  que e o erro mais comum da area.
- **D48** — o chefao nao traz mecanica nova: ele e a versao `'micro'` dos seis
  minijogos. O que ele cobra e lembrar qual poder responde a qual ataque.
- **D50** — os itens de dica (Cartao Perfurado, Fita Magnetica) resolvem um
  micro-desafio no chefao, em vez de dar dica na missao. Dica na missao ja e de
  graca (D43), entao "item de dica" ali nao teria efeito nenhum.

Fora disso, uma coisa que **nao** decidi e vale olhar: `src/data/ui.pt-BR.json`
nao usa acento em nenhum texto (o arquivo inteiro e ASCII), enquanto
`minigames.pt-BR.json` usa. Escrevi os textos novos sem acento, para o arquivo
continuar consistente e para nao quebrar os testes de ponta a ponta, que casam
por rotulo. Se a intencao era ter acento na interface, isso e uma passada no
arquivo inteiro — e uma iteracao propria, nao um remendo no meio desta.

## Como conferir

```bash
npm run ci          # lint, tipos, notas, testes com cobertura, build
npm run test:e2e    # Playwright nos 3 dispositivos
```

Esperado: 410 testes de unidade e contrato verdes (cobertura de 99,6%), e 99 de
ponta a ponta — eram 54 antes desta iteracao. (Com o modo desenvolvedor da nota
seguinte, o total de ponta a ponta subiu para 117.) O teste que mais vale ler e
`tests/contract/progression.test.ts > o BUG Day 0 fecha a campanha`: ele zera as
seis eras resolvendo os seis minijogos e vence o chefao sem levar dano.

No navegador, o caminho curto para ver o chefao:

```bash
npm run dev
```

Menu > Zonas nao serve (as eras comecam trancadas). Para ver o combate sem zerar
a campanha, cole no console do navegador o save de ponta a ponta que esta em
`tests/e2e/smoke.spec.ts` (`seedCleared`), recarregue, e o menu passa a oferecer
"Enfrentar o BUG Day 0".

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 99 testes nos 3 dispositivos
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu ter
      afrouxado nenhum deles**
- [x] Mexi em `tests/contract/`: so para **acrescentar** exigencia (minijogo
      registrado em toda era, campanha jogada pelos minijogos de verdade, chefao
      vencivel, `core/boss` na superficie publica) e para declarar os quatro
      grupos novos de `constants.ts`, como o proprio arquivo manda fazer ao
      acrescentar nome novo.
