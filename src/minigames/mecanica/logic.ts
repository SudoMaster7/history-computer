import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { LOOM } from '@/core/constants';
import { createRng, pick, randInt } from '@/core/rng';
import { mistakeEfficiency } from '@/core/scoring';
import { byDifficulty, replaySequence } from '../shared/logic';

/**
 * Tear de Engrenagens (Era 1, poder Repetir).
 *
 * O tear tece um desenho que se repete: um trecho curto de fios, de novo e de
 * novo. O tecido chega com os ultimos fios faltando e o jogador os completa.
 * Para acertar ele precisa enxergar o trecho que volta -- que e a ideia de
 * repeticao, sem nenhuma conta.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface LoomRound {
  /** O tecido inteiro, fio por fio. */
  cloth: string[];
  /** Quantos fios do fim estao faltando. */
  hidden: number;
}

export interface LoomInstance {
  colors: string[];
  rounds: LoomRound[];
}

/** Por rodada, as cores que o jogador tocou, na ordem (erros inclusive). */
export type LoomSolution = string[][];

/** Os fios que faltam numa rodada, na ordem em que entram. */
export function missingOf(round: LoomRound): string[] {
  return round.cloth.slice(round.cloth.length - round.hidden);
}

/** Um trecho so serve se nao for ele mesmo uma repeticao de um trecho menor. */
function isPrimitive(unit: readonly string[]): boolean {
  for (let size = 1; size < unit.length; size += 1) {
    if (unit.length % size !== 0) continue;
    if (unit.every((color, i) => color === unit[i % size])) return false;
  }
  return true;
}

function drawUnit(rng: () => number, colors: readonly string[], size: number): string[] {
  for (let attempt = 0; attempt < LOOM.GEN_ATTEMPTS; attempt += 1) {
    const unit = Array.from({ length: size }, () => pick(rng, colors));
    if (isPrimitive(unit)) return unit;
  }
  // Reserva: uma cor, depois a outra ate o fim. Nunca e repeticao de trecho menor.
  return Array.from({ length: size }, (_, i) => (i === 0 ? colors[0] : colors[1]) as string);
}

/**
 * Cada rodada mostra o trecho pelo menos duas vezes inteiras antes dos fios que
 * faltam: com menos que isso nao da para saber o que se repete. O trecho cresce
 * da primeira para a ultima rodada.
 */
export function generate(seed: string, difficulty: Difficulty): LoomInstance {
  const rng = createRng(`tear:${seed}:${difficulty}`);
  const colors = LOOM.COLORS.slice();
  const total = byDifficulty(LOOM.ROUNDS, difficulty, 3);
  const unitMin = byDifficulty(LOOM.UNIT_MIN, difficulty, 2);
  const unitMax = byDifficulty(LOOM.UNIT_MAX, difficulty, 3);
  const hidden = byDifficulty(LOOM.HIDDEN, difficulty, 3);

  const rounds: LoomRound[] = [];
  for (let index = 0; index < total; index += 1) {
    const grow = total <= 1 ? 0 : Math.round(((unitMax - unitMin) * index) / (total - 1));
    const size = unitMin + grow;
    const unit = drawUnit(rng, colors, size);
    const shown = size * 2 + randInt(rng, 0, size - 1);
    const cloth = Array.from({ length: shown + hidden }, (_, i) => unit[i % size] as string);
    rounds.push({ cloth, hidden });
  }
  return { colors, rounds };
}

export function reference(instance: LoomInstance): LoomSolution {
  return instance.rounds.map(missingOf);
}

/** `ok` exige todos os tecidos completos; cada fio errado custa eficiencia. */
export function evaluate(instance: LoomInstance, solution: LoomSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.rounds.length) {
    return { ok: false, efficiency: 0 };
  }
  let mistakes = 0;
  for (let i = 0; i < instance.rounds.length; i += 1) {
    const picks = solution[i];
    if (!Array.isArray(picks)) return { ok: false, efficiency: 0 };
    const replay = replaySequence(missingOf(instance.rounds[i] as LoomRound), picks);
    if (!replay.done) return { ok: false, efficiency: 0 };
    mistakes += replay.mistakes;
  }
  return { ok: true, efficiency: mistakeEfficiency(mistakes) };
}

export const era: EraId = 'mecanica';

export const loom: Minigame<LoomInstance, LoomSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
