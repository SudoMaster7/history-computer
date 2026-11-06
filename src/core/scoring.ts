import type { Stars } from './types';
import { SCORING } from './constants';

export function clampEfficiency(efficiency: number): number {
  if (!Number.isFinite(efficiency) || efficiency < 0) return 0;
  return Math.min(efficiency, SCORING.EFFICIENCY_MAX);
}

/** 1 = concluiu; 2 = eficiencia >= 0,85; 3 = eficiencia >= 1,0. */
export function starsFor(efficiency: number, ok: boolean): Stars {
  if (!ok) return 0;
  const e = clampEfficiency(efficiency);
  if (e >= SCORING.STARS_3_EFFICIENCY) return 3;
  if (e >= SCORING.STARS_2_EFFICIENCY) return 2;
  return 1;
}

/** round(1000 x eficiencia), limitada a 1500. */
export function missionScore(efficiency: number): number {
  const raw = Math.round(clampEfficiency(efficiency) * SCORING.MISSION_SCORE_FACTOR);
  return Math.min(raw, SCORING.MISSION_SCORE_MAX);
}

/**
 * 2000 + 10 x vida restante DO JOGADOR - 60 x turnos (min 200).
 * Ver DECISIONS.md: o briefing diz apenas "vida restante"; adotamos a do jogador.
 */
export function bossScore(hpLeft: number, turns: number): number {
  const raw =
    SCORING.BOSS_BASE +
    SCORING.BOSS_PER_HP * Math.max(0, hpLeft) -
    SCORING.BOSS_PER_TURN * Math.max(0, turns);
  return Math.max(SCORING.BOSS_SCORE_MIN, Math.round(raw));
}
