import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { ROUTE, SCORING } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';

/**
 * Rota dos Pacotes (Era 4, poder Conectar).
 *
 * O pacote sai da maquina de origem e tem de chegar na de destino pulando de
 * vizinho em vizinho. Cada ligacao cobra um atraso, e o pacote tem um orcamento
 * de atraso: chegar nao basta, tem de chegar pela rota curta.
 *
 * O jogador so ve os vizinhos de onde o pacote esta -- que e exatamente o que um
 * roteador sabe. Ninguem na ARPANET tinha o mapa inteiro da rede na mao.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface RouteLink {
  /** Indices das duas maquinas ligadas. A ligacao vale nos dois sentidos. */
  a: number;
  b: number;
  /** Atraso da ligacao. */
  cost: number;
}

export interface RouteInstance {
  /** Quantas maquinas a rede tem. A 0 e a origem, a ultima e o destino. */
  nodes: number;
  links: RouteLink[];
  /** Orcamento de atraso. Na missao B so cabe a rota mais curta. */
  maxCost: number;
}

/** A rota, em maquinas visitadas: comeca na origem e termina no destino. */
export type RouteSolution = number[];

export function origin(): number {
  return 0;
}

export function destination(instance: RouteInstance): number {
  return instance.nodes - 1;
}

/** Atraso da ligacao entre duas maquinas, ou null se elas nao se ligam. */
export function linkCost(instance: RouteInstance, a: number, b: number): number | null {
  for (const link of instance.links) {
    if ((link.a === a && link.b === b) || (link.a === b && link.b === a)) return link.cost;
  }
  return null;
}

/** Vizinhos de uma maquina, em ordem crescente: e o que o roteador conhece. */
export function neighbors(instance: RouteInstance, node: number): number[] {
  const out: number[] = [];
  for (const link of instance.links) {
    if (link.a === node) out.push(link.b);
    else if (link.b === node) out.push(link.a);
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

/**
 * Forma da rota: comeca na origem, termina no destino, cada passo usa uma
 * ligacao que existe e nenhuma maquina aparece duas vezes (passar duas vezes
 * pelo mesmo roteador e laco de roteamento, nao rota).
 */
export function isWellFormed(instance: RouteInstance, solution: RouteSolution): boolean {
  if (!Array.isArray(solution) || solution.length < 2) return false;
  if (!solution.every((node) => Number.isInteger(node) && node >= 0 && node < instance.nodes)) {
    return false;
  }
  if (solution[0] !== origin()) return false;
  if (solution[solution.length - 1] !== destination(instance)) return false;
  if (new Set(solution).size !== solution.length) return false;

  for (let i = 0; i + 1 < solution.length; i += 1) {
    if (linkCost(instance, solution[i] as number, solution[i + 1] as number) === null) return false;
  }
  return true;
}

/** Atraso total da rota, ou infinito se a rota nao e valida. */
export function pathCost(instance: RouteInstance, solution: RouteSolution): number {
  if (!isWellFormed(instance, solution)) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (let i = 0; i + 1 < solution.length; i += 1) {
    total += linkCost(instance, solution[i] as number, solution[i + 1] as number) as number;
  }
  return total;
}

/**
 * Rota de menor atraso, por Dijkstra. O empate e resolvido pelo menor indice de
 * maquina, para a referencia ser sempre a mesma na mesma rede.
 */
export function shortestPath(instance: RouteInstance): RouteSolution | null {
  const total = instance.nodes;
  const dist: number[] = new Array(total).fill(Number.POSITIVE_INFINITY);
  const before: number[] = new Array(total).fill(-1);
  const seen: boolean[] = new Array(total).fill(false);
  dist[origin()] = 0;

  for (let step = 0; step < total; step += 1) {
    let current = -1;
    for (let node = 0; node < total; node += 1) {
      if (seen[node]) continue;
      if (current < 0 || (dist[node] as number) < (dist[current] as number)) current = node;
    }
    if (current < 0 || !Number.isFinite(dist[current] as number)) break;
    seen[current] = true;

    for (const next of neighbors(instance, current)) {
      const edge = linkCost(instance, current, next) as number;
      const candidate = (dist[current] as number) + edge;
      if (candidate < (dist[next] as number)) {
        dist[next] = candidate;
        before[next] = current;
      }
    }
  }

  const target = destination(instance);
  if (!Number.isFinite(dist[target] as number)) return null;

  const path: number[] = [];
  for (let node = target; node >= 0; node = before[node] as number) {
    path.unshift(node);
    if (node === origin()) break;
  }
  return path[0] === origin() ? path : null;
}

/** Rota de referencia: a de menor atraso. */
export function reference(instance: RouteInstance): RouteSolution {
  const path = shortestPath(instance);
  if (!path) throw new Error('Rota dos Pacotes: rede sem caminho ate o destino.');
  return path;
}

/** Atraso da rota de referencia; e o que a eficiencia compara. */
export function referenceCost(instance: RouteInstance): number {
  return pathCost(instance, reference(instance));
}

function linkKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Sorteia a rede. Primeiro uma arvore (cada maquina nova se liga a uma que ja
 * esta na rede), que garante que todas se alcancam; depois ligacoes extras, que
 * e o que cria rota alternativa -- sem isso nao ha escolha a fazer.
 */
export function generate(seed: string, difficulty: Difficulty): RouteInstance {
  const rng = createRng(`rota:${seed}:${difficulty}`);
  const key = String(difficulty);
  const nodes = Math.max(3, ROUTE.NODES[key] ?? ROUTE.NODES['1'] ?? 6);
  const extra = ROUTE.EXTRA_LINKS[key] ?? 2;
  const slack = ROUTE.SLACK[key] ?? 0;

  const build = (): RouteInstance => {
    const links: RouteLink[] = [];
    const used = new Set<string>();
    const add = (a: number, b: number): void => {
      if (a === b || used.has(linkKey(a, b))) return;
      used.add(linkKey(a, b));
      links.push({ a, b, cost: randInt(rng, ROUTE.MIN_COST, ROUTE.MAX_COST) });
    };

    for (let node = 1; node < nodes; node += 1) add(randInt(rng, 0, node - 1), node);
    for (let i = 0; i < extra; i += 1) add(randInt(rng, 0, nodes - 1), randInt(rng, 0, nodes - 1));

    return { nodes, links, maxCost: 0 };
  };

  /*
   * Uma rede so serve se a rota curta tiver pelo menos dois saltos: com a
   * origem ligada direto no destino, nao ha roteamento nenhum para pensar.
   */
  let instance: RouteInstance | null = null;
  for (let attempt = 0; attempt < ROUTE.GEN_ATTEMPTS && !instance; attempt += 1) {
    const draft = build();
    const path = shortestPath(draft);
    if (path && path.length >= 3) instance = draft;
  }

  if (!instance) {
    // Reserva deterministica: um anel, onde toda rota tem mais de um salto.
    const links: RouteLink[] = [];
    for (let node = 0; node + 1 < nodes; node += 1) {
      links.push({ a: node, b: node + 1, cost: ROUTE.MIN_COST });
    }
    links.push({ a: 0, b: nodes - 1, cost: ROUTE.MAX_COST * nodes });
    instance = { nodes, links, maxCost: 0 };
  }

  return { ...instance, maxCost: referenceCost(instance) + slack };
}

/**
 * Avalia a rota. `ok` exige chegar ao destino dentro do orcamento de atraso.
 * Eficiencia = atraso da rota curta / atraso da rota usada (1 = a mais curta).
 */
export function evaluate(instance: RouteInstance, solution: RouteSolution): Evaluation {
  const used = pathCost(instance, solution);
  if (!Number.isFinite(used)) return { ok: false, efficiency: 0 };
  if (used > instance.maxCost) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(referenceCost(instance) / used, SCORING.EFFICIENCY_MAX);
  return { ok: true, efficiency };
}

export const era: EraId = 'redes';

export const route: Minigame<RouteInstance, RouteSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
