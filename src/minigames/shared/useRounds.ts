import { useState } from 'react';

/**
 * O andamento comum aos seis minijogos (D69): rodadas em sequencia, e o
 * REGISTRO de tudo o que o jogador tocou em cada uma.
 *
 * A tela nao decide nota nenhuma. Ela so anota os toques e, no fim da ultima
 * rodada, entrega o registro inteiro -- quem conta os erros e o `evaluate`.
 * O contador de erros daqui existe so para o jogador ver quanto ja custou.
 */
export interface Rounds<T> {
  /** Rodada atual, a partir de 0. */
  round: number;
  total: number;
  /** Esta e a ultima rodada. */
  last: boolean;
  /** A rodada atual ja foi concluida (falta tocar em seguir). */
  done: boolean;
  /** O que foi tocado na rodada atual, na ordem. */
  entries: readonly T[];
  /** Erros somados em todas as rodadas. */
  mistakes: number;
  /** O ultimo toque foi um erro. */
  missed: boolean;
  record(entry: T, finished: boolean, mistake?: boolean): void;
  /** Segue para a proxima rodada, ou envia o registro se era a ultima. */
  next(): void;
}

export function useRounds<T>(total: number, onSubmit: (log: T[][]) => void): Rounds<T> {
  const [log, setLog] = useState<T[][]>(() => Array.from({ length: total }, () => []));
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState(false);

  const last = round >= total - 1;

  function record(entry: T, finished: boolean, mistake = false): void {
    if (done) return;
    setLog((current) => current.map((picks, i) => (i === round ? [...picks, entry] : picks)));
    setMissed(mistake);
    if (mistake) setMistakes((count) => count + 1);
    if (finished) setDone(true);
  }

  function next(): void {
    if (!done) return;
    if (last) {
      onSubmit(log);
      return;
    }
    setRound(round + 1);
    setDone(false);
    setMissed(false);
  }

  return {
    round,
    total,
    last,
    done,
    entries: log[round] ?? [],
    mistakes,
    missed,
    record,
    next,
  };
}
