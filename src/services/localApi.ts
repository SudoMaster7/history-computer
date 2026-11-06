import type { Api, RecordSolution, Session, SubmittedRun } from './api';
import type { GameMode, LeaderboardEntry, RunSubmission } from '@/core/types';
import { dailySeed } from '@/core/rng';
import { bossScore, missionScore } from '@/core/scoring';
import { getMinigame, hasMinigame } from '@/core/registry';
import { getMission } from '@/data/missions';
import { eraOfMissionId } from '@/core/rpg';

const KEY = 'davalvulaaia:runs:v1';
const SESSION_KEY = 'davalvulaaia:session:v1';

interface LocalRun extends SubmittedRun {
  playerId: string;
  playerName: string;
  solution: unknown;
}

function read(): LocalRun[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalRun[]) : [];
  } catch {
    return [];
  }
}

function write(runs: LocalRun[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(runs));
  } catch {
    /* modo privado / cota cheia: o jogo segue sem historico */
  }
}

function randomId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ranking simulado para o MVP rodar sem nenhuma chave. */
const SIMULATED: readonly { name: string; factor: number }[] = [
  { name: 'Ada', factor: 1.0 },
  { name: 'Turing', factor: 0.92 },
  { name: 'Grace', factor: 0.84 },
  { name: 'Hopper Jr.', factor: 0.72 },
];

/**
 * Implementacao local: localStorage + ranking simulado.
 * Reavalia a solucao com o mesmo `core`, exatamente como a Edge Function fara.
 */
export class LocalApi implements Api {
  readonly isOffline = true;

  async signInAnonymous(): Promise<Session> {
    try {
      const raw = globalThis.localStorage?.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as Session;
    } catch {
      /* ignora */
    }
    const session: Session = { playerId: randomId(), playerName: 'Debugger' };
    try {
      globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignora */
    }
    return session;
  }

  async submitRun(run: RunSubmission): Promise<SubmittedRun> {
    const session = await this.signInAnonymous();
    const score = scoreRun(run);
    const stored: LocalRun = {
      id: randomId(),
      mode: run.mode,
      ...(run.missionId ? { missionId: run.missionId } : {}),
      seed: run.seed,
      score,
      verified: false, // local nunca e "verified": so a Edge Function marca true
      createdAt: new Date().toISOString(),
      playerId: session.playerId,
      playerName: session.playerName,
      solution: run.solution,
    };
    write([...read(), stored]);
    const { playerId: _p, playerName: _n, solution: _s, ...publicRun } = stored;
    return publicRun;
  }

  async leaderboard(mode: GameMode, missionId?: string): Promise<LeaderboardEntry[]> {
    const mine = read().filter((r) => r.mode === mode && r.missionId === missionId);
    const best = mine.reduce((acc, r) => Math.max(acc, r.score), 0);
    const session = await this.signInAnonymous();

    const entries: LeaderboardEntry[] = SIMULATED.map((s) => ({
      playerId: `sim:${s.name}`,
      playerName: s.name,
      score: Math.round((best || 1000) * s.factor),
      verified: true,
      createdAt: '1970-01-01T00:00:00.000Z',
    }));

    if (best > 0) {
      entries.push({
        playerId: session.playerId,
        playerName: session.playerName,
        score: best,
        verified: false,
        createdAt: new Date().toISOString(),
      });
    }
    return entries.sort((a, b) => b.score - a.score);
  }

  async daily(): Promise<{ day: string; seed: string }> {
    const day = dailySeed();
    return { day, seed: `daily:${day}` };
  }

  async recordSolution(mode: GameMode, missionId?: string): Promise<RecordSolution | null> {
    const mine = read()
      .filter((r) => r.mode === mode && r.missionId === missionId)
      .sort((a, b) => b.score - a.score);
    const top = mine[0];
    if (!top) return null;
    return { playerName: top.playerName, score: top.score, solution: top.solution };
  }
}

/** Recalcula a pontuacao a partir da solucao, como o servidor fara. */
export function scoreRun(run: RunSubmission): number {
  if (run.mode === 'mission') {
    const mission = run.missionId ? getMission(run.missionId) : undefined;
    const era = run.missionId ? eraOfMissionId(run.missionId) : null;
    if (!mission || !era || !hasMinigame(era)) return 0;
    const game = getMinigame(era);
    const instance = game.generate(mission.seed, mission.difficulty);
    const evaluation = game.evaluate(instance, run.solution);
    return evaluation.ok ? missionScore(evaluation.efficiency) : 0;
  }
  // Chefao: a solucao traz o log de turnos; o replay completo entra na S3 (boss.ts).
  const log = run.solution as { hpLeft?: number; turns?: number } | null;
  if (!log || typeof log.hpLeft !== 'number' || typeof log.turns !== 'number') return 0;
  return bossScore(log.hpLeft, log.turns);
}

export const localApi: Api = new LocalApi();
