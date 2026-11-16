import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { LOOM } from '@/core/constants';
import { mistakeEfficiency } from '@/core/scoring';
import { evaluate, generate, loom, missingOf, reference } from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `tear-${i}`);

describe('Tear de Engrenagens', () => {
  it('e da era Mecanica', () => {
    expect(loom.era).toBe('mecanica');
  });

  it('a mesma seed da sempre o mesmo tecido', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
    expect(generate('uma', 1)).not.toEqual(generate('outra', 1));
  });

  it('tem o numero de rodadas e de fios escondidos da constante', () => {
    for (const difficulty of DIFFICULTIES) {
      const instance = generate('medidas', difficulty);
      expect(instance.rounds).toHaveLength(LOOM.ROUNDS[String(difficulty)] as number);
      for (const round of instance.rounds) {
        expect(round.hidden).toBe(LOOM.HIDDEN[String(difficulty)]);
        expect(missingOf(round)).toHaveLength(round.hidden);
      }
    }
  });

  it('o trecho aparece pelo menos duas vezes inteiras antes dos fios que faltam', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        for (const round of generate(seed, difficulty).rounds) {
          const shown = round.cloth.slice(0, round.cloth.length - round.hidden);
          // O menor periodo do tecido inteiro e o trecho que se repete.
          let period = 1;
          while (!round.cloth.every((color, i) => color === round.cloth[i % period])) period += 1;
          expect(period).toBeGreaterThanOrEqual(2);
          expect({ seed, difficulty, cabe: shown.length >= period * 2 }).toEqual({
            seed,
            difficulty,
            cabe: true,
          });
          // E so usa cores que o jogador tem para tocar.
          expect(round.cloth.every((color) => LOOM.COLORS.includes(color))).toBe(true);
        }
      }
    }
  });

  it('a referencia fecha todas as rodadas sem erro', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('fio errado custa eficiencia, mas a rodada ainda fecha', () => {
    const instance = generate('erros', 1);
    const solution = reference(instance);
    const first = solution[0] as string[];
    const other = instance.colors.find((color) => color !== first[0]) as string;
    solution[0] = [other, other, ...first];
    expect(evaluate(instance, solution)).toEqual({ ok: true, efficiency: mistakeEfficiency(2) });
  });

  it('rodada incompleta ou solucao torta nao conclui', () => {
    const instance = generate('incompleta', 1);
    const solution = reference(instance);
    solution[0] = (solution[0] as string[]).slice(0, -1);
    expect(evaluate(instance, solution).ok).toBe(false);
    expect(evaluate(instance, []).ok).toBe(false);
    expect(evaluate(instance, 'x' as never).ok).toBe(false);
    expect(evaluate(instance, instance.rounds.map(() => null) as never).ok).toBe(false);
  });
});
