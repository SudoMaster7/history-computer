import { describe, expect, it } from 'vitest';
import type { Difficulty } from '@/core/types';
import { MODEL } from '@/core/constants';
import { mistakeEfficiency } from '@/core/scoring';
import {
  consistentRules,
  evaluate,
  generate,
  isVirus,
  model,
  neededToPass,
  reference,
} from './logic';

const DIFFICULTIES: Difficulty[] = ['micro', 1, 2, 3];
const SEEDS = Array.from({ length: 40 }, (_, i) => `detector-${i}`);

describe('Treinar o Detector', () => {
  it('e da era da IA', () => {
    expect(model.era).toBe('ia');
  });

  it('a regra olha uma caracteristica so', () => {
    const rule = { attr: 1, value: 2 };
    expect(isVirus(rule, [0, 2, 0])).toBe(true);
    expect(isVirus(rule, [2, 1, 0])).toBe(false);
  });

  it('consistentRules devolve so as regras que batem com todos os exemplos', () => {
    const train = [
      { item: [0, 0, 0], virus: true },
      { item: [0, 1, 0], virus: true },
      { item: [1, 0, 0], virus: false },
      { item: [2, 1, 0], virus: false },
    ];
    expect(consistentRules(train, 2)).toEqual([{ attr: 0, value: 0 }]);
    // Com um exemplo so, varias regras servem: e por isso que nao basta um.
    expect(consistentRules(train.slice(0, 1), 2).length).toBeGreaterThan(1);
  });

  it('neededToPass arredonda para cima', () => {
    expect(neededToPass(3)).toBe(Math.ceil(3 * MODEL.PASS_RATIO));
    expect(neededToPass(10)).toBe(Math.ceil(10 * MODEL.PASS_RATIO));
  });

  it('a mesma seed da sempre as mesmas rodadas', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generate('fixa', difficulty)).toEqual(generate('fixa', difficulty));
    }
  });

  it('os exemplos apontam para uma regra so, e os programas novos sao novos', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        const key = String(difficulty);
        const attrs = MODEL.ATTRS[key] as number;
        expect(instance.rounds).toHaveLength(MODEL.ROUNDS[key] as number);

        for (const round of instance.rounds) {
          // Sem isso a resposta seria chute: duas regras explicariam os exemplos.
          expect({ seed, difficulty, regras: consistentRules(round.train, attrs) }).toEqual({
            seed,
            difficulty,
            regras: [round.rule],
          });
          for (const example of round.train) {
            expect(example.virus).toBe(isVirus(round.rule, example.item));
          }
          expect(round.train.filter((e) => e.virus).length).toBeGreaterThanOrEqual(2);
          expect(round.train.filter((e) => !e.virus).length).toBeGreaterThanOrEqual(2);

          const seen = new Set(round.train.map((e) => e.item.join(',')));
          const fresh = round.test.map((item) => item.join(','));
          expect(fresh.some((id) => seen.has(id))).toBe(false);
          expect(new Set(fresh).size).toBe(fresh.length);
          // Tem dos dois tipos: responder tudo igual nunca acerta tudo.
          expect(round.test.some((item) => isVirus(round.rule, item))).toBe(true);
          expect(round.test.some((item) => !isVirus(round.rule, item))).toBe(true);
        }
      }
    }
  });

  it('nas missoes cada rodada esconde uma regra diferente', () => {
    for (const seed of SEEDS) {
      for (const difficulty of [1, 2] as const) {
        const rules = generate(seed, difficulty).rounds.map(
          (r) => `${r.rule.attr}:${r.rule.value}`,
        );
        expect(new Set(rules).size).toBe(rules.length);
      }
    }
  });

  it('a referencia classifica tudo certo', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const instance = generate(seed, difficulty);
        expect(evaluate(instance, reference(instance))).toEqual({ ok: true, efficiency: 1 });
      }
    }
  });

  it('um erro custa eficiencia; errar demais reprova o detector', () => {
    const instance = generate('erros', 2);
    const good = reference(instance);

    const oneWrong = good.map((answers, i) =>
      i === 0 ? [!answers[0], ...answers.slice(1)] : answers,
    );
    expect(evaluate(instance, oneWrong)).toEqual({ ok: true, efficiency: mistakeEfficiency(1) });

    const allWrong = good.map((answers) => answers.map((answer) => !answer));
    expect(evaluate(instance, allWrong)).toEqual({ ok: false, efficiency: 0 });
  });

  it('resposta faltando ou torta nao conclui', () => {
    const instance = generate('torta', 1);
    const good = reference(instance);
    expect(
      evaluate(
        instance,
        good.map((a, i) => (i === 0 ? a.slice(1) : a)),
      ).ok,
    ).toBe(false);
    expect(evaluate(instance, good.map((a) => a.map(() => 'sim')) as never).ok).toBe(false);
    expect(evaluate(instance, good.slice(1)).ok).toBe(false);
    expect(evaluate(instance, instance.rounds.map(() => true) as never).ok).toBe(false);
    expect(evaluate(instance, {} as never).ok).toBe(false);
  });
});
