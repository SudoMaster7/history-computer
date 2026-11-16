import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { useRounds } from '../shared/useRounds';
import type { ModelInstance, ModelItem, ModelRound, ModelSolution } from './logic';
import { isVirus } from './logic';

const t = ui.model;

/** Um programa em palavras: cor, forma e, quando tem, a antena. */
function nameOf(item: ModelItem): string {
  const parts = [t.colors[item[0] ?? 0], t.shapes[item[1] ?? 0]];
  if (item[2] === 1) parts.push(t.antenna[1]);
  return `${t.program} ${parts.join(', ')}`;
}

/** O desenho de um programa: a forma, pintada da cor, com ou sem antena. */
function Program({ item }: { item: ModelItem }) {
  const shape = item[1] ?? 0;
  return (
    <svg
      className="program"
      data-color={item[0] ?? 0}
      viewBox="0 0 40 44"
      role="img"
      aria-label={nameOf(item)}
    >
      {item[2] === 1 ? (
        <g className="program__antenna">
          <line x1={20} y1={14} x2={20} y2={5} />
          <circle cx={20} cy={4} r={3} />
        </g>
      ) : null}
      {shape === 0 ? <circle className="program__body" cx={20} cy={28} r={14} /> : null}
      {shape === 1 ? (
        <rect className="program__body" x={6} y={14} width={28} height={28} rx={3} />
      ) : null}
      {shape === 2 ? <polygon className="program__body" points="20,12 36,42 4,42" /> : null}
      <circle className="program__eye" cx={15} cy={31} r={2} />
      <circle className="program__eye" cx={25} cy={31} r={2} />
    </svg>
  );
}

/**
 * Treinar o Detector: exemplos carimbados em cima, programas novos embaixo. A
 * regra nunca e escrita antes; a tela so a conta quando a rodada acaba.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<ModelInstance, ModelSolution>) {
  const rounds = useRounds<boolean>(instance.rounds.length, onSubmit);
  const current = instance.rounds[rounds.round] as ModelRound;
  const answered = rounds.entries.length;

  function answer(virus: boolean): void {
    if (rounds.done) return;
    const item = current.test[answered] as ModelItem;
    const right = isVirus(current.rule, item) === virus;
    play(right ? 'place' : 'erase');
    rounds.record(virus, answered + 1 >= current.test.length, !right);
  }

  const { attr, value } = current.rule;
  const ruleName = [t.colors, t.shapes, t.antenna][attr]?.[value] ?? '';

  const status = rounds.done
    ? { text: `${t.ruleWas} ${ruleName} ${t.ruleEnd}`, state: 'ok' as const }
    : answered === 0
      ? { text: t.prompt, state: 'idle' as const }
      : rounds.missed
        ? { text: t.wrongAnswer, state: 'warn' as const }
        : { text: t.rightAnswer, state: 'ok' as const };

  return (
    <Frame
      era="ia"
      className="model"
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
        <h3>{t.train}</h3>
        <ul className="model__cards" aria-label={t.train}>
          {current.train.map((example, i) => (
            <li key={i} className="model__card" data-virus={example.virus}>
              <Program item={example.item} />
              <span className="model__stamp">{example.virus ? t.virus : t.safe}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mg__block">
        <h3>{t.test}</h3>
        <ol className="model__cards" aria-label={t.test}>
          {current.test.map((item, i) => {
            const given = rounds.entries[i];
            const right = given === undefined ? undefined : given === isVirus(current.rule, item);
            return (
              <li
                key={i}
                className="model__card model__card--test"
                data-state={given === undefined ? (i === answered ? 'now' : 'todo') : 'done'}
                data-right={right}
              >
                <Program item={item} />
                <span className="model__stamp">
                  {given === undefined
                    ? '?'
                    : `${given ? t.virus : t.safe}: ${right ? t.right : t.wrongMark}`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {rounds.done ? null : (
        <div className="controls model__answers">
          <button
            type="button"
            className="model__answer"
            data-kind="virus"
            onClick={() => answer(true)}
          >
            {t.virus}
          </button>
          <button
            type="button"
            className="model__answer"
            data-kind="safe"
            onClick={() => answer(false)}
          >
            {t.safe}
          </button>
        </div>
      )}
    </Frame>
  );
}
