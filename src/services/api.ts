import type { GameMode, LeaderboardEntry, RunSubmission } from '@/core/types';

export interface Session {
  playerId: string;
  playerName: string;
}

export interface SubmittedRun {
  id: string;
  mode: GameMode;
  missionId?: string;
  seed: string;
  score: number;
  /** true somente quando a pontuacao foi recalculada no servidor. */
  verified: boolean;
  createdAt: string;
}

export interface RecordSolution {
  playerName: string;
  score: number;
  solution: unknown;
}

/**
 * Contrato unico de servico. O cliente NUNCA envia pontuacao:
 * envia { mode, missionId | seed, solution } e o servidor reavalia.
 */
export interface Api {
  signInAnonymous(): Promise<Session>;
  submitRun(run: RunSubmission): Promise<SubmittedRun>;
  leaderboard(mode: GameMode, missionId?: string): Promise<LeaderboardEntry[]>;
  /** Seed do desafio do dia. */
  daily(): Promise<{ day: string; seed: string }>;
  /** Como o recordista resolveu (liberado so depois de concluir a missao). */
  recordSolution(mode: GameMode, missionId?: string): Promise<RecordSolution | null>;
  readonly isOffline: boolean;
}
