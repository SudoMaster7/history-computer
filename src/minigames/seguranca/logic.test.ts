import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { VAULT } from '@/core/constants';
import { mistakeEfficiency } from '@/core/scoring';
import { ALPHABET, encode, evaluate, generate, reference, shiftLetter, vault } from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `cofre-${i}`);

describe('Cofre Criptografico', () => {
  it('e da era da Seguranca', () => {
    expect(vault.era).toBe('seguranca');
  });

  it('a cifra anda no alfabeto e da a volta no fim', () => {
    expect(shiftLetter('A', 3)).toBe('D');
    expect(shiftLetter('Z', 1)).toBe('A');
    expect(shiftLetter('A', -1)).toBe('Z');
    expect(shiftLetter('D', -3)).toBe('A');
    // O que nao e letra do alfabeto passa como esta.
    expect(shiftLetter('-', 5)).toBe('-');
    expect(encode('REDE', 1)).toBe('SFEF');
    expect(encode(encode('COFRE', 5), -5)).toBe('COFRE');
  });

  it('a mesma seed da sempre as mesmas senhas', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
  });

  it('cada rodada fecha entre si: cifra, chave, opcoes e senha', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        const key = String(difficulty);
        expect(instance.rounds).toHaveLength(VAULT.ROUNDS[key] as number);
        // Nenhuma senha se repete dentro da mesma missao.
        expect(new Set(instance.rounds.map((r) => r.plain)).size).toBe(instance.rounds.length);

        for (const round of instance.rounds) {
          expect(round.shift).toBeGreaterThanOrEqual(VAULT.SHIFT_MIN[key] as number);
          expect(round.shift).toBeLessThanOrEqual(VAULT.SHIFT_MAX[key] as number);
          expect(round.plain.length).toBeLessThanOrEqual(VAULT.MAX_LEN[key] as number);
          expect(round.cipher).toBe(encode(round.plain, round.shift));
          expect(round.cipher).not.toBe(round.plain);
          expect([...round.plain].every((letter) => ALPHABET.includes(letter))).toBe(true);

          expect(round.choices).toHaveLength(round.plain.length);
          round.choices.forEach((options, i) => {
            expect(options).toHaveLength(VAULT.CHOICES);
            expect(new Set(options).size).toBe(VAULT.CHOICES);
            expect(options).toContain(round.plain[i]);
          });
        }
      }
    }
  });

  it('a referencia decifra todas as senhas sem erro', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('letra errada custa eficiencia, mas o cofre abre quando a certa entra', () => {
    const instance = generate('erros', 1);
    const solution = reference(instance);
    const first = solution[0] as string[];
    const wrong = shiftLetter(first[0] as string, 1);
    solution[0] = [wrong, wrong, wrong, ...first];
    expect(evaluate(instance, solution)).toEqual({ ok: true, efficiency: mistakeEfficiency(3) });
  });

  it('senha pela metade ou solucao torta nao abre o cofre', () => {
    const instance = generate('torta', 2);
    const good = reference(instance);
    expect(
      evaluate(
        instance,
        good.map((p, i) => (i === 0 ? p.slice(0, 2) : p)),
      ).ok,
    ).toBe(false);
    expect(evaluate(instance, good.slice(1)).ok).toBe(false);
    expect(evaluate(instance, instance.rounds.map(() => 'ABC') as never).ok).toBe(false);
    expect(evaluate(instance, undefined as never).ok).toBe(false);
  });
});
