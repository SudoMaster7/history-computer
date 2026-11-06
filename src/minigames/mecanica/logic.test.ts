import { describe, expect, it } from 'vitest';
import {
  evaluate,
  expand,
  generate,
  groupCost,
  reference,
  referenceCost,
  solutionCost,
} from './logic';
import type { LoomInstance, LoomSolution } from './logic';
import { LOOM } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

describe('tear: custo e expansao', () => {
  it('um grupo sem repeticao custa uma carta por cor', () => {
    expect(groupCost({ colors: ['a', 'b'], times: 1 })).toBe(2);
  });

  it('repetir custa uma carta a mais, nao uma por volta', () => {
    expect(groupCost({ colors: ['a', 'b'], times: 5 })).toBe(3);
  });

  it('a fita expande os grupos na ordem', () => {
    expect(
      expand([
        { colors: ['a', 'b'], times: 2 },
        { colors: ['c'], times: 1 },
      ]),
    ).toEqual(['a', 'b', 'a', 'b', 'c']);
  });

  it('grupo com 0 repeticoes nao produz nada', () => {
    expect(expand([{ colors: ['a'], times: 0 }])).toEqual([]);
  });
});

describe('tear: solucao de referencia', () => {
  it('acha a codificacao curta de um padrao repetido', () => {
    const instance: LoomInstance = {
      target: ['a', 'b', 'a', 'b', 'a', 'b'],
      maxCards: 10,
      colors: ['a', 'b', 'c'],
    };
    const solution = reference(instance);
    expect(expand(solution)).toEqual(instance.target);
    // 2 cores + 1 carta de repetir = 3, contra 6 escrevendo na mao.
    expect(solutionCost(solution)).toBe(3);
  });

  it('nao inventa repeticao quando nao ha padrao', () => {
    const instance: LoomInstance = {
      target: ['a', 'b', 'c'],
      maxCards: 10,
      colors: ['a', 'b', 'c'],
    };
    expect(solutionCost(reference(instance))).toBe(3);
  });

  it('a referencia nunca custa mais que escrever o padrao na mao', () => {
    for (let i = 0; i < 200; i += 1) {
      const instance = generate(`ref-${i}`, 2);
      expect(referenceCost(instance)).toBeLessThanOrEqual(instance.target.length);
    }
  });
});

describe('tear: geracao', () => {
  it('e deterministica para a mesma seed', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('igual', difficulty)).toEqual(generate('igual', difficulty));
    }
  });

  it('seeds diferentes dao padroes diferentes', () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, i) => JSON.stringify(generate(`s${i}`, 2).target)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('a versao micro e curta o bastante para o chefao', () => {
    const micro = generate('boss', 'micro');
    expect(micro.target.length).toBeLessThanOrEqual(8);
  });

  it('usa apenas cores da paleta', () => {
    for (let i = 0; i < 100; i += 1) {
      const instance = generate(`cor-${i}`, 3);
      expect(instance.target.every((c) => LOOM.COLORS.includes(c))).toBe(true);
    }
  });

  it('a missao A (tutorial) fecha escrevendo o padrao na mao', () => {
    for (let i = 0; i < 100; i += 1) {
      const instance = generate(`mao-${i}`, 1);
      const naMao: LoomSolution = instance.target.map((c) => ({ colors: [c], times: 1 }));
      const result = evaluate(instance, naMao);
      expect(result.ok, `mao-${i}`).toBe(true);
      // Resolver na mao e valido, mas rende menos estrelas que usar repeticao.
      expect(result.efficiency).toBeLessThanOrEqual(1);
    }
  });

  it('a versao micro do chefao tambem fecha na mao', () => {
    for (let i = 0; i < 100; i += 1) {
      const instance = generate(`micro-${i}`, 'micro');
      const naMao: LoomSolution = instance.target.map((c) => ({ colors: [c], times: 1 }));
      expect(evaluate(instance, naMao).ok, `micro-${i}`).toBe(true);
    }
  });

  it('a missao B nao tem folga: o limite e o custo da referencia', () => {
    for (let i = 0; i < 100; i += 1) {
      const b = generate(`folga-${i}`, 2);
      expect(b.maxCards).toBe(referenceCost(b));
    }
  });

  it('na missao B o limite de cartoes obriga a usar repeticao', () => {
    for (let i = 0; i < 100; i += 1) {
      const instance = generate(`obriga-${i}`, 2);
      const naMao: LoomSolution = instance.target.map((c) => ({ colors: [c], times: 1 }));
      expect(solutionCost(naMao)).toBeGreaterThan(instance.maxCards);
      expect(evaluate(instance, naMao).ok).toBe(false);
    }
  });
});

describe('tear: avaliacao', () => {
  it('a referencia sempre resolve com eficiencia 1', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 300; i += 1) {
        const instance = generate(`seed-${i}`, difficulty);
        const result = evaluate(instance, reference(instance));
        expect(result.ok, `seed-${i}/${difficulty}`).toBe(true);
        expect(result.efficiency).toBeCloseTo(1);
      }
    }
  });

  it('a mesma solucao avalia igual toda vez', () => {
    const instance = generate('estavel', 2);
    const solution = reference(instance);
    expect(evaluate(instance, solution)).toEqual(evaluate(instance, solution));
  });

  it('padrao errado nao passa', () => {
    const instance = generate('errado', 1);
    const trocado: LoomSolution = [{ colors: ['a', 'a', 'a', 'a'], times: 1 }];
    const result = evaluate(instance, trocado);
    if (expand(trocado).join('') !== instance.target.join('')) {
      expect(result.ok).toBe(false);
    }
  });

  it('solucao vazia ou malformada nao passa', () => {
    const instance = generate('vazio', 1);
    expect(evaluate(instance, []).ok).toBe(false);
    expect(evaluate(instance, [{ colors: [], times: 1 }]).ok).toBe(false);
    expect(evaluate(instance, [{ colors: ['a'], times: 0 }]).ok).toBe(false);
    expect(evaluate(instance, [{ colors: ['a'], times: 1.5 }]).ok).toBe(false);
    expect(evaluate(instance, [{ colors: ['z'], times: 1 }]).ok).toBe(false);
    expect(evaluate(instance, [{ colors: ['a'], times: LOOM.MAX_REPEAT + 1 }]).ok).toBe(false);
    expect(evaluate(instance, null as unknown as LoomSolution).ok).toBe(false);
  });

  it('estourar o limite de cartoes nao passa', () => {
    const instance = generate('limite', 2);
    const gastao: LoomSolution = instance.target.map((c) => ({ colors: [c], times: 1 }));
    expect(solutionCost(gastao)).toBeGreaterThan(instance.maxCards);
    expect(evaluate(instance, gastao).ok).toBe(false);
  });

  it('a eficiencia cai quando se gasta mais cartoes que a referencia', () => {
    // Padrao com folga: resolver na mao custa mais que a referencia.
    const instance: LoomInstance = {
      target: ['a', 'b', 'a', 'b'],
      maxCards: 10,
      colors: ['a', 'b', 'c'],
    };
    const naMao: LoomSolution = instance.target.map((c) => ({ colors: [c], times: 1 }));
    const result = evaluate(instance, naMao);
    expect(result.ok).toBe(true);
    expect(result.efficiency).toBeLessThan(1);
    expect(result.efficiency).toBeCloseTo(3 / 4);
  });

  it('a eficiencia nunca passa do teto', () => {
    const instance = generate('teto', 2);
    expect(evaluate(instance, reference(instance)).efficiency).toBeLessThanOrEqual(1.5);
  });
});

describe('tear: missoes do jogo', () => {
  it('as missoes mecanica-A e mecanica-B resolvem com a referencia', () => {
    const missions = MISSIONS.filter((m) => m.era === 'mecanica');
    expect(missions).toHaveLength(2);
    for (const mission of missions) {
      const instance = generate(mission.seed, mission.difficulty);
      const result = evaluate(instance, reference(instance));
      expect(result.ok, mission.id).toBe(true);
      expect(result.efficiency).toBeCloseTo(1);
    }
  });
});
