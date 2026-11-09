# Minijogo da Era 2: Circuitos Logicos

- **Data:** 2026-11-09
- **Autor:** agente (Claude Opus 5) a pedido de Leticia
- **Tipo:** regra de jogo

## O que mudou

- `src/minigames/logica/logic.ts` — novo. Logica pura do minijogo: tabela-verdade
  sorteada por seed, forma do circuito, simulacao linha a linha, menor circuito
  (`reference`) e avaliacao (`evaluate`).
- `src/minigames/logica/logic.test.ts` — novo. 30 testes: convencao da tabela,
  simulacao, forma do circuito, referencia, geracao e avaliacao.
- `src/minigames/logica/Screen.tsx` — novo. Tela por toque: tabela do cofre com
  ✓/✗ ao vivo, quadro de portas, encaixes e paleta NAO/E/OU.
- `src/minigames/logica/index.ts` — novo. Monta o `MinigameModule` da era.
- `src/minigames/index.ts` — registra `logicaModule` junto do `mecanicaModule`.
- `src/core/constants.ts` — grupo `CIRCUIT`: entradas, faixa de portas, folga e
  tentativas de sorteio, por dificuldade.
- `src/data/ui.pt-BR.json` — bloco `circuit` com os textos da tela; o texto de
  falha da missao deixou de citar "padrao" (era so do Tear) e passou a ser
  "Ainda nao: o resultado nao bateu.".
- `src/styles/app.css` — estilos `.circuit*`.
- `tests/contract/api-surface.test.ts` — `CIRCUIT` entrou na lista de
  `core/constants`.
- `tests/contract/architecture.test.ts` — `src/minigames/logica/logic.ts` entrou
  na lista de arquivos que precisam ser puros.
- `tests/e2e/smoke.spec.ts` — tres testes novos: zerar `logica-A` por toque com 3
  estrelas, apagar porta sem deixar fio podre, e a tela cabendo no celular
  (44 px e sem rolagem lateral) com o quadro cheio.
- `README.md` e `CLAUDE.md` — o estado do projeto agora diz Eras 1 **e 2**.
- `DECISIONS.md` — D36 a D40.
- `docs/CHANGELOG.md` — indice.

## Por que

Era o item seguinte da frente F3 (`docs/fases/F3_Interface_e_Eras_1-2.md`, Semana
2): a Era 2 tinha mapa, personagens, prova e item, mas o terminal dizia "Terminal
em construcao". O pedido foi "vamos para a proxima fase de desenvolvimento do
projeto", e a proxima fase pendente, pela ordem dos documentos de fase e pela
ordem de corte do briefing (que nao deixa cortar as Eras 1–4), e este minijogo.

Com isso duas das seis eras fecham o ciclo completo: duas missoes, porta, prova,
poder e item.

## O que isso quebra

Nada de formato de save: `STORAGE.VERSION` continua 1, e o save antigo abre igual.

Dois pontos para quem estiver mexendo em paralelo:

- `ui.mission.failure` mudou de texto. Era especifico do Tear ("o padrao nao
  bateu") e agora serve para qualquer minijogo. Quem estiver procurando a frase
  antiga num teste nao vai achar.
- A zona de Logica deixou de cair no aviso de terminal em construcao. Teste de
  ponta a ponta que contava com esse aviso na Era 2 passa a falhar — nao havia
  nenhum, mas vale o aviso.

Nenhum nome do `core/` foi renomeado ou removido. `CIRCUIT` foi acrescentado a
`constants.ts`, e o contrato de superficie foi atualizado por adicao (nenhuma
assercao foi afrouxada).

## Decisoes que tomei sozinho

Todas registradas em `DECISIONS.md`:

- **D36** — a solucao de referencia e o **menor circuito calculado**, nao a
  expressao que o gerador sorteou. Sem isso, eficiencia 1,0 significaria "parecido
  com o sorteio" em vez de "tao enxuto quanto da para ser".
- **D37** — uma porta so liga em entradas ou em portas montadas **antes** dela.
  Aciclico por construcao, sem busca de ciclo.
- **D38** — o fio se liga **encaixe primeiro, origem depois** (o briefing sugeria
  o contrario). Assim a lista de origens mostrada e so a valida para aquele
  encaixe.
- **D39** — a tabela sorteada tem de reagir a **todas** as chaves do cofre, senao
  uma entrada fica decorativa.
- **D40** — faixa de portas e folga por dificuldade: A e micro com folga, B
  apertada, dificuldade 3 so com o circuito minimo.

Uma decisao de conteudo que nao virou regra: a missao A caiu numa tabela NAO(A E
B) e a B num alvo de 5 portas com 3 entradas. Sao consequencia das seeds em
`missions.json`, que nao mexi.

## Como conferir

```bash
npm run ci
npm run test:e2e
```

Esperado: `npm run ci` verde (inclui os 30 testes novos de `logic.test.ts` e os
testes de contrato) e `npm run test:e2e` verde nos tres dispositivos.

Na mao, para ver o minijogo: `npm run dev`, menu → Zonas → Mecanica, zere as duas
missoes e passe na prova (ou abra Valvulas e Logica depois disso), ande ate o
terminal da esquerda (coluna 2, linha 7) e toque em "Usar o terminal". A tabela
pede NAO (A E B): monte uma porta E ligada em A e B, uma porta NAO ligada na
porta 1, e aponte a saida para a porta 2. Deve fechar com 3 estrelas.

## Verificacao

- [x] `npm run ci` passou (lint, tipos, testes com cobertura, build)
- [x] `npm run test:e2e` passou
- [x] Os testes de contrato em `tests/contract/` continuam verdes **sem eu
      ter afrouxado nenhum deles**
- [x] Se mexi em `tests/contract/`, expliquei acima por que o contrato antigo
      estava errado — aqui so acrescentei nome novo (`CIRCUIT`) e arquivo novo a
      lista de arquivos puros; nenhuma assercao foi removida ou relaxada
