import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { replaySequence } from '../shared/logic';
import { useRounds } from '../shared/useRounds';
import type { VaultInstance, VaultRound, VaultSolution } from './logic';
import { ALPHABET } from './logic';

/**
 * Cofre Criptografico: a senha cifrada em cima, a decifrada embaixo, letra por
 * letra. O alfabeto fica a vista para o jogador contar as casas com o dedo.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<VaultInstance, VaultSolution>) {
  const t = ui.vault;
  const rounds = useRounds<string>(instance.rounds.length, onSubmit);

  const current = instance.rounds[rounds.round] as VaultRound;
  const plain = [...current.plain];
  const cipher = [...current.cipher];
  const at = replaySequence(plain, rounds.entries).at;
  const choices = current.choices[at] ?? [];

  function choose(letter: string): void {
    if (rounds.done) return;
    const right = letter === plain[at];
    play(right ? 'place' : 'erase');
    rounds.record(letter, right && at + 1 >= plain.length, !right);
  }

  const status = rounds.done
    ? { text: `${t.opened} ${current.plain}.`, state: 'ok' as const }
    : rounds.missed
      ? { text: t.wrong, state: 'warn' as const }
      : { text: t.prompt, state: 'idle' as const };

  const columns = { gridTemplateColumns: `repeat(${plain.length}, 1fr)` };

  return (
    <Frame
      era="seguranca"
      className="vault"
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
      <p className="vault__key">
        {t.keyA} <strong>{current.shift}</strong> {current.shift === 1 ? t.stepOne : t.stepMany}{' '}
        {t.keyB}
      </p>

      <div className="mg__block">
        <h3>{t.cipher}</h3>
        <ol className="vault__tiles" style={columns} aria-label={t.cipher}>
          {cipher.map((letter, i) => (
            <li
              key={i}
              className="vault__tile"
              data-state={i < at ? 'done' : i === at && !rounds.done ? 'now' : 'todo'}
            >
              {letter}
            </li>
          ))}
        </ol>
        <h3>{t.plain}</h3>
        <ol className="vault__tiles" style={columns} aria-label={t.plain}>
          {plain.map((letter, i) =>
            i < at ? (
              <li key={i} className="vault__tile vault__tile--open">
                {letter}
              </li>
            ) : (
              <li key={i} className="vault__tile vault__tile--closed" aria-label={t.hidden}>
                ?
              </li>
            ),
          )}
        </ol>
      </div>

      <p className="vault__alphabet" aria-label={t.alphabet}>
        {[...ALPHABET].map((letter) => (
          <span key={letter} data-now={!rounds.done && letter === cipher[at]}>
            {letter}
          </span>
        ))}
      </p>

      {rounds.done ? null : (
        <div className="controls vault__choices" role="group" aria-label={t.choices}>
          {choices.map((letter) => (
            <button
              key={letter}
              type="button"
              className="vault__choice"
              aria-label={`${t.letter} ${letter}`}
              onClick={() => choose(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      )}
    </Frame>
  );
}
