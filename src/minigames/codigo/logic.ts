import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { BITS } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';
import { mistakeEfficiency } from '@/core/scoring';
import { byDifficulty, replaySequence } from '../shared/logic';

/**
 * Mesa de Bits (Era 3, poder Codificar).
 *
 * O computador guarda qualquer numero como uma fileira de bits, e cada bit
 * ligado vale o dobro do vizinho: 1, 2, 4, 8... O jogador recebe um numero e
 * liga os bits que somam esse numero. E codificar no sentido mais direto:
 * escrever uma coisa na lingua da maquina.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface BitsInstance {
  /** Quantos bits a mesa tem. */
  width: number;
  /** Os numeros a gravar, um por rodada. */
  targets: number[];
}

/** Por rodada, os numeros que o jogador mandou gravar, na ordem. */
export type BitsSolution = number[][];

/** Quanto vale o bit da posicao `index`, contando da esquerda. */
export function bitValue(width: number, index: number): number {
  return 2 ** (width - 1 - index);
}

/** O numero que uma fileira de bits representa. */
export function valueOf(bits: readonly boolean[]): number {
  return bits.reduce((sum, on, i) => sum + (on ? bitValue(bits.length, i) : 0), 0);
}

/** A fileira de bits que representa `value`. */
export function bitsOf(value: number, width: number): boolean[] {
  return Array.from({ length: width }, (_, i) => Math.floor(value / bitValue(width, i)) % 2 === 1);
}

function bitsOn(value: number, width: number): number {
  return bitsOf(value, width).filter(Boolean).length;
}

/**
 * Numeros diferentes entre si e nunca zero. Da segunda rodada em diante o
 * numero pede pelo menos dois bits ligados: acender um bit so nao ensina a
 * somar. Os numeros tambem crescem com a rodada.
 */
export function generate(seed: string, difficulty: Difficulty): BitsInstance {
  const rng = createRng(`bits:${seed}:${difficulty}`);
  const width = byDifficulty(BITS.WIDTH, difficulty, 4);
  const total = byDifficulty(BITS.ROUNDS, difficulty, 3);
  const top = 2 ** width - 1;

  const targets: number[] = [];
  for (let index = 0; index < total; index += 1) {
    // A faixa sobe com a rodada: comeca na parte de baixo e termina no topo.
    const ceiling = Math.max(3, Math.round((top * (index + 2)) / (total + 1)));
    let chosen = 0;
    for (let attempt = 0; attempt < BITS.GEN_ATTEMPTS && chosen === 0; attempt += 1) {
      const value = randInt(rng, 1, Math.min(top, ceiling));
      if (targets.includes(value)) continue;
      if (index > 0 && bitsOn(value, width) < 2) continue;
      chosen = value;
    }
    // Reserva: o primeiro numero ainda nao usado, de cima para baixo.
    for (let value = top; chosen === 0 && value >= 1; value -= 1) {
      if (!targets.includes(value)) chosen = value;
    }
    targets.push(chosen);
  }
  return { width, targets };
}

export function reference(instance: BitsInstance): BitsSolution {
  return instance.targets.map((target) => [target]);
}

/** `ok` exige todos os numeros gravados; cada gravacao errada custa eficiencia. */
export function evaluate(instance: BitsInstance, solution: BitsSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.targets.length) {
    return { ok: false, efficiency: 0 };
  }
  const top = 2 ** instance.width - 1;
  let mistakes = 0;
  for (let i = 0; i < instance.targets.length; i += 1) {
    const tries = solution[i];
    if (!Array.isArray(tries)) return { ok: false, efficiency: 0 };
    if (!tries.every((value) => Number.isInteger(value) && value >= 0 && value <= top)) {
      return { ok: false, efficiency: 0 };
    }
    const replay = replaySequence([instance.targets[i] as number], tries);
    if (!replay.done) return { ok: false, efficiency: 0 };
    mistakes += replay.mistakes;
  }
  return { ok: true, efficiency: mistakeEfficiency(mistakes) };
}

export const era: EraId = 'codigo';

export const bits: Minigame<BitsInstance, BitsSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
