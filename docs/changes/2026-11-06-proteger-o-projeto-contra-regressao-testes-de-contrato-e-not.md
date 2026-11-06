# Proteger o projeto contra regressao: testes de contrato e nota por iteracao

- **Data:** 2026-11-06
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** infraestrutura

## O que mudou

- `CLAUDE.md` (novo) — as regras que qualquer pessoa ou agente deve seguir ao
  mexer no projeto. Agentes leem este arquivo automaticamente.
- `CONTRIBUINDO.md` (novo) — o mesmo combinado, escrito para as pessoas do
  grupo: o passo a passo de uma iteracao e o que olhar ao revisar.
- `tests/contract/architecture.test.ts` (novo) — le o codigo-fonte do nucleo e
  reprova import de React/DOM/rede, `Math.random` e `Date.now`, e numero de
  balanceamento solto fora de `constants.ts`.
- `tests/contract/api-surface.test.ts` (novo) — trava os nomes exportados por
  cada modulo do `core/` e as chaves dos grupos de `constants.ts`.
- `tests/contract/content.test.ts` (novo) — cruza `worlds`, `npcs`, `quizzes`,
  `missions`, itens e textos de interface, e confere no disco se existe sprite
  para cada personagem colocado no mapa.
- `tests/contract/progression.test.ts` (novo) — joga a campanha inteira com as
  funcoes puras e exige que as 6 eras sejam concluiveis em sequencia.
- `docs/changes/TEMPLATE.md`, `docs/CHANGELOG.md` (novos) — o modelo da nota de
  iteracao e o indice.
- `tools/new-change.mjs`, `tools/check-changes.mjs` (novos) — um cria a nota a
  partir do modelo, o outro reprova nota faltando, fora do indice ou com campo
  do modelo por preencher.
- `package.json` — scripts `change`, `check:changes`, `test:contract`,
  `sprites`, `worlds`, `npcs`, `quizzes`; o `ci` agora roda `check:changes`.
- `vite.config.ts` — o Vitest passa a incluir `tests/contract/`.
- `src/core/constants.ts` e `src/core/rpg.ts` — os anos de abertura das eras
  sairam de `rpg.ts` e viraram `ERA_YEARS` em `constants.ts`.

## Por que

Pedido de Leticia: "Coloque regras de teste contra regressao para agentes nao
delirar... para que eu possa junto com meus amigos desenvolver esse sistema sem
problemas de mudancas indevidas que quebram o sistema."

O risco concreto nao e erro de digitacao — disso o TypeScript cuida. O risco e
alguem (pessoa ou agente) mexer numa parte e quebrar outra sem perceber, porque
a quebra so aparece numa tela que ninguem abriu naquele dia. Os casos tipicos
neste projeto sao tres: dado que deixa de fechar com outro dado (personagem sem
ficha, terminal apontando para missao inexistente, sprite nao gerado), funcao do
`core` renomeada com algum ponto de uso esquecido, e progressao que trava numa
era. Nenhum desses aparece no typecheck.

Os quatro arquivos de contrato cobrem exatamente isso, e o
`progression.test.ts` e o mais importante: ele joga a campanha das seis eras e
falha dizendo em qual delas travou.

A nota por iteracao resolve o outro lado do problema. Com varias pessoas e
agentes mexendo no mesmo codigo em dias diferentes, o historico de "o que mudou
e por que" nao pode morar so na conversa de quem estava presente.

## O que isso quebra

Duas coisas obrigam ajuste de quem estiver com trabalho em andamento:

1. **`npm run ci` agora falha sem nota de mudanca.** Quem estiver no meio de uma
   tarefa precisa rodar `npm run change -- "..."` e preencher a nota. Essa e a
   intencao do pedido, mas e uma mudanca de rotina para todo mundo.
2. **`ERA_START_YEAR` mudou de casa.** O nome continua exportado por
   `core/rpg.ts` e quem importa de la nao precisa mexer em nada; os numeros
   agora ficam em `ERA_YEARS`, em `core/constants.ts`. Quem for ajustar os anos
   das eras edita o `constants.ts`.

Nenhum formato de save mudou; o progresso de quem ja jogou continua abrindo.

## Decisoes que tomei sozinho

- **O contrato de arquitetura le o codigo-fonte em vez de confiar no ESLint.**
  Uma regra de lint pode ser afrouxada por quem esta com pressa — inclusive por
  um agente que "resolve" um erro mexendo na configuracao. Lendo o fonte, mexer
  no `eslint.config.js` nao faz o problema sumir.
- **A deteccao de numero magico e uma heuristica simples** (numero de tres
  digitos ou mais solto no nucleo, com `constants.ts` e `rng.ts` liberados). Nao
  pega tudo, mas pega o caso comum de cravar 1500 no meio da regra. Preferi uma
  regra que as pessoas entendem a uma analise esperta que ninguem revisa. Foi
  ela que achou os anos das eras em `rpg.ts`.
- **O `check-changes.mjs` nao tenta adivinhar se a nota e verdadeira**, so
  impede o caso de abrir a nota e esquecer de escrever. Julgar o conteudo e da
  revisao humana, e prometer mais que isso daria falsa seguranca.
- **Nao rodei `git init`.** O repositorio nao esta sob controle de versao, e
  isso e o que de fato protege contra mudanca indevida — mas criar o
  repositorio e decisao do grupo, nao minha. Esta registrado como pendencia no
  `CONTRIBUINDO.md`.

## Como conferir

```bash
cd game
npm run test:contract   # 50 testes de contrato
npm run ci              # inclui a checagem das notas
npm run test:e2e        # 51 testes nos 3 dispositivos
```

Para ver o contrato funcionando de verdade, quebre algo de proposito: apague um
personagem de `src/data/npcs.pt-BR.json` e rode `npm run test:contract`. O
`content.test.ts` acusa qual mapa ficou com personagem sem ficha.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — os tres ajustes feitos (`LOOM` e `ERA_YEARS` faltando na
      lista, nomes reais do `registry`) corrigiam a lista que eu tinha escrito
      errado, nao afrouxavam exigencia
