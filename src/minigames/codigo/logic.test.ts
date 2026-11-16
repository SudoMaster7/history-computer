import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { BITS } from '@/core/constants';
import { mistakeEfficiency } from '@/core/scoring';
import { bitValue, bits, bitsOf, evaluate, generate, reference, valueOf } from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `bits-${i}`);

describe('Mesa de Bits', () => {
  it('e da era do Codigo', () => {
    expect(bits.era).toBe('codigo');
  });

  it('cada bit vale o dobro do vizinho da direita', () => {
    expect([0, 1, 2, 3].map((i) => bitValue(4, i))).toEqual([8, 4, 2, 1]);
  });

  it('bitsOf e valueOf sao o inverso um do outro', () => {
    expect(bitsOf(11, 4)).toEqual([true, false, true, true]);
    expect(valueOf([true, false, true, true])).toBe(11);
    for (let value = 0; value < 64; value += 1) {
      expect(valueOf(bitsOf(value, 6))).toBe(value);
    }
  });

  it('a mesma seed da sempre os mesmos numeros', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
  });

  it('os numeros cabem na mesa, nao se repetem e nunca sao zero', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(instance.width).toBe(BITS.WIDTH[String(difficulty)]);
        expect(instance.targets).toHaveLength(BITS.ROUNDS[String(difficulty)] as number);
        expect(new Set(instance.targets).size).toBe(instance.targets.length);
        instance.targets.forEach((target, index) => {
          expect(target).toBeGreaterThanOrEqual(1);
          expect(target).toBeLessThanOrEqual(2 ** instance.width - 1);
          // Da segunda rodada em diante o numero pede soma de verdade.
          if (index > 0) {
            const on = bitsOf(target, instance.width).filter(Boolean).length;
            expect({ seed, difficulty, target, soma: on >= 2 }).toEqual({
              seed,
              difficulty,
              target,
              soma: true,
            });
          }
        });
      }
    }
  });

  it('a referencia grava todos os numeros de primeira', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('gravacao errada custa eficiencia, mas a rodada fecha quando acerta', () => {
    const instance = generate('erros', 1);
    const solution = reference(instance);
    const target = instance.targets[0] as number;
    solution[0] = [target - 1, 0, target];
    expect(evaluate(instance, solution)).toEqual({ ok: true, efficiency: mistakeEfficiency(2) });
  });

  it('nao conclui sem gravar o numero, nem com valor fora da mesa', () => {
    const instance = generate('torta', 1);
    const good = reference(instance);
    expect(
      evaluate(
        instance,
        good.map((tries, i) => (i === 0 ? [] : tries)),
      ).ok,
    ).toBe(false);
    expect(
      evaluate(
        instance,
        good.map((tries, i) => (i === 0 ? [999] : tries)),
      ).ok,
    ).toBe(false);
    expect(
      evaluate(
        instance,
        good.map((tries, i) => (i === 0 ? [1.5] : tries)),
      ).ok,
    ).toBe(false);
    expect(evaluate(instance, []).ok).toBe(false);
    expect(evaluate(instance, instance.targets.map(() => 3) as never).ok).toBe(false);
  });
});
