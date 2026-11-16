import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { useRounds } from '../shared/useRounds';
import type { BitsInstance, BitsSolution } from './logic';
import { bitValue, bitsOf, valueOf } from './logic';

/**
 * Mesa de Bits: uma fileira de bits, cada um valendo o dobro do vizinho. O
 * jogador liga os que somam o numero pedido e manda gravar. A soma so aparece
 * depois de gravar -- fazer a conta e o exercicio.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<BitsInstance, BitsSolution>) {
  const t = ui.bits;
  const { width } = instance;
  const rounds = useRounds<number>(instance.targets.length, onSubmit);
  const target = instance.targets[rounds.round] as number;

  const [bits, setBits] = useState<boolean[]>(() => new Array<boolean>(width).fill(false));
  /** A mesa foi mexida depois da ultima gravacao. */
  const [dirty, setDirty] = useState(true);

  const litValues = bits.flatMap((on, i) => (on ? [bitValue(width, i)] : []));
  const lastWritten = rounds.entries[rounds.entries.length - 1];

  function toggle(index: number): void {
    if (rounds.done) return;
    play('tap');
    setBits((now) => now.map((on, i) => (i === index ? !on : on)));
    setDirty(true);
  }

  function write(): void {
    if (rounds.done) return;
    const value = valueOf(bits);
    const right = value === target;
    play(right ? 'ok' : 'erase');
    setDirty(false);
    rounds.record(value, right, !right);
  }

  function next(): void {
    setBits(new Array<boolean>(width).fill(false));
    setDirty(true);
    rounds.next();
  }

  const status = rounds.done
    ? {
        text: `${t.roundDone} ${bitsOf(target, width)
          .map((on) => (on ? '1' : '0'))
          .join('')}`,
        state: 'ok' as const,
      }
    : rounds.missed && !dirty && lastWritten !== undefined
      ? { text: `${t.wrote} ${lastWritten}. ${t.wanted} ${target}.`, state: 'warn' as const }
      : { text: t.prompt, state: 'idle' as const };

  return (
    <Frame
      era="codigo"
      className="bits"
      mode={mode}
      help={mode === 'micro' ? t.microHelp : t.help}
      round={rounds.round}
      total={rounds.total}
      done={rounds.done}
      mistakes={rounds.mistakes}
      status={status}
      onNext={next}
      onExit={onExit}
    >
      <p className="bits__target">
        <span className="label">{t.target}</span>
        <strong>{target}</strong>
      </p>

      <div className="mg__block">
        <h3>{t.table}</h3>
        <div
          className="bits__row"
          style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
          role="group"
          aria-label={t.table}
        >
          {bits.map((on, i) => {
            const value = bitValue(width, i);
            return (
              <button
                key={i}
                type="button"
                className="bits__bit"
                data-on={on}
                aria-pressed={on}
                aria-label={`${t.bit} ${value}: ${on ? t.on : t.off}`}
                disabled={rounds.done}
                onClick={() => toggle(i)}
              >
                <span className="bits__led" aria-hidden="true">
                  {on ? '1' : '0'}
                </span>
                <span className="bits__value">{value}</span>
              </button>
            );
          })}
        </div>
        <p className="mg__note">
          {t.lit}: {litValues.length > 0 ? litValues.join(' + ') : t.none}
        </p>
      </div>

      <button type="button" className="bits__write" disabled={rounds.done} onClick={write}>
        {t.write}
      </button>
    </Frame>
  );
}
