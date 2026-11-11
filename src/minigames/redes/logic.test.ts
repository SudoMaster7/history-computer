import { describe, expect, it } from 'vitest';
import {
  destination,
  evaluate,
  generate,
  isWellFormed,
  linkCost,
  neighbors,
  origin,
  pathCost,
  reference,
  referenceCost,
  shortestPath,
} from './logic';
import type { RouteInstance } from './logic';
import { ROUTE, SCORING } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

/**
 * Rede de teste, escrita a mao:
 *
 *   0 --1-- 1 --1-- 3        (atraso 2, tres saltos)
 *   0 --5-- 2 --1-- 3        (atraso 6)
 *   1 --1-- 2
 */
const rede: RouteInstance = {
  nodes: 4,
  links: [
    { a: 0, b: 1, cost: 1 },
    { a: 1, b: 3, cost: 1 },
    { a: 0, b: 2, cost: 5 },
    { a: 2, b: 3, cost: 1 },
    { a: 1, b: 2, cost: 1 },
  ],
  maxCost: 6,
};

describe('rota dos pacotes: a rede', () => {
  it('a origem e a primeira maquina e o destino e a ultima', () => {
    expect(origin()).toBe(0);
    expect(destination(rede)).toBe(3);
  });

  it('a ligacao vale nos dois sentidos', () => {
    expect(linkCost(rede, 0, 1)).toBe(1);
    expect(linkCost(rede, 1, 0)).toBe(1);
  });

  it('maquinas sem ligacao nao tem atraso', () => {
    expect(linkCost(rede, 0, 3)).toBeNull();
  });

  it('o roteador conhece so os vizinhos dele, em ordem', () => {
    expect(neighbors(rede, 0)).toEqual([1, 2]);
    expect(neighbors(rede, 1)).toEqual([0, 2, 3]);
    expect(neighbors(rede, 3)).toEqual([1, 2]);
  });
});

describe('rota dos pacotes: forma da rota', () => {
  it('aceita a rota que sai da origem e chega no destino por ligacoes que existem', () => {
    expect(isWellFormed(rede, [0, 1, 3])).toBe(true);
  });

  it('recusa rota que nao comeca na origem ou nao termina no destino', () => {
    expect(isWellFormed(rede, [1, 3])).toBe(false);
    expect(isWellFormed(rede, [0, 1])).toBe(false);
  });

  it('recusa salto por ligacao que nao existe', () => {
    expect(isWellFormed(rede, [0, 3])).toBe(false);
  });

  it('recusa laco de roteamento: a mesma maquina duas vezes', () => {
    expect(isWellFormed(rede, [0, 1, 0, 1, 3])).toBe(false);
  });

  it('recusa rota mal escrita', () => {
    expect(isWellFormed(rede, [])).toBe(false);
    expect(isWellFormed(rede, [0, 9, 3])).toBe(false);
    expect(isWellFormed(rede, [0, 1.5, 3])).toBe(false);
  });
});

describe('rota dos pacotes: atraso', () => {
  it('soma o atraso de cada salto', () => {
    expect(pathCost(rede, [0, 1, 3])).toBe(2);
    expect(pathCost(rede, [0, 2, 3])).toBe(6);
    expect(pathCost(rede, [0, 1, 2, 3])).toBe(3);
  });

  it('rota invalida tem atraso infinito, nao zero', () => {
    expect(pathCost(rede, [0, 3])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('rota dos pacotes: referencia', () => {
  it('acha a rota de menor atraso, nao a de menos saltos', () => {
    expect(shortestPath(rede)).toEqual([0, 1, 3]);
    expect(referenceCost(rede)).toBe(2);
  });

  it('devolve null quando o destino nao se alcanca', () => {
    const partida: RouteInstance = {
      nodes: 3,
      links: [{ a: 0, b: 1, cost: 1 }],
      maxCost: 9,
    };
    expect(shortestPath(partida)).toBeNull();
    expect(() => reference(partida)).toThrow();
  });

  it('nenhuma rota valida tem atraso menor que a referencia', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`ref-${i}`, difficulty);
        const melhor = referenceCost(instance);
        // Forca bruta sobre todas as rotas simples da rede.
        const visitar = (path: number[]): void => {
          const atual = path[path.length - 1] as number;
          if (atual === destination(instance)) {
            expect(pathCost(instance, path)).toBeGreaterThanOrEqual(melhor);
            return;
          }
          for (const next of neighbors(instance, atual)) {
            if (path.includes(next)) continue;
            visitar([...path, next]);
          }
        };
        visitar([origin()]);
      }
    }
  });
});

describe('rota dos pacotes: geracao', () => {
  it('a mesma seed produz sempre a mesma rede', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('igual', difficulty)).toEqual(generate('igual', difficulty));
    }
  });

  it('seeds diferentes produzem redes diferentes', () => {
    expect(generate('seed-a', 2)).not.toEqual(generate('seed-b', 2));
  });

  it('a rede tem o numero de maquinas da dificuldade', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('contagem', difficulty).nodes).toBe(ROUTE.NODES[String(difficulty)]);
    }
  });

  it('o destino sempre se alcanca, e nunca em um salto so', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`alcanca-${i}`, difficulty);
        const path = shortestPath(instance);
        expect({ difficulty, i, chega: path !== null }).toEqual({ difficulty, i, chega: true });
        expect({ difficulty, i, saltos: (path?.length ?? 0) >= 3 }).toEqual({
          difficulty,
          i,
          saltos: true,
        });
      }
    }
  });

  it('a referencia sempre cabe no orcamento de atraso', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`cabe-${i}`, difficulty);
        expect(referenceCost(instance)).toBeLessThanOrEqual(instance.maxCost);
      }
    }
  });

  it('na dificuldade 3 so a rota mais curta cabe no orcamento', () => {
    for (let i = 0; i < 20; i += 1) {
      const instance = generate(`justo-${i}`, 3);
      expect(instance.maxCost).toBe(referenceCost(instance));
    }
  });
});

describe('rota dos pacotes: avaliacao', () => {
  it('a referencia fecha com eficiencia 1', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`eval-${i}`, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('rota mais longa que o orcamento reprova', () => {
    const curta: RouteInstance = { ...rede, maxCost: 2 };
    expect(evaluate(curta, [0, 2, 3])).toEqual({ ok: false, efficiency: 0 });
  });

  it('rota que nao chega ao destino reprova', () => {
    expect(evaluate(rede, [0, 1])).toEqual({ ok: false, efficiency: 0 });
  });

  it('dar a volta mais longa passa com eficiencia menor quando ha folga', () => {
    const resultado = evaluate(rede, [0, 1, 2, 3]);
    expect(resultado.ok).toBe(true);
    expect(resultado.efficiency).toBeCloseTo(2 / 3);
  });

  it('a eficiencia nunca passa do teto', () => {
    expect(evaluate(rede, [0, 1, 3]).efficiency).toBeLessThanOrEqual(SCORING.EFFICIENCY_MAX);
  });
});

describe('rota dos pacotes: as missoes da era 4 sao jogaveis', () => {
  const missoes = MISSIONS.filter((m) => m.era === 'redes');

  it('ha duas missoes declaradas', () => {
    expect(missoes).toHaveLength(2);
  });

  it.each(missoes.map((m) => m.id))('a missao %s fecha com a referencia', (id) => {
    const missao = missoes.find((m) => m.id === id)!;
    const instance = generate(missao.seed, missao.difficulty);
    expect(evaluate(instance, reference(instance)).ok).toBe(true);
  });
});
