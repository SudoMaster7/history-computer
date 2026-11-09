import { describe, expect, it } from 'vitest';
import {
  arityOf,
  evaluate,
  generate,
  inputValue,
  isWellFormed,
  reference,
  referenceCost,
  rowCount,
  simulate,
  wrongRows,
} from './logic';
import type { CircuitInstance, CircuitSolution } from './logic';
import { CIRCUIT, SCORING } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

/** Tabela de 2 entradas montada a partir da propria regra, sem cravar bits. */
function tableOf(inputs: number, fn: (values: boolean[]) => boolean): boolean[] {
  const table: boolean[] = [];
  for (let row = 0; row < rowCount(inputs); row += 1) {
    const values = Array.from({ length: inputs }, (_, i) => inputValue(row, i));
    table.push(fn(values));
  }
  return table;
}

function instanceOf(
  inputs: number,
  fn: (values: boolean[]) => boolean,
  maxGates: number,
): CircuitInstance {
  return { inputs, table: tableOf(inputs, fn), maxGates };
}

describe('circuitos: convencoes da tabela', () => {
  it('a tabela tem 2^entradas linhas', () => {
    expect(rowCount(2)).toBe(4);
    expect(rowCount(3)).toBe(8);
  });

  it('o bit da linha e o valor da entrada', () => {
    // Linha 2 em binario e 10: entrada 0 desligada, entrada 1 ligada.
    expect([inputValue(2, 0), inputValue(2, 1)]).toEqual([false, true]);
    expect([inputValue(0, 0), inputValue(0, 1)]).toEqual([false, false]);
    expect([inputValue(3, 0), inputValue(3, 1)]).toEqual([true, true]);
  });

  it('NAO recebe um encaixe; E e OU recebem dois', () => {
    expect([arityOf('NOT'), arityOf('AND'), arityOf('OR')]).toEqual([1, 2, 2]);
  });
});

describe('circuitos: simulacao', () => {
  const xor = instanceOf(2, ([a, b]) => a !== b, 5);

  it('simula o circuito linha por linha', () => {
    const solution: CircuitSolution = {
      gates: [{ type: 'AND', in: [{ input: 0 }, { input: 1 }] }],
      out: { gate: 0 },
    };
    const e = instanceOf(2, ([a, b]) => Boolean(a && b), 3);
    expect(simulate(e, solution)).toEqual(e.table);
  });

  it('a saida pode ser uma entrada direta', () => {
    const solution: CircuitSolution = {
      gates: [{ type: 'NOT', in: [{ input: 0 }] }],
      out: { input: 1 },
    };
    const e = instanceOf(2, ([, b]) => Boolean(b), 3);
    expect(simulate(e, solution)).toEqual(e.table);
  });

  it('aponta as linhas erradas, nao so que errou', () => {
    const solution: CircuitSolution = {
      gates: [{ type: 'AND', in: [{ input: 0 }, { input: 1 }] }],
      out: { gate: 0 },
    };
    // E acerta as linhas 00, 01 e 10 do XOR? Nao: erra 01, 10 e 11.
    expect(wrongRows(xor, solution)).toEqual([1, 2, 3]);
  });
});

describe('circuitos: forma do circuito', () => {
  const e = instanceOf(2, ([a, b]) => a !== b, 5);

  it('porta nao pode ligar em si mesma nem em porta posterior', () => {
    expect(
      isWellFormed(e, {
        gates: [{ type: 'NOT', in: [{ gate: 0 }] }],
        out: { gate: 0 },
      }),
    ).toBe(false);
    expect(
      isWellFormed(e, {
        gates: [
          { type: 'NOT', in: [{ gate: 1 }] },
          { type: 'NOT', in: [{ input: 0 }] },
        ],
        out: { gate: 0 },
      }),
    ).toBe(false);
  });

  it('entrada que nao existe no cofre nao vale', () => {
    expect(
      isWellFormed(e, {
        gates: [{ type: 'NOT', in: [{ input: 2 }] }],
        out: { gate: 0 },
      }),
    ).toBe(false);
  });

  it('aridade errada nao vale', () => {
    expect(
      isWellFormed(e, {
        gates: [{ type: 'AND', in: [{ input: 0 }] }],
        out: { gate: 0 },
      }),
    ).toBe(false);
    expect(
      isWellFormed(e, {
        gates: [{ type: 'NOT', in: [{ input: 0 }, { input: 1 }] }],
        out: { gate: 0 },
      }),
    ).toBe(false);
  });

  it('circuito vazio, porta inventada e saida solta nao valem', () => {
    expect(isWellFormed(e, { gates: [], out: { input: 0 } })).toBe(false);
    expect(
      isWellFormed(e, {
        gates: [{ type: 'XOR' as 'AND', in: [{ input: 0 }, { input: 1 }] }],
        out: { gate: 0 },
      }),
    ).toBe(false);
    expect(
      isWellFormed(e, {
        gates: [{ type: 'NOT', in: [{ input: 0 }] }],
        out: { gate: 3 },
      }),
    ).toBe(false);
  });

  it('simulate devolve null em circuito malformado, em vez de inventar saida', () => {
    expect(simulate(e, { gates: [], out: { input: 0 } })).toBeNull();
  });
});

describe('circuitos: solucao de referencia', () => {
  it('resolve E com uma porta', () => {
    const e = instanceOf(2, ([a, b]) => Boolean(a && b), 4);
    expect(referenceCost(e)).toBe(1);
    expect(reference(e).gates).toHaveLength(1);
  });

  it('resolve NAO E com duas portas', () => {
    const e = instanceOf(2, ([a, b]) => !(a && b), 4);
    expect(referenceCost(e)).toBe(2);
  });

  it('resolve XOR com o circuito minimo em NAO/E/OU', () => {
    const e = instanceOf(2, ([a, b]) => a !== b, 8);
    // (A OU B) E NAO (A E B): um OU, um E, uma negacao e outro E.
    expect(referenceCost(e)).toBe(4);
    const solution = reference(e);
    expect(solution.gates).toHaveLength(4);
    expect(simulate(e, solution)).toEqual(e.table);
  });

  it('a referencia resolve a tabela e cabe no limite, em todas as dificuldades', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 40; i += 1) {
        const instance = generate(`ref-${i}`, difficulty);
        const solution = reference(instance);
        expect({ difficulty, i, saida: simulate(instance, solution) }).toEqual({
          difficulty,
          i,
          saida: instance.table,
        });
        expect({
          difficulty,
          i,
          cabe: solution.gates.length <= instance.maxGates,
        }).toEqual({ difficulty, i, cabe: true });
      }
    }
  });

  it('a referencia vence com eficiencia exatamente 1 em centenas de seeds', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 80; i += 1) {
        const instance = generate(`eff-${i}`, difficulty);
        const result = evaluate(instance, reference(instance));
        expect({ difficulty, i, ...result }).toEqual({
          difficulty,
          i,
          ok: true,
          efficiency: 1,
        });
      }
    }
  });
});

describe('circuitos: geracao', () => {
  it('a mesma seed produz a mesma tabela', () => {
    expect(generate('logica-A-v1', 1)).toEqual(generate('logica-A-v1', 1));
  });

  it('seeds diferentes produzem tabelas diferentes', () => {
    const a = generate('logica-A-v1', 1);
    const b = generate('logica-B-v1', 1);
    expect(a.table).not.toEqual(b.table);
  });

  it('cada dificuldade tem o numero de entradas combinado', () => {
    for (const difficulty of DIFFICULTIES) {
      const instance = generate('entradas', difficulty);
      expect({ difficulty, inputs: instance.inputs }).toEqual({
        difficulty,
        inputs: CIRCUIT.INPUTS[String(difficulty)],
      });
      expect(instance.table).toHaveLength(rowCount(instance.inputs));
    }
  });

  it('nunca sorteia tabela trivial: sempre ha pelo menos uma porta para montar', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 60; i += 1) {
        const instance = generate(`trivial-${i}`, difficulty);
        const minimo = CIRCUIT.MIN_GATES[String(difficulty)] ?? 2;
        expect({ difficulty, i, portas: referenceCost(instance) >= minimo }).toEqual({
          difficulty,
          i,
          portas: true,
        });
      }
    }
  });

  it('toda chave do cofre muda a resposta em alguma linha', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 40; i += 1) {
        const instance = generate(`chaves-${i}`, difficulty);
        for (let index = 0; index < instance.inputs; index += 1) {
          const importa = instance.table.some((valor, row) => {
            if (inputValue(row, index)) return false;
            return valor !== instance.table[row | (1 << index)];
          });
          expect({ difficulty, i, index, importa }).toEqual({
            difficulty,
            i,
            index,
            importa: true,
          });
        }
      }
    }
  });

  it('a dificuldade 3 nao da folga: so o circuito minimo fecha', () => {
    const instance = generate('sem-folga', 3);
    expect(instance.maxGates).toBe(referenceCost(instance));
  });

  it('a missao A e a versao micro tem folga sobre a referencia', () => {
    for (const difficulty of ['micro', 1] as Difficulty[]) {
      const instance = generate('com-folga', difficulty);
      expect({
        difficulty,
        folga: instance.maxGates - referenceCost(instance),
      }).toEqual({ difficulty, folga: CIRCUIT.SLACK[String(difficulty)] });
    }
  });

  it('as missoes de logica declaradas em missions.json sao gerareis', () => {
    const minhas = MISSIONS.filter((m) => m.era === 'logica');
    expect(minhas).toHaveLength(2);
    for (const mission of minhas) {
      const instance = generate(mission.seed, mission.difficulty);
      expect({ id: mission.id, ok: evaluate(instance, reference(instance)).ok }).toEqual({
        id: mission.id,
        ok: true,
      });
    }
  });
});

describe('circuitos: avaliacao', () => {
  const e = instanceOf(2, ([a, b]) => a !== b, 5);

  it('tabela certa dentro do limite conclui a missao', () => {
    expect(evaluate(e, reference(e)).ok).toBe(true);
  });

  it('circuito malformado reprova sem pontuar', () => {
    expect(evaluate(e, { gates: [], out: { input: 0 } })).toEqual({ ok: false, efficiency: 0 });
  });

  it('passar do limite de portas reprova mesmo com a tabela certa', () => {
    const apertado: CircuitInstance = { ...e, maxGates: 3 };
    const solution = reference(e);
    expect(solution.gates.length).toBeGreaterThan(apertado.maxGates);
    expect(evaluate(apertado, solution)).toEqual({ ok: false, efficiency: 0 });
  });

  it('errar uma linha da tabela reprova', () => {
    const solution: CircuitSolution = {
      gates: [{ type: 'OR', in: [{ input: 0 }, { input: 1 }] }],
      out: { gate: 0 },
    };
    expect(evaluate(e, solution)).toEqual({ ok: false, efficiency: 0 });
  });

  it('porta sobrando derruba a eficiencia, mas ainda conclui', () => {
    const folgado: CircuitInstance = { ...e, maxGates: 6 };
    const base = reference(e);
    // Duas negacoes em sequencia no fim: mesma tabela, duas portas a mais.
    const inflado: CircuitSolution = {
      gates: [
        ...base.gates,
        { type: 'NOT', in: [base.out] },
        { type: 'NOT', in: [{ gate: base.gates.length }] },
      ],
      out: { gate: base.gates.length + 1 },
    };
    const result = evaluate(folgado, inflado);
    expect(result.ok).toBe(true);
    expect(result.efficiency).toBeCloseTo(4 / 6, 5);
    expect(result.efficiency).toBeLessThan(SCORING.STARS_2_EFFICIENCY);
  });

  it('a eficiencia nunca passa do teto, nem com circuito mais curto que a referencia', () => {
    // Teto: mesmo uma solucao muito mais curta que a referencia para na EFFICIENCY_MAX.
    const ou = instanceOf(2, ([a, b]) => Boolean(a || b), 9);
    const solution: CircuitSolution = {
      gates: [{ type: 'OR', in: [{ input: 0 }, { input: 1 }] }],
      out: { gate: 0 },
    };
    const result = evaluate(ou, solution);
    expect(result.efficiency).toBeLessThanOrEqual(SCORING.EFFICIENCY_MAX);
  });
});
