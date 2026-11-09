# Explicar e dar dica em todo minijogo

- **Data:** 2026-11-09
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** interface

## O que mudou

- `src/data/minigames.pt-BR.json` — novo. Por era com minijogo: a maquina real
  que ele imita (`machine`), o que ela fazia (`represents`), a funcionalidade da
  era (`power`), por que o desafio e esse (`lesson`) e as dicas em ordem
  (`hints`). Hoje: Mecanica e Logica, 4 dicas cada.
- `src/data/minigameBriefs.ts` — novo. Tipa e expoe o JSON (`MINIGAME_BRIEFS`,
  `briefOfEra`).
- `src/ui/MinigameHelp.tsx` — novo. Painel de ajuda igual para todas as eras:
  botao "O que e isto?" que abre a explicacao, e botao "Dica" que libera uma
  dica por toque, com contador.
- `src/minigames/mecanica/Screen.tsx` e `src/minigames/logica/Screen.tsx` — uma
  linha cada, logo abaixo do cabecalho.
- `src/data/ui.pt-BR.json` — bloco `help` com os rotulos do painel.
- `src/styles/app.css` — estilos `.help*`.
- `tests/contract/content.test.ts` — contrato novo: **toda era com minijogo
  registrado** precisa dos quatro textos e de no minimo 2 dicas, com tamanho
  minimo para nao passar rotulo de uma palavra como explicacao.
- `tests/e2e/smoke.spec.ts` — dois testes novos (a explicacao do Tear abre, cita
  Jacquard e a funcionalidade REPETIR, e as dicas saem uma a uma ate acabarem; a
  dos Circuitos cita Shannon e DECIDIR) e o teste de 44 px dos Circuitos agora
  roda com a ajuda **aberta**, que e quando a tela mais aperta.
- `README.md` — o passo 3 do "como se joga" descreve a ajuda.
- `DECISIONS.md` — D41 a D44.

## Por que

Pedido do grupo, nas palavras de Leticia: "é importante que os mini games tenham
uma dica para ajudar a resolver e explicação de o que eles estão representando,
qual funcionalidade da era".

Os dois problemas que isso resolve sao reais e diferentes:

- **Sem explicacao**, o minijogo vira quebra-cabeca solto. O jogador fechava o
  Tear sem saber que estava programando um tear de Jacquard, nem que o cartao
  "repetir xN" era o avo do laco de repeticao. O jogo e sobre a historia da
  computacao, e essa ligacao estava so no nome da tela.
- **Sem dica**, quem travava tinha uma saida so: abandonar a missao. Na Era 2 isso
  e pior, porque ler tabela-verdade e coisa que ninguem nasce sabendo.

Fiz como contrato (`tests/contract/content.test.ts`), e nao como convencao, para
que as Eras 3 a 6 nao possam ser entregues sem os textos: quem registrar o
minijogo da Era 3 esbarra no teste antes de abrir PR.

## O que isso quebra

Nada de save, de API do `core/` nem de formato de dado existente. `STORAGE.VERSION`
continua 1.

Um aviso para quem for implementar minijogo novo: **registrar o minijogo sem
escrever os textos em `src/data/minigames.pt-BR.json` deixa o contrato vermelho**.
Isso e de proposito. A correcao e escrever os textos, nao tirar a era da lista.

Quem estiver mexendo no `Screen.tsx` de um minijogo em paralelo vai pegar
conflito de uma linha logo abaixo do `</header>`, onde entrou o `<MinigameHelp>`.

## Decisoes que tomei sozinho

Em `DECISIONS.md`:

- **D41** — os textos sao obrigatorios por contrato, com minimo de 2 dicas por
  era, e o formato tem os quatro campos (maquina, o que fazia, funcionalidade da
  era, por que o desafio e esse).
- **D42** — a ajuda fica recolhida atras de botao (mesma escolha do HUD, D31) e a
  dica sai **uma por toque**, da mais geral a mais concreta, para nao entregar a
  resposta inteira a quem travou numa coisa pequena.
- **D43** — **dica nao custa pontos**. Nao mexe em estrela, eficiencia nem
  pontuacao. Era a escolha que mais podia ter sido feita diferente: da para
  argumentar que ajuda deveria custar. Decidi que nao porque cobrar pela ajuda,
  num jogo educacional para adolescente, ensina a nao pedir ajuda. Se o grupo
  preferir cobrar, o lugar e `applyMissionResult` e um campo novo no resultado —
  diga que eu mudo.
- **D44** — um componente unico (`MinigameHelp`) para as seis eras, em vez de
  painel copiado por minijogo.

Sobre o conteudo: escrevi os textos a partir do que os personagens da zona ja
contam em `npcs.pt-BR.json` e do que a prova da era cobra, para nao aparecer
nome, data ou afirmacao que o resto do jogo nao sustente. Jacquard 1804, Lovelace
1843, Shannon 1937, ENIAC 1945 e Colossus estao todos em conteudo que ja existia.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

Esperado: `npm run ci` verde, incluindo os 5 testes de contrato novos em
`content.test.ts`; `npm run test:e2e` verde nos tres dispositivos, incluindo os
dois testes novos de ajuda.

Na mao: `npm run dev`, entre na primeira zona, ande ate um terminal e toque em
"Usar o terminal". Na tela do minijogo, "O que e isto?" abre a explicacao (deve
citar o tear de Jacquard e a palavra REPETIR) e "Dica" libera a primeira das
quatro dicas, mudando para "Dica 2 de 4". Depois da ultima, o botao desativa e
aparece "Essas eram todas as dicas.".

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — aqui o contrato antigo nao estava errado: foi acrescentada
      exigencia nova (explicacao e dicas), nenhuma assercao foi removida
