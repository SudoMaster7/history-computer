# PROMPT F3: Interface (RPG) e minijogos das Eras 1–2

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

# SUA FRENTE: F3 — INTERFACE (RPG) E ERAS 1–2

## Responsabilidades

1. **Casca do jogo (UI):** `src/ui/` — HUD de RPG, árvore de poderes, menus, diálogos, enciclopédia, tutorial, tela do **portão da Linha do Tempo**, tela de **combate**, tela de **ranking**, tela de fim de missão. Roteamento e _layout_ mobile.
2. **Minijogos das Eras 1 e 2:** Tear de Engrenagens e Circuitos Lógicos.

Você consome `core/` (F1) e embute `<HubScene/>`, `<Bit/>` e `<BossArena/>` (F2). Enquanto elas não existem, use _stubs_ com a mesma assinatura.

## UI (casca)

- **HUD:** vida (barra), XP/nível, clock, **relógio de ano**, potência da máquina (soma dos níveis de poder + nível). Compacto, no topo, respeitando `safe-area`.
- **Árvore de poderes:** 6 nós com setas de dependência; mostra nível 0–3, estado (bloqueado/disponível/conquistado). Em cada missão, mostrar de **quais poderes anteriores cada etapa depende**; etapa sem o poder aparece **trancada** com o motivo ("precisa de Repetir, da Era 1").
- **Tela de missão:** carrega `getMinigame(era)`, gera a instância com a seed de `missions.json`, renderiza `Screen`, avalia com `evaluate()`, mostra **estrelas, pontuação, comparação com o recorde** e botões "Tentar de novo" (destaque) e "Próxima". Em falha, dizer o motivo em linguagem simples ("a saída do circuito está errada na linha 3"), nunca só "errou".
- **Portão da Linha do Tempo:** usa `drawGate/placeCard` da F1. Fluxo por toque: tocar na carta da mão → tocar no espaço entre duas cartas da linha. Acerto revela ano + curiosidade (+10 XP); erro tira vida (animação curta). Arrastar é opcional.
- **Combate:** mostra o ataque anunciado, as ações restantes (clock), os poderes disponíveis; ao escolher um poder abre a versão `micro` do minijogo da era (mesmo `Screen` com `mode='micro'`) e envia `applyAction`. Barra de Patch (0..3) e botão "Patch Day 0" quando cheio.
- **Ranking:** lista por missão e do chefão diário (via `Api`), com aviso "sem conexão" no offline. Depois de concluir uma missão, botão "ver como o recordista resolveu" (reproduz a solução salva passo a passo).
- **Textos:** todos em `src/data/dialogues.pt-BR.json` (humor leve, frases curtas, analogia do cotidiano antes do termo técnico). Os 3 guias (Ada, Turing, Grace Hopper) aparecem como imagens 2D (placeholder SVG no MVP). **Tutorial:** a missão `mecanica-A` ensina tocar e adicionar.
- **Acessibilidade:** opção "Reduzir animações" e "Sem vibração" em Configurações; `aria-label` nos controles.

## Minijogo 1 — Tear de Engrenagens (`mecanica`, poder **Repetir**)

Uma **fita** de células com cores (paleta de 3 a 4 cores). O jogador monta um programa de **cartões perfurados** para tecer um padrão-alvo.

```ts
type Card =
  | { op: 'paint'; color: number } // pinta a célula atual e avança
  | { op: 'repeat'; times: number; body: Card[] }; // repete o corpo N vezes
interface Instance {
  length: number;
  palette: number;
  target: number[];
  maxCards: number;
}
type Solution = Card[];
```

`evaluate`: executa a fita; `ok` se o padrão gerado == `target` e nº de cartões (contagem **recursiva**; `repeat` conta 1 + corpo) ≤ `maxCards`. `efficiency = min(1.5, refCards / usedCards)`. `generate`: **A** (dif. 1) fita de 6 células sem repetição; **B** (dif. 2) fita de 16 células com padrão periódico e `maxCards` que **só cabe com `repeat`**; **micro**: fita de 8 com um padrão curto. `reference` = menor programa conhecido para o padrão gerado.
**Toque:** tocar nos cartões da paleta adiciona à fita do programa; tocar num cartão da fita abre ações (apagar, mover ↑/↓, mudar nº de repetições). Mostrar o tecido sendo tecido numa animação curta ao executar (▶), com passo a passo e velocidade 1x/2x/4x.

## Minijogo 2 — Circuitos Lógicos (`logica`, poder **Decidir**)

O jogador liga portas **NÃO, E, OU** entre entradas e a saída para igualar uma **tabela-verdade** (cofre do ENIAC).

```ts
type Ref = { input: number } | { gate: number };
interface Gate {
  id: number;
  type: 'NOT' | 'AND' | 'OR';
  in: [Ref] | [Ref, Ref];
}
interface Instance {
  inputs: 2 | 3;
  table: boolean[];
  maxGates: number;
} // table tem 2^inputs linhas
interface Solution {
  gates: Gate[];
  out: Ref;
}
```

`evaluate`: valida que o grafo é **acíclico** e bem formado, simula todas as linhas; `ok` se todas batem e `gates.length <= maxGates`. `efficiency = min(1.5, refGates / usedGates)`. `generate`: **A** 2 entradas; **B** 3 entradas, tabela mais rica; **micro**: 2 entradas. Gere a tabela a partir de uma expressão aleatória (por `rng`) com k portas; `reference` = essa expressão (ou menor, se você a encontrar).
**Toque:** tocar numa porta da paleta e depois no encaixe do quadro; tocar na origem e depois no destino para ligar o fio; mostrar a **saída ao vivo** para cada linha da tabela (✓/✗).

## Plano por semana

- **S1:** projeto de rotas e _layout_ mobile · HUD · árvore de poderes (com dados do `store`) · tela de missão genérica · minijogo **Tear** completo (`logic.ts` + testes + `Screen.tsx`) · Playwright (Pixel 5, iPhone 12): completar `mecanica-A` por toque.
- **S2:** minijogo **Circuitos** completo · tela do **portão da Linha do Tempo** · enciclopédia básica (cartas desbloqueadas) · diálogos.
- **S3:** tela de **combate** (integrada a `applyAction`) · tela de **ranking** · fim de missão (estrelas, recorde, "ver como o recordista resolveu").
- **S4:** tutorial, acessibilidade, textos finais, conferência de **alvos ≥ 44 px** e ausência de rolagem horizontal em 360×640, capturas de tela.

## Critérios de aceite

`mecanica-A` completável por toque, sem ajuda, em até 3 min · todos os controles ≥ 44 px · sem rolagem horizontal em 360×640 · `reference()` vence com eficiência ≈ 1 em centenas de seeds (testes) · etapas trancadas mostram o poder que falta · `Screen` não importa nada de `core/` além dos tipos.
