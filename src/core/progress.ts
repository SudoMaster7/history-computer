import type { EraId, Evaluation, PlayerState, PowerId, PowerLevel, Stars } from './types';
import { POWERS } from './constants';
import { missionScore, starsFor } from './scoring';
import { ERAS, POWER_IDS, POWER_OF_ERA } from './powers';

/**
 * Progresso do jogador (D73): estrelas e melhor pontuacao de cada fase. Era o
 * `rpg.ts` -- XP, nivel, vida, ano do mundo e mochila sairam com o RPG. Ficou
 * o que o mapa de fases precisa: o que foi concluido e com que capricho.
 */

export function initialState(): PlayerState {
  return { missions: {} };
}

export function missionId(era: EraId, letter: 'A' | 'B'): string {
  return `${era}-${letter}`;
}

export function eraOfMissionId(id: string): EraId | null {
  const era = id.split('-')[0] as EraId | undefined;
  return era && ERAS.includes(era) ? era : null;
}

/**
 * Nivel da habilidade da era pelas estrelas das fases A e B: 1 ao fechar a
 * era, 2 e 3 com capricho nas duas. No chefao, o nivel multiplica o golpe.
 */
export function powerLevelFor(s: PlayerState, era: EraId): PowerLevel {
  const a = s.missions[missionId(era, 'A')];
  const b = s.missions[missionId(era, 'B')];
  if (!a || !b || a.stars < 1 || b.stars < 1) return 0;
  const minStars = Math.min(a.stars, b.stars);
  if (minStars >= POWERS.LEVEL_3_MIN_STARS) return 3;
  if (minStars >= POWERS.LEVEL_2_MIN_STARS) return 2;
  return 1;
}

/** Nivel de cada poder, derivado das estrelas (nao e salvo). */
export function powersOf(s: PlayerState): Record<PowerId, PowerLevel> {
  const out = Object.fromEntries(POWER_IDS.map((p) => [p, 0])) as Record<PowerId, PowerLevel>;
  for (const era of ERAS) out[POWER_OF_ERA[era]] = powerLevelFor(s, era);
  return out;
}

/**
 * Aplica o resultado do minijogo de uma fase: guarda a melhor estrela e a
 * melhor pontuacao. Repetir nunca reduz nada.
 */
export function applyMissionResult(s: PlayerState, id: string, e: Evaluation): PlayerState {
  if (!eraOfMissionId(id)) return s;
  const previous = s.missions[id] ?? { stars: 0 as Stars, bestScore: 0 };
  const stars = starsFor(e.efficiency, e.ok);
  const score = e.ok ? missionScore(e.efficiency) : 0;
  return {
    ...s,
    missions: {
      ...s.missions,
      [id]: {
        stars: Math.max(previous.stars, stars) as Stars,
        bestScore: Math.max(previous.bestScore, score),
      },
    },
  };
}
