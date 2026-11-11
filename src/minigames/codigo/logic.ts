import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { BITS, SCORING } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';

/**
 * Mesa de Bits (Era 3, poder Codificar).
 *
 * A mensagem a gravar na fita e feita de alguns simbolos, uns muito mais
 * frequentes que outros. O jogador escolhe o codigo em bits de cada simbolo e
 * tem um orcamento de bits na fita: para caber, o simbolo que aparece muito
 * precisa de um codigo curto, e o que aparece pouco paga o codigo longo.
 *
 * A regra que faz o quebra-cabeca: nenhum codigo pode ser o comeco de outro
 * (codigo livre de prefixo), senao a leitura da fita fica ambigua -- e e
 * exatamente esse o problema que Huffman resolveu em 1952.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface BitsSymbol {
  /** Letra que representa o simbolo na mensagem. */
  id: string;
  /** Quantas vezes o simbolo aparece na mensagem. */
  weight: number;
}

export interface BitsInstance {
  symbols: BitsSymbol[];
  /** Orcamento de bits da fita. Na missao B so cabe o codigo otimo. */
  maxBits: number;
}

/** Codigo de cada simbolo, em texto de '0' e '1'. */
export type BitsSolution = Record<string, string>;

/** Codigo de bits bem escrito: so '0' e '1', nem vazio nem longo demais. */
function isCode(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > BITS.MAX_CODE_LEN) return false;
  for (const bit of value) {
    if (bit !== '0' && bit !== '1') return false;
  }
  return true;
}

/**
 * Nenhum codigo e o comeco de outro. Sem isso o leitor da fita nao sabe onde um
 * simbolo termina: "0" e "01" juntos tornam a fita ilegivel.
 */
export function isPrefixFree(codes: readonly string[]): boolean {
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = 0; j < codes.length; j += 1) {
      if (i === j) continue;
      const a = codes[i] as string;
      const b = codes[j] as string;
      if (b.startsWith(a)) return false;
    }
  }
  return true;
}

/** Pares de simbolos em que o codigo do primeiro e comeco do codigo do segundo. */
export function prefixClashes(solution: BitsSolution): [string, string][] {
  const entries = Object.entries(solution).filter(([, code]) => isCode(code));
  const clashes: [string, string][] = [];
  for (const [idA, codeA] of entries) {
    for (const [idB, codeB] of entries) {
      if (idA === idB) continue;
      if (codeB.startsWith(codeA)) clashes.push([idA, idB]);
    }
  }
  return clashes;
}

/** Bits gastos na fita: cada simbolo paga o seu codigo uma vez por aparicao. */
export function solutionCost(instance: BitsInstance, solution: BitsSolution): number {
  let total = 0;
  for (const symbol of instance.symbols) {
    const code = solution[symbol.id];
    if (!isCode(code)) return Number.POSITIVE_INFINITY;
    total += symbol.weight * code.length;
  }
  return total;
}

/** Forma da solucao: um codigo valido por simbolo, e nada sobrando. */
export function isWellFormed(instance: BitsInstance, solution: BitsSolution): boolean {
  if (typeof solution !== 'object' || solution === null || Array.isArray(solution)) return false;
  const ids = instance.symbols.map((s) => s.id);
  if (Object.keys(solution).length !== ids.length) return false;
  return ids.every((id) => isCode(solution[id]));
}

interface TreeNode {
  weight: number;
  /** Menor id da sub-arvore; serve so para desempatar de forma deterministica. */
  tag: string;
  left: TreeNode | null;
  right: TreeNode | null;
  id: string | null;
}

/**
 * Arvore de Huffman: junta sempre os dois nos mais leves, porque o simbolo mais
 * raro e o que pode descer mais fundo na arvore sem encarecer a fita.
 *
 * O empate e resolvido pela etiqueta (o menor id da sub-arvore), senao a mesma
 * mensagem produziria codigos diferentes a cada execucao e nenhum teste valeria.
 */
function huffmanTree(symbols: readonly BitsSymbol[]): TreeNode {
  let pool: TreeNode[] = symbols.map((s) => ({
    weight: s.weight,
    tag: s.id,
    left: null,
    right: null,
    id: s.id,
  }));

  const order = (a: TreeNode, b: TreeNode): number =>
    a.weight !== b.weight ? a.weight - b.weight : a.tag < b.tag ? -1 : 1;

  while (pool.length > 1) {
    pool.sort(order);
    const left = pool[0] as TreeNode;
    const right = pool[1] as TreeNode;
    const merged: TreeNode = {
      weight: left.weight + right.weight,
      tag: left.tag < right.tag ? left.tag : right.tag,
      left,
      right,
      id: null,
    };
    pool = [merged, ...pool.slice(2)];
  }

  const root = pool[0];
  if (!root) throw new Error('Mesa de Bits: mensagem sem simbolo nenhum.');
  return root;
}

/** Codigo otimo de cada simbolo. Com um simbolo so, o codigo e "0". */
export function reference(instance: BitsInstance): BitsSolution {
  const root = huffmanTree(instance.symbols);
  const codes: BitsSolution = {};

  const walk = (node: TreeNode, prefix: string): void => {
    if (node.id !== null) {
      codes[node.id] = prefix.length > 0 ? prefix : '0';
      return;
    }
    if (node.left) walk(node.left, `${prefix}0`);
    if (node.right) walk(node.right, `${prefix}1`);
  };

  walk(root, '');
  return codes;
}

/** Bits do codigo otimo; e o que a eficiencia compara. */
export function referenceCost(instance: BitsInstance): number {
  return solutionCost(instance, reference(instance));
}

/** Bits de um codigo de tamanho fixo, que e a solucao ingenua da missao A. */
export function fixedCost(instance: BitsInstance): number {
  const bits = Math.max(1, Math.ceil(Math.log2(instance.symbols.length)));
  return instance.symbols.reduce((total, s) => total + s.weight * bits, 0);
}

function symbolsFor(count: number, weights: readonly number[]): BitsSymbol[] {
  return Array.from({ length: count }, (_, i) => ({
    id: BITS.SYMBOLS[i] ?? String(i + 1),
    weight: weights[i] ?? 1,
  }));
}

/**
 * Sorteia a mensagem. A frequencia precisa ser desigual o bastante para o
 * codigo otimo sair MENOR que o de tamanho fixo -- se todos os simbolos
 * aparecem quase o mesmo numero de vezes, nao ha nada a aprender na fita.
 */
export function generate(seed: string, difficulty: Difficulty): BitsInstance {
  const rng = createRng(`bits:${seed}:${difficulty}`);
  const key = String(difficulty);
  const count = Math.max(2, BITS.COUNT[key] ?? BITS.COUNT['1'] ?? 3);
  const slack = BITS.SLACK[key] ?? 0;

  let symbols: BitsSymbol[] | null = null;
  for (let attempt = 0; attempt < BITS.GEN_ATTEMPTS && !symbols; attempt += 1) {
    const weights = Array.from({ length: count }, () =>
      randInt(rng, BITS.MIN_WEIGHT, BITS.MAX_WEIGHT),
    );
    const draft = symbolsFor(count, weights);
    const probe: BitsInstance = { symbols: draft, maxBits: 0 };
    if (referenceCost(probe) < fixedCost(probe)) symbols = draft;
  }

  if (!symbols) {
    // Reserva deterministica: pesos que dobram, onde Huffman sempre ganha.
    symbols = symbolsFor(
      count,
      Array.from({ length: count }, (_, i) => 1 << (count - 1 - i)),
    );
  }

  const draft: BitsInstance = { symbols, maxBits: 0 };
  const optimal = referenceCost(draft);

  /*
   * Missao A e a versao micro cabem com codigo de tamanho fixo (a primeira
   * solucao que qualquer um tenta; rende 1 estrela). Da missao B em diante o
   * orcamento e o do codigo otimo mais a folga da dificuldade.
   */
  const generous = difficulty === 1 || difficulty === 'micro';
  const maxBits = generous ? Math.max(fixedCost(draft), optimal) : optimal + slack;
  return { symbols, maxBits };
}

/**
 * Avalia a fita. `ok` exige codigo livre de prefixo dentro do orcamento de bits.
 * Eficiencia = bits do codigo otimo / bits gastos (1 = tao enxuto quanto Huffman).
 */
export function evaluate(instance: BitsInstance, solution: BitsSolution): Evaluation {
  if (!isWellFormed(instance, solution)) return { ok: false, efficiency: 0 };

  const codes = instance.symbols.map((s) => solution[s.id] as string);
  if (!isPrefixFree(codes)) return { ok: false, efficiency: 0 };

  const used = solutionCost(instance, solution);
  if (used > instance.maxBits) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(referenceCost(instance) / used, SCORING.EFFICIENCY_MAX);
  return { ok: true, efficiency };
}

export const era: EraId = 'codigo';

export const bits: Minigame<BitsInstance, BitsSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
