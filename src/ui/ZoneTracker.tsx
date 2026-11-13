import type { WorldDef } from '@/core/world';
import { IconDoor, IconFragment, IconStar } from './icons';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  world: WorldDef;
  /** Estrelas por missao. */
  stars: Readonly<Record<string, number>>;
  fragmentsFound: number;
  fragmentsTotal: number;
  doorOpen: boolean;
  /** A prova desta era ja foi passada. */
  cleared: boolean;
  /** Ha espaco na tela: mostra o titulo e o proximo passo, alem das fichas. */
  full: boolean;
}

/**
 * Objetivos da zona, sempre a vista: as duas missoes com as estrelas, os
 * fragmentos achados e o estado da prova.
 *
 * Existe porque "o que falta fazer aqui?" e a pergunta que faz o jogador
 * continuar -- e antes a resposta so aparecia ao encostar na porta. E leitura
 * pura do progresso: nao decide nada.
 */
export default function ZoneTracker({
  world,
  stars,
  fragmentsFound,
  fragmentsTotal,
  doorOpen,
  cleared,
  full,
}: Props) {
  const t = ui.world;
  const missionsDone = world.stations.every((s) => (stars[s.missionId] ?? 0) >= 1);
  const allFragments = fragmentsFound >= fragmentsTotal;

  const next = !missionsDone
    ? t.nextStation
    : !cleared
      ? t.nextDoor
      : !allFragments
        ? t.nextFragments
        : t.allDone;

  const quizState = cleared ? t.quizDone : doorOpen ? t.quizOpen : t.quizLocked;

  return (
    <div className={full ? 'tracker tracker--full' : 'tracker'} aria-label={t.trackerTitle}>
      {full ? <h3 className="tracker__title label">{t.trackerTitle}</h3> : null}

      <ul className="tracker__chips">
        {world.stations.map((station) => {
          const earned = stars[station.missionId] ?? 0;
          const letter = station.missionId.split('-')[1] ?? '';
          return (
            <li
              key={station.id}
              className={earned >= 1 ? 'chip chip--done' : 'chip'}
              aria-label={`${t.missionShort} ${letter}: ${earned} ${ui.mission.stars}`}
            >
              <span className="chip__name" aria-hidden="true">
                {full ? `${t.missionShort} ${letter}` : letter}
              </span>
              <span className="chip__stars" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <IconStar key={step} size={12} filled={earned >= step} />
                ))}
              </span>
            </li>
          );
        })}

        <li
          className={allFragments ? 'chip chip--done' : 'chip'}
          aria-label={`${t.fragments}: ${fragmentsFound} ${t.fragmentsOf} ${fragmentsTotal}`}
        >
          <span aria-hidden="true" className="chip__icon">
            <IconFragment size={14} />
          </span>
          <span className="chip__name" aria-hidden="true">
            {fragmentsFound} {t.fragmentsOf} {fragmentsTotal}
          </span>
        </li>

        <li
          className={cleared ? 'chip chip--done' : doorOpen ? 'chip chip--ready' : 'chip'}
          aria-label={`${t.quiz}: ${quizState}`}
        >
          <span aria-hidden="true" className="chip__icon">
            <IconDoor size={14} />
          </span>
          <span className="chip__name" aria-hidden="true">
            {full ? `${t.quiz}: ${quizState}` : quizState}
          </span>
        </li>
      </ul>

      {full ? <p className="tracker__next">{next}</p> : null}
    </div>
  );
}
