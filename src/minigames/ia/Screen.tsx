import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { ModelInstance, ModelSolution } from './logic';
import { classify, missedExamples } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import Gauge from '@/ui/Gauge';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<ModelInstance, ModelSolution>;

/**
 * Treinar o Detector. Um toque liga e desliga cada sinal observado, dois botoes
 * mexem no gatilho. A tabela de treino mostra na hora o que o detector diria --
 * mas os exemplos guardados ficam escondidos ate o envio, de proposito.
 */
export default function ModelScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [watched, setWatched] = useState<number[]>([]);
  const [trigger, setTrigger] = useState(1);
  const t = ui.model;

  const ordered = [...watched].sort((a, b) => a - b);
  const safeTrigger = Math.min(Math.max(1, trigger), Math.max(1, ordered.length));
  const solution: ModelSolution | null =
    ordered.length > 0 ? { watched: ordered, trigger: safeTrigger } : null;

  function toggle(index: number): void {
    setWatched((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );
  }

  const wrong = solution ? missedExamples(solution, instance.train) : [];
  const overBudget = ordered.length > instance.maxSignals;
  const trained = solution !== null && wrong.length === 0 && !overBudget;

  return (
    <section className="model game-surface" aria-label={ui.minigames.ia}>
      <header className="model__head">
        <h2>{ui.minigames.ia}</h2>
        <p className="model__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <MinigameHelp era="ia" mode={mode} />

      <div className="model__block">
        <h3>
          {t.signals}: {ordered.length}/{instance.maxSignals}
        </h3>
        <Gauge value={ordered.length} max={instance.maxSignals} />
        <div className="controls model__signals" aria-label={t.signals}>
          {Array.from({ length: instance.signals }, (_, index) => {
            const on = watched.includes(index);
            return (
              <button
                key={index}
                type="button"
                className={on ? 'model__signal model__signal--on' : 'model__signal'}
                aria-pressed={on}
                data-sfx={on ? 'erase' : 'place'}
                onClick={() => toggle(index)}
                aria-label={`${on ? t.unwatch : t.watch} ${index + 1}`}
              >
                <i className="model__lamp" data-s={on ? 'on' : 'ignored'} aria-hidden="true" />
                {t.signalName} {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="model__block model__trigger">
        <h3>
          {t.trigger}: {ordered.length === 0 ? '–' : safeTrigger} {t.triggerText}
        </h3>
        <div className="controls">
          <button
            type="button"
            disabled={safeTrigger <= 1}
            onClick={() => setTrigger((v) => Math.max(1, v - 1))}
            aria-label={t.triggerDown}
          >
            −
          </button>
          <button
            type="button"
            disabled={safeTrigger >= ordered.length}
            onClick={() => setTrigger((v) => v + 1)}
            aria-label={t.triggerUp}
          >
            +
          </button>
        </div>
      </div>

      <div className="model__block">
        <h3>
          {t.trainTitle} — {t.trainScore}: {instance.train.length - wrong.length}/
          {instance.train.length}
        </h3>
        <ul className="model__examples" aria-label={t.trainTitle}>
          {instance.train.map((item, index) => {
            const said = solution ? classify(solution, item) : null;
            const miss = wrong.includes(index);
            return (
              <li
                key={index}
                className={miss ? 'model__example model__example--wrong' : 'model__example'}
                aria-label={`${index + 1}: ${item.attack ? t.attack : t.normal}, ${t.says} ${
                  said === null ? '–' : said ? t.attack : t.normal
                }`}
              >
                {/* Uma lampada por sinal: acesa, apagada, ou fosca se o detector nao olha. */}
                <span className="model__bits" aria-hidden="true">
                  {item.signals.map((on, signal) => (
                    <i
                      key={signal}
                      className="model__lamp"
                      data-s={watched.includes(signal) ? (on ? 'on' : 'off') : 'ignored'}
                    />
                  ))}
                </span>
                <span className="model__truth" data-attack={item.attack} aria-hidden="true">
                  {item.attack ? t.attack : t.normal}
                </span>
                <span
                  className="model__said"
                  data-ok={said === null ? 'none' : said === item.attack}
                  aria-hidden="true"
                >
                  {said === null ? '–' : said === item.attack ? '✓' : '✗'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="model__hidden">
        {t.testTitle}: {instance.test.length} — {t.testHidden}
      </p>

      <p
        className="model__status"
        role="status"
        data-state={ordered.length === 0 ? 'idle' : trained ? 'ok' : 'warn'}
      >
        {ordered.length === 0
          ? t.noSignals
          : overBudget
            ? `${t.overBudget} (${ordered.length}/${instance.maxSignals})`
            : wrong.length > 0
              ? `${t.trainWrong}: ${wrong.length}`
              : t.trainOk}
      </p>

      <div className="controls">
        <button
          type="button"
          className="model__submit"
          data-ready={trained}
          disabled={!solution}
          onClick={() => solution && onSubmit(solution)}
        >
          {ui.mission.submit}
          {trained ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
