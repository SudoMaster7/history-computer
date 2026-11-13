import { useEffect } from 'react';
import type { Evaluation, PowerId } from '@/core/types';
import { missionScore, starsFor } from '@/core/scoring';
import { Burst, play, useCountUp } from '@/fx';
import { IconKnowledge, IconLevel, IconPower, IconStar } from './icons';
import ui from '@/data/ui.pt-BR.json';

/** O que a missao rendeu, medido comparando o jogador antes e depois. */
export interface MissionOutcome {
  evaluation: Evaluation;
  /** Conhecimento ganho nesta tentativa (repeticao so paga a melhoria). */
  xp: number;
  levelFrom: number;
  levelTo: number;
  power: PowerId;
  powerFrom: number;
  powerTo: number;
  /** Bateu a propria melhor pontuacao (so conta se ja havia uma). */
  record: boolean;
  /** Melhor pontuacao guardada depois desta tentativa. */
  best: number;
}

interface Props {
  outcome: MissionOutcome;
  reduceMotion: boolean;
  onRetry(): void;
  onExit(): void;
}

/** Intervalo entre uma estrela e a seguinte, em milissegundos. */
const STAR_GAP_MS = 320;
const STAR_START_MS = 260;

/**
 * Resultado da missao. Nao calcula nada: recebe a avaliacao e o que mudou no
 * jogador e apresenta -- estrelas uma a uma, pontuacao subindo, e cada ganho
 * (conhecimento, nivel, poder, recorde) na sua propria linha.
 *
 * Existe porque concluir um desafio tem de parecer conquista. Uma linha de
 * texto com "★☆☆" dizia a mesma coisa e nao dava vontade de voltar pela
 * terceira estrela.
 */
export default function MissionResult({ outcome, reduceMotion, onRetry, onExit }: Props) {
  const { evaluation } = outcome;
  const ok = evaluation.ok;
  const stars = starsFor(evaluation.efficiency, ok);
  const score = ok ? missionScore(evaluation.efficiency) : 0;
  const efficiency = Math.round(evaluation.efficiency * 100);
  const leveled = outcome.levelTo > outcome.levelFrom;
  const powered = outcome.powerTo > outcome.powerFrom;

  const shownScore = useCountUp(score, 900, !reduceMotion, STAR_START_MS);
  const shownEfficiency = useCountUp(efficiency, 700, !reduceMotion, STAR_START_MS);

  // O som acompanha as estrelas: uma nota por estrela, cada uma mais aguda.
  useEffect(() => {
    if (!ok) {
      play('fail');
      return;
    }
    const timers = Array.from({ length: stars }, (_, i) =>
      setTimeout(
        () => play('star', 1 + i * 0.12),
        reduceMotion ? 0 : STAR_START_MS + i * STAR_GAP_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [ok, stars, reduceMotion]);

  const tip = !ok ? ui.mission.tryHint : stars >= 3 ? ui.mission.perfect : ui.mission.nextStar;

  return (
    <section
      className={ok ? 'result game-surface pad' : 'result result--fail game-surface pad'}
      aria-label={ui.mission.result}
    >
      <h2 className="result__title">{ok ? ui.mission.success : ui.mission.failure}</h2>

      <div className="result__stage">
        <p className="result__stars" aria-label={`${stars} ${ui.mission.stars}`}>
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={stars >= step ? 'result__star result__star--on' : 'result__star'}
              style={{ animationDelay: `${STAR_START_MS + (step - 1) * STAR_GAP_MS}ms` }}
              aria-hidden="true"
            >
              <IconStar size={52} filled={stars >= step} />
            </span>
          ))}
        </p>
        {stars >= 3 ? <Burst count={26} spread={130} /> : null}
      </div>

      <dl className="result__numbers">
        <div className="result__number">
          <dt className="label">{ui.mission.efficiency}</dt>
          <dd>{shownEfficiency}%</dd>
        </div>
        <div className="result__number">
          <dt className="label">{ui.mission.score}</dt>
          <dd>{shownScore}</dd>
        </div>
        <div className="result__number">
          <dt className="label">{ui.mission.best}</dt>
          <dd>{outcome.best}</dd>
        </div>
      </dl>

      {ok ? (
        <ul className="result__gains">
          {outcome.record ? (
            <li className="gain gain--record">
              <IconStar size={18} filled />
              {ui.mission.newRecord}
            </li>
          ) : null}
          {outcome.xp > 0 ? (
            <li className="gain">
              <IconKnowledge size={18} />+{outcome.xp} {ui.mission.xpGained}
            </li>
          ) : null}
          {leveled ? (
            <li className="gain gain--level">
              <IconLevel size={18} />
              {ui.mission.levelUp} {outcome.levelTo}
            </li>
          ) : null}
          {powered ? (
            <li className="gain gain--power">
              <IconPower size={18} />
              {ui.mission.powerUp} {ui.powers[outcome.power]}: {ui.mission.powerLevel}{' '}
              {outcome.powerTo}
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="result__tip">{tip}</p>

      <div className="controls result__actions">
        <button type="button" className={ok ? undefined : 'result__primary'} onClick={onRetry}>
          {ui.mission.retry}
        </button>
        <button type="button" className={ok ? 'result__primary' : undefined} onClick={onExit}>
          {ui.world.backToWorld}
        </button>
      </div>
    </section>
  );
}
