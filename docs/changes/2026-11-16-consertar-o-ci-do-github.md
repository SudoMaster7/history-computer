# Consertar o CI do GitHub

- **Data:** 2026-11-16
- **Autor:** agente (Claude Opus 5.5) a pedido de Leticia
- **Tipo:** infraestrutura

## O que mudou

- `.github/workflows/ci.yml` — saiu `working-directory: game`, e
  `cache-dependency-path` e o caminho do relatório do Playwright deixaram de
  começar com `game/`.
- `.github/workflows/ci.yml` — o runner ficou fixo em `ubuntu-24.04`. Com o
  caminho consertado, tudo passou até o build, e o CI quebrou ao instalar os
  navegadores do Playwright (`--with-deps`) no `ubuntu-latest`, que aponta para
  um Ubuntu mais novo que o Playwright 1.49 conhece.
- `ASSETS.md`, `docs/MULTIPLAYER.md`, `src/ui/WorldScreen.tsx` — só formatação
  do Prettier, sem mudança de conteúdo nem de comportamento.

## Por que

O workflow foi escrito como se o repositório tivesse uma pasta `game/` dentro
dele, mas a raiz do repositório já é a própria pasta `game`. O passo de instalar
o Node não achava `game/package-lock.json` e o CI falhava antes de rodar
qualquer teste — em todos os commits recentes. Com o caminho certo, o passo de
formatação passaria a rodar e reprovaria os três arquivos acima, que estavam
fora do padrão desde iterações anteriores (no Windows o `autocrlf` escondia
isso no `format:check` local).

## O que isso quebra

Nada. A partir daqui o CI roda de verdade a cada push no `main` e em todo pull
request: formatação, lint, nota de mudança, contratos, tipos, cobertura, build e
Playwright.

## Decisoes que tomei sozinho

Nenhuma.

## Como conferir

```bash
npm run ci
```

E na aba Actions do GitHub o workflow CI do commit fica verde.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou — 147 testes
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que — nao mexi
