# <titulo curto, no imperativo: "Adicionar minijogo da Era 2">

- **Data:** AAAA-MM-DD
- **Autor:** <nome da pessoa, ou "agente (<modelo>) a pedido de <nome>">
- **Tipo:** conteudo | regra de jogo | interface | arte | infraestrutura | correcao

## O que mudou

<Uma lista do que foi mexido, em arquivos. Direto, sem adjetivo.>

- `caminho/do/arquivo.ts` — o que aconteceu ali

## Por que

<O motivo. Nao repita o "o que": explique o problema que isso resolve ou o
pedido que isso atende. Se foi pedido por alguem, diga por quem e com que
palavras.>

## O que isso quebra

<Mudancas que obrigam outra pessoa a ajustar o que ela estava fazendo:
funcao renomeada, formato de dado alterado, save antigo que deixa de abrir,
decisao anterior revogada. Se nao quebra nada, escreva "Nada.">

## Decisoes que tomei sozinho

<Escolhas que o pedido nao determinava e que alguem poderia ter feito
diferente. Se uma delas virar regra do projeto, registre tambem em
`DECISIONS.md` e aponte o numero aqui.>

## Como conferir

<Como a proxima pessoa confirma que isto funciona. Comando e o que esperar.>

```bash
npm run ci
```

## Verificacao

- [ ] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [ ] `npm run test:e2e` passou
- [ ] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [ ] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado
