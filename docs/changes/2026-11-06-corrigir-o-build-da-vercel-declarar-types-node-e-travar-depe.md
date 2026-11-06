# Corrigir o build da Vercel: declarar @types/node e travar dependencia fantasma

- **Data:** 2026-11-06
- **Autor:** agente (Claude Opus 5) a pedido da dona do repositorio
- **Tipo:** correcao

## O que mudou

- `package.json` — `@types/node` declarado em `devDependencies`, na versao fixa
  `22.20.5` (a linha que acompanha o Node 22 do projeto).
- `package-lock.json` — entrada correspondente.
- `tsconfig.json` — `"node"` acrescentado ao campo `types`, para os globais do
  Node (`process`) nao dependerem de cadeia de referencia de outro pacote.
- `tests/contract/dependencies.test.ts` (novo) — contrato que le os imports do
  codigo e cobra a declaracao no `package.json`.

## Por que

O deploy na Vercel falhou no `npm run build`:

```
tests/contract/architecture.test.ts(2,43): error TS2307: Cannot find module 'node:fs'
tests/contract/content.test.ts(26,14): error TS2591: Cannot find name 'process'
vite.config.ts(4,31): error TS2307: Cannot find module 'node:url'
Error: Command "npm run build" exited with 2
```

Na maquina de desenvolvimento o mesmo comando passava. A diferenca nao era de
versao nem de configuracao: `@types/node` **nunca esteve declarado**, e tambem
nao estava instalado dentro do projeto. O `tsc --traceResolution` mostrou de
onde os tipos vinham:

```
C:/Users/leosc/node_modules/@types/node/fs.d.ts
```

Uma pasta `node_modules` solta na pasta do usuario, tres niveis acima do
projeto. TypeScript e Node procuram `node_modules` tambem nos diretorios
**acima** do projeto, entao aquele pacote perdido resolvia os imports de quem o
tinha na maquina — e de mais ninguem. Na Vercel, que comeca de um clone limpo,
nao havia nada acima para encontrar.

Depois da correcao, `tsc --listFiles` nao carrega **nenhum** arquivo de fora do
projeto.

Esse e o tipo de defeito que o grupo vai encontrar de novo: funciona na maquina
de quem escreveu e falha em todo o resto. Por isso virou contrato, em vez de so
consertar o sintoma.

## O que isso quebra

Nada. `@types/node` e so tipo: nao entra no build, nao muda o jogo e nao muda o
formato do save.

Quem ja tem o repositorio precisa rodar `npm install` para pegar o pacote novo.

## Decisoes que tomei sozinho

- **Pinei a versao 22.20.5, sem `^`.** E a regra do projeto (D10) e e o que faz
  a arvore de pacotes ser a mesma em qualquer maquina — justamente o que faltou
  aqui. O contrato novo tambem cobra isso: nenhuma dependencia pode ter `^` ou
  `~`.
- **Acrescentei `"node"` ao `types` do tsconfig** em vez de confiar que os
  globais chegariam pela cadeia de referencias do `vitest/globals`. Chegavam, mas
  por acidente; agora e explicito.
- **Nao tirei os testes do `tsc --noEmit` do build**, que seria o caminho curto
  para fazer a Vercel passar. O build checar os testes e o que garante que o
  contrato compila; desligar isso resolveria o deploy escondendo o problema.
- **O contrato novo nao usa ferramenta externa** (tipo `depcheck`): le os
  imports com expressao regular e compara com o `package.json`. E menos esperto,
  mas nao acrescenta dependencia e qualquer pessoa do grupo entende o que ele
  faz lendo trinta linhas.

## Como conferir

```bash
cd game
npm install
npm run build          # era isto que falhava na Vercel
npm run test:contract  # 60 testes, 4 deles novos
```

Para ver o contrato pegando o defeito original, tire `@types/node` do
`package.json` e rode `npm run test:contract`: o teste acusa
`{ arquivos: 4, declarado: false }`.

Para conferir que nenhum tipo vem de fora do projeto:

```bash
npx tsc --noEmit --listFiles | grep -v "TCC/game" | wc -l   # deve dar 0
```

Vale notar: a CI do GitHub (`.github/workflows/ci.yml`) roda `npm ci` num
runner limpo e **teria pegado isto**, pelo mesmo motivo que a Vercel pegou.
Vale olhar a aba Actions do repositorio antes de cada deploy.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build) — 211
      testes
- [x] `npm run test:e2e` passou — 54 testes nos 3 dispositivos
- [x] Os testes de contrato continuam verdes **sem eu ter afrouxado nenhum
      deles** — acrescentei um arquivo
- [x] Se mexi em `tests/contract/`, expliquei acima por que — o contrato novo
      cobre a causa desta falha, nao afrouxa exigencia anterior
- [x] `tsc --listFiles` nao carrega nenhum arquivo de fora do projeto
- [x] O `package-lock.json` registra `@types/node@22.20.5`
