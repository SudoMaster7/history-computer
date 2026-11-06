import { useMemo, useState } from 'react';
import type { Evaluation } from '@/core/types';
import { getMinigame } from '@/core/registry';
import { getMission } from '@/data/missions';
import { missionScore, starsFor } from '@/core/scoring';
import { useGameStore } from '@/store';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  missionId: string;
  onExit(): void;
}

/**
 * Abre o minijogo da missao, avalia a solucao com `evaluate` e aplica o
 * resultado no estado. A tela do minijogo nunca calcula pontuacao.
 */
export default function MissionRunner({ missionId, onExit }: Props) {
  const completeMission = useGameStore((s) => s.completeMission);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [attempt, setAttempt] = useState(0);

  const mission = getMission(missionId);
  const game = mission ? getMinigame(mission.era) : null;

  const instance = useMemo(() => {
    if (!mission || !game) return null;
    return game.generate(mission.seed, mission.difficulty);
  }, [mission, game]);

  if (!mission || !game || !instance) {
    return (
      <section className="game-surface pad">
        <p>{ui.world.stationSoon}</p>
        <button type="button" onClick={onExit}>
          {ui.app.back}
        </button>
      </section>
    );
  }

  const active = game;

  function submit(solution: unknown): void {
    const evaluation = active.evaluate(instance, solution);
    setResult(evaluation);
    if (evaluation.ok) completeMission(missionId, evaluation);
  }

  if (result) {
    const stars = starsFor(result.efficiency, result.ok);
    return (
      <section className="result game-surface pad" aria-label={ui.mission.result}>
        <h2>{result.ok ? ui.mission.success : ui.mission.failure}</h2>
        <p className="result__stars" aria-label={`${stars} ${ui.mission.stars}`}>
          {'★'.repeat(stars)}
          {'☆'.repeat(3 - stars)}
        </p>
        <p>
          {ui.mission.efficiency}: {(result.efficiency * 100).toFixed(0)}%
        </p>
        <p>
          {ui.mission.score}: {result.ok ? missionScore(result.efficiency) : 0}
        </p>
        <div className="controls">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAttempt((n) => n + 1);
            }}
          >
            {ui.mission.retry}
          </button>
          <button type="button" onClick={onExit}>
            {ui.world.backToWorld}
          </button>
        </div>
      </section>
    );
  }

  const Screen = active.Screen as React.ComponentType<{
    instance: unknown;
    mode: 'mission' | 'micro';
    onSubmit(solution: unknown): void;
    onExit(): void;
  }>;

  return (
    <Screen key={attempt} instance={instance} mode="mission" onSubmit={submit} onExit={onExit} />
  );
}
