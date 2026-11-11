import { describe, expect, it } from 'vitest';
import {
  evaluate,
  fixedCost,
  generate,
  isPrefixFree,
  isWellFormed,
  prefixClashes,
  reference,
  referenceCost,
  solutionCost,
} from './logic';
import type { BitsInstance, BitsSolution } from './logic';
import { BITS, SCORING } from '@/core/constants';
import { MISSIONS } from '@/data/missions';
import type { Difficulty } from '@/core/types';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];

function instanceOf(weights: Record<string, number>, maxBits: number): BitsInstance {
  return {
    symbols: Object.entries(weights).map(([id, weight]) => ({ id, weight })),
    maxBits,
  };
}

/** Codigo de tamanho fixo, a solucao ingenua: A=00, B=01, C=10, D=11. */
function fixedCodes(instance: BitsInstance): BitsSolution {
  const bits = Math.max(1, Math.ceil(Math.log2(instance.symbols.length)));
  const codes: BitsSolution = {};
  instance.symbols.forEach((symbol, index) => {
    codes[symbol.id] = index.toString(2).padStart(bits, '0');
  });
  return codes;
}

describe('mesa de bits: codigo livre de prefixo', () => {
  it('aceita codigos em que nenhum e comeco de outro', () => {
    expect(isPrefixFree(['0', '10', '11'])).toBe(true);
  });

  it('recusa codigo que e comeco de outro', () => {
    expect(isPrefixFree(['0', '01'])).toBe(false);
    expect(isPrefixFree(['1', '10', '11'])).toBe(false);
  });

  it('aponta o par em conflito, para a tela mostrar onde', () => {
    expect(prefixClashes({ A: '0', B: '01' })).toEqual([['A', 'B']]);
    expect(prefixClashes({ A: '0', B: '10' })).toEqual([]);
  });

  it('dois simbolos com o mesmo codigo tambem sao conflito', () => {
    expect(isPrefixFree(['0', '0'])).toBe(false);
    expect(prefixClashes({ A: '0', B: '0' })).toHaveLength(2);
  });
});

describe('mesa de bits: custo da fita', () => {
  const instance = instanceOf({ A: 5, B: 2, C: 1 }, 99);

  it('cada simbolo paga o seu codigo uma vez por aparicao', () => {
    // 5x1 + 2x2 + 1x2 = 11
    expect(solutionCost(instance, { A: '0', B: '10', C: '11' })).toBe(11);
  });

  it('codigo invalido torna o custo infinito, nao zero', () => {
    expect(solutionCost(instance, { A: '', B: '10', C: '11' })).toBe(Number.POSITIVE_INFINITY);
    expect(solutionCost(instance, { A: '2', B: '10', C: '11' })).toBe(Number.POSITIVE_INFINITY);
  });

  it('o codigo de tamanho fixo cobra o mesmo numero de bits de todo mundo', () => {
    // 3 simbolos cabem em 2 bits: (5 + 2 + 1) x 2 = 16
    expect(fixedCost(instance)).toBe(16);
  });
});

describe('mesa de bits: forma da solucao', () => {
  const instance = instanceOf({ A: 3, B: 1 }, 99);

  it('exige um codigo para cada simbolo, e nada sobrando', () => {
    expect(isWellFormed(instance, { A: '0', B: '1' })).toBe(true);
    expect(isWellFormed(instance, { A: '0' })).toBe(false);
    expect(isWellFormed(instance, { A: '0', B: '1', C: '10' })).toBe(false);
  });

  it('recusa codigo vazio, com outro caractere ou longo demais', () => {
    expect(isWellFormed(instance, { A: '', B: '1' })).toBe(false);
    expect(isWellFormed(instance, { A: '0x', B: '1' })).toBe(false);
    expect(isWellFormed(instance, { A: '0'.repeat(BITS.MAX_CODE_LEN + 1), B: '1' })).toBe(false);
  });

  it('recusa o que nem e objeto de codigos', () => {
    expect(isWellFormed(instance, [] as unknown as BitsSolution)).toBe(false);
    expect(isWellFormed(instance, null as unknown as BitsSolution)).toBe(false);
  });
});

describe('mesa de bits: referencia de Huffman', () => {
  it('da o codigo mais curto ao simbolo mais frequente', () => {
    const instance = instanceOf({ A: 8, B: 2, C: 1 }, 99);
    const codes = reference(instance);
    expect(codes['A']!.length).toBeLessThan(codes['B']!.length);
    expect(codes['A']!.length).toBeLessThan(codes['C']!.length);
  });

  it('a referencia e sempre livre de prefixo', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`ref-${i}`, difficulty);
        const codes = reference(instance);
        expect(isPrefixFree(Object.values(codes))).toBe(true);
      }
    }
  });

  it('nenhum codigo da referencia passa do limite de comprimento', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`len-${i}`, difficulty);
        for (const code of Object.values(reference(instance))) {
          expect(code.length).toBeLessThanOrEqual(BITS.MAX_CODE_LEN);
        }
      }
    }
  });

  it('nenhum codigo livre de prefixo gasta menos bits que a referencia', () => {
    // Forca bruta sobre todos os codigos curtos de 3 simbolos.
    const instance = instanceOf({ A: 7, B: 3, C: 2 }, 99);
    const optimal = referenceCost(instance);
    const candidates: string[] = [];
    for (let len = 1; len <= 4; len += 1) {
      for (let value = 0; value < 1 << len; value += 1) {
        candidates.push(value.toString(2).padStart(len, '0'));
      }
    }
    for (const a of candidates) {
      for (const b of candidates) {
        for (const c of candidates) {
          if (!isPrefixFree([a, b, c])) continue;
          expect(solutionCost(instance, { A: a, B: b, C: c })).toBeGreaterThanOrEqual(optimal);
        }
      }
    }
  });

  it('com um simbolo so, o codigo e um bit', () => {
    expect(reference(instanceOf({ A: 4 }, 99))).toEqual({ A: '0' });
  });
});

describe('mesa de bits: geracao', () => {
  it('a mesma seed produz sempre a mesma mensagem', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('igual', difficulty)).toEqual(generate('igual', difficulty));
    }
  });

  it('seeds diferentes produzem mensagens diferentes', () => {
    const a = generate('seed-a', 2);
    const b = generate('seed-b', 2);
    expect(a).not.toEqual(b);
  });

  it('a mensagem tem o numero de simbolos da dificuldade', () => {
    for (const difficulty of DIFFICULTIES) {
      const esperado = BITS.COUNT[String(difficulty)];
      expect(generate('contagem', difficulty).symbols).toHaveLength(esperado!);
    }
  });

  it('o codigo otimo sempre sai menor que o de tamanho fixo', () => {
    // Senao nao ha nada a aprender: qualquer codigo serviria.
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`vale-${i}`, difficulty);
        expect({
          difficulty,
          i,
          otimo: referenceCost(instance) < fixedCost(instance),
        }).toEqual({ difficulty, i, otimo: true });
      }
    }
  });

  it('a referencia sempre cabe no orcamento de bits', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 30; i += 1) {
        const instance = generate(`cabe-${i}`, difficulty);
        expect(referenceCost(instance)).toBeLessThanOrEqual(instance.maxBits);
      }
    }
  });

  it('a missao A cabe com codigo de tamanho fixo; a B so com o otimo', () => {
    for (let i = 0; i < 20; i += 1) {
      const facil = generate(`folga-${i}`, 1);
      expect(evaluate(facil, fixedCodes(facil)).ok).toBe(true);

      const dificil = generate(`folga-${i}`, 3);
      expect(evaluate(dificil, fixedCodes(dificil)).ok).toBe(false);
    }
  });
});

describe('mesa de bits: avaliacao', () => {
  it('a referencia fecha com eficiencia 1', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const instance = generate(`eval-${i}`, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('codigo ambiguo reprova mesmo gastando poucos bits', () => {
    const instance = instanceOf({ A: 5, B: 2, C: 1 }, 99);
    // "0" e comeco de "01": a fita ficaria ilegivel.
    expect(evaluate(instance, { A: '0', B: '01', C: '11' })).toEqual({ ok: false, efficiency: 0 });
  });

  it('passar do orcamento de bits reprova', () => {
    const instance = instanceOf({ A: 5, B: 2, C: 1 }, 10);
    expect(solutionCost(instance, { A: '00', B: '01', C: '1' })).toBeGreaterThan(10);
    expect(evaluate(instance, { A: '00', B: '01', C: '1' })).toEqual({ ok: false, efficiency: 0 });
  });

  it('faltar simbolo reprova', () => {
    const instance = instanceOf({ A: 5, B: 2, C: 1 }, 99);
    expect(evaluate(instance, { A: '0', B: '10' })).toEqual({ ok: false, efficiency: 0 });
  });

  it('a eficiencia nunca passa do teto', () => {
    const instance = instanceOf({ A: 5, B: 2, C: 1 }, 99);
    expect(evaluate(instance, reference(instance)).efficiency).toBeLessThanOrEqual(
      SCORING.EFFICIENCY_MAX,
    );
  });

  it('gastar mais bits que a referencia derruba a eficiencia, sem reprovar', () => {
    const instance = generate('eficiencia', 1);
    const fixo = evaluate(instance, fixedCodes(instance));
    expect(fixo.ok).toBe(true);
    expect(fixo.efficiency).toBeLessThan(1);
  });
});

describe('mesa de bits: as missoes da era 3 sao jogaveis', () => {
  const missoes = MISSIONS.filter((m) => m.era === 'codigo');

  it('ha duas missoes declaradas', () => {
    expect(missoes).toHaveLength(2);
  });

  it.each(missoes.map((m) => m.id))('a missao %s fecha com a referencia', (id) => {
    const missao = missoes.find((m) => m.id === id)!;
    const instance = generate(missao.seed, missao.difficulty);
    expect(evaluate(instance, reference(instance)).ok).toBe(true);
  });
});
