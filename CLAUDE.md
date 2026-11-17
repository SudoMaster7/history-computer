# Regras deste projeto

Este arquivo vale para **qualquer pessoa ou agente** que mexa no código. Agentes
leem isto automaticamente. Se uma instrução sua contradiz o que está aqui, diga
isso em voz alta antes de mexer, em vez de mudar o projeto por baixo.

O projeto é um TCC feito por um grupo. Mais de uma pessoa trabalha no mesmo
código, às vezes com ajuda de agentes, às vezes com dias de distância entre uma
mexida e outra. Tudo aqui existe para que uma mudança não quebre em silêncio o
trabalho de outra pessoa.

---

## 1. Antes de encerrar qualquer iteração

Estas duas coisas não são opcionais e não dependem de alguém pedir:

```bash
npm run ci          # lint, tipos, testes com cobertura, notas, build
npm run test:e2e    # Playwright nos 3 dispositivos
```

E **escreva a nota da sua iteração**:

```bash
npm run change -- "o que voce fez"
```

Isso cria `docs/changes/AAAA-MM-DD-<slug>.md` a partir do modelo. Preencha-a de
verdade — principalmente **Por que** e **O que isso quebra**. O `npm run ci`
falha se houver nota com campo do modelo por preencher.

Uma iteração sem nota é uma mudança que ninguém consegue revisar depois.

---

## 2. Os testes de contrato são a linha que não se cruza

`tests/contract/` não testa detalhe de implementação. Ele trava as decisões que
sustentam o jogo:

| Arquivo                | O que trava                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `architecture.test.ts` | o núcleo é puro: sem React, DOM, rede, `Math.random`, `Date.now` |
| `api-surface.test.ts`  | os nomes exportados pelo `core/` e as chaves de `constants.ts`   |
| `content.test.ts`      | os dados fecham entre si, e a arte existe no disco               |
| `progression.test.ts`  | **o jogo é zerável do início ao fim, sem travar em nenhuma era** |

**Nunca deixe um teste de contrato verde apagando o que ele exigia.** Se o
contrato está errado, ele muda — mas na mesma iteração, com o motivo escrito na
nota, e com a suíte inteira rodada depois. "Removi a asserção e passou" é o
contrário do que estes arquivos existem para evitar.

`architecture.test.ts` lê o código-fonte direto, de propósito: afrouxar o
`eslint.config.js` não faz o problema sumir.

---

## 3. Regras de arquitetura

**O núcleo é puro.** `src/core/**` e `src/minigames/*/logic.ts` não importam
React, Three.js, Zustand, DOM, nem as camadas de cima (`ui/`, `store/`,
`services/`, `data/`). Toda regra de jogo é função determinística.

**Nada de acaso solto.** Aleatoriedade só por `createRng(seed)`. Nada de
`Math.random()` nem `Date.now()` no núcleo — a mesma seed tem que produzir
sempre o mesmo resultado, senão nenhum teste vale.

**Todo número de balanceamento mora em `src/core/constants.ts`.** Para calibrar
o jogo, só esse arquivo muda. Número de três dígitos solto no meio de uma regra
reprova no contrato.

**Todo texto visível ao jogador mora em `src/data/*.pt-BR.json`.** Identificador
de código em inglês, texto de jogador em português. Nada de string escrita
direto no JSX.

**Texto de jogador é português escrito certo, com acento e ç.** Isso vale para
`ui.pt-BR.json`, para as falas e para as provas — e a fonte do jogo tem os
glifos (conferido nos três pesos). Comentário e identificador no código
continuam sem acento. Os testes de ponta a ponta casam por rótulo: mexeu num
texto, atualize `tests/e2e/smoke.spec.ts` na mesma mudança.

**`core/` não lê arquivo de dados.** Quem precisa de dado recebe por parâmetro
(é por isso que `stepRun` recebe a planta da fase já lida).

---

## 4. Conteúdo entra por script, não na mão

Os JSON de `src/data/` são gerados:

```bash
npm run stages    # as 12 fases: planta, portões, placas, abertura e resumo
npm run sprites   # pixel art (tilesets, Bit, BUG)
```

Edite o script, rode, e deixe o JSON gerado ser o resultado. O gerador de fases
confere largura de linha, um fragmento por trecho certo, portão com dispositivo e
nada de perigo colado no portão na hora de gerar — erro de digitação não chega no
jogo. Que a fase **fecha** quem prova é o contrato de progressão, correndo o robô
de referência (`referenceRun`).

**Mexeu numa fase? Rode a suíte.** `content.test.ts` reprova fase com placa sem
texto, portão da era errada ou terreno igual ao de outra fase; `progression.test.ts`
reprova fase que o robô não termina — sem habilidade, com as do ponto da campanha
e com as seis.

---

## 5. O jogo é de celular, e isso restringe

- **100% jogável por toque, sem arrastar.** Nada de arrastar nem gesto de dois
  dedos. **Segurar é permitido só para andar e pular na fase** (D81, pedido da
  dona do projeto, para o controle ser como Mega Man e Mario); todo o resto é
  toque simples.
- **Alvo de toque mínimo de 44 px.** Há teste de ponta a ponta medindo todos os
  botões.
- Nada pode exigir teclado.
- Sem rolagem horizontal, em nenhuma tela.
- A fase é canvas 2D com pixel art. **Sem WebGL.**
- Na fase o Bit fica parado até o jogador **segurar ◀ ou ▶**, e para ao soltar;
  **Pular** segurado vai mais alto, **Atirar** é toque. Cada botão captura o
  próprio ponteiro: segurar ▶ e tocar em Pular ao mesmo tempo tem de funcionar
  (D81). No e2e, segurar é `dispatchEvent('pointerdown')` e soltar é
  `dispatchEvent('pointerup')`.
- Mensagem na fase não pausa o jogo (D83): placa é balão sobre a fase, fragmento é
  aviso curto. Só param o jogo o cartão de abertura, o painel do portão, a pausa e
  o cartão de fim -- momentos em que o Bit já está parado.

---

## 6. Como escrever uma mudança que não quebra os outros

- **Mexeu no formato do save?** Ele é persistido em `localStorage`. Mudar o
  formato invalida o progresso de quem já jogou. Se for necessário, suba
  `STORAGE.VERSION` e diga na nota.
- **Renomeou algo do `core/`?** Atualize todos os pontos de uso **antes** de
  mexer em `api-surface.test.ts`, e rode a suíte inteira.
- **Removeu uma função?** Procure quem chamava. O typecheck pega o código, mas
  não pega string usada em teste de ponta a ponta.
- **Decisão que o pedido não determinava?** Registre em `DECISIONS.md` com
  número novo, e aponte o número na sua nota. Se revoga uma decisão anterior,
  diga qual e por quê — não apague a antiga.

---

## 7. Honestidade sobre o que está pronto

Não diga que algo funciona sem ter rodado. Se um teste falha, mostre a saída.
Se uma parte ficou de fora, diga qual e por quê.

Hoje, especificamente: **o jogo é um mapa de fases** (D73, desde 17/11/2026, quando
deixou de ser RPG). São 12 fases de plataforma, duas por era, cada uma com portões
de conceito e terminando no minijogo da era; fechar a era dá uma habilidade ao
Bit; o BUG Day 0 fecha o mapa, numa luta por corações com os micro-minijogos
(`src/core/boss.ts` + `src/ui/BossScreen.tsx`). Os seis minijogos estão
registrados (Tear de Engrenagens, Circuitos Lógicos, Mesa de Bits, Rota dos
Pacotes, Cofre Criptográfico, Treinar o Detector). Não há mais XP, nível, vida que
cresce, itens, prova nem zona vista de cima.

O acabamento: fragmentos de memória nas fases, arte por era nas fases e nos
minijogos, resultado de missão com recompensa, pixel art gerada por código (o Bit
é um robô), e som e música sintetizados (`src/fx/`, desligados por padrão).

O que **continua faltando**, e deve continuar escrito assim no `README.md` até
deixar de ser verdade: o ranking no Supabase (e o multiplayer, que só existe
como proposta em `docs/MULTIPLAYER.md`), e a conferência em fonte primária das
placas das fases, dos textos dos minijogos e das curiosidades dos fragmentos. As
faixas de música foram escritas em código e ninguém as afinou de ouvido ainda. O
chefão ainda não é uma arena de plataforma (D77), e os 18 sprites de personagem
(`npc-*.png`) ficaram sem uso desde a D73.

Uma regra de animação, explicada no topo de `src/styles/fx.css`: nenhuma
animação em laço mexe em `transform` ou tamanho de **botão** (botão chama
atenção com brilho). Não há ajuste de reduzir animações (D68).

---

## 8. Mapa rápido do projeto

```
src/core/      regra pura: stage (fase), gadgets (portões), campaign (mapa), progress,
               boss, powers, scoring, rng, registry
src/minigames/ <era>/logic.ts (puro) + Screen.tsx + index.ts + logic.test.ts
src/ui/        MainMenu, OverworldScreen (mapa), StageScreen + stageArt + GatePanel (fase),
               MissionRunner, MissionResult, BossScreen
src/fx/        som e música sintetizados (Web Audio) e efeitos de tela; nada de regra de jogo
src/store/     Zustand com persistência local
src/data/      JSON gerado + módulos que o tipam
tools/         geradores de conteúdo e de arte, e os scripts de nota
tests/contract/ o que não pode quebrar
tests/e2e/     Playwright (Pixel 5, iPhone 12, desktop)
docs/changes/  uma nota por iteração
DECISIONS.md   escolhas de projeto, numeradas, com motivo
```
