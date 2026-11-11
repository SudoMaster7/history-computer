import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { MODEL, SCORING } from '@/core/constants';
import { createRng, randInt, shuffle } from '@/core/rng';

/**
 * Treinar o Detector (Era 6, poder Aprender).
 *
 * Ninguem entrega ao jogador a regra do ataque. Ele recebe exemplos rotulados e
 * tem de descobrir em quais sinais o detector deve prestar atencao, e quantos
 * sinais ligados bastam para acusar.
 *
 * Parte dos exemplos fica guardada (o teste) e so e conferida no envio. Isso e
 * de proposito: um detector que acerta o treino e erra o resto nao aprendeu, so
 * decorou -- e e o erro mais comum da area, o sobreajuste.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export interface ModelExample {
  /** Quais sinais estavam ligados neste episodio. */
  signals: boolean[];
  /** Era ataque de verdade? */
  attack: boolean;
}

export interface ModelInstance {
  /** Quantos sinais o detector pode observar. */
  signals: number;
  /** Exemplos visiveis. */
  train: ModelExample[];
  /** Exemplos guardados, conferidos so no envio. */
  test: ModelExample[];
  /** Sinais que o detector aguenta observar. Na missao B so cabe o minimo. */
  maxSignals: number;
}

export interface ModelSolution {
  /** Indices dos sinais observados. */
  watched: number[];
  /** Sinais ligados necessarios para acusar ataque. */
  trigger: number;
}

/** Forma da solucao: sinais que existem, sem repetir, e gatilho possivel. */
export function isWellFormed(instance: ModelInstance, solution: ModelSolution): boolean {
  if (typeof solution !== 'object' || solution === null) return false;
  const { watched, trigger } = solution;
  if (!Array.isArray(watched) || watched.length === 0) return false;
  if (!watched.every((i) => Number.isInteger(i) && i >= 0 && i < instance.signals)) return false;
  if (new Set(watched).size !== watched.length) return false;
  if (!Number.isInteger(trigger)) return false;
  return trigger >= 1 && trigger <= watched.length;
}

/** O detector acusa ataque neste exemplo? */
export function classify(solution: ModelSolution, example: ModelExample): boolean {
  let on = 0;
  for (const index of solution.watched) {
    if (example.signals[index]) on += 1;
  }
  return on >= solution.trigger;
}

/** Exemplos em que o detector erra (base 0), para a tela mostrar onde. */
export function missedExamples(
  solution: ModelSolution,
  examples: readonly ModelExample[],
): number[] {
  const wrong: number[] = [];
  examples.forEach((example, index) => {
    if (classify(solution, example) !== example.attack) wrong.push(index);
  });
  return wrong;
}

/** Acerta todos os exemplos desta lista? */
export function fits(solution: ModelSolution, examples: readonly ModelExample[]): boolean {
  return missedExamples(solution, examples).length === 0;
}

/**
 * Menor detector que acerta treino E teste, procurado por tamanho crescente.
 * Observar menos sinais, com o mesmo resultado, e sempre melhor: sinal a mais e
 * chance a mais de o detector se apoiar numa coincidencia.
 */
export function reference(instance: ModelInstance): ModelSolution {
  const todos = instance.train.concat(instance.test);

  for (let size = 1; size <= instance.signals; size += 1) {
    const found = searchBySize(instance, todos, size);
    if (found) return found;
  }
  throw new Error('Treinar o Detector: nenhum detector acerta os exemplos.');
}

/** Primeiro detector de exatamente `size` sinais que acerta `examples`. */
function searchBySize(
  instance: ModelInstance,
  examples: readonly ModelExample[],
  size: number,
): ModelSolution | null {
  const combine = (start: number, chosen: number[]): ModelSolution | null => {
    if (chosen.length === size) {
      for (let trigger = 1; trigger <= size; trigger += 1) {
        const candidate: ModelSolution = { watched: chosen, trigger };
        if (fits(candidate, examples)) return candidate;
      }
      return null;
    }
    for (let index = start; index < instance.signals; index += 1) {
      const found = combine(index + 1, [...chosen, index]);
      if (found) return found;
    }
    return null;
  };
  return combine(0, []);
}

/** Quantos sinais o menor detector observa; e o que a eficiencia compara. */
export function referenceCost(instance: ModelInstance): number {
  return reference(instance).watched.length;
}

/**
 * Sorteia os exemplos a partir de uma regra escondida: o ataque acontece quando
 * ao menos `hiddenTrigger` dos sinais causadores estao ligados.
 *
 * Um dos sinais sobrantes vira armadilha: no treino ele coincide exatamente com
 * o rotulo, e nos exemplos guardados ele faz o contrario. Quem escolher o
 * atalho acerta o treino inteiro e reprova no envio -- que e a licao da era.
 */
export function generate(seed: string, difficulty: Difficulty): ModelInstance {
  const rng = createRng(`detector:${seed}:${difficulty}`);
  const key = String(difficulty);
  const signals = Math.max(3, MODEL.SIGNALS[key] ?? MODEL.SIGNALS['1'] ?? 4);
  const real = Math.min(signals - 1, Math.max(2, MODEL.REAL[key] ?? 2));
  const trainSize = Math.max(4, MODEL.TRAIN[key] ?? 6);
  const testSize = Math.max(2, MODEL.TEST[key] ?? 3);
  const slack = MODEL.SLACK[key] ?? 0;

  const build = (): ModelInstance | null => {
    const order = shuffle(
      rng,
      Array.from({ length: signals }, (_, i) => i),
    );
    const causes = order.slice(0, real);
    const trap = order[real] as number;
    const hiddenTrigger = randInt(rng, Math.max(1, real - 1), real);

    const label = (values: boolean[]): boolean =>
      causes.filter((index) => values[index]).length >= hiddenTrigger;

    const draw = (count: number, trapFollowsLabel: boolean): ModelExample[] =>
      Array.from({ length: count }, () => {
        const values = Array.from({ length: signals }, () => randInt(rng, 0, 1) === 1);
        const attack = label(values);
        values[trap] = trapFollowsLabel ? attack : !attack;
        return { signals: values, attack };
      });

    const train = draw(trainSize, true);
    const test = draw(testSize, false);

    // Exemplo so de uma classe nao ensina nada: o detector acerta sem pensar.
    const bothClasses = (examples: ModelExample[]): boolean =>
      examples.some((e) => e.attack) && examples.some((e) => !e.attack);
    if (!bothClasses(train) || !bothClasses(test)) return null;

    const draft: ModelInstance = { signals, train, test, maxSignals: signals };
    // A regra escondida tem de continuar sendo uma resposta valida.
    if (!fits({ watched: causes, trigger: hiddenTrigger }, train.concat(test))) return null;
    // Detector de um sinal so tornaria a fase trivial.
    if (referenceCost(draft) < 2) return null;
    return draft;
  };

  let instance: ModelInstance | null = null;
  for (let attempt = 0; attempt < MODEL.GEN_ATTEMPTS && !instance; attempt += 1) {
    instance = build();
  }

  if (!instance) {
    /*
     * Reserva deterministica: o ataque e "os dois primeiros sinais ligados", e o
     * ultimo sinal e a armadilha. As quatro combinacoes dos dois sinais estao no
     * treino, entao a regra e achavel.
     */
    const combos: [boolean, boolean][] = [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    const make = (pair: [boolean, boolean], trapFollowsLabel: boolean): ModelExample => {
      const attack = pair[0] && pair[1];
      const values = Array.from({ length: signals }, (_, i) =>
        i < 2 ? (pair[i] as boolean) : false,
      );
      values[signals - 1] = trapFollowsLabel ? attack : !attack;
      return { signals: values, attack };
    };
    instance = {
      signals,
      train: combos.map((pair) => make(pair, true)),
      test: combos.map((pair) => make(pair, false)),
      maxSignals: signals,
    };
  }

  return { ...instance, maxSignals: referenceCost(instance) + slack };
}

/**
 * Avalia o detector. `ok` exige acertar treino E exemplos guardados dentro do
 * limite de sinais observados.
 * Eficiencia = sinais do menor detector / sinais observados (1 = o mais enxuto).
 */
export function evaluate(instance: ModelInstance, solution: ModelSolution): Evaluation {
  if (!isWellFormed(instance, solution)) return { ok: false, efficiency: 0 };
  if (solution.watched.length > instance.maxSignals) return { ok: false, efficiency: 0 };
  if (!fits(solution, instance.train)) return { ok: false, efficiency: 0 };
  if (!fits(solution, instance.test)) return { ok: false, efficiency: 0 };

  const efficiency = Math.min(
    referenceCost(instance) / solution.watched.length,
    SCORING.EFFICIENCY_MAX,
  );
  return { ok: true, efficiency };
}

export const era: EraId = 'ia';

export const detector: Minigame<ModelInstance, ModelSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
