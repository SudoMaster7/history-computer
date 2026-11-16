import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { CIRCUIT } from '@/core/constants';
import { mistakeEfficiency } from '@/core/scoring';
import type { CircuitRound } from './logic';
import {
  circuit,
  evaluate,
  gateOutputs,
  generate,
  initialState,
  lights,
  reference,
  signalsOf,
  solve,
} from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `circuito-${i}`);

const plain = (gates: CircuitRound['gates'], inputs = gates.length + 1): CircuitRound => ({
  neg: new Array<boolean>(inputs).fill(false),
  gates,
  locked: new Array<boolean | null>(inputs).fill(null),
});

describe('Circuitos Logicos', () => {
  it('e da era Logica', () => {
    expect(circuit.era).toBe('logica');
  });

  it('a porta E so acende com as duas entradas ligadas', () => {
    const round = plain(['AND']);
    expect(lights(round, [false, false])).toBe(false);
    expect(lights(round, [true, false])).toBe(false);
    expect(lights(round, [false, true])).toBe(false);
    expect(lights(round, [true, true])).toBe(true);
  });

  it('a porta OU acende com pelo menos uma entrada ligada', () => {
    const round = plain(['OR']);
    expect(lights(round, [false, false])).toBe(false);
    expect(lights(round, [true, false])).toBe(true);
    expect(lights(round, [false, true])).toBe(true);
  });

  it('o NAO inverte o sinal da chave', () => {
    const round: CircuitRound = { ...plain(['AND']), neg: [true, false] };
    expect(signalsOf(round, [false, true])).toEqual([true, true]);
    expect(lights(round, [false, true])).toBe(true);
    expect(lights(round, [true, true])).toBe(false);
  });

  it('as portas formam uma cadeia: cada uma junta a anterior com a proxima chave', () => {
    const round = plain(['AND', 'OR']);
    expect(gateOutputs(round, [true, false, true])).toEqual([false, true]);
    expect(gateOutputs(round, [true, true, false])).toEqual([true, true]);
    expect(gateOutputs(round, [false, true, false])).toEqual([false, false]);
  });

  it('chave travada comeca e fica no estado dela', () => {
    const round: CircuitRound = { ...plain(['AND']), locked: [true, null] };
    expect(initialState(round)).toEqual([true, false]);
    expect(solve(round)).toEqual([true, true]);
    // Um circuito que a trava torna impossivel nao tem solucao.
    expect(solve({ ...plain(['AND']), locked: [false, null] })).toBeNull();
  });

  it('a mesma seed da sempre os mesmos circuitos', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
  });

  it('todo circuito comeca apagado e tem como acender', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(instance.rounds).toHaveLength(CIRCUIT.ROUNDS[String(difficulty)] as number);
        instance.rounds.forEach((round, index) => {
          expect(round.gates).toHaveLength(round.neg.length - 1);
          expect(round.locked).toHaveLength(round.neg.length);
          expect({ seed, difficulty, index, apagado: !lights(round, initialState(round)) }).toEqual(
            { seed, difficulty, index, apagado: true },
          );
          expect(solve(round)).not.toBeNull();
          // A primeira rodada apresenta a porta, sem NAO.
          if (index === 0) expect(round.neg.includes(true)).toBe(false);
        });
      }
    }
  });

  it('a referencia acende todas as lampadas no primeiro teste', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('teste que nao acende custa eficiencia, e o que vem depois de acender nao conta', () => {
    const instance = generate('erros', 1);
    const solution = reference(instance);
    const first = instance.rounds[0] as CircuitRound;
    const dark = initialState(first);
    solution[0] = [dark, dark, ...(solution[0] as boolean[][]), dark];
    expect(evaluate(instance, solution)).toEqual({ ok: true, efficiency: mistakeEfficiency(2) });
  });

  it('nao conclui sem acender, com estado torto ou mexendo em chave travada', () => {
    const instance = generate('torta', 3);
    const good = reference(instance);

    const never = good.map((tests, i) => (i === 0 ? [] : tests));
    expect(evaluate(instance, never).ok).toBe(false);

    const short = good.map((tests, i) => (i === 0 ? [[true]] : tests));
    expect(evaluate(instance, short).ok).toBe(false);

    const index = instance.rounds.findIndex((round) => round.locked.some((v) => v !== null));
    expect(index).toBeGreaterThanOrEqual(0);
    const round = instance.rounds[index] as CircuitRound;
    const forced = initialState(round).map((value, i) =>
      round.locked[i] === null ? value : !value,
    );
    const cheated = good.map((tests, i) => (i === index ? [forced] : tests));
    expect(evaluate(instance, cheated).ok).toBe(false);

    expect(evaluate(instance, []).ok).toBe(false);
    expect(evaluate(instance, null as never).ok).toBe(false);
    expect(evaluate(instance, instance.rounds.map(() => 0) as never).ok).toBe(false);
  });

  it('reference acusa rodada sem solucao em vez de devolver lixo', () => {
    const impossible = { rounds: [{ ...plain(['AND']), locked: [false, null] }] };
    expect(() => reference(impossible)).toThrow();
  });
});
