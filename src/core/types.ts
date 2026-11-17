/** Contratos compartilhados. Dono: F1. Mudancas aqui precisam de aviso + DECISIONS.md. */

export type EraId = 'mecanica' | 'logica' | 'codigo' | 'redes' | 'seguranca' | 'ia';

export type PowerId = 'repetir' | 'decidir' | 'codificar' | 'conectar' | 'proteger' | 'aprender';

/** 'micro' = versao curta (<= 60 s) usada no chefao. */
export type Difficulty = 'micro' | 1 | 2 | 3;

export type PowerLevel = 0 | 1 | 2 | 3;

/** Dificuldade escolhida pelo jogador (D82): coracoes, municao e chao que cai. */
export type GameDifficulty = 'facil' | 'normal' | 'dificil';
export type Stars = 0 | 1 | 2 | 3;
export type MissionLetter = 'A' | 'B';

/** efficiency: 0..1.5 ; 1 = solucao de referencia. */
export interface Evaluation {
  ok: boolean;
  efficiency: number;
}

export interface Minigame<I, S> {
  era: EraId;
  /** Puro, deterministico, sempre solucionavel. */
  generate(seed: string, difficulty: Difficulty): I;
  /** Puro. */
  evaluate(instance: I, solution: S): Evaluation;
  /** Solucao de referencia (usada nos testes e na calibragem de eficiencia). */
  reference(instance: I): S;
}

export interface MinigameScreenProps<I, S> {
  instance: I;
  mode: 'mission' | 'micro';
  /** A tela envia; quem chama avalia com evaluate(). */
  onSubmit(solution: S): void;
  onExit(): void;
}

/** Tipo minimo de componente para nao obrigar core/ a importar React. */
export type ScreenComponent<I, S> = (props: MinigameScreenProps<I, S>) => unknown;

export interface MinigameModule<I, S> extends Minigame<I, S> {
  /** Exportado em index.ts, NUNCA em logic.ts. */
  Screen: ScreenComponent<I, S>;
}

export interface MissionProgress {
  stars: Stars;
  bestScore: number;
}

/**
 * O que o save guarda do jogador (D73): so as estrelas e a melhor pontuacao de
 * cada fase. Habilidade, era fechada e fase aberta saem dai (`core/campaign`).
 */
export interface PlayerState {
  /** Chave: "<era>-A" | "<era>-B" (o id da fase e da missao). */
  missions: Record<string, MissionProgress>;
}

export interface MissionDef {
  /** "<era>-<letra>", ex.: "redes-B". */
  id: string;
  era: EraId;
  letter: MissionLetter;
  difficulty: Exclude<Difficulty, 'micro'>;
  seed: string;
}

export type BossAttackId =
  | 'clonagem'
  | 'metamorfose'
  | 'instrucaoCorrompida'
  | 'pacotesPerdidos'
  | 'vazamento'
  | 'camuflagem';

export interface Attack {
  id: BossAttackId;
  /** Poder que neutraliza este ataque. */
  neutralizedBy: PowerId;
}

export type GameMode = 'mission' | 'boss' | 'daily';

export interface RunSubmission {
  mode: GameMode;
  /** Presente no modo 'mission'. */
  missionId?: string;
  seed: string;
  /** No chefao, o registro de acoes de cada turno. O cliente nunca envia pontuacao. */
  solution: unknown;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  verified: boolean;
  createdAt: string;
}
