# Corrige workflow verify para rodar na raiz do repositorio

- **Data:** 2026-11-09
- **Autor:** agente (GitHub Copilot Coding Agent) a pedido de SudoMaster7
- **Tipo:** infraestrutura

## O que mudou

- `.github/workflows/ci.yml` — removido `working-directory: game` do job `verify` para os comandos rodarem na raiz real do repositorio
- `.github/workflows/ci.yml` — ajustado `cache-dependency-path` de `game/package-lock.json` para `package-lock.json`
- `.github/workflows/ci.yml` — ajustado caminho de artifact de `game/playwright-report` para `playwright-report`

## Por que

O workflow `verify` falhava no GitHub Actions antes de executar qualquer etapa
de verificacao, porque tentava cachear `game/package-lock.json`, caminho que nao
existe neste repositorio. O pedido foi corrigir o job `verify` com base no log
do run informado.

## O que isso quebra

Nada.

## Decisoes que tomei sozinho

Mantive o fluxo do job inalterado e corrigi apenas os caminhos que apontavam
para a pasta `game`, pois a raiz do projeto ja contem `package.json`,
`package-lock.json` e os artefatos usados pelos comandos de CI.

## Como conferir

Rodar os mesmos comandos usados no CI e validar que passam na raiz.

```bash
npm run ci
```

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [ ] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado
