# PROMPT F1: Core, RPG, chefão e servidor

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

# SUA FRENTE: F1 — CORE E SERVIDOR

Você é o **dono dos contratos**. As outras 4 frentes dependem de você já na **Semana 1**, então publique cedo (dia 1–2) a pasta `src/core/` com **tipos e assinaturas** (mesmo que as implementações ainda sejam simples), e só depois refine.

## Responsabilidades

Projeto base (Vite + TS strict + ESLint/Prettier + Vitest + Playwright + CI + PWA básica + `constants.ts`), `core/` inteiro, `store/` (Zustand), `services/` e `supabase/`. Você **não** faz telas de minijogo, 3D nem conteúdo.

## API que você precisa publicar (assinaturas fixas desde a S1)

```ts
// core/rng.ts
export function hashSeed(s: string): number;
export function createRng(seed: string): () => number; // mulberry32, retorna [0,1)
export function dailySeed(now?: Date): string; // "AAAA-MM-DD" no fuso America/Sao_Paulo

// core/rpg.ts  (todas puras: recebem e devolvem PlayerState)
export function initialState(): PlayerState;
export function gainXp(s: PlayerState, amount: number): PlayerState; // sobe nível, vida máx., clock
export function takeDamage(s: PlayerState, amount: number): PlayerState; // vida 0 => reinicia com 50%
export function heal(s: PlayerState, pct: number): PlayerState;
export function applyMissionResult(s: PlayerState, missionId: string, e: Evaluation): PlayerState;
// aplica estrelas, bestScore, XP (só melhoria), +25% de vida, nível do poder e avanço do ano

// core/powers.ts
export const POWER_OF_ERA: Record<EraId, PowerId>;
export const POWER_REQUIRES: Record<PowerId, PowerId[]>;
export function missingPowers(s: PlayerState, era: EraId): PowerId[];
export function canEnterEra(s: PlayerState, era: EraId, gateCleared: boolean): boolean;

// core/scoring.ts
export function starsFor(efficiency: number, ok: boolean): 0 | 1 | 2 | 3;
export function missionScore(efficiency: number): number;
export function bossScore(hpLeft: number, turns: number): number; // 2000 + 10*hp - 60*turns (min 200)

// core/timeline.ts  (portão)
export function drawGate(era: EraId, seed: string): Gate; // 4 a 5 cartas, 1 inicial visível
export function placeCard(g: Gate, cardId: string, index: number): { gate: Gate; correct: boolean };
export function gateCleared(g: Gate): boolean;

// core/registry.ts
export function registerMinigame<I, S>(m: MinigameModule<I, S>): void;
export function getMinigame(era: EraId): MinigameModule<any, any>;
```

## Combate por turnos (`core/boss.ts`, puro)

Vida do chefão = 600. Estado: vida do chefão, vida do jogador, medidor de Patch (0..3), turno, ataque anunciado, ações restantes, log.

```ts
export interface BattleState {
  /* ... */
}
export type BattleAction =
  | { t: 'power'; power: PowerId; solution: unknown } // usa a versão micro do minijogo da era
  | { t: 'patch'; solutions: unknown[] } // 3 micro-desafios de eras diferentes
  | { t: 'endTurn' };
export function newBattle(seed: string, player: PlayerState): BattleState;
export function announcedAttack(b: BattleState): Attack; // ordem sorteada pela seed
export function applyAction(b: BattleState, a: BattleAction): BattleState; // avalia via getMinigame(era)
```

Regras: o ataque anunciado do turno é neutralizado pelo poder correspondente (Clonagem→repetir, Metamorfose→decidir, Instrução corrompida→codificar, Pacotes perdidos→conectar, Vazamento→proteger, Camuflagem→aprender). Dano ao chefão = `40 × multiplicador do poder × eficiência`. Se uma ação usa o poder certo com eficiência ≥ 0,5: ataque bloqueado e Patch +1; senão o jogador perde ~20 de vida. Com Patch = 3: `patch` causa 200 de dano se as 3 soluções forem `ok`. Fim: chefão em 0 (vitória) ou jogador em 0 (reinicia o combate com Patch zerado). **Fallback:** se as Eras 5–6 atrasarem, `newBattle` aceita uma lista de poderes ativos e sorteia ataques só entre eles.

## Serviços e servidor

- `services/api.ts` define a interface `Api`: `signInAnonymous()`, `submitRun(run)`, `leaderboard(mode, missionId)`, `daily()`, `recordSolution(mode, missionId)`. Implemente **`localApi` primeiro** (localStorage + ranking simulado) para o jogo rodar **sem chaves**; `supabaseApi` na S2–S3, escolhida por variável de ambiente.
- O cliente **nunca envia pontuação**: envia `{ mode, missionId | seed, solution }`. No chefão, `solution` é o registro de ações de cada turno.
- Supabase: tabelas `players`, `runs(id, player_id, mode, mission_id, seed, solution jsonb, score, verified, created_at)`, `daily(day, seed)`; view `leaderboard` (melhor score verificado por jogador e missão); **RLS ligado**, leitura pública do ranking, escrita de runs **só** pela Edge Function. `functions/validate-run` importa o **mesmo `core/`**, regenera a instância pela seed, reavalia, calcula a pontuação e grava `verified = true`; divergência é descartada. Limite de tamanho da solução e de taxa por jogador.
- Telemetria só com aviso ao jogador e dados anônimos.

## Plano por semana

- **S1 (05–11/11):** projeto base + CI + deploy (Vercel/Netlify) · `types`, `constants`, `rng`, `registry`, `rpg`, `powers`, `scoring` com testes (cobertura do `core` ≥ 90%) · `store` com persistência local · `localApi` · `missions.json` com as 12 missões (seed e dificuldade). **Publique os tipos no dia 1–2.**
- **S2 (12–18/11):** `timeline.ts` (+ leitura de `cards.json` da F5) · `applyMissionResult` completo (avanço do ano) · projeto Supabase, migrations, login anônimo, envio de runs · teste que roda **todas as missões** com `reference()` e exige `ok` e eficiência ≈ 1.
- **S3 (19–25/11):** `boss.ts` + testes (vitória, derrota, Patch, determinismo com a mesma seed) · `validate-run` (missões e chefão) · `leaderboard` · chefão diário · teste "mesma solução enviada 2× = mesma pontuação" e "solução adulterada é rejeitada".
- **S4 (26–30/11):** calibrar constantes com os playtests · corrigir bugs · deploy final · Lighthouse mobile ≥ 80 e PWA instalável · README, `DECISIONS.md`, `ASSETS.md`.

## Critérios de aceite

`core/` sem imports de React/Three/DOM (checar com regra de lint) · cobertura ≥ 90% · portal fechado sem pré-requisito · chefão determinístico · ranking validado no servidor · jogo roda 100% offline com `localApi`.
