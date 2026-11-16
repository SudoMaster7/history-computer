import type { ReactNode } from 'react';
import type { EraId } from '@/core/types';
import MinigameHelp from '@/ui/MinigameHelp';
import ui from '@/data/ui.pt-BR.json';

export interface FrameStatus {
  text: string;
  state: 'idle' | 'ok' | 'warn';
}

interface Props {
  era: EraId;
  /** Classe da era (`loom`, `circuit`...): e por ela que chegam a cor e a arte. */
  className: string;
  mode: 'mission' | 'micro';
  /** A frase de instrucao, ja escolhida entre a da missao e a do chefao. */
  help: string;
  round: number;
  total: number;
  done: boolean;
  /** Erros ate agora; fica de fora onde nao ha erro para contar (Rota). */
  mistakes?: number;
  status: FrameStatus;
  onNext(): void;
  onExit(): void;
  children: ReactNode;
}

/**
 * A moldura igual nos seis minijogos (D69): titulo, rodada em que se esta, a
 * peca da era no meio, a frase de estado, e o botao de seguir quando a rodada
 * fecha. Cada tela so desenha a peca dela.
 */
export default function Frame({
  era,
  className,
  mode,
  help,
  round,
  total,
  done,
  mistakes,
  status,
  onNext,
  onExit,
  children,
}: Props) {
  const t = ui.minigame;
  const title = ui.minigames[era];
  const last = round >= total - 1;

  return (
    <section className={`mg ${className} game-surface`} aria-label={title}>
      <header className="mg__head">
        <h2>{title}</h2>
        <p className="mg__help">{help}</p>
      </header>

      <div className="mg__bar">
        <p className="mg__round">
          {t.round} {round + 1} {t.of} {total}
        </p>
        <span className="mg__pips" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className="mg__pip"
              data-state={
                i < round || (i === round && done) ? 'done' : i === round ? 'now' : 'todo'
              }
            />
          ))}
        </span>
        {mistakes === undefined ? null : (
          <p className="mg__mistakes" data-any={mistakes > 0}>
            {t.mistakes}: {mistakes}
          </p>
        )}
      </div>

      {children}

      <p className="mg__status" data-state={status.state} role="status">
        {status.text}
      </p>

      {done ? (
        <button type="button" className="mg__next" data-ready="true" onClick={onNext}>
          {last ? t.finish : t.next}
        </button>
      ) : null}

      <MinigameHelp era={era} mode={mode} />

      <div className="controls">
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
