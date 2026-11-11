import { describe, expect, it } from 'vitest';
import {
  classify,
  evaluate,
  fits,
  generate,
  isWellFormed,
  missedExamples,
  reference,
  referenceCost,
} from './logic';
import type { ModelExample, ModelInstance } from './logic';
import { MODEL, SCORING } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

function example(signals: boolean[], attack: boolean): ModelExample {
  return { signals, attack };
}

/**
 * Conjunto escrito a mao: o ataque e "os sinais 0 e 1 ligados". O sinal 2 e
 * armadilha -- no treino ele acompanha o rotulo, no teste ele faz o contrario.
 */
const combos: [boolean, boolean][] = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
];

function conjunto(trapFollowsLabel: boolean): ModelExample[] {
  return combos.map(([a, b]) => {
    const attack = a && b;
    return example([a, b, trapFollowsLabel ? attack : !attack], attack);
  });
}

const armadilha: ModelInstance = {
  signals: 3,
  train: conjunto(true),
  test: conjunto(false),
  maxSignals: 3,
};

describe('treinar o detector: como o detector decide', () => {
  it('acusa quando o numero de sinais observados ligados chega ao gatilho', () => {
    const solution = { watched: [0, 1], trigger: 2 };
    expect(classify(solution, example([true, true, false], true))).toBe(true);
    expect(classify(solution, example([true, false, false], false))).toBe(false);
  });

  it('gatilho 1 e "pelo menos um"; gatilho igual ao tamanho e "todos"', () => {
    const exemplo = example([true, false, false], false);
    expect(classify({ watched: [0, 1], trigger: 1 }, exemplo)).toBe(true);
    expect(classify({ watched: [0, 1], trigger: 2 }, exemplo)).toBe(false);
  });

  it('sinal nao observado nao influencia nada', () => {
    const solution = { watched: [0], trigger: 1 };
    expect(classify(solution, example([false, true, true], false))).toBe(false);
  });

  it('aponta quais exemplos o detector errou', () => {
    const solution = { watched: [0], trigger: 1 };
    // Observar so o sinal 0 erra o exemplo [true, false] (acusa sem ataque).
    expect(missedExamples(solution, armadilha.train)).toEqual([2]);
    expect(fits({ watched: [0, 1], trigger: 2 }, armadilha.train)).toBe(true);
  });
});

describe('treinar o detector: forma da solucao', () => {
  it('exige ao menos um sinal e gatilho dentro do tamanho', () => {
    expect(isWellFormed(armadilha, { watched: [0, 1], trigger: 2 })).toBe(true);
    expect(isWellFormed(armadilha, { watched: [], trigger: 1 })).toBe(false);
    expect(isWellFormed(armadilha, { watched: [0], trigger: 2 })).toBe(false);
    expect(isWellFormed(armadilha, { watched: [0], trigger: 0 })).toBe(false);
  });

  it('recusa sinal repetido ou que nao existe', () => {
    expect(isWellFormed(armadilha, { watched: [0, 0], trigger: 1 })).toBe(false);
    expect(isWellFormed(armadilha, { watched: [9], trigger: 1 })).toBe(false);
  });
});

describe('treinar o detector: a armadilha do sobreajuste', () => {
  it('o sinal-armadilha acerta o treino inteiro sozinho', () => {
    expect(fits({ watched: [2], trigger: 1 }, armadilha.train)).toBe(true);
  });

  it('e reprova nos exemplos guardados', () => {
    expect(fits({ watched: [2], trigger: 1 }, armadilha.test)).toBe(false);
    expect(evaluate(armadilha, { watched: [2], trigger: 1 })).toEqual({
      ok: false,
      efficiency: 0,
    });
  });

  it('a regra de verdade acerta treino e exemplos guardados', () => {
    expect(evaluate(armadilha, { watched: [0, 1], trigger: 2 }).ok).toBe(true);
  });
});

describe('treinar o detector: referencia', () => {
  it('acha o menor detector que acerta treino e teste', () => {
    expect(reference(armadilha)).toEqual({ watched: [0, 1], trigger: 2 });
    expect(referenceCost(armadilha)).toBe(2);
  });

  it('a referencia sempre acerta todos os exemplos', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 15; i += 1) {
        const instance = generate(`ref-${i}`, difficulty);
        const solution = reference(instance);
        expect({ difficulty, i, treino: fits(solution, instance.train) }).toEqual({
          difficulty,
          i,
          treino: true,
        });
        expect({ difficulty, i, teste: fits(solution, instance.test) }).toEqual({
          difficulty,
          i,
          teste: true,
        });
      }
    }
  });

  it('nenhum detector menor acerta tudo', () => {
    for (let i = 0; i < 10; i += 1) {
      const instance = generate(`minimo-${i}`, 2);
      const minimo = referenceCost(instance);
      const todos = instance.train.concat(instance.test);
      const combinar = (inicio: number, atual: number[]): void => {
        if (atual.length === minimo - 1) {
          for (let trigger = 1; trigger <= atual.length; trigger += 1) {
            expect(fits({ watched: atual, trigger }, todos)).toBe(false);
          }
          return;
        }
        for (let index = inicio; index < instance.signals; index += 1) {
          combinar(index + 1, [...atual, index]);
        }
      };
      combinar(0, []);
    }
  });
});

describe('treinar o detector: geracao', () => {
  it('a mesma seed produz sempre os mesmos exemplos', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('igual', difficulty)).toEqual(generate('igual', difficulty));
    }
  });

  it('seeds diferentes produzem exemplos diferentes', () => {
    expect(generate('seed-a', 2)).not.toEqual(generate('seed-b', 2));
  });

  it('o conjunto tem o tamanho da dificuldade', () => {
    for (const difficulty of DIFFICULTIES) {
      const key = String(difficulty);
      const instance = generate('tamanho', difficulty);
      expect(instance.signals).toBe(MODEL.SIGNALS[key]);
      expect(instance.train).toHaveLength(MODEL.TRAIN[key] as number);
      expect(instance.test).toHaveLength(MODEL.TEST[key] as number);
    }
  });

  it('treino e teste sempre tem exemplo de ataque e exemplo normal', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`classes-${i}`, difficulty);
        for (const lista of [instance.train, instance.test]) {
          expect(lista.some((e) => e.attack)).toBe(true);
          expect(lista.some((e) => !e.attack)).toBe(true);
        }
      }
    }
  });

  it('nunca basta observar um sinal so', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`dois-${i}`, difficulty);
        expect(referenceCost(instance)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('o menor detector sempre cabe no limite de sinais', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`cabe-${i}`, difficulty);
        expect(referenceCost(instance)).toBeLessThanOrEqual(instance.maxSignals);
      }
    }
  });
});

describe('treinar o detector: avaliacao', () => {
  it('a referencia fecha com eficiencia 1', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 15; i += 1) {
        const instance = generate(`eval-${i}`, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('errar o treino reprova', () => {
    expect(evaluate(armadilha, { watched: [0], trigger: 1 })).toEqual({
      ok: false,
      efficiency: 0,
    });
  });

  it('passar do limite de sinais reprova', () => {
    const apertado: ModelInstance = { ...armadilha, maxSignals: 1 };
    expect(evaluate(apertado, { watched: [0, 1], trigger: 2 })).toEqual({
      ok: false,
      efficiency: 0,
    });
  });

  it('observar sinal a mais, com folga, passa com eficiencia menor', () => {
    const instance = generate('folga', 1);
    const minimo = reference(instance);
    if (minimo.watched.length >= instance.maxSignals) return;
    const extra = Array.from({ length: instance.signals }, (_, i) => i).find(
      (i) => !minimo.watched.includes(i),
    );
    const candidato = { watched: [...minimo.watched, extra as number], trigger: minimo.trigger };
    const resultado = evaluate(instance, candidato);
    if (resultado.ok) expect(resultado.efficiency).toBeLessThan(1);
  });

  it('a eficiencia nunca passa do teto', () => {
    expect(evaluate(armadilha, reference(armadilha)).efficiency).toBeLessThanOrEqual(
      SCORING.EFFICIENCY_MAX,
    );
  });
});

describe('treinar o detector: as missoes da era 6 sao jogaveis', () => {
  const missoes = MISSIONS.filter((m) => m.era === 'ia');

  it('ha duas missoes declaradas', () => {
    expect(missoes).toHaveLength(2);
  });

  it.each(missoes.map((m) => m.id))('a missao %s fecha com a referencia', (id) => {
    const missao = missoes.find((m) => m.id === id)!;
    const instance = generate(missao.seed, missao.difficulty);
    expect(evaluate(instance, reference(instance)).ok).toBe(true);
  });
});
