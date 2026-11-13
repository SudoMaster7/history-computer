import { useMemo, useState } from 'react';
import { getMinigame } from '@/core/registry';
import { getMission } from '@/data/missions';
import { POWER_OF_ERA } from '@/core/powers';
import { useGameStore } from '@/store';
import MissionResult from './MissionResult';
import type { MissionOutcome } from './MissionResult';
import { totalXp } from './xp';
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
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);
  const [outcome, setOutcome] = useState<MissionOutcome | null>(null);
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
  const power = POWER_OF_ERA[mission.era];

  function submit(solution: unknown): void {
    const evaluation = active.evaluate(instance, solution);

    /*
     * O que a missao rendeu sai da comparacao do jogador antes e depois: a
     * regra (XP, nivel, poder) continua toda em `core/rpg`, e esta tela so
     * mostra a diferenca -- nao refaz a conta.
     */
    const before = useGameStore.getState().player;
    if (evaluation.ok) completeMission(missionId, evaluation);
    const after = useGameStore.getState().player;
    const previousBest = before.missions[missionId]?.bestScore ?? 0;
    const best = after.missions[missionId]?.bestScore ?? 0;

    setOutcome({
      evaluation,
      xp: totalXp(after) - totalXp(before),
      levelFrom: before.level,
      levelTo: after.level,
      power,
      powerFrom: before.powers[power],
      powerTo: after.powers[power],
      record: previousBest > 0 && best > previousBest,
      best,
    });
  }

  if (outcome) {
    return (
      <MissionResult
        outcome={outcome}
        reduceMotion={reduceMotion}
        onRetry={() => {
          setOutcome(null);
          setAttempt((n) => n + 1);
        }}
        onExit={onExit}
      />
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
