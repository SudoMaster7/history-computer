import { describe, expect, it } from 'vitest';
import type { GadgetData, RouteGadget } from './gadgets';
import {
  bestRoute,
  bitsValue,
  cipherText,
  circuitLights,
  initialGadget,
  isVirus,
  patternMissing,
  pressTarget,
  referencePresses,
  routeCost,
  shiftLetter,
  targetCount,
  validateGadget,
} from './gadgets';

function solve(g: GadgetData, presses: number[]): ReturnType<typeof pressTarget> {
  let state = initialGadget(g);
  let last = { state, mistake: false, opened: false };
  for (const p of presses) {
    last = pressTarget(g, state, p);
    state = last.state;
  }
  return last;
}

describe('dispositivos: cada ideia', () => {
  it('padrao: os fios que faltam continuam o trecho', () => {
    expect(
      patternMissing({
        kind: 'pattern',
        unit: ['a', 'b', 'c'],
        shown: 4,
        hidden: 3,
        colors: ['a', 'b', 'c'],
      }),
    ).toEqual(['b', 'c', 'a']);
  });

  it('circuito: E com NAO na segunda chave', () => {
    const g = { kind: 'circuit', neg: [false, true], gates: ['AND'] } as const;
    const c = { ...g, neg: [...g.neg], gates: [...g.gates] };
    expect(circuitLights(c, [true, false])).toBe(true);
    expect(circuitLights(c, [true, true])).toBe(false);
  });

  it('bits: 8 4 2 1', () => {
    expect(bitsValue(4, [true, false, true, true])).toBe(11);
  });

  it('rota: a de menor atraso nao e a de saida mais barata', () => {
    const g: RouteGadget = {
      kind: 'route',
      first: [1, 4],
      links: [
        [
          [9, 9],
          [1, 1],
        ],
      ],
      last: [1, 1],
    };
    expect(bestRoute(g)).toEqual([1, 0]);
    expect(routeCost(g, [1, 0])).toBe(6);
    expect(routeCost(g, [0, 0])).toBe(11);
  });

  it('cifra: anda e volta no alfabeto, passando pelo Z', () => {
    expect(shiftLetter('A', 3)).toBe('D');
    expect(shiftLetter('A', -1)).toBe('Z');
    expect(cipherText({ kind: 'cipher', word: 'XYZ', shift: 3, choices: [] })).toBe('ABC');
  });

  it('detector: virus e quem tem a caracteristica da regra', () => {
    expect(isVirus({ kind: 'classify', attr: 1, value: 2 }, [0, 2])).toBe(true);
    expect(isVirus({ kind: 'classify', attr: 1, value: 2 }, [2, 0])).toBe(false);
  });
});

describe('dispositivos: toques', () => {
  const all: GadgetData[] = [
    { kind: 'pattern', unit: ['a', 'b'], shown: 3, hidden: 3, colors: ['a', 'b', 'c'] },
    { kind: 'circuit', neg: [true, false, false], gates: ['OR', 'AND'] },
    { kind: 'bits', width: 5, value: 19 },
    {
      kind: 'route',
      first: [3, 1, 2],
      links: [
        [
          [1, 2, 3],
          [4, 5, 6],
          [1, 1, 1],
        ],
      ],
      last: [2, 2, 9],
    },
    {
      kind: 'cipher',
      word: 'BIT',
      shift: 2,
      choices: [
        ['B', 'C'],
        ['J', 'I'],
        ['T', 'U'],
      ],
    },
  ];

  for (const g of all) {
    it(`a referencia abre "${g.kind}" sem erro`, () => {
      expect(validateGadget(g)).toEqual([]);
      const last = solve(g, referencePresses(g));
      expect(last.opened).toBe(true);
      expect(last.state.mistakes).toBe(0);
      expect(last.state.perfect).toBe(true);
    });
  }

  it('circuito: testar sem acender conta erro e mostra as saidas', () => {
    const g: GadgetData = { kind: 'circuit', neg: [false, false], gates: ['AND'] };
    const out = pressTarget(g, initialGadget(g), 2);
    expect(out.mistake).toBe(true);
    expect(out.state.lastTest).toEqual([0]);
  });

  it('bits: gravar o numero errado conta erro e diz o que foi gravado', () => {
    const g: GadgetData = { kind: 'bits', width: 4, value: 5 };
    const out = solve(g, [0, 4]);
    expect(out.mistake).toBe(true);
    expect(out.state.lastTest).toEqual([8]);
  });

  it('rota: caminho caro abre, mas nao e perfeito', () => {
    const g: GadgetData = {
      kind: 'route',
      first: [1, 4],
      links: [
        [
          [9, 9],
          [1, 1],
        ],
      ],
      last: [1, 1],
    };
    const out = solve(g, [0, 0]);
    expect(out.opened).toBe(true);
    expect(out.state.perfect).toBe(false);
  });

  it('peca fora da faixa e portao aberto nao mudam nada', () => {
    const g: GadgetData = { kind: 'bits', width: 2, value: 1 };
    const s = initialGadget(g);
    expect(pressTarget(g, s, 9).state).toBe(s);
    const open = solve(g, [1, 2]).state;
    expect(pressTarget(g, open, 0).state).toBe(open);
  });

  it('o painel do detector nao tem pecas', () => {
    const g: GadgetData = { kind: 'classify', attr: 0, value: 0 };
    expect(targetCount(g, initialGadget(g))).toBe(0);
    expect(referencePresses(g)).toEqual([]);
  });

  it('validacao acusa cifra sem a letra certa e circuito impossivel', () => {
    expect(validateGadget({ kind: 'cipher', word: 'A', shift: 1, choices: [['B']] }).length).toBe(
      1,
    );
    expect(validateGadget({ kind: 'circuit', neg: [false, true], gates: ['AND'] })).toEqual([]);
    expect(validateGadget({ kind: 'bits', width: 2, value: 9 }).length).toBe(1);
  });
});
