import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { MODEL } from '@/core/constants';
import { createRng, randInt, shuffle } from '@/core/rng';
import { mistakeEfficiency } from '@/core/scoring';
import { byDifficulty } from '../shared/logic';

/**
 * Treinar o Detector (Era 6, poder Aprender).
 *
 * Ninguem conta a regra ao jogador. Ele ve alguns programas ja carimbados como
 * "virus" ou "seguro", repara no que os virus tem em comum (a cor, a forma ou
 * a antena) e entao classifica programas novos. E o que uma IA faz: aprende a
 * regra olhando exemplos, em vez de receber a regra escrita.
 *
 * Um programa e uma lista de caracteristicas: [cor, forma, antena].
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export type ModelItem = number[];

export interface ModelRule {
  /** Qual caracteristica decide (indice em [cor, forma, antena]). */
  attr: number;
  /** O valor dela que faz do programa um virus. */
  value: number;
}

export interface ModelExample {
  item: ModelItem;
  virus: boolean;
}

export interface ModelRound {
  /** A regra escondida. A tela so a mostra depois da rodada. */
  rule: ModelRule;
  /** Exemplos ja carimbados. */
  train: ModelExample[];
  /** Programas novos, para o jogador classificar. */
  test: ModelItem[];
}

export interface ModelInstance {
  rounds: ModelRound[];
}

/** Por rodada, a resposta para cada programa novo: `true` = virus. */
export type ModelSolution = boolean[][];

export function isVirus(rule: ModelRule, item: ModelItem): boolean {
  return item[rule.attr] === rule.value;
}

/** Todos os programas possiveis variando so as `attrs` primeiras caracteristicas. */
function allItems(attrs: number): ModelItem[] {
  let items: ModelItem[] = [[]];
  MODEL.VALUES.forEach((count, attr) => {
    const values = attr < attrs ? Array.from({ length: count }, (_, v) => v) : [0];
    items = items.flatMap((item) => values.map((value) => [...item, value]));
  });
  return items;
}

/** Todas as regras de uma caracteristica so que o jogador poderia imaginar. */
function candidateRules(attrs: number): ModelRule[] {
  const rules: ModelRule[] = [];
  for (let attr = 0; attr < attrs; attr += 1) {
    for (let value = 0; value < (MODEL.VALUES[attr] as number); value += 1) {
      rules.push({ attr, value });
    }
  }
  return rules;
}

/** As regras que batem com todos os exemplos carimbados. */
export function consistentRules(train: readonly ModelExample[], attrs: number): ModelRule[] {
  return candidateRules(attrs).filter((rule) =>
    train.every((example) => isVirus(rule, example.item) === example.virus),
  );
}

/** Rodada de reserva: "todo programa da primeira cor e virus", com exemplos fixos. */
function fallbackRound(): ModelRound {
  return {
    rule: { attr: 0, value: 0 },
    train: [
      { item: [0, 0, 0], virus: true },
      { item: [0, 1, 0], virus: true },
      { item: [1, 0, 0], virus: false },
      { item: [2, 1, 0], virus: false },
    ],
    test: [
      [0, 2, 0],
      [1, 1, 0],
      [2, 0, 0],
    ],
  };
}

function drawRound(
  rng: () => number,
  attrs: number,
  trainSize: number,
  testSize: number,
  rule: ModelRule,
): ModelRound | null {
  const items = shuffle(rng, allItems(attrs));
  const viruses = items.filter((item) => isVirus(rule, item));
  const safes = items.filter((item) => !isVirus(rule, item));

  // Pelo menos dois de cada lado: com um exemplo so nao da para ver o padrao.
  const virusCount = randInt(rng, 2, trainSize - 2);
  const safeCount = trainSize - virusCount;
  if (viruses.length < virusCount + 1 || safes.length < safeCount + 1) return null;

  const train: ModelExample[] = shuffle(rng, [
    ...viruses.slice(0, virusCount).map((item) => ({ item, virus: true })),
    ...safes.slice(0, safeCount).map((item) => ({ item, virus: false })),
  ]);

  // So vale se os exemplos apontam para UMA regra: senao a resposta seria chute.
  if (consistentRules(train, attrs).length !== 1) return null;

  // Os programas novos nunca repetem um exemplo, e tem dos dois tipos.
  const freshViruses = viruses.slice(virusCount);
  const freshSafes = safes.slice(safeCount);
  const rest = shuffle(rng, [...freshViruses.slice(1), ...freshSafes.slice(1)]);
  const test = shuffle(rng, [
    freshViruses[0] as ModelItem,
    freshSafes[0] as ModelItem,
    ...rest.slice(0, testSize - 2),
  ]);
  if (test.length < testSize) return null;

  return { rule, train, test };
}

export function generate(seed: string, difficulty: Difficulty): ModelInstance {
  const rng = createRng(`detector:${seed}:${difficulty}`);
  const total = byDifficulty(MODEL.ROUNDS, difficulty, 2);
  const attrs = byDifficulty(MODEL.ATTRS, difficulty, 2);
  const trainSize = byDifficulty(MODEL.TRAIN, difficulty, 4);
  const testSize = byDifficulty(MODEL.TEST, difficulty, 3);

  // Cada rodada tem uma regra diferente, senao a segunda sai de graca.
  const rules = shuffle(rng, candidateRules(attrs));

  const rounds: ModelRound[] = [];
  for (let index = 0; index < total; index += 1) {
    const rule = rules[index % rules.length] as ModelRule;
    let chosen: ModelRound | null = null;
    for (let attempt = 0; attempt < MODEL.GEN_ATTEMPTS && !chosen; attempt += 1) {
      chosen = drawRound(rng, attrs, trainSize, testSize, rule);
    }
    rounds.push(chosen ?? fallbackRound());
  }
  return { rounds };
}

export function reference(instance: ModelInstance): ModelSolution {
  return instance.rounds.map((round) => round.test.map((item) => isVirus(round.rule, item)));
}

/** Quantos acertos o detector precisa, de `total` programas, para ser aprovado. */
export function neededToPass(total: number): number {
  return Math.ceil(total * MODEL.PASS_RATIO);
}

/**
 * Aqui a resposta e sim ou nao, entao nao ha "tentar de novo" dentro da rodada:
 * `ok` exige que o detector acerte a maioria dos programas novos, e cada erro
 * custa eficiencia.
 */
export function evaluate(instance: ModelInstance, solution: ModelSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.rounds.length) {
    return { ok: false, efficiency: 0 };
  }
  let total = 0;
  let mistakes = 0;
  for (let i = 0; i < instance.rounds.length; i += 1) {
    const round = instance.rounds[i] as ModelRound;
    const answers = solution[i];
    if (!Array.isArray(answers) || answers.length !== round.test.length) {
      return { ok: false, efficiency: 0 };
    }
    if (!answers.every((answer) => typeof answer === 'boolean')) {
      return { ok: false, efficiency: 0 };
    }
    round.test.forEach((item, j) => {
      total += 1;
      if (answers[j] !== isVirus(round.rule, item)) mistakes += 1;
    });
  }
  if (total - mistakes < neededToPass(total)) return { ok: false, efficiency: 0 };
  return { ok: true, efficiency: mistakeEfficiency(mistakes) };
}

export const era: EraId = 'ia';

export const model: Minigame<ModelInstance, ModelSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
