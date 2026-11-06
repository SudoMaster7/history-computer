# PROMPT F2: 3D (hub, arena do chefão e Bit)

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

# SUA FRENTE: F2 — 3D (HUB, ARENA DO CHEFÃO E BIT)

## Responsabilidades

Toda a parte **Three.js**: `src/render/` (`HubScene`, `BossArena`, `Bit`, helpers). Você **não** faz minijogos nem HUD. Os minijogos são 2D e ficam fora do WebGL.

## Princípios

- **Formas simples** (caixas, cápsulas, cilindros, esferas) e **low-poly ilustrado**, cores chapadas, luz ambiente + 1 direcional. Nada de assets externos no MVP; encapsule o Bit em `Bit.tsx` para trocar por glTF depois.
- **Mobile primeiro:** orçamento por cena: ≤ ~150 mil triângulos, ≤ ~100 draw calls (use `InstancedMesh` para peças repetidas), texturas ≤ 1024 px, **sem sombras em tempo real e sem pós-processamento**. `<Canvas dpr={[1, 1.75]}>` + `PerformanceMonitor` do drei reduzindo a resolução se o fps cair. `frameloop="demand"` quando a cena está parada (volta a `always` só durante animação). Pausar o render com a aba oculta (`visibilitychange`).
- **Resiliência:** detectar ausência de WebGL e tratar `webglcontextlost`/`restored` com mensagem amigável e botão "Recarregar cena" (nunca tela branca). Fornecer um **fallback 2D estático** (imagem/SVG) para quando não houver WebGL.
- **Lazy load:** as cenas 3D são carregadas com `React.lazy`; o peso inicial da página não pode passar de ~5 MB.
- Respeitar `prefers-reduced-motion` e a opção "Reduzir animações" (props).

## Componentes e props (contrato com a F3 e a F1)

```tsx
// Hub: ilha com um portal por era; evolui com o ano
<HubScene
  year={state.year}                       // define as camadas visuais já "construídas"
  powers={state.powers}                   // define as peças do Bit
  unlocked={EraId[]}                      // portais abertos (os outros ficam apagados)
  onSelectEra={(era: EraId) => void}      // toque no portal
  reducedMotion={boolean}
/>

// Bit: montado com formas simples; cada poder adiciona uma peça
<Bit powers={Record<PowerId, 0|1|2|3>} mood={'idle'|'happy'|'hurt'|'cast'} />

// Arena do chefão: recebe eventos do combate e anima
<BossArena
  bossHp={number} bossHpMax={number}
  telegraph={AttackType | null}           // ataque anunciado: o BUG "carrega" o golpe
  lastEvent={{ t: 'hit'|'block'|'damage'|'patch'|'win'|'lose' } | null}
  powers={...} reducedMotion={boolean}
/>
```

Peças do Bit por poder: repetir = braço de engrenagem · decidir = cabeça com válvulas · codificar = tórax com circuito · conectar = antena e cabos · proteger = escudo e fechadura · aprender = núcleo neural brilhante (nível 2 e 3 = mais brilho/tamanho).

## Hub evolutivo (por ano / era)

Mesma ilha com camadas que aparecem conforme o ano avança: bronze e engrenagens (1) → válvulas incandescentes (2) → placas verdes de circuito (3) → cabos e torres neon (4) → nuvens e cofres azuis (5) → núcleo de IA magenta (6). **Uma paleta por era.** Câmera orbital com limites, toque no portal para entrar; portais bloqueados ficam apagados e sem resposta ao toque (mostrar um "tremor" leve).

## Arena do chefão

Plataforma simples; o **BUG Day 0** é uma forma geométrica "glitchada" (cubos que tremem/mudam de cor) com barra de vida; animações simples em `useFrame`: carregar o ataque (telegraph), receber golpe, bloquear, vitória e derrota. Um efeito diferente por tipo de ataque (clonagem, metamorfose, instrução corrompida, pacotes perdidos, vazamento, camuflagem), só com cor e escala.

## Plano por semana

- **S1:** projeto de cena sob a convenção da F1 · `Bit` com 2 peças · `HubScene` básico (ilha, 6 portais, câmera, toque no portal) · fallback de WebGL · medição de fps num celular real ou emulado.
- **S2:** hub evolutivo por ano (camadas e paletas das 6 eras) · todas as 6 peças do Bit com níveis 1–3 · `PerformanceMonitor` e `frameloop="demand"`.
- **S3:** `BossArena` completa com os 6 efeitos de ataque e os eventos (`hit`, `block`, `damage`, `patch`, `win`, `lose`).
- **S4:** otimização em celular (draw calls, triângulos, dpr), polimento, efeitos sonoros curtos opcionais (mudos por padrão), teste de perda de contexto WebGL.

## Critérios de aceite

≥ 30 fps no hub e na arena num celular intermediário (ou emulação com CPU throttling) · orçamento de triângulos/draw calls respeitado (documente a medição em `DECISIONS.md`) · sem tela branca sem WebGL · portais bloqueados não respondem · Bit mostra a peça de cada poder conquistado · nenhuma dependência nova além das da stack.
