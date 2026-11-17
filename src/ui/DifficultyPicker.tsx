import type { GameDifficulty } from '@/core/types';
import { difficultyOf, useGameStore } from '@/store';
import ui from '@/data/ui.pt-BR.json';

const LEVELS: readonly GameDifficulty[] = ['facil', 'normal', 'dificil'];

/**
 * Escolha da dificuldade (D82): tres botoes, o escolhido aceso, e uma frase
 * dizendo o que muda. Vale para a proxima fase e para o chefao; nao mexe no
 * progresso salvo.
 */
export default function DifficultyPicker() {
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const current = difficultyOf(settings);

  return (
    <div className="difficulty">
      <p className="label" id="difficulty-title">
        {ui.difficulty.title}
      </p>
      <div className="difficulty__options" role="group" aria-labelledby="difficulty-title">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className="difficulty__option"
            data-level={level}
            aria-pressed={current === level}
            onClick={() => setSettings({ difficulty: level })}
          >
            {ui.difficulty[level]}
          </button>
        ))}
      </div>
      <p className="difficulty__text">{ui.difficulty[`${current}Text`]}</p>
    </div>
  );
}
