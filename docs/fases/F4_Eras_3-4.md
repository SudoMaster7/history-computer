# PROMPT F4: Minijogos das Eras 3–4 (Mesa de Bits e Rota dos Pacotes)

Você é um engenheiro sênior trabalhando em **uma das 5 frentes** de um projeto com 5 pessoas e **1 mês** de prazo (05 a 30/11/2026; validação com usuários de 01 a 03/12). Leia o **contexto comum** e depois a **sua frente**. Ao começar, responda com um plano curto (máx. 15 linhas) e as dúvidas bloqueantes; depois execute a Semana 1 sem esperar aprovação, a menos que haja dúvida bloqueante.

---

# CONTEXTO COMUM (igual em todas as frentes)

## O produto

**Da Válvula à IA** (título provisório) é um jogo educacional em estilo **RPG**, para navegador, **mobile-first**, para adolescentes curiosos. O jogador controla o **Bit**, uma máquina que viaja por **6 eras da computação** cumprindo **missões** (2 por era, A e B), cada era com um **minijogo diferente**. Missões rendem **conhecimento (XP/nível)** e um **poder** que depende dos poderes anteriores (árvore de dependências). Para abrir o portal de cada era o jogador passa por um **portão da Linha do Tempo** (adaptação do jogo de cartas Timeline). No fim enfrenta o chefão **BUG Day 0** em **combate por turnos**, que só se vence usando os poderes de todas as eras. Competição **assíncrona** (pontuação recorde, desafio diário, ranking). Sem multiplayer em tempo real.

Documentos de referência do projeto: `PROMPT_MVP_Da_Valvula_a_IA.md` (visão geral e regras) e o Documento de Implementação v0.2. Em caso de conflito, **este arquivo manda para a sua frente** e as mudanças de contrato devem ser combinadas com a F1.

## Stack (fixa; não adicionar bibliotecas sem justificar em `DECISIONS.md`)

TypeScript strict · Vite · React · Zustand (persistência local) · Three.js via `@react-three/fiber` + `drei` (**só** hub, arena do chefão e Bit) · minijogos em **React + SVG** (Canvas 2D só se necessário; **sem WebGL**) · Vitest · Playwright · Supabase (fase final) · `vite-plugin-pwa` · ESLint + Prettier. Versões **exatas** no `package.json` (sem `^`).

## Regra inviolável de arquitetura

**`core/` e a lógica dos minijogos (`logic.ts`) não podem importar React, Three.js, DOM nem rede.** Gerar desafios, avaliar soluções, XP, vida, dano e pontuação são **funções puras e determinísticas** (sem `Math.random`, sem relógio; aleatoriedade só via `rng(seed)`). As telas só mostram e coletam toques.

## Contratos compartilhados (`src/core/types.ts`, dono: F1)

```ts
export type EraId = 'mecanica' | 'logica' | 'codigo' | 'redes' | 'seguranca' | 'ia';
export type PowerId = 'repetir' | 'decidir' | 'codificar' | 'conectar' | 'proteger' | 'aprender';
export type Difficulty = 'micro' | 1 | 2 | 3; // micro = versão curta (<= 60 s) usada no chefão

export interface Evaluation {
  ok: boolean;
  efficiency: number;
} // 0..1.5 ; 1 = solução de referência

export interface Minigame<I, S> {
  era: EraId;
  generate(seed: string, difficulty: Difficulty): I; // puro, determinístico, sempre solucionável
  evaluate(instance: I, solution: S): Evaluation; // puro
  reference(instance: I): S; // solução de referência (usada nos testes)
}

export interface MinigameScreenProps<I, S> {
  instance: I;
  mode: 'mission' | 'micro';
  onSubmit(solution: S): void; // a tela envia; quem chama avalia com evaluate()
  onExit(): void;
}
export interface MinigameModule<I, S> extends Minigame<I, S> {
  Screen: React.ComponentType<MinigameScreenProps<I, S>>; // exportado em index.ts, NÃO em logic.ts
}

export interface PlayerState {
  level: number;
  xp: number;
  hp: number;
  hpMax: number;
  clock: number;
  powers: Record<PowerId, 0 | 1 | 2 | 3>;
  missions: Record<string, { stars: 0 | 1 | 2 | 3; bestScore: number }>; // id: "<era>-A" | "<era>-B"
  year: number;
  cards: string[];
}
```

Registro: `registerMinigame(module)` e `getMinigame(era)` em `src/core/registry.ts`. Missões em `src/data/missions.json`: `{ id: "redes-B", era: "redes", letter: "B", difficulty: 2, seed: "redes-B-v1" }`. **A solução de referência não é guardada em JSON**: é calculada por `reference(instance)`.

Estrutura de cada minijogo: `src/minigames/<era>/logic.ts` (puro) · `Screen.tsx` · `index.ts` (monta o `MinigameModule`) · `logic.test.ts`.

## Regras RPG (valores iniciais, todos em `src/core/constants.ts`, nunca espalhados no código)

Vida máx. = 100 + 10 × nível (nível máx. 10) · XP p/ próximo nível = 100 × nível · XP da missão = 50 + 30 × estrelas (só a melhoria conta) · XP por carta correta no portão = 10 · Clock = 2 (+1 nos níveis 4 e 8) · erro no portão = −10 de vida (vida 0 → reinicia com 50% e repete o portão) · +25% de vida ao concluir missão; vida cheia ao subir de nível · missões **não tiram vida** · estrelas: 1 = concluiu, 2 = eficiência ≥ 0,85, 3 = ≥ 1,0 · pontuação da missão = `round(1000 × eficiência)` (máx. 1500) · nível do poder: 1 ao concluir a missão B da era, 2 com ≥ 2★ nas duas, 3 com 3★ nas duas (dano ×1,0/1,25/1,5).

Árvore de poderes (exige nível ≥ 1): repetir (nada) · decidir (repetir) · codificar (repetir, decidir) · conectar (repetir, decidir, codificar) · proteger (decidir, codificar, conectar) · aprender (decidir, codificar).

## MOBILE-FIRST (requisito, vale para todas as frentes)

Celulares de entrada/intermediários, ~360–430 px, **retrato primeiro**.

- `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-*)`, sem rolagem horizontal, `overscroll-behavior: none` na tela do jogo, sem zoom por toque duplo nem seleção de texto nos elementos de jogo.
- Alvos de toque **≥ 44 × 44 px**, espaçamento ≥ 8 px. Nada depende de `hover`. Usar `pointer events`.
- **Tudo jogável por toque simples (tocar e tocar), sem arrastar.** Arrastar é atalho opcional (com `activationConstraint` para não brigar com a rolagem).
- Fonte base ≥ 16 px, contraste AA, `aria-label`, respeitar `prefers-reduced-motion`, vibração opcional e desativável.
- Cenas 3D: ≥ 30 fps em Android intermediário, `dpr` ≤ 1,75, ≤ ~150 mil triângulos, ≤ ~100 draw calls, sem sombras em tempo real e sem pós-processamento. Minijogos 2D: animações leves em CSS/SVG.
- Peso inicial ≤ ~5 MB; carregar cada era sob demanda (`React.lazy`).

## Como trabalhar

- Uma branch por tarefa (`feat/...`, `fix/...`), PR pequeno, pelo menos 1 revisão, CI verde (lint, `tsc --noEmit`, Vitest, Playwright).
- Todo texto visível ao jogador em **pt-BR** (em `src/data/*.pt-BR.json`); identificadores em inglês.
- Se algo estiver ambíguo e for caro de desfazer, pergunte; senão escolha o mais simples e registre em `DECISIONS.md`.
- Não mexa em pastas de outras frentes; se precisar de algo delas, abra uma issue ou peça a mudança de contrato à F1.
- Ao fim de cada semana: rode tudo, commit e escreva 3 linhas (pronto / pendente / bloqueios).
- **Ordem de corte se houver atraso:** efeitos visuais; bônus de herança entre poderes; Eras 5 e 6 reduzidas a 1 missão cada; chefão com 4 ataques; chefão diário. O núcleo RPG, as Eras 1–4 e o chefão básico **não** se cortam.
- Licenças: código MIT; conteúdo CC BY 4.0; assets de terceiros apenas CC0 ou compatíveis, registrados em `ASSETS.md`.

---

# SUA FRENTE: F4 — ERAS 3 E 4 (MESA DE BITS E ROTA DOS PACOTES)

## Responsabilidades

Os minijogos **Mesa de Bits** (Era 3, poder **Codificar**) e **Rota dos Pacotes** (Era 4, poder **Conectar**), cada um com `logic.ts` puro, `Screen.tsx`, `index.ts`, testes, e **versão `micro`** para o chefão. Você consome `core/` (F1) e a casca de UI da F3 (a tela de missão chama o seu `Screen`).

Respeite o contrato `Minigame/MinigameModule`. As estruturas abaixo são **sugestões firmes**: se precisar mudar, registre em `DECISIONS.md` e avise a F1 e a F3.

## Minijogo 3 — Mesa de Bits (`codigo`, poder **Codificar**)

Era do transistor e das linguagens (compilador de Grace Hopper). Duas missões:

- **A (dif. 1): "Liga e desliga".** Formar um número (0–255) ou uma letra (ASCII) ligando/desligando **8 transistores (bits)**.
- **B (dif. 2): "Compilador".** Traduzir um programa de alto nível em **instruções de máquina**.

```ts
type Instance =
  | { kind: 'bits'; target: number } // 0..255
  | {
      kind: 'compile';
      isa: { mnemonic: string; opcode: number }[]; // instruções disponíveis
      program: { dest: string; a: string; op: '+' | '-'; b: string | number }[];
    };
type Solution =
  | { kind: 'bits'; bits: boolean[] } // 8 posições, MSB primeiro
  | { kind: 'compile'; code: string[] }; // sequência de mnemônicos escolhidos
```

- **A:** `ok` se o valor dos bits == `target`. `efficiency = min(1.5, refToggles / toggles)` (a referência é o nº de bits 1 do alvo; a solução deve registrar os toques).
- **B:** a ISA tem, por exemplo, `LOAD x`, `ADD x`, `SUB x`, `INC x`, `STORE x`. Cada linha `x = a + b` compila em `LOAD a; ADD b; STORE x`; o caso `x = x + 1` pode usar `INC x` (otimização). Simule a máquina (registrador + memória) e confira o resultado final. `ok` se os valores finais batem. `efficiency = min(1.5, refLen / usedLen)`.
- **micro:** um número ou uma linha de programa.
- **Toque (A):** tocar em cada transistor liga/desliga, com mostrador de binário e decimal ao vivo. **(B):** lista dos comandos de alto nível; tocar na instrução da paleta a adiciona; tocar numa instrução montada a remove ou move; botão ▶ executa e mostra registradores e memória passo a passo.
- **Didática:** mostrar o **peso de cada bit** (128, 64, …, 1) e a ponte "alto nível → instruções → bits".

## Minijogo 4 — Rota dos Pacotes (`redes`, poder **Conectar**)

Enviar uma mensagem pela rede **fazendo todos os passos**.

- **A (dif. 1): "Primeiro pacote".** Um pacote: descobrir o endereço do destino e rotear por um grafo.
- **B (dif. 2): "Mensagem completa", 5 etapas em sequência:** (1) **fragmentar** em pacotes (respeitando um tamanho máximo `mtu`), (2) **endereçar** (consultar a **tabela DNS**), (3) **rotear** por um grafo com **link caído**, (4) **confirmar entrega (ACK) e reenviar** os pacotes perdidos, (5) **remontar** na ordem correta (os pacotes chegam embaralhados).

```ts
interface Instance {
  message: string; // 12 a 24 caracteres
  mtu: number; // tamanho máximo por pacote
  dns: { name: string; ip: string }[];
  target: string; // nome a resolver
  graph: {
    nodes: string[];
    edges: { a: string; b: string; cost: number; down?: boolean }[];
    from: string;
    to: string;
  };
  lostSeq: number[]; // pacotes sem ACK (definido pela seed)
  arrival: number[]; // ordem embaralhada de chegada
}
interface Solution {
  cuts: number[]; // índices de corte da mensagem
  ip: string; // endereço escolhido
  route: string[]; // nós do caminho
  resend: number[]; // pacotes marcados para reenvio
  order: number[]; // ordem de remontagem
}
```

`evaluate` confere **cada etapa**: `cuts` geram pacotes ≤ `mtu`; `ip` == DNS de `target`; `route` é um caminho válido que **não usa links caídos**; `resend` == `lostSeq` (conjunto exato); `order` reconstrói a mensagem. `ok` só se **todas** as etapas válidas. `efficiency` = média de: (pacotes mínimos ÷ pacotes usados), (custo mínimo da rota por Dijkstra ÷ custo usado) e (1 se `resend` exato, senão 0). Missão A avalia só IP e rota. **micro:** mensagem de 3 pacotes e um link caído.

- **Toque:** etapa 1 tocar nos pontos de corte da mensagem; etapa 2 tocar na linha certa da tabela DNS; etapa 3 tocar nos roteadores em sequência (link caído em vermelho); etapa 4 tocar em "reenviar" nos pacotes sem ACK; etapa 5 tocar nas peças na ordem. Cada etapa mostra um selo do **poder anterior cujo conceito reutiliza** (fragmentar = Repetir; roteamento com link caído = Decidir; endereços e bits = Codificar), para a árvore de dependências ficar visível.
- **Garantias do gerador:** sempre existe rota sem links caídos; `lostSeq` não vazio na dif. 2; o grafo é pequeno (6–8 nós) para caber em 360 px.

## Requisitos de todo minijogo (testes obrigatórios em `logic.test.ts`)

`reference()` vence com `ok` e eficiência ≈ 1 em **centenas de seeds** (`generate` sempre solucionável) · soluções inválidas/adulteradas são rejeitadas · mesma seed + mesma solução = mesmo resultado · `micro` termina em ≤ 60 s de jogo · solução serializável em JSON.

## Plano por semana

- **S1:** esqueleto dos dois módulos com tipos e `generate/evaluate/reference` · **Mesa de Bits** completa (A e B, `logic` + `Screen` + testes).
- **S2:** **Rota dos Pacotes** completa (as 5 etapas, A e B) · visual do grafo em SVG legível em 360 px.
- **S3:** versões **micro** das duas eras, integradas ao combate (a F3 chama o seu `Screen` com `mode='micro'`; a F1 chama `evaluate`) · ajustes de balanceamento com os playtests.
- **S4:** polimento, alvos ≥ 44 px, textos de dica, testes de toque no Playwright (iPhone 12 e Pixel 5) para `codigo-A` e `redes-A`.

## Critérios de aceite

Missões `codigo-A/B` e `redes-A/B` passam nos testes de referência e de seeds · tudo jogável por toque, sem arrastar · grafo e tabelas cabem em 360 px sem rolagem horizontal · versão `micro` de ambos pronta e integrada ao chefão.
