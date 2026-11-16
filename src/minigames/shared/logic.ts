import type { Difficulty } from '@/core/types';

/**
 * Pecas comuns aos seis minijogos (D69). Puro, como todo `logic.ts`.
 *
 * Todos sao jogados em rodadas, e a solucao enviada e o REGISTRO do que o
 * jogador tocou em cada rodada, na ordem -- inclusive os toques errados. Quem
 * conta os erros e o `evaluate`, nao a tela.
 */

/** Le de uma tabela de constantes o valor da dificuldade, com reserva. */
export function byDifficulty(
  table: Record<string, number>,
  difficulty: Difficulty,
  fallback: number,
): number {
  return table[String(difficulty)] ?? table['1'] ?? fallback;
}

export interface Replay {
  /** A rodada chegou ao fim? */
  done: boolean;
  /** Toques errados ate la. */
  mistakes: number;
  /** Quantas escolhas certas ja entraram. */
  at: number;
}

/**
 * Refaz uma rodada de "escolha a proxima": o jogador avanca a cada escolha
 * igual a esperada, e toda escolha diferente conta um erro. O que vier depois
 * de completar a rodada e ignorado.
 */
export function replaySequence<T>(expected: readonly T[], picks: readonly T[]): Replay {
  let at = 0;
  let mistakes = 0;
  for (const pick of picks) {
    if (at >= expected.length) break;
    if (pick === expected[at]) at += 1;
    else mistakes += 1;
  }
  return { done: at >= expected.length, mistakes, at };
}
