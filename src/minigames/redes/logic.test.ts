import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { ROUTE } from '@/core/constants';
import type { RouteMap } from './logic';
import {
  bestCost,
  evaluate,
  generate,
  linkCost,
  neighborsOf,
  pathCost,
  reference,
  route,
  shortestPath,
} from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `rota-${i}`);

/** Origem 0, destino 3: por 1 custa 2 + 2, por 2 custa 1 + 9. */
const SMALL: RouteMap = {
  nodes: [
    { id: 0, row: 0, x: 0.5 },
    { id: 1, row: 1, x: 0.25 },
    { id: 2, row: 1, x: 0.75 },
    { id: 3, row: 2, x: 0.5 },
  ],
  links: [
    { a: 0, b: 1, cost: 2 },
    { a: 0, b: 2, cost: 1 },
    { a: 1, b: 3, cost: 2 },
    { a: 2, b: 3, cost: 9 },
  ],
  origin: 0,
  dest: 3,
  rows: 3,
};

/** Todos os caminhos sem repetir maquina, para conferir o menor na forca bruta. */
function allCosts(map: RouteMap): number[] {
  const costs: number[] = [];
  const walk = (at: number, seen: number[], total: number): void => {
    if (at === map.dest) {
      costs.push(total);
      return;
    }
    for (const next of neighborsOf(map, at)) {
      if (!seen.includes(next.id)) walk(next.id, [...seen, next.id], total + next.cost);
    }
  };
  walk(map.origin, [map.origin], 0);
  return costs;
}

describe('Rota dos Pacotes', () => {
  it('e da era das Redes', () => {
    expect(route.era).toBe('redes');
  });

  it('a ligacao vale nos dois sentidos, e so existe entre vizinhas', () => {
    expect(linkCost(SMALL, 0, 1)).toBe(2);
    expect(linkCost(SMALL, 1, 0)).toBe(2);
    expect(linkCost(SMALL, 0, 3)).toBeNull();
    expect(neighborsOf(SMALL, 0)).toEqual([
      { id: 1, cost: 2 },
      { id: 2, cost: 1 },
    ]);
    expect(neighborsOf(SMALL, 3).map((n) => n.id)).toEqual([1, 2]);
  });

  it('o salto mais barato agora nem sempre e o melhor caminho', () => {
    expect(pathCost(SMALL, [0, 2, 3])).toBe(10);
    expect(shortestPath(SMALL)).toEqual([0, 1, 3]);
    expect(bestCost(SMALL)).toBe(4);
    expect(pathCost(SMALL, [0, 3])).toBeNull();
  });

  it('a mesma seed da sempre os mesmos mapas', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
  });

  it('todo mapa tem as medidas da constante e um caminho ate o destino', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        const layers = ROUTE.LAYERS[String(difficulty)] as number;
        const width = ROUTE.WIDTH[String(difficulty)] as number;
        expect(instance.rounds).toHaveLength(ROUTE.ROUNDS[String(difficulty)] as number);
        for (const map of instance.rounds) {
          expect(map.nodes).toHaveLength(layers * width + 2);
          expect(map.rows).toBe(layers + 2);
          for (const link of map.links) {
            expect(link.cost).toBeGreaterThanOrEqual(ROUTE.MIN_COST);
            expect(link.cost).toBeLessThanOrEqual(ROUTE.MAX_COST);
          }
          const path = shortestPath(map);
          expect(path[0]).toBe(map.origin);
          expect(path.at(-1)).toBe(map.dest);
          expect(pathCost(map, path)).not.toBeNull();
        }
      }
    }
  });

  it('shortestPath acha mesmo o menor atraso (conferido na forca bruta)', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 15)) {
        for (const map of generate(seed, difficulty).rounds) {
          expect({ seed, difficulty, menor: bestCost(map) }).toEqual({
            seed,
            difficulty,
            menor: Math.min(...allCosts(map)),
          });
        }
      }
    }
  });

  it('a referencia chega em todas as rodadas pelo melhor caminho', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('caminho mais lento conclui, com eficiencia = melhor / feito', () => {
    const instance = { rounds: [SMALL] };
    expect(evaluate(instance, [[0, 2, 3]])).toEqual({ ok: true, efficiency: 4 / 10 });
    // Ir e voltar tambem chega: so custa mais.
    expect(evaluate(instance, [[0, 2, 0, 1, 3]])).toEqual({ ok: true, efficiency: 4 / 6 });
  });

  it('nao conclui sem chegar, saltando onde nao ha ligacao ou saindo de outro lugar', () => {
    const instance = { rounds: [SMALL] };
    expect(evaluate(instance, [[0, 1]]).ok).toBe(false);
    expect(evaluate(instance, [[0, 3]]).ok).toBe(false);
    expect(evaluate(instance, [[1, 3]]).ok).toBe(false);
    expect(evaluate(instance, [[3]]).ok).toBe(false);
    expect(evaluate(instance, []).ok).toBe(false);
    expect(evaluate(instance, [null] as never).ok).toBe(false);
    expect(evaluate(instance, 7 as never).ok).toBe(false);
  });
});
