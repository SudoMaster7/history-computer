import { useMemo, useState } from 'react';
import { ERAS } from '@/core/powers';
import { STAGE_ORDER, clearedErasOf, nextStage, eraOfStage } from '@/core/campaign';
import { stageFragmentId } from '@/core/stage';
import { STAGES } from '@/data/stages';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import MenuBanner from './MenuBanner';
import DifficultyPicker from './DifficultyPicker';
import { IconFragment, IconSound, IconSoundOff, IconStar } from './icons';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  /** Abre o mapa da jornada. */
  onPlay(): void;
  /** Abre o chefao. So aparece com as 12 fases concluidas. */
  onBoss(): void;
}

type Panel = 'main' | 'settings' | 'about';

/** Estrelas que uma fase pode render: tres no minijogo do fim. */
const STARS_PER_STAGE = 3;

/** Menu inicial do jogo: jogar (abre o mapa), comecar de novo e ajustes. */
export default function MainMenu({ onPlay, onBoss }: Props) {
  const player = useGameStore((s) => s.player);
  const collected = useGameStore((s) => s.fragments);
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const resetGame = useGameStore((s) => s.resetGame);
  const hasProgress = useGameStore((s) => s.hasProgress);
  const canFaceBoss = useGameStore((s) => s.canFaceBoss);
  const bossDefeated = useGameStore((s) => s.bossDefeated);
  const bossBestScore = useGameStore((s) => s.bossBestScore);

  const [panel, setPanel] = useState<Panel>('main');
  const clearedEras = clearedErasOf(player.missions);

  /** A era da proxima fase a jogar: e ela que passa na faixa de abertura. */
  const now: EraId = eraOfStage(nextStage(player.missions)) ?? 'ia';

  function startNew(): void {
    if (hasProgress() && !window.confirm(ui.menu.newGameWarning)) return;
    resetGame();
    onPlay();
  }

  /* Estrelas e fragmentos lidos do save: leitura, nao regra. */
  const totals = useMemo(() => {
    const found = collected ?? [];
    return {
      stars: STAGE_ORDER.reduce((sum, id) => sum + (player.missions[id]?.stars ?? 0), 0),
      starsMax: STAGE_ORDER.length * STARS_PER_STAGE,
      fragments: STAGES.reduce(
        (sum, def) =>
          sum + def.fragments.filter((_, i) => found.includes(stageFragmentId(def, i))).length,
        0,
      ),
      fragmentsMax: STAGES.reduce((sum, def) => sum + def.fragments.length, 0),
    };
  }, [player.missions, collected]);

  // `!== false`: save antigo pode nao ter a chave, e o som comeca desligado.
  const muted = settings.muted !== false;

  return (
    <section className={`menu menu--${now} game-surface`} aria-label={ui.menu.title}>
      <div className="menu__top">
        <div className="menu__heading">
          <h1 className="menu__title">{ui.menu.title}</h1>
          <p className="menu__tagline">{ui.menu.tagline}</p>
        </div>
        <button
          type="button"
          className="menu__sound"
          aria-label={muted ? ui.menu.soundOn : ui.menu.soundOff}
          aria-pressed={!muted}
          onClick={() => setSettings({ muted: !muted })}
        >
          {muted ? <IconSoundOff size={20} /> : <IconSound size={20} />}
        </button>
      </div>

      {/* Faixa de abertura: a zona da era atual passando, com o Bit andando. */}
      <div className="menu__art" aria-hidden="true">
        <MenuBanner era={now} />
      </div>

      {/* A jornada: as seis eras numa linha, da Pascalina a IA. */}
      <ol className="journey" aria-label={ui.menu.journey}>
        {ERAS.map((era, index) => {
          const cleared = clearedEras.includes(era);
          const state = cleared ? 'done' : era === now ? 'now' : 'locked';
          const label = cleared
            ? ui.menu.eraDone
            : era === now
              ? ui.menu.eraCurrent
              : ui.menu.eraLocked;
          return (
            <li
              key={era}
              className="journey__step"
              data-state={state}
              data-era={era}
              aria-label={`${ui.eras[era]}: ${label}`}
            >
              <span className="journey__dot" aria-hidden="true">
                {index + 1}
              </span>
              <span className="journey__year" aria-hidden="true">
                {ui.eraSubtitles[era].split(' ')[0]}
              </span>
            </li>
          );
        })}
      </ol>

      {hasProgress() ? (
        <ul className="menu__stats">
          <li className="menu__stat">
            <IconStar size={16} filled />
            <strong>
              {totals.stars}/{totals.starsMax}
            </strong>
            <span className="label">{ui.menu.starsTotal}</span>
          </li>
          <li className="menu__stat">
            <IconFragment size={16} />
            <strong>
              {totals.fragments}/{totals.fragmentsMax}
            </strong>
            <span className="label">{ui.menu.fragmentsTotal}</span>
          </li>
        </ul>
      ) : null}

      {panel === 'main' ? (
        <div className="menu__actions">
          {hasProgress() ? (
            <button type="button" className="menu__primary" onClick={onPlay}>
              {ui.menu.continueGame}
            </button>
          ) : (
            <button type="button" className="menu__primary" onClick={startNew}>
              {ui.menu.newGame}
            </button>
          )}
          {hasProgress() ? (
            <button type="button" onClick={startNew}>
              {ui.menu.newGame}
            </button>
          ) : null}
          {canFaceBoss() ? (
            <button type="button" className="menu__boss" onClick={onBoss}>
              {bossDefeated ? ui.menu.bossAgain : ui.menu.boss}
            </button>
          ) : null}
          {bossDefeated ? (
            <p className="menu__bossScore">
              {ui.boss.score}: {bossBestScore}
            </p>
          ) : null}
          <button type="button" onClick={() => setPanel('settings')}>
            {ui.menu.settings}
          </button>
          <button type="button" onClick={() => setPanel('about')}>
            {ui.menu.about}
          </button>
        </div>
      ) : null}

      {panel === 'settings' ? (
        <div className="menu__panel menu__actions">
          <DifficultyPicker />
          <button
            type="button"
            className="menu__toggle"
            aria-pressed={!muted}
            onClick={() => setSettings({ muted: !muted })}
          >
            {ui.settings.sound}
          </button>
          <button
            type="button"
            className="menu__toggle"
            /* !== false: save antigo nao tem a chave, e a musica comeca ligada. */
            aria-pressed={settings.music !== false}
            disabled={muted}
            onClick={() => setSettings({ music: settings.music === false })}
          >
            {ui.settings.music}
          </button>
          <button
            type="button"
            className="menu__toggle"
            aria-pressed={settings.vibration}
            onClick={() => setSettings({ vibration: !settings.vibration })}
          >
            {ui.settings.vibration}
          </button>
          <button
            type="button"
            className={
              settings.devMode ? 'menu__toggle menu__dev menu__dev--on' : 'menu__toggle menu__dev'
            }
            /* === true: save antigo foi gravado sem esta chave, e aria-pressed
               nao pode sair indefinido. */
            aria-pressed={settings.devMode === true}
            onClick={() => setSettings({ devMode: settings.devMode !== true })}
          >
            {ui.settings.devMode}
          </button>
          <p className="menu__devText">
            {settings.devMode ? ui.settings.devModeOn : ui.settings.devModeText}
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(ui.app.resetConfirm)) resetGame();
            }}
          >
            {ui.app.reset}
          </button>
          <button type="button" onClick={() => setPanel('main')}>
            {ui.app.back}
          </button>
        </div>
      ) : null}

      {panel === 'about' ? (
        <div className="menu__panel">
          <p className="menu__about">{ui.menu.aboutText}</p>
          <button type="button" onClick={() => setPanel('main')}>
            {ui.app.back}
          </button>
        </div>
      ) : null}
    </section>
  );
}
