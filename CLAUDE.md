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

**`core/` não lê arquivo de dados.** Quem precisa de dado recebe por parâmetro
(é por isso que `buildQuiz` recebe o banco de perguntas).

---

## 4. Conteúdo entra por script, não na mão

Os JSON de `src/data/` são gerados:

```bash
npm run worlds    # mapas das zonas
npm run npcs      # falas dos personagens
npm run quizzes   # banco de perguntas
npm run sprites   # pixel art (tilesets, Bit, 18 personagens)
```

Edite o script, rode, e deixe o JSON gerado ser o resultado. Os scripts conferem
largura de linha do mapa, tile caminhável sob cada personagem e id repetido na
hora de gerar — erro de digitação não chega no jogo.

**Acrescentou personagem? Gere o sprite dele.** `content.test.ts` reprova
personagem sem sprite, porque sem isso ele some do mapa em silêncio.

---

## 5. O jogo é de celular, e isso restringe

- **100% jogável por toque simples, sem arrastar.** Nada de arrastar, segurar
  ou gesto de dois dedos.
- **Alvo de toque mínimo de 44 px.** Há teste de ponta a ponta medindo todos os
  botões.
- Nada pode exigir teclado.
- Sem rolagem horizontal, em nenhuma tela.
- O mapa é canvas 2D com pixel art. **Sem WebGL.**

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

Hoje, especificamente: **as Eras 1 e 2 fecham o ciclo completo** (Tear de
Engrenagens e Circuitos Lógicos). As eras 3 a 6 têm mapa, personagens, prova e
item, mas os terminais mostram "Terminal em construção". O chefão não existe. Os
itens de combate estão na mochila sem efeito. Está escrito assim no `README.md` e
deve continuar assim até deixar de ser verdade.

---

## 8. Mapa rápido do projeto

```
src/core/      regra pura: rng, rpg, powers, scoring, world, quiz, items, registry
src/minigames/ <era>/logic.ts (puro) + Screen.tsx + index.ts + logic.test.ts
src/ui/        MainMenu, WorldScreen (mapa em canvas), Quiz, Tutorial, Hud, MissionRunner
src/store/     Zustand com persistência local
src/data/      JSON gerado + módulos que o tipam
tools/         geradores de conteúdo e de arte, e os scripts de nota
tests/contract/ o que não pode quebrar
tests/e2e/     Playwright (Pixel 5, iPhone 12, desktop)
docs/changes/  uma nota por iteração
DECISIONS.md   escolhas de projeto, numeradas, com motivo
```
