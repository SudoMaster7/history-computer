# PROMPT F5: Minijogos das Eras 5–6, conteúdo e validação

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

# SUA FRENTE: F5 — ERAS 5–6 E CONTEÚDO/PESQUISA

## Responsabilidades

1. **Minijogos das Eras 5 e 6:** Cofre Criptográfico (poder **Proteger**) e Treinar o Detector (poder **Aprender**), com `logic.ts`, `Screen.tsx`, `index.ts`, testes e versão `micro`.
2. **Conteúdo do jogo:** `cards.json` (cartas do portão), diálogos, ilustrações-guia (placeholders), textos de dica.
3. **Pesquisa e validação:** bibliografia, material do teste com usuários (pré/pós-teste, SUS, questionário de engajamento, termo de assentimento/consentimento), roteiro e aplicação dos **playtests** (S3) e da validação formal (01–03/12), consolidação dos dados e texto da monografia (junto com a equipe).

Respeite o contrato `Minigame/MinigameModule`. As estruturas abaixo são **sugestões firmes**: mudanças vão para `DECISIONS.md` e avise a F1 e a F3.

## Minijogo 5 — Cofre Criptográfico (`seguranca`, poder **Proteger**)

- **A (dif. 1): "Cifra de César".** Cifrar e decifrar mensagens com deslocamento de letras.
- **B (dif. 2): "Integridade".** Achar o **pacote adulterado** comparando checksums e **reenviá-lo cifrado**.

```ts
type Instance =
  | { kind: 'caesar'; mode: 'encrypt' | 'decrypt'; text: string; shift?: number } // em 'decrypt' o shift é oculto
  | {
      kind: 'integrity';
      packets: { id: number; data: string; sentChecksum: number }[];
      tamperedId: number;
      shift: number;
    };
type Solution =
  | { kind: 'caesar'; shift: number; output: string; attempts: number }
  | { kind: 'integrity'; marked: number; checks: number; resent: string }; // resent = pacote correto cifrado
```

`evaluate` (A): `ok` se `output` == resultado correto; `efficiency = min(1.5, 2 / attempts)` (o ideal é acertar em poucas tentativas usando a análise de frequência/dica). (B): `ok` se `marked == tamperedId` **e** `resent` == dado original cifrado com `shift`; `efficiency = min(1.5, ceil(n/2) / checks)`. Checksum simples e didático (ex.: soma dos códigos mod 256). **micro:** cifrar uma palavra curta.
**Toque:** roda de letras com botões **+** e **−** (deslocamento) e prévia ao vivo; tocar nos pacotes para "verificar" (mostra checksum calculado × recebido) e marcar o adulterado.

## Minijogo 6 — Treinar o Detector (`ia`, poder **Aprender**)

- **A (dif. 1): "Separar os dados".** Posicionar uma **fronteira (reta)** que separa bugs de dados normais num gráfico 2D (linearmente separáveis).
- **B (dif. 2): "Dados ruidosos".** Há **ruído**, **conjunto de treino** e **conjunto de teste**: o jogador ajusta a fronteira vendo o treino e, ao "testar", vê a acurácia nos dados **não vistos** (lição de **sobreajuste**).

```ts
interface Point {
  x: number;
  y: number;
  label: 0 | 1;
}
interface Instance {
  train: Point[];
  test: Point[];
  refAccuracy: number;
} // acurácia da referência no teste
interface Solution {
  angle: number;
  offset: number;
} // fronteira: lado = sinal de (cos,sin)·p − offset
```

`evaluate`: acurácia da fronteira nos pontos de **teste**; A: `ok` se acurácia ≥ 0,90; B: `ok` se ≥ 0,75. `efficiency = min(1.5, accuracy / refAccuracy)`. `generate`: pontos por `rng` (duas nuvens), com ruído crescente por dificuldade; **micro:** ~10 pontos, sem ruído. `reference` = melhor reta simples (busca em grade de ângulos/offsets).
**Toque:** **dois controles deslizantes grandes** (posição e inclinação) movem a fronteira ao vivo; botão "Testar" revela a acurácia no teste. Texto curto explicando por que acertar o treino não basta.

## Conteúdo

- **`src/data/cards.json`:** `{ id, title, year, era, blurb, source, verified }`. **~28 cartas** (4 a 5 por era). Candidatas — **conferir cada ano em fonte confiável** (livro/artigo/museu) e preencher `source`; `verified: false` onde houver dúvida; onde há mais de uma data aceita (criação × apresentação pública), registre a escolhida e o motivo no `blurb`/`DECISIONS.md`:
  - Mecânica: Tear de Jacquard (1804), Máquina Diferencial (1822), Pascalina (1642), Máquina Analítica (1837), notas de Ada Lovelace (1843).
  - Lógica: Máquina de Turing (1936), arquitetura de von Neumann (1945), ENIAC (1946), Teste de Turing (1950).
  - Código: Transistor (1947), compilador de Grace Hopper (1952), FORTRAN (1957), Unix (1969), Intel 4004 (1971).
  - Redes: ARPANET (1969), e-mail (1971), TCP/IP na ARPANET (1983), proposta da WWW (1989).
  - Segurança/Web: RSA (1977), Linux (1991), Google (1998), AWS (2006), iPhone (2007).
  - IA: Dartmouth (1956), Deep Blue vence Kasparov (1997), AlexNet (2012), Transformers (2017), ChatGPT (2022).
    Cada `blurb` tem **1–2 frases**, tom leve, com analogia do cotidiano antes do termo técnico.
- **`src/data/dialogues.pt-BR.json`:** falas curtas de Ada, Turing, Grace Hopper e do Bit (introdução de cada era, dicas, vitória/derrota, chefão). Humor leve, adolescentes.
- **Guias 2D:** 3 ilustrações-placeholder em SVG (Ada, Turing, Grace Hopper) em `src/assets/guides/`, no estilo low-poly/chapado; só CC0 ou criadas por nós (registrar em `ASSETS.md`).

## Pesquisa e validação (entregáveis em `docs/`)

- **Bibliografia** (S1): gamificação, jogos educacionais, ensino de história da computação, pensamento computacional, aprendizagem cumulativa. Lista inicial: Deterding et al. (2011), Kapp (2012), Wing (2006), Papert (1980), Csikszentmihalyi (1990), Vygotsky (1978), Hevner et al. (2004), Brooke (1996), BNCC Computação (Parecer CNE/CEB nº 2/2022). **Conferir e normalizar em ABNT**; ampliar com trabalhos brasileiros sobre jogos para ensino de computação.
- **Instrumentos:** pré/pós-teste de conhecimento (cronologia + 1 questão conceitual por era), escala **SUS**, questionário de diversão/engajamento (Likert), termo de assentimento + autorização dos responsáveis (menores de 18), aviso de telemetria anônima. **Verifique com o orientador a exigência de comitê de ética.**
- **Playtests informais (S3):** ~5 pessoas; registrar onde travaram, tempo por missão, o que não entenderam; entregar um resumo de 1 página à F1 para calibrar as constantes.
- **Validação formal (01–03/12):** 15 a 20 participantes; consolidar em planilha e produzir gráficos simples (pré × pós, SUS, engajamento).

## Plano por semana

- **S1:** bibliografia inicial · lista de cartas com fontes · esqueleto do módulo `ia` · **Treinar o Detector** completo (`logic` + `Screen` + testes) · começo do `dialogues.pt-BR.json`.
- **S2:** **Cofre Criptográfico** completo · `cards.json` com ≥ 25 cartas (marcando `verified`) · guias 2D (placeholders) · instrumentos de validação e termos.
- **S3:** versões **micro** das Eras 5 e 6 integradas ao chefão · playtests informais · roteiro da validação formal · resumo de calibragem para a F1.
- **S4:** textos finais, correção de dicas, preparação do material do teste, testes de toque (Playwright) para `seguranca-A` e `ia-A` · apoio à redação da monografia.

## Critérios de aceite

Missões `seguranca-A/B` e `ia-A/B` passam nos testes de referência e de seeds (centenas) · jogáveis por toque, sem arrastar · sliders ≥ 44 px de alvo e gráfico legível em 360 px · `cards.json` com ≥ 25 cartas e `source` preenchida (as sem fonte marcadas `verified: false`) · material de validação pronto antes de 01/12.
