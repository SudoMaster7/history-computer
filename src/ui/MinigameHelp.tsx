import { useState } from 'react';
import type { EraId } from '@/core/types';
import { briefOfEra } from '@/data/minigameBriefs';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  era: EraId;
  /** No chefao o espaco e curto: a explicacao fica recolhida, as dicas ficam. */
  mode: 'mission' | 'micro';
}

/**
 * Ajuda do minijogo, igual em todas as eras: o que aquilo representa na
 * historia da computacao, e dicas liberadas uma por toque.
 *
 * Fica recolhido atras de dois botoes (mesma escolha do HUD, D31): quem quer
 * jogar nao perde a tela, e quem travou tem onde pedir ajuda sem sair da missao.
 */
export default function MinigameHelp({ era, mode }: Props) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const t = ui.help;

  const brief = briefOfEra(era);
  if (!brief) return null;

  const hints = brief.hints;
  const allShown = shown >= hints.length;

  return (
    <div className="help">
      <div className="controls help__actions">
        <button
          type="button"
          className="help__toggle"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? t.close : t.what}
        </button>
        <button
          type="button"
          className="help__hint"
          disabled={allShown}
          onClick={() => setShown((current) => Math.min(current + 1, hints.length))}
        >
          {shown === 0 ? t.hint : `${t.hint} ${shown + 1} ${t.of} ${hints.length}`}
        </button>
      </div>

      {open ? (
        <div className="help__panel" aria-label={t.what}>
          <h3>{t.whatTitle}</h3>
          <p className="help__machine">{brief.machine}</p>
          <p>{brief.represents}</p>
          <h4>{t.powerTitle}</h4>
          <p>{brief.power}</p>
          {mode === 'mission' ? (
            <>
              <h4>{t.lessonTitle}</h4>
              <p>{brief.lesson}</p>
            </>
          ) : null}
        </div>
      ) : null}

      {shown > 0 ? (
        <ol className="help__hints" aria-label={t.hintsLabel}>
          {hints.slice(0, shown).map((hint, index) => (
            <li key={index}>{hint}</li>
          ))}
          {allShown ? <li className="help__hintsEnd">{t.noMoreHints}</li> : null}
        </ol>
      ) : null}
    </div>
  );
}
