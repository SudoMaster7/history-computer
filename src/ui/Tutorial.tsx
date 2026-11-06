import ui from '@/data/ui.pt-BR.json';
import { TUTORIAL_STEPS } from './tutorialSteps';

interface Props {
  step: number;
  onNext(): void;
  onSkip(): void;
}

/**
 * Tutorial da primeira zona: uma faixa por cima do mapa, que anda conforme o
 * jogador faz a acao pedida. Pode ser pulado e nunca mais volta (fica salvo).
 */
export default function Tutorial({ step, onNext, onSkip }: Props) {
  const text = TUTORIAL_STEPS[step];
  if (!text) return null;

  return (
    <div className="tutorial" role="dialog" aria-label={ui.tutorial.title}>
      <p className="tutorial__step">
        {step + 1}/{TUTORIAL_STEPS.length}
      </p>
      <p className="tutorial__text">{text}</p>
      <div className="tutorial__actions">
        <button type="button" onClick={onNext}>
          {ui.tutorial.next}
        </button>
        <button type="button" className="tutorial__skip" onClick={onSkip}>
          {ui.tutorial.skip}
        </button>
      </div>
    </div>
  );
}
