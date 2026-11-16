import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { ROUTE } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';
import { byDifficulty } from '../shared/logic';

/**
 * Rota dos Pacotes (Era 4, poder Conectar).
 *
 * Um mapa pequeno de maquinas ligadas entre si: a origem em cima, o destino
 * embaixo. Cada ligacao tem um atraso. O jogador leva o pacote de maquina em
 * maquina, tocando numa vizinha de cada vez. Qualquer caminho que chega
 * conclui a rodada; o caminho de menor atraso e o que rende as tres estrelas.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface RouteNode {
  id: number;
  /** Fileira do mapa: 0 e a origem, a ultima e o destino. */
  row: number;
  /** Posicao horizontal dentro da fileira, de 0 (esquerda) a 1 (direita). */
  x: number;
}

export interface RouteLink {
  a: number;
  b: number;
  /** Atraso para atravessar a ligacao, nos dois sentidos. */
  cost: number;
}

export interface RouteMap {
  nodes: RouteNode[];
  links: RouteLink[];
  origin: number;
  dest: number;
  /** Fileiras do mapa, contando origem e destino. */
  rows: number;
}

export interface RouteInstance {
  rounds: RouteMap[];
}

/** Por rodada, as maquinas por onde o pacote passou, da origem ao destino. */
export type RouteSolution = number[][];

/** Atraso da ligacao entre duas maquinas, ou `null` se nao sao vizinhas. */
export function linkCost(map: RouteMap, from: number, to: number): number | null {
  const link = map.links.find((l) => (l.a === from && l.b === to) || (l.a === to && l.b === from));
  return link ? link.cost : null;
}

/** As vizinhas de uma maquina, com o atraso de cada ligacao. */
export function neighborsOf(map: RouteMap, node: number): { id: number; cost: number }[] {
  return map.links.flatMap((l) => {
    if (l.a === node) return [{ id: l.b, cost: l.cost }];
    if (l.b === node) return [{ id: l.a, cost: l.cost }];
    return [];
  });
}

/** Atraso total de um caminho, ou `null` se algum salto nao e uma ligacao. */
export function pathCost(map: RouteMap, path: readonly number[]): number | null {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const cost = linkCost(map, path[i - 1] as number, path[i] as number);
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

/** Caminho de menor atraso da origem ao destino (o mapa e pequeno: relaxa ate parar). */
export function shortestPath(map: RouteMap): number[] {
  const dist = map.nodes.map(() => Number.POSITIVE_INFINITY);
  const prev = map.nodes.map(() => -1);
  dist[map.origin] = 0;
  for (let pass = 0; pass < map.nodes.length; pass += 1) {
    for (const link of map.links) {
      for (const [from, to] of [
        [link.a, link.b],
        [link.b, link.a],
      ] as const) {
        const candidate = (dist[from] as number) + link.cost;
        if (candidate < (dist[to] as number)) {
          dist[to] = candidate;
          prev[to] = from;
        }
      }
    }
  }
  const path: number[] = [];
  for (let at = map.dest; at !== -1; at = prev[at] as number) path.unshift(at);
  return path;
}

export function bestCost(map: RouteMap): number {
  return pathCost(map, shortestPath(map)) ?? 0;
}

/**
 * O que faria quem so olha o proximo salto: sempre a ligacao mais barata que
 * desce uma fileira. Serve para garantir que o mapa tem uma armadilha -- o
 * salto barato agora nem sempre e o melhor caminho.
 */
function greedyCost(map: RouteMap): number {
  let at = map.origin;
  let total = 0;
  while (at !== map.dest) {
    const row = (map.nodes[at] as RouteNode).row;
    const down = neighborsOf(map, at).filter((n) => (map.nodes[n.id] as RouteNode).row > row);
    const next = down.reduce((best, n) => (n.cost < best.cost ? n : best), down[0]!);
    total += next.cost;
    at = next.id;
  }
  return total;
}

function drawMap(rng: () => number, layers: number, width: number): RouteMap {
  const nodes: RouteNode[] = [{ id: 0, row: 0, x: 0.5 }];
  const grid: number[][] = [];
  for (let layer = 0; layer < layers; layer += 1) {
    const ids: number[] = [];
    for (let slot = 0; slot < width; slot += 1) {
      const id = nodes.length;
      nodes.push({ id, row: layer + 1, x: (slot + 0.5) / width });
      ids.push(id);
    }
    grid.push(ids);
  }
  const dest = nodes.length;
  nodes.push({ id: dest, row: layers + 1, x: 0.5 });

  const links: RouteLink[] = [];
  const cost = (): number => randInt(rng, ROUTE.MIN_COST, ROUTE.MAX_COST);
  const link = (a: number, b: number): void => {
    links.push({ a, b, cost: cost() });
  };

  for (const id of grid[0] as number[]) link(0, id);
  for (let layer = 0; layer + 1 < layers; layer += 1) {
    const upper = grid[layer] as number[];
    const lower = grid[layer + 1] as number[];
    upper.forEach((id, slot) => {
      // Reto para baixo sempre existe: nenhuma maquina fica sem entrada nem saida.
      link(id, lower[slot] as number);
      // Na diagonal, so para a direita: assim duas ligacoes nunca se cruzam.
      if (slot + 1 < width && rng() < 0.6) link(id, lower[slot + 1] as number);
    });
  }
  for (const ids of grid) {
    for (let slot = 0; slot + 1 < width; slot += 1) {
      if (rng() < 0.4) link(ids[slot] as number, ids[slot + 1] as number);
    }
  }
  for (const id of grid[layers - 1] as number[]) link(id, dest);

  return { nodes, links, origin: 0, dest, rows: layers + 2 };
}

/**
 * Da segunda rodada em diante (e sempre na missao B) o mapa precisa ter a
 * armadilha do salto barato. Se os sorteios nao derem um mapa assim, fica o
 * ultimo sorteado: ele continua tendo caminho, so e mais facil.
 */
export function generate(seed: string, difficulty: Difficulty): RouteInstance {
  const rng = createRng(`rota:${seed}:${difficulty}`);
  const total = byDifficulty(ROUTE.ROUNDS, difficulty, 2);
  const layers = byDifficulty(ROUTE.LAYERS, difficulty, 2);
  const width = byDifficulty(ROUTE.WIDTH, difficulty, 2);
  const alwaysTrap = difficulty === 2 || difficulty === 3;

  const rounds: RouteMap[] = [];
  for (let index = 0; index < total; index += 1) {
    const wantsTrap = alwaysTrap || index > 0;
    let map = drawMap(rng, layers, width);
    for (let attempt = 1; attempt < ROUTE.GEN_ATTEMPTS; attempt += 1) {
      if (!wantsTrap || greedyCost(map) > bestCost(map)) break;
      map = drawMap(rng, layers, width);
    }
    rounds.push(map);
  }
  return { rounds };
}

export function reference(instance: RouteInstance): RouteSolution {
  return instance.rounds.map(shortestPath);
}

/**
 * `ok` exige que o pacote chegue em todas as rodadas, por ligacoes que existem.
 * Eficiencia = atraso do melhor caminho / atraso do caminho feito, somando as
 * rodadas (1 = achou o melhor em todas).
 */
export function evaluate(instance: RouteInstance, solution: RouteSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.rounds.length) {
    return { ok: false, efficiency: 0 };
  }
  let best = 0;
  let used = 0;
  for (let i = 0; i < instance.rounds.length; i += 1) {
    const map = instance.rounds[i] as RouteMap;
    const path = solution[i];
    if (!Array.isArray(path) || path.length < 2) return { ok: false, efficiency: 0 };
    if (path[0] !== map.origin || path.at(-1) !== map.dest) return { ok: false, efficiency: 0 };
    const cost = pathCost(map, path);
    if (cost === null) return { ok: false, efficiency: 0 };
    best += bestCost(map);
    used += cost;
  }
  return { ok: true, efficiency: used > 0 ? Math.min(1, best / used) : 0 };
}

export const era: EraId = 'redes';

export const route: Minigame<RouteInstance, RouteSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
