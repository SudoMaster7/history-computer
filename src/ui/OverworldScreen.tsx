import { useEffect, useRef, useState } from 'react';
import type { EraId } from '@/core/types';
import { ERAS, POWER_OF_ERA } from '@/core/powers';
import {
  BOSS_STAGE,
  STAGE_LETTERS,
  eraCleared,
  nextStage,
  stageCleared,
  stageId,
  stageUnlocked,
} from '@/core/campaign';
import { stageFragmentId } from '@/core/stage';
import { getStage, stageText } from '@/data/stages';
import { useGameStore } from '@/store';
import { IconFragment, IconMenu, IconStar } from './icons';
import DifficultyPicker from './DifficultyPicker';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  onPlay(id: string): void;
  onBoss(): void;
  onMenu(): void;
  /** Fase recem-concluida: o mapa anima a que abriu depois dela. */
  justCleared?: string | null;
}

/** Quanto o Bit leva saltando ate o no escolhido, antes de a fase abrir. */
const HOP_MS = 520;

const STARS_PER_STAGE = 3;

/**
 * Mapa da jornada (D73), no espirito do mapa de Super Mario World: seis ilhas,
 * uma por era, com duas fases cada, ligadas por uma trilha, e o BUG Day 0 no
 * fim. O Bit fica sobre a fase em que o jogador esta; tocar numa fase aberta
 * faz o Bit saltar ate ela e a fase abre.
 *
 * E HTML, nao canvas (D79): cada fase e um botao de verdade, com alvo de 44 px,
 * nome lido pelo leitor de tela e rotulo para o teste de ponta a ponta.
 */
export default function OverworldScreen({ onPlay, onBoss, onMenu, justCleared }: Props) {
  const missions = useGameStore((s) => s.player.missions);
  const collected = useGameStore((s) => s.fragments);
  const devMode = useGameStore((s) => s.settings.devMode === true);

  const next = nextStage(missions);
  const [at, setAt] = useState<string>(justCleared ?? next);
  const [hopping, setHopping] = useState(false);
  const fresh = justCleared && next !== justCleared ? next : null;
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({});

  // Depois de concluir, o Bit anda sozinho ate a fase que abriu.
  useEffect(() => {
    if (!fresh) return;
    const id = window.setTimeout(() => setAt(fresh), HOP_MS);
    return () => window.clearTimeout(id);
  }, [fresh]);

  // A fase atual fica a vista quando o mapa abre.
  useEffect(() => {
    nodeRefs.current[at]?.scrollIntoView?.({ block: 'center' });
  }, [at]);

  function choose(id: string): void {
    if (hopping) return;
    setAt(id);
    setHopping(true);
    window.setTimeout(() => {
      setHopping(false);
      if (id === BOSS_STAGE) onBoss();
      else onPlay(id);
    }, HOP_MS);
  }

  const found = collected ?? [];
  const starsOf = (id: string): number => missions[id]?.stars ?? 0;
  const fragmentsOf = (id: string): number => {
    const def = getStage(id);
    if (!def) return 0;
    return def.fragments.filter((_, i) => found.includes(stageFragmentId(def, i))).length;
  };
  const allIds = ERAS.flatMap((era) => STAGE_LETTERS.map((l) => stageId(era, l)));
  const totalStars = allIds.reduce((sum, id) => sum + starsOf(id), 0);
  const totalFragments = allIds.reduce((sum, id) => sum + fragmentsOf(id), 0);
  const maxFragments = allIds.reduce((sum, id) => sum + (getStage(id)?.fragments.length ?? 0), 0);
  const bossOpen = stageUnlocked(BOSS_STAGE, missions, devMode);

  const bit = (id: string) =>
    at === id ? <span className="overworld__bit" data-hop={hopping} aria-hidden="true" /> : null;

  return (
    <section className="overworld game-surface" aria-label={ui.map.title}>
      <header className="overworld__head">
        <button type="button" className="overworld__menu" aria-label={ui.map.menu} onClick={onMenu}>
          <IconMenu size={20} />
        </button>
        <div>
          <h1 className="overworld__title">{ui.map.title}</h1>
          <p className="overworld__tagline">{ui.map.tagline}</p>
        </div>
      </header>

      <ul className="overworld__totals">
        <li aria-label={`${ui.map.stars}: ${totalStars}`}>
          <IconStar size={14} filled /> {totalStars}/{allIds.length * STARS_PER_STAGE}
        </li>
        <li aria-label={`${ui.map.fragments}: ${totalFragments}`}>
          <IconFragment size={14} /> {totalFragments}/{maxFragments}
        </li>
      </ul>

      <DifficultyPicker />

      <ol className="overworld__abilities" aria-label={ui.map.abilities}>
        {ERAS.map((era) => {
          const power = POWER_OF_ERA[era];
          const got = eraCleared(era, missions);
          return (
            <li
              key={era}
              data-era={era}
              data-got={got}
              title={got ? ui.abilities[power].text : ui.map.abilityLocked}
            >
              {ui.abilities[power].name}
            </li>
          );
        })}
      </ol>

      <ol className="overworld__trail">
        {ERAS.map((era, eraIndex) => (
          <li key={era} className="island" data-era={era}>
            <p className="island__name">
              <span className="island__number">{eraIndex + 1}</span> {ui.eras[era as EraId]}
              <small> · {ui.eraSubtitles[era]}</small>
            </p>
            <div className="island__nodes">
              {STAGE_LETTERS.map((letter, k) => {
                const id = stageId(era, letter);
                const open = stageUnlocked(id, missions, devMode);
                const done = stageCleared(id, missions);
                const state = done ? 'done' : open ? 'open' : 'locked';
                const title = stageText(id)?.title ?? id;
                const label = `${ui.map.stage} ${eraIndex + 1}-${letter}: ${title}. ${
                  done ? ui.map.cleared : open ? ui.map.next : ui.map.locked
                }`;
                return (
                  <div
                    key={id}
                    className="node"
                    data-side={k === 0 ? 'left' : 'right'}
                    ref={(el) => {
                      nodeRefs.current[id] = el;
                    }}
                  >
                    {bit(id)}
                    <button
                      type="button"
                      className="node__button"
                      data-state={state}
                      data-fresh={fresh === id}
                      disabled={!open || hopping}
                      aria-label={label}
                      onClick={() => choose(id)}
                    >
                      <span className="node__code">
                        {eraIndex + 1}-{letter}
                      </span>
                      <span className="node__title">{title}</span>
                      {open ? (
                        <span className="node__score">
                          <span className="node__stars" aria-hidden="true">
                            {Array.from({ length: STARS_PER_STAGE }, (_, i) => (
                              <IconStar key={i} size={12} filled={i < starsOf(id)} />
                            ))}
                          </span>
                          <span className="node__frags">
                            <IconFragment size={12} /> {fragmentsOf(id)}/
                            {getStage(id)?.fragments.length ?? 0}
                          </span>
                        </span>
                      ) : (
                        <span className="node__lock">{ui.map.locked}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </li>
        ))}

        <li className="island island--boss">
          <div
            className="node node--boss"
            ref={(el) => {
              nodeRefs.current[BOSS_STAGE] = el;
            }}
          >
            {bit(BOSS_STAGE)}
            <button
              type="button"
              className="node__button"
              data-state={bossOpen ? 'open' : 'locked'}
              data-fresh={fresh === BOSS_STAGE}
              disabled={!bossOpen || hopping}
              aria-label={`${ui.map.boss}. ${bossOpen ? ui.map.next : ui.map.locked}`}
              onClick={() => choose(BOSS_STAGE)}
            >
              <span className="node__code">!</span>
              <span className="node__title">{ui.map.boss}</span>
              <span className="node__lock">{ui.map.bossText}</span>
            </button>
          </div>
        </li>
      </ol>

      {fresh ? (
        <p className="overworld__toast" role="status">
          {ui.map.unlocked}
        </p>
      ) : null}
    </section>
  );
}
