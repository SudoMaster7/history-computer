import { describe, expect, it } from 'vitest';
import { byDifficulty, replaySequence } from './logic';

describe('minijogos: pecas comuns', () => {
  it('byDifficulty le a tabela e cai na reserva quando falta a chave', () => {
    const table = { micro: 1, 1: 2, 2: 3 };
    expect(byDifficulty(table, 'micro', 9)).toBe(1);
    expect(byDifficulty(table, 2, 9)).toBe(3);
    // Dificuldade sem valor usa o da dificuldade 1; tabela vazia usa a reserva.
    expect(byDifficulty(table, 3, 9)).toBe(2);
    expect(byDifficulty({}, 1, 9)).toBe(9);
  });

  it('replaySequence avanca no acerto e conta o erro sem avancar', () => {
    expect(replaySequence(['a', 'b'], ['a', 'b'])).toEqual({ done: true, mistakes: 0, at: 2 });
    expect(replaySequence(['a', 'b'], ['b', 'a', 'a', 'b'])).toEqual({
      done: true,
      mistakes: 2,
      at: 2,
    });
    expect(replaySequence(['a', 'b'], ['a'])).toEqual({ done: false, mistakes: 0, at: 1 });
    expect(replaySequence(['a'], [])).toEqual({ done: false, mistakes: 0, at: 0 });
  });

  it('o que vem depois de completar a rodada e ignorado', () => {
    expect(replaySequence(['a'], ['a', 'x', 'y'])).toEqual({ done: true, mistakes: 0, at: 1 });
  });
});
