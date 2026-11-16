import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { CIRCUIT } from '@/core/constants';
import { createRng, pick, randInt } from '@/core/rng';
import { mistakeEfficiency } from '@/core/scoring';
import { byDifficulty } from '../shared/logic';

/**
 * Circuitos Logicos (Era 2, poder Decidir).
 *
 * Cada rodada e um circuito pronto: chaves em cima, portas E / OU no meio, uma
 * lampada embaixo. O jogador liga e desliga as chaves e aperta "Testar"; se a
 * lampada acende, a rodada fecha. Teste que nao acende conta como erro -- o
 * desafio e pensar na regra da porta antes de testar, em vez de chutar.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export type GateType = 'AND' | 'OR';

export interface CircuitRound {
  /** Para cada chave: ha um NAO no fio dela, que inverte o sinal? */
  neg: boolean[];
  /**
   * Portas em cadeia. A primeira junta as chaves 0 e 1; cada porta seguinte
   * junta o resultado da anterior com a proxima chave.
   */
  gates: GateType[];
  /** Chave travada: `true`/`false` = presa nesse estado; `null` = livre. */
  locked: (boolean | null)[];
}

export interface CircuitInstance {
  rounds: CircuitRound[];
}

/** Por rodada, os estados das chaves a cada "Testar", na ordem. */
export type CircuitSolution = boolean[][][];

/** Como as chaves comecam: desligadas, a nao ser as travadas. */
export function initialState(round: CircuitRound): boolean[] {
  return round.locked.map((value) => value ?? false);
}

/** O sinal que cada chave entrega depois do NAO (se houver). */
export function signalsOf(round: CircuitRound, state: readonly boolean[]): boolean[] {
  return round.neg.map((inverted, i) => (inverted ? !state[i] : Boolean(state[i])));
}

/** A saida de cada porta, na ordem da cadeia. */
export function gateOutputs(round: CircuitRound, state: readonly boolean[]): boolean[] {
  const signals = signalsOf(round, state);
  const outputs: boolean[] = [];
  let carry = Boolean(signals[0]);
  round.gates.forEach((gate, i) => {
    const next = Boolean(signals[i + 1]);
    carry = gate === 'AND' ? carry && next : carry || next;
    outputs.push(carry);
  });
  return outputs;
}

/** A lampada acende com as chaves neste estado? */
export function lights(round: CircuitRound, state: readonly boolean[]): boolean {
  return gateOutputs(round, state).at(-1) ?? false;
}

/** O estado respeita o numero de chaves e as travas da rodada? */
function isValidState(round: CircuitRound, state: unknown): state is boolean[] {
  if (!Array.isArray(state) || state.length !== round.neg.length) return false;
  return state.every(
    (value, i) =>
      typeof value === 'boolean' && (round.locked[i] === null || round.locked[i] === value),
  );
}

/** Todos os estados possiveis das chaves livres, do menos ligado ao mais ligado. */
function statesOf(round: CircuitRound): boolean[][] {
  const free = round.locked.flatMap((value, i) => (value === null ? [i] : []));
  const out: boolean[][] = [];
  for (let mask = 0; mask < 2 ** free.length; mask += 1) {
    const state = initialState(round);
    free.forEach((index, bit) => {
      state[index] = Math.floor(mask / 2 ** bit) % 2 === 1;
    });
    out.push(state);
  }
  return out;
}

/** O primeiro estado que acende a lampada, ou `null` se nao houver. */
export function solve(round: CircuitRound): boolean[] | null {
  return statesOf(round).find((state) => lights(round, state)) ?? null;
}

/** Circuito de reserva: so portas E, sem NAO e sem trava. Sempre tem solucao. */
function fallbackRound(inputs: number): CircuitRound {
  return {
    neg: new Array<boolean>(inputs).fill(false),
    gates: new Array<GateType>(inputs - 1).fill('AND'),
    locked: new Array<boolean | null>(inputs).fill(null),
  };
}

/**
 * A primeira rodada nunca tem NAO: ela apresenta a porta. Dali em diante todo
 * circuito tem pelo menos um NAO, e os mais dificeis ganham uma terceira chave
 * e uma chave travada. Um circuito so vale se a lampada comeca apagada e existe
 * um jeito de acende-la.
 */
export function generate(seed: string, difficulty: Difficulty): CircuitInstance {
  const rng = createRng(`circuito:${seed}:${difficulty}`);
  const total = byDifficulty(CIRCUIT.ROUNDS, difficulty, 3);
  const threeFrom = byDifficulty(CIRCUIT.THREE_FROM, difficulty, 2);
  const lockFrom = byDifficulty(CIRCUIT.LOCK_FROM, difficulty, 9);
  const types = CIRCUIT.TYPES as readonly GateType[];

  const rounds: CircuitRound[] = [];
  for (let index = 0; index < total; index += 1) {
    const inputs = index >= threeFrom ? 3 : 2;
    let chosen: CircuitRound | null = null;

    for (let attempt = 0; attempt < CIRCUIT.GEN_ATTEMPTS && !chosen; attempt += 1) {
      const gates = Array.from({ length: inputs - 1 }, () => pick(rng, types));
      const neg = Array.from({ length: inputs }, () => index > 0 && rng() < 0.5);
      if (index > 0 && !neg.includes(true)) continue;

      const locked = new Array<boolean | null>(inputs).fill(null);
      if (index >= lockFrom) locked[randInt(rng, 0, inputs - 1)] = rng() < 0.5;

      const round: CircuitRound = { neg, gates, locked };
      if (lights(round, initialState(round))) continue;
      if (!solve(round)) continue;
      chosen = round;
    }
    rounds.push(chosen ?? fallbackRound(inputs));
  }
  return { rounds };
}

export function reference(instance: CircuitInstance): CircuitSolution {
  return instance.rounds.map((round) => {
    const state = solve(round);
    if (!state) throw new Error('Circuito: rodada sem solucao.');
    return [state];
  });
}

/** `ok` exige todas as lampadas acesas; cada teste que nao acende custa eficiencia. */
export function evaluate(instance: CircuitInstance, solution: CircuitSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.rounds.length) {
    return { ok: false, efficiency: 0 };
  }
  let mistakes = 0;
  for (let i = 0; i < instance.rounds.length; i += 1) {
    const round = instance.rounds[i] as CircuitRound;
    const tests = solution[i];
    if (!Array.isArray(tests)) return { ok: false, efficiency: 0 };

    let lit = false;
    for (const state of tests) {
      if (!isValidState(round, state)) return { ok: false, efficiency: 0 };
      if (lights(round, state)) {
        lit = true;
        break;
      }
      mistakes += 1;
    }
    if (!lit) return { ok: false, efficiency: 0 };
  }
  return { ok: true, efficiency: mistakeEfficiency(mistakes) };
}

export const era: EraId = 'logica';

export const circuit: Minigame<CircuitInstance, CircuitSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
