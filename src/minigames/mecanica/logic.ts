import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { LOOM, SCORING } from '@/core/constants';
import { createRng, pick, randInt } from '@/core/rng';

/**
 * Tear de Engrenagens (Era 1, poder Repetir).
 *
 * O jogador reproduz um padrao de cores na fita usando cartoes. Para caber no
 * limite de cartoes ele precisa usar REPETICAO: um grupo de cores com um
 * cartao "repetir xN" sai mais barato que escrever tudo na mao.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface LoomInstance {
  /** Padrao que a fita deve produzir, em cores. */
  target: string[];
  /** Cartoes disponiveis. Na missao B so cabe com repeticao. */
  maxCards: number;
  colors: string[];
}

/** Um grupo da fita: uma sequencia de cores repetida `times` vezes. */
export interface LoomGroup {
  colors: string[];
  times: number;
}

export type LoomSolution = LoomGroup[];

/** Custo em cartoes: uma carta por cor, mais uma carta "repetir" se times > 1. */
export function groupCost(group: LoomGroup): number {
  return group.colors.length + (group.times > 1 ? 1 : 0);
}

export function solutionCost(solution: LoomSolution): number {
  return solution.reduce((total, group) => total + groupCost(group), 0);
}

/** Resultado da fita: os grupos expandidos, em ordem. */
export function expand(solution: LoomSolution): string[] {
  const out: string[] = [];
  for (const group of solution) {
    const times = Math.max(0, Math.floor(group.times));
    for (let i = 0; i < times; i += 1) out.push(...group.colors);
  }
  return out;
}

function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function isValidGroup(group: LoomGroup, colors: readonly string[]): boolean {
  if (!Array.isArray(group.colors) || group.colors.length === 0) return false;
  if (!Number.isInteger(group.times) || group.times < 1) return false;
  if (group.times > LOOM.MAX_REPEAT) return false;
  return group.colors.every((c) => colors.includes(c));
}

/**
 * Codificacao mais curta possivel do padrao, por programacao dinamica:
 * best[i] = menor custo para produzir target[i..]. Cada trecho candidato e uma
 * unidade repetida um numero inteiro de vezes.
 */
export function reference(instance: LoomInstance): LoomSolution {
  const target = instance.target;
  const n = target.length;
  const best: number[] = new Array(n + 1).fill(Number.POSITIVE_INFINITY);
  const choice: (LoomGroup | null)[] = new Array(n + 1).fill(null);
  best[n] = 0;

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let end = i + 1; end <= n; end += 1) {
      const segment = target.slice(i, end);
      // A unidade mais curta que, repetida, forma o trecho.
      for (let unitLen = 1; unitLen <= segment.length; unitLen += 1) {
        if (segment.length % unitLen !== 0) continue;
        const times = segment.length / unitLen;
        if (times > LOOM.MAX_REPEAT) continue;
        const unit = segment.slice(0, unitLen);
        let repeats = true;
        for (let k = 1; k < times && repeats; k += 1) {
          for (let j = 0; j < unitLen; j += 1) {
            if (segment[k * unitLen + j] !== unit[j]) {
              repeats = false;
              break;
            }
          }
        }
        if (!repeats) continue;

        const group: LoomGroup = { colors: unit, times };
        const cost = groupCost(group) + (best[end] as number);
        if (cost < (best[i] as number)) {
          best[i] = cost;
          choice[i] = group;
        }
        // Unidades maiores que a minima nunca saem mais baratas para o mesmo trecho.
        break;
      }
    }
  }

  const solution: LoomSolution = [];
  let cursor = 0;
  while (cursor < n) {
    const group = choice[cursor];
    if (!group) throw new Error('Tear: padrao sem codificacao possivel.');
    solution.push(group);
    cursor += group.colors.length * group.times;
  }
  return solution;
}

export function referenceCost(instance: LoomInstance): number {
  return solutionCost(reference(instance));
}

function patternLength(difficulty: Difficulty): number {
  return LOOM.LENGTH[String(difficulty)] ?? LOOM.LENGTH['1'] ?? 8;
}

/**
 * Gera um padrao sempre solucionavel: monta a partir de grupos repetidos, de
 * modo que exista uma codificacao com repeticao dentro do limite de cartoes.
 */
export function generate(seed: string, difficulty: Difficulty): LoomInstance {
  const rng = createRng(`tear:${seed}:${difficulty}`);
  const colors = LOOM.COLORS.slice();
  const wanted = patternLength(difficulty);
  const target: string[] = [];

  while (target.length < wanted) {
    const remaining = wanted - target.length;
    const unitLen = Math.min(randInt(rng, 1, 3), remaining);
    const maxTimes = Math.min(LOOM.MAX_REPEAT, Math.floor(remaining / unitLen));
    const times = maxTimes <= 1 ? 1 : randInt(rng, 2, maxTimes);
    const unit = Array.from({ length: unitLen }, () => pick(rng, colors));
    for (let i = 0; i < times; i += 1) target.push(...unit);
  }

  const draft: LoomInstance = { target, maxCards: target.length, colors };
  const minimum = referenceCost(draft);

  /*
   * Missao A e a versao micro sao o tutorial: cabem escrevendo o padrao na mao,
   * cartao por cartao (so que ai a eficiencia fica baixa e rende 1 estrela).
   * Da missao B em diante o limite e o custo da referencia, ou seja, so fecha
   * usando repeticao.
   */
  const handCost = target.length;
  const maxCards =
    difficulty === 1 || difficulty === 'micro' ? Math.max(handCost, minimum) : minimum;
  return { target, maxCards, colors };
}

/**
 * Avalia a fita. `ok` exige o padrao exato dentro do limite de cartoes.
 * Eficiencia = cartoes da referencia / cartoes usados (1 = tao bom quanto a referencia).
 */
export function evaluate(instance: LoomInstance, solution: LoomSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length === 0) {
    return { ok: false, efficiency: 0 };
  }
  if (!solution.every((group) => isValidGroup(group, instance.colors))) {
    return { ok: false, efficiency: 0 };
  }

  const used = solutionCost(solution);
  if (used > instance.maxCards) return { ok: false, efficiency: 0 };
  if (!sameSequence(expand(solution), instance.target)) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(referenceCost(instance) / used, SCORING.EFFICIENCY_MAX);
  return { ok: true, efficiency };
}

export const era: EraId = 'mecanica';

export const loom: Minigame<LoomInstance, LoomSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
