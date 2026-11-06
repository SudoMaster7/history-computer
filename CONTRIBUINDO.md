# Como mexer neste projeto

Escrito para quem vai desenvolver junto. As mesmas regras valem para agentes, e
estão em `CLAUDE.md` — agentes leem aquele arquivo sozinhos.

## Uma iteração, do começo ao fim

```bash
cd game
npm install

# 1. Faça a mudança.

# 2. Rode a verificação completa.
npm run ci          # lint, tipos, notas, testes com cobertura, build
npm run test:e2e    # Playwright: Pixel 5, iPhone 12, desktop

# 3. Escreva a nota da sua iteração.
npm run change -- "o que voce fez"
```

O passo 3 cria `docs/changes/AAAA-MM-DD-<slug>.md` a partir do modelo. **Preencha
de verdade**, principalmente:

- **Por que** — o problema que isso resolve, não a repetição do que mudou.
- **O que isso quebra** — o que obriga outra pessoa a ajustar o trabalho dela.
- **Decisões que tomei sozinho** — escolhas que o pedido não determinava.

O `npm run ci` falha se houver nota com campo do modelo por preencher, fora do
índice ou sem as seções obrigatórias.

## Os testes de contrato

`tests/contract/` é a linha que não se cruza. Ele não testa detalhe de
implementação; trava o que sustenta o jogo:

| Arquivo                | O que trava                                     |
| ---------------------- | ----------------------------------------------- |
| `architecture.test.ts` | o núcleo é puro e determinístico                |
| `api-surface.test.ts`  | os nomes exportados pelo `core/`                |
| `content.test.ts`      | os dados fecham entre si, e a arte existe       |
| `progression.test.ts`  | **o jogo é zerável, sem travar em nenhuma era** |

Rode só eles com `npm run test:contract` (é rápido, serve durante o trabalho).

**A regra:** nunca deixe um contrato verde apagando o que ele exigia. Se o
contrato está errado, ele muda — na mesma iteração, com o motivo na nota, e com
a suíte inteira rodada depois.

Para ver que eles funcionam, quebre algo de propósito: apague um personagem de
`src/data/npcs.pt-BR.json` e rode `npm run test:contract`.

## Ao revisar o trabalho de outra pessoa (ou de um agente)

Olhe nesta ordem:

1. **Tem nota?** Sem nota, não dá para revisar. Peça antes de ler o código.
2. **A nota diz o que quebra?** "Nada." é resposta válida, mas precisa ser
   verdade.
3. **Algum arquivo de `tests/contract/` foi mexido?** Se foi, a nota explica
   por quê? Asserção removida sem explicação é o sinal mais importante a pegar.
4. **Mexeu em `DECISIONS.md`?** Decisão revogada deve dizer qual revoga e por
   quê — não se apaga a antiga.
5. **Entrou conteúdo novo?** Veio por script (`npm run worlds`/`npcs`/
   `quizzes`) ou foi editado na mão? Deve vir por script.
6. **Entrou personagem novo?** O sprite dele foi gerado (`npm run sprites`)?

## Gerar conteúdo e arte

Os JSON de `src/data/` não se editam na mão: edite o script e rode.

```bash
npm run worlds    # mapas das zonas
npm run npcs      # falas dos personagens
npm run quizzes   # banco de perguntas
npm run sprites   # pixel art (tilesets, Bit, 18 personagens)
```

Os scripts conferem largura de linha do mapa, tile caminhável sob cada
personagem e id repetido na hora de gerar.

## Pendências do combinado

- **O projeto ainda não está sob controle de versão.** Rodar `git init` e
  começar a usar branches é o que de fato protege contra mudança indevida: dá
  para ver o que mudou, voltar atrás e revisar antes de juntar. Os testes de
  contrato pegam a quebra; o Git é o que deixa desfazê-la. Vale decidir isso no
  grupo antes de mais gente começar a mexer.
