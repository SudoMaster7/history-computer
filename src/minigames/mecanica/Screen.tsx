import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { replaySequence } from '../shared/logic';
import { useRounds } from '../shared/useRounds';
import type { LoomInstance, LoomRound, LoomSolution } from './logic';
import { missingOf } from './logic';

/**
 * Tear de Engrenagens: o tecido chega com os ultimos fios faltando e o jogador
 * toca na cor de cada um. A tela so anota os toques; a nota e do `evaluate`.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<LoomInstance, LoomSolution>) {
  const t = ui.loom;
  const names = t.colorNames as Record<string, string>;
  const rounds = useRounds<string>(instance.rounds.length, onSubmit);

  const current = instance.rounds[rounds.round] as LoomRound;
  const missing = missingOf(current);
  const placed = replaySequence(missing, rounds.entries).at;
  const woven = current.cloth.length - current.hidden + placed;

  function weave(color: string): void {
    if (rounds.done) return;
    const right = color === missing[placed];
    play(right ? 'place' : 'erase');
    rounds.record(color, right && placed + 1 >= missing.length, !right);
  }

  const status = rounds.done
    ? { text: t.roundDone, state: 'ok' as const }
    : rounds.missed
      ? { text: t.wrong, state: 'warn' as const }
      : { text: t.prompt, state: 'idle' as const };

  return (
    <Frame
      era="mecanica"
      className="loom"
      mode={mode}
      help={mode === 'micro' ? t.microHelp : t.help}
      round={rounds.round}
      total={rounds.total}
      done={rounds.done}
      mistakes={rounds.mistakes}
      status={status}
      onNext={rounds.next}
      onExit={onExit}
    >
      <div className="mg__block">
        <h3>{t.cloth}</h3>
        <ol
          className={rounds.done ? 'loom__tape loom__tape--ok' : 'loom__tape'}
          aria-label={t.cloth}
        >
          {current.cloth.map((color, i) =>
            i < woven ? (
              <li
                key={i}
                className={
                  i >= current.cloth.length - current.hidden
                    ? 'loom__cell loom__cell--new'
                    : 'loom__cell'
                }
                data-thread={color}
                aria-label={`${t.thread} ${names[color] ?? color}`}
              />
            ) : (
              <li
                key={i}
                className={i === woven ? 'loom__ghost loom__ghost--now' : 'loom__ghost'}
                aria-label={t.missing}
              />
            ),
          )}
        </ol>
      </div>

      <div className="controls loom__palette" role="group" aria-label={t.pick}>
        {instance.colors.map((color) => (
          <button
            key={color}
            type="button"
            className="loom__thread"
            data-thread={color}
            disabled={rounds.done}
            aria-label={`${t.weave} ${names[color] ?? color}`}
            onClick={() => weave(color)}
          >
            <span className="loom__swatch" aria-hidden="true" />
            {names[color] ?? color}
          </button>
        ))}
      </div>
    </Frame>
  );
}
