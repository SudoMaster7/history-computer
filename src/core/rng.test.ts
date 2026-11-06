import { describe, expect, it } from 'vitest';
import { createRng, dailySeed, hashSeed, pick, randInt, shuffle } from './rng';

describe('rng', () => {
  it('hashSeed e deterministico e cabe em 32 bits', () => {
    expect(hashSeed('bit')).toBe(hashSeed('bit'));
    expect(hashSeed('bit')).not.toBe(hashSeed('bug'));
    expect(hashSeed('')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('qualquer coisa')).toBeLessThanOrEqual(0xffffffff);
  });

  it('createRng devolve a mesma sequencia para a mesma seed', () => {
    const a = createRng('mecanica-A-v1');
    const b = createRng('mecanica-A-v1');
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('createRng produz sequencias diferentes para seeds diferentes', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-2');
    expect(a()).not.toBe(b());
  });

  it('todos os valores ficam em [0,1)', () => {
    const rng = createRng('faixa');
    for (let i = 0; i < 2000; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randInt respeita os limites inclusivos', () => {
    const rng = createRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) {
      const v = randInt(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect(seen.size).toBe(5);
  });

  it('pick sorteia do array e rejeita array vazio', () => {
    const rng = createRng('pick');
    expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']));
    expect(() => pick(rng, [])).toThrow();
  });

  it('shuffle preserva os elementos e nao muta a entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(createRng('shuffle'), input);
    expect(out).toHaveLength(input.length);
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffle(createRng('shuffle'), input)).toEqual(out);
  });

  it('dailySeed usa o fuso America/Sao_Paulo no formato AAAA-MM-DD', () => {
    // 2026-01-01T01:00:00Z ainda e 31/12/2025 em Sao Paulo (UTC-3).
    expect(dailySeed(new Date('2026-01-01T01:00:00Z'))).toBe('2025-12-31');
    expect(dailySeed(new Date('2026-01-01T05:00:00Z'))).toBe('2026-01-01');
    expect(dailySeed()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
