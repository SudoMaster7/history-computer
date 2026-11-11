import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { SCORING, VAULT } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';

/**
 * Cofre Criptografico (Era 5, poder Proteger).
 *
 * O invasor entra pela borda da rede e tenta chegar ao cofre. O jogador gasta
 * firewalls nas ligacoes entre as maquinas e precisa fechar TODOS os caminhos --
 * porque uma unica rota aberta ja basta para o invasor.
 *
 * A graca esta em onde cortar: perto da entrada a rede e larga, no meio ela
 * aperta. Cortar no gargalo custa poucos firewalls; cortar na entrada custa
 * muitos e protege o mesmo.
 *
 * E o oposto exato da Era 4: la o jogador abre um caminho, aqui ele fecha todos.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface VaultLink {
  /** Ligacao dirigida, sempre no sentido entrada -> cofre. */
  from: number;
  to: number;
}

export interface VaultInstance {
  /** Maquinas da rede. A 0 e a entrada do invasor, a ultima e o cofre. */
  nodes: number;
  links: VaultLink[];
  /** Firewalls disponiveis. Na missao B so cabe o corte minimo. */
  maxFirewalls: number;
}

/** Indices das ligacoes onde o jogador instalou firewall. */
export type VaultSolution = number[];

export function entry(): number {
  return 0;
}

export function vault(instance: VaultInstance): number {
  return instance.nodes - 1;
}

/** Forma da solucao: indices de ligacao que existem, sem repetir. */
export function isWellFormed(instance: VaultInstance, solution: VaultSolution): boolean {
  if (!Array.isArray(solution)) return false;
  if (
    !solution.every(
      (index) => Number.isInteger(index) && index >= 0 && index < instance.links.length,
    )
  ) {
    return false;
  }
  return new Set(solution).size === solution.length;
}

/** Maquinas que o invasor alcanca com esses firewalls instalados. */
export function reachable(instance: VaultInstance, firewalls: readonly number[]): Set<number> {
  const blocked = new Set(firewalls);
  const seen = new Set<number>([entry()]);
  const queue: number[] = [entry()];

  while (queue.length > 0) {
    const node = queue.shift() as number;
    instance.links.forEach((link, index) => {
      if (blocked.has(index) || link.from !== node || seen.has(link.to)) return;
      seen.add(link.to);
      queue.push(link.to);
    });
  }
  return seen;
}

/** O cofre continua alcancavel com esses firewalls? Uma rota aberta ja basta. */
export function vaultExposed(instance: VaultInstance, firewalls: readonly number[]): boolean {
  return reachable(instance, firewalls).has(vault(instance));
}

/** Um caminho ainda aberto da entrada ao cofre, para a tela mostrar a falha. */
export function openPath(instance: VaultInstance, firewalls: readonly number[]): number[] | null {
  const blocked = new Set(firewalls);
  const before = new Map<number, number>([[entry(), -1]]);
  const queue: number[] = [entry()];

  while (queue.length > 0) {
    const node = queue.shift() as number;
    if (node === vault(instance)) break;
    instance.links.forEach((link, index) => {
      if (blocked.has(index) || link.from !== node || before.has(link.to)) return;
      before.set(link.to, node);
      queue.push(link.to);
    });
  }

  if (!before.has(vault(instance))) return null;
  const path: number[] = [];
  for (let node = vault(instance); node >= 0; node = before.get(node) as number) {
    path.unshift(node);
    if (node === entry()) break;
  }
  return path;
}

/*
 * Corte minimo = fluxo maximo com capacidade 1 em cada ligacao (Menger). Com
 * capacidade 1, cada caminho aumentante achado e uma rota independente que o
 * invasor teria, e cada uma delas exige um firewall proprio.
 */

interface Arc {
  to: number;
  cap: number;
  /** Indice do arco inverso na lista do no de destino. */
  rev: number;
  /** Indice da ligacao original, ou -1 para o arco inverso. */
  link: number;
}

function buildGraph(instance: VaultInstance): Arc[][] {
  const graph: Arc[][] = Array.from({ length: instance.nodes }, () => []);
  instance.links.forEach((link, index) => {
    const forward = graph[link.from] as Arc[];
    const backward = graph[link.to] as Arc[];
    forward.push({ to: link.to, cap: 1, rev: backward.length, link: index });
    backward.push({ to: link.from, cap: 0, rev: forward.length - 1, link: -1 });
  });
  return graph;
}

/** Firewalls do corte minimo: o conjunto mais barato que fecha tudo. */
export function reference(instance: VaultInstance): VaultSolution {
  const graph = buildGraph(instance);
  const source = entry();
  const sink = vault(instance);

  // Edmonds-Karp: busca em largura acha o caminho aumentante mais curto.
  for (;;) {
    const before = new Map<number, { node: number; arc: number }>();
    const queue: number[] = [source];
    while (queue.length > 0 && !before.has(sink)) {
      const node = queue.shift() as number;
      (graph[node] as Arc[]).forEach((arc, index) => {
        if (arc.cap <= 0 || arc.to === source || before.has(arc.to)) return;
        before.set(arc.to, { node, arc: index });
        queue.push(arc.to);
      });
    }
    if (!before.has(sink)) break;

    let node = sink;
    while (node !== source) {
      const step = before.get(node) as { node: number; arc: number };
      const arc = (graph[step.node] as Arc[])[step.arc] as Arc;
      arc.cap -= 1;
      ((graph[arc.to] as Arc[])[arc.rev] as Arc).cap += 1;
      node = step.node;
    }
  }

  // Lado da entrada no grafo residual: o corte sao as ligacoes que saem dele.
  const side = new Set<number>([source]);
  const queue: number[] = [source];
  while (queue.length > 0) {
    const node = queue.shift() as number;
    for (const arc of graph[node] as Arc[]) {
      if (arc.cap > 0 && !side.has(arc.to)) {
        side.add(arc.to);
        queue.push(arc.to);
      }
    }
  }

  const cut: number[] = [];
  instance.links.forEach((link, index) => {
    if (side.has(link.from) && !side.has(link.to)) cut.push(index);
  });
  return cut;
}

/** Quantos firewalls o corte minimo usa; e o que a eficiencia compara. */
export function referenceCost(instance: VaultInstance): number {
  return reference(instance).length;
}

/**
 * Sorteia a rede em camadas: a entrada, algumas camadas de maquinas e o cofre.
 * Toda ligacao aponta para a camada seguinte, entao sempre existe caminho --
 * e sempre existe corte.
 */
export function generate(seed: string, difficulty: Difficulty): VaultInstance {
  const rng = createRng(`cofre:${seed}:${difficulty}`);
  const key = String(difficulty);
  const layers = Math.max(1, VAULT.LAYERS[key] ?? VAULT.LAYERS['1'] ?? 2);
  const width = Math.max(2, VAULT.WIDTH[key] ?? 2);
  const extra = VAULT.EXTRA_LINKS[key] ?? 1;
  const slack = VAULT.SLACK[key] ?? 0;

  /** Camadas de indices: [entrada], [camada 1], ..., [cofre]. */
  const groups: number[][] = [[0]];
  let next = 1;
  for (let layer = 0; layer < layers; layer += 1) {
    groups.push(Array.from({ length: width }, () => next++));
  }
  groups.push([next]);
  const nodes = next + 1;

  const build = (): VaultInstance => {
    const used = new Set<string>();
    const links: VaultLink[] = [];
    const add = (from: number, to: number): void => {
      const id = `${from}-${to}`;
      if (used.has(id)) return;
      used.add(id);
      links.push({ from, to });
    };

    for (let layer = 0; layer + 1 < groups.length; layer += 1) {
      const here = groups[layer] as number[];
      const there = groups[layer + 1] as number[];
      // Ninguem fica sem saida, e ninguem fica sem entrada.
      for (const from of here) add(from, there[randInt(rng, 0, there.length - 1)] as number);
      for (const to of there) add(here[randInt(rng, 0, here.length - 1)] as number, to);
      for (let i = 0; i < extra; i += 1) {
        add(
          here[randInt(rng, 0, here.length - 1)] as number,
          there[randInt(rng, 0, there.length - 1)] as number,
        );
      }
    }

    return { nodes, links, maxFirewalls: 0 };
  };

  /*
   * Corte minimo de 1 nao serve: um firewall unico resolveria a fase e a licao
   * ("fechar todos os caminhos") nao apareceria.
   */
  let instance: VaultInstance | null = null;
  for (let attempt = 0; attempt < VAULT.GEN_ATTEMPTS && !instance; attempt += 1) {
    const draft = build();
    if (referenceCost(draft) >= 2) instance = draft;
  }

  if (!instance) {
    // Reserva deterministica: duas trilhas paralelas, corte minimo 2.
    const links: VaultLink[] = [];
    for (const lane of [0, 1]) {
      const first = (groups[1] as number[])[lane] as number;
      links.push({ from: 0, to: first });
      let current = first;
      for (let layer = 2; layer + 1 < groups.length; layer += 1) {
        const node = (groups[layer] as number[])[lane] as number;
        links.push({ from: current, to: node });
        current = node;
      }
      links.push({ from: current, to: nodes - 1 });
    }
    instance = { nodes, links, maxFirewalls: 0 };
  }

  return { ...instance, maxFirewalls: referenceCost(instance) + slack };
}

/**
 * Avalia a defesa. `ok` exige o cofre inalcancavel dentro do limite de firewalls.
 * Eficiencia = firewalls do corte minimo / firewalls usados (1 = corte no gargalo).
 */
export function evaluate(instance: VaultInstance, solution: VaultSolution): Evaluation {
  if (!isWellFormed(instance, solution)) return { ok: false, efficiency: 0 };
  if (solution.length === 0) return { ok: false, efficiency: 0 };
  if (solution.length > instance.maxFirewalls) return { ok: false, efficiency: 0 };
  if (vaultExposed(instance, solution)) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(referenceCost(instance) / solution.length, SCORING.EFFICIENCY_MAX);
  return { ok: true, efficiency };
}

export const era: EraId = 'seguranca';

export const vaultGame: Minigame<VaultInstance, VaultSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
