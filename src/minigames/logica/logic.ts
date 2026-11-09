import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { CIRCUIT, SCORING } from '@/core/constants';
import { createRng, randInt } from '@/core/rng';

/**
 * Circuitos Logicos (Era 2, poder Decidir).
 *
 * O cofre do ENIAC abre quando o circuito do jogador responde exatamente como a
 * tabela-verdade pedida. O jogador tem portas NAO, E e OU e um limite de portas:
 * fechar dentro do limite exige escolher bem, nao empilhar portas.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export type GateType = 'NOT' | 'AND' | 'OR';

/** De onde um encaixe tira valor: uma entrada do cofre ou outra porta. */
export type CircuitRef = { input: number } | { gate: number };

export interface Gate {
  type: GateType;
  /** Uma referencia para NAO, duas para E e OU. */
  in: CircuitRef[];
}

export interface CircuitInstance {
  /** Quantas chaves de entrada o cofre tem (2 ou 3). */
  inputs: number;
  /** Saida esperada por linha; 2^inputs linhas. */
  table: boolean[];
  /** Portas disponiveis. Na missao B a folga sobre a referencia e curta. */
  maxGates: number;
}

export interface CircuitSolution {
  /** Em ordem de montagem: uma porta so liga em entradas ou em portas anteriores. */
  gates: Gate[];
  out: CircuitRef;
}

/** Linhas da tabela-verdade de `inputs` entradas. */
export function rowCount(inputs: number): number {
  return 1 << inputs;
}

/**
 * Valor da entrada `index` na linha `row`.
 * Convencao: o bit `index` da linha e o valor da entrada `index`.
 */
export function inputValue(row: number, index: number): boolean {
  return ((row >> index) & 1) === 1;
}

/** Quantos encaixes a porta tem: NAO recebe uma, E e OU recebem duas. */
export function arityOf(type: GateType): number {
  return type === 'NOT' ? 1 : 2;
}

/*
 * Representacao interna: uma funcao booleana de n entradas e um numero cujo bit
 * `row` diz a saida naquela linha. Com 3 entradas sao 8 linhas, ou seja 256
 * funcoes possiveis -- pequeno o bastante para procurar o menor circuito de
 * todas elas de uma vez.
 */

function maskOfInput(inputs: number, index: number): number {
  let mask = 0;
  for (let row = 0; row < rowCount(inputs); row += 1) {
    if (inputValue(row, index)) mask |= 1 << row;
  }
  return mask;
}

function maskOfTable(table: readonly boolean[]): number {
  let mask = 0;
  for (let row = 0; row < table.length; row += 1) {
    if (table[row]) mask |= 1 << row;
  }
  return mask;
}

function tableOfMask(inputs: number, fn: number): boolean[] {
  const table: boolean[] = [];
  for (let row = 0; row < rowCount(inputs); row += 1) table.push(((fn >> row) & 1) === 1);
  return table;
}

/**
 * A funcao reage a todas as entradas? Tabela que ignora uma das chaves daria um
 * cofre com chave decorativa, e o jogador acharia que entendeu errado.
 */
function usesEveryInput(inputs: number, fn: number): boolean {
  for (let index = 0; index < inputs; index += 1) {
    let matters = false;
    for (let row = 0; row < rowCount(inputs) && !matters; row += 1) {
      if (inputValue(row, index)) continue;
      const flipped = row | (1 << index);
      matters = ((fn >> row) & 1) !== ((fn >> flipped) & 1);
    }
    if (!matters) return false;
  }
  return true;
}

type Step =
  | { op: 'input'; index: number }
  | { op: 'NOT'; a: number }
  | { op: 'AND'; a: number; b: number }
  | { op: 'OR'; a: number; b: number };

interface Costs {
  /** cost[f] = menor numero de portas que produz a funcao f. */
  cost: number[];
  /** Como f foi alcancada com esse custo. */
  how: (Step | null)[];
}

const costCache = new Map<number, Costs>();

/**
 * Menor circuito de cada funcao booleana de `inputs` entradas, por relaxamento
 * sucessivo: parte das entradas (custo 0) e vai combinando com NAO, E e OU ate
 * nenhum custo melhorar. O custo conta a arvore (sem reaproveitar porta), que e
 * exatamente o que `gates.length` mede numa solucao em arvore.
 *
 * Memoizado porque so ha dois tamanhos de cofre no jogo.
 */
function costsFor(inputs: number): Costs {
  const cached = costCache.get(inputs);
  if (cached) return cached;

  const total = 1 << rowCount(inputs);
  const full = total - 1;
  const cost: number[] = new Array(total).fill(Number.POSITIVE_INFINITY);
  const how: (Step | null)[] = new Array(total).fill(null);

  for (let index = 0; index < inputs; index += 1) {
    const mask = maskOfInput(inputs, index);
    cost[mask] = 0;
    how[mask] = { op: 'input', index };
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let a = 0; a < total; a += 1) {
      const ca = cost[a] as number;
      if (!Number.isFinite(ca)) continue;

      const negated = full ^ a;
      if (ca + 1 < (cost[negated] as number)) {
        cost[negated] = ca + 1;
        how[negated] = { op: 'NOT', a };
        changed = true;
      }

      for (let b = a; b < total; b += 1) {
        const cb = cost[b] as number;
        if (!Number.isFinite(cb)) continue;
        const sum = ca + cb + 1;

        const and = a & b;
        if (sum < (cost[and] as number)) {
          cost[and] = sum;
          how[and] = { op: 'AND', a, b };
          changed = true;
        }

        const or = a | b;
        if (sum < (cost[or] as number)) {
          cost[or] = sum;
          how[or] = { op: 'OR', a, b };
          changed = true;
        }
      }
    }
  }

  const result: Costs = { cost, how };
  costCache.set(inputs, result);
  return result;
}

/** Monta o circuito gravado em `how`, de baixo para cima. */
function build(inputs: number, fn: number): CircuitSolution {
  const { how } = costsFor(inputs);
  const gates: Gate[] = [];

  function emit(target: number): CircuitRef {
    const step = how[target];
    if (!step) throw new Error('Circuitos: funcao sem circuito possivel.');
    if (step.op === 'input') return { input: step.index };
    if (step.op === 'NOT') {
      gates.push({ type: 'NOT', in: [emit(step.a)] });
      return { gate: gates.length - 1 };
    }
    const left = emit(step.a);
    const right = emit(step.b);
    gates.push({ type: step.op, in: [left, right] });
    return { gate: gates.length - 1 };
  }

  const out = emit(fn);
  return { gates, out };
}

/** Menor circuito conhecido para a tabela da instancia. */
export function reference(instance: CircuitInstance): CircuitSolution {
  return build(instance.inputs, maskOfTable(instance.table));
}

/** Portas do menor circuito; e o que a eficiencia compara. */
export function referenceCost(instance: CircuitInstance): number {
  const { cost } = costsFor(instance.inputs);
  const value = cost[maskOfTable(instance.table)];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error('Circuitos: tabela sem circuito possivel.');
  }
  return value;
}

function isRef(value: unknown): value is CircuitRef {
  if (typeof value !== 'object' || value === null) return false;
  const ref = value as Record<string, unknown>;
  if ('input' in ref) return Number.isInteger(ref.input);
  if ('gate' in ref) return Number.isInteger(ref.gate);
  return false;
}

/**
 * Referencia valida: entrada que existe, ou porta montada ANTES desta.
 * Olhar so para tras e o que mantem o grafo aciclico sem precisar procurar
 * ciclo: nao ha como uma porta depender de si mesma.
 */
function refOk(ref: CircuitRef, inputs: number, gatesBefore: number): boolean {
  if ('input' in ref) return ref.input >= 0 && ref.input < inputs;
  return ref.gate >= 0 && ref.gate < gatesBefore;
}

/** Forma do circuito: portas conhecidas, aridade certa, ligacoes validas. */
export function isWellFormed(instance: CircuitInstance, solution: CircuitSolution): boolean {
  if (typeof solution !== 'object' || solution === null) return false;
  if (!Array.isArray(solution.gates) || solution.gates.length === 0) return false;
  if (!isRef(solution.out)) return false;

  for (let index = 0; index < solution.gates.length; index += 1) {
    const gate = solution.gates[index] as Gate;
    if (typeof gate !== 'object' || gate === null) return false;
    if (!CIRCUIT.TYPES.includes(gate.type)) return false;
    if (!Array.isArray(gate.in) || gate.in.length !== arityOf(gate.type)) return false;
    for (const ref of gate.in) {
      if (!isRef(ref) || !refOk(ref, instance.inputs, index)) return false;
    }
  }

  return refOk(solution.out, instance.inputs, solution.gates.length);
}

/**
 * Saida do circuito em cada linha da tabela, ou `null` se o circuito esta
 * malformado. A tela usa isto para mostrar ✓/✗ ao vivo.
 */
export function simulate(instance: CircuitInstance, solution: CircuitSolution): boolean[] | null {
  if (!isWellFormed(instance, solution)) return null;

  const outputs: boolean[] = [];
  for (let row = 0; row < rowCount(instance.inputs); row += 1) {
    const values: boolean[] = [];
    const valueOf = (ref: CircuitRef): boolean =>
      'input' in ref ? inputValue(row, ref.input) : (values[ref.gate] as boolean);

    for (const gate of solution.gates) {
      const a = valueOf(gate.in[0] as CircuitRef);
      if (gate.type === 'NOT') {
        values.push(!a);
        continue;
      }
      const b = valueOf(gate.in[1] as CircuitRef);
      values.push(gate.type === 'AND' ? a && b : a || b);
    }

    outputs.push(valueOf(solution.out));
  }
  return outputs;
}

/** Linhas em que o circuito responde diferente do pedido (base 0). */
export function wrongRows(instance: CircuitInstance, solution: CircuitSolution): number[] {
  const outputs = simulate(instance, solution);
  if (!outputs) return [];
  const wrong: number[] = [];
  for (let row = 0; row < outputs.length; row += 1) {
    if (outputs[row] !== instance.table[row]) wrong.push(row);
  }
  return wrong;
}

/**
 * Sorteia uma tabela que exige entre MIN_GATES e TOP_GATES portas.
 * Tabela trivial (a saida e uma entrada, zero porta) nao serve: nao haveria
 * circuito para montar. Se o sorteio nao achar nada na faixa, varre as funcoes
 * em ordem -- deterministico e sempre existe uma.
 */
export function generate(seed: string, difficulty: Difficulty): CircuitInstance {
  const rng = createRng(`circuitos:${seed}:${difficulty}`);
  const key = String(difficulty);
  const inputs = CIRCUIT.INPUTS[key] ?? CIRCUIT.INPUTS['1'] ?? 2;
  const minGates = Math.max(1, CIRCUIT.MIN_GATES[key] ?? 2);
  const slack = CIRCUIT.SLACK[key] ?? 1;
  const top = Math.max(minGates, CIRCUIT.TOP_GATES[key] ?? minGates);

  const { cost } = costsFor(inputs);
  const rows = rowCount(inputs);
  const total = 1 << rows;
  const inBand = (fn: number): boolean => {
    const c = cost[fn];
    if (c === undefined || !Number.isFinite(c)) return false;
    return c >= minGates && c <= top && usesEveryInput(inputs, fn);
  };

  let chosen = -1;
  for (let attempt = 0; attempt < CIRCUIT.GEN_ATTEMPTS && chosen < 0; attempt += 1) {
    let fn = 0;
    for (let row = 0; row < rows; row += 1) {
      if (randInt(rng, 0, 1) === 1) fn |= 1 << row;
    }
    if (inBand(fn)) chosen = fn;
  }
  for (let fn = 0; fn < total && chosen < 0; fn += 1) {
    if (inBand(fn)) chosen = fn;
  }
  if (chosen < 0) throw new Error('Circuitos: nenhuma tabela na faixa de dificuldade.');

  return {
    inputs,
    table: tableOfMask(inputs, chosen),
    maxGates: (cost[chosen] as number) + slack,
  };
}

/**
 * Avalia o circuito. `ok` exige a tabela inteira certa dentro do limite de portas.
 * Eficiencia = portas da referencia / portas usadas (1 = tao enxuto quanto ela).
 */
export function evaluate(instance: CircuitInstance, solution: CircuitSolution): Evaluation {
  if (!isWellFormed(instance, solution)) return { ok: false, efficiency: 0 };
  if (solution.gates.length > instance.maxGates) return { ok: false, efficiency: 0 };
  if (wrongRows(instance, solution).length > 0) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(
    referenceCost(instance) / solution.gates.length,
    SCORING.EFFICIENCY_MAX,
  );
  return { ok: true, efficiency };
}

export const era: EraId = 'logica';

export const circuits: Minigame<CircuitInstance, CircuitSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
