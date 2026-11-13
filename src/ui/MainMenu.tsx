import { useMemo, useState } from 'react';
import { ERAS } from '@/core/powers';
import { fragmentsOf } from '@/core/world';
import { worldOfEra } from '@/data/worlds';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import MenuBanner from './MenuBanner';
import { IconFragment, IconLevel, IconSound, IconSoundOff, IconStar } from './icons';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  onPlay(era: EraId): void;
  /** Abre o chefao. So aparece com as seis eras concluidas. */
  onBoss(): void;
}

type Panel = 'main' | 'zones' | 'settings' | 'about';

/** Estrelas que uma zona pode render: tres por missao. */
const STARS_PER_MISSION = 3;

/** Menu inicial do jogo: continuar, comecar de novo, escolher zona e ajustes. */
export default function MainMenu({ onPlay, onBoss }: Props) {
  const player = useGameStore((s) => s.player);
  const clearedEras = useGameStore((s) => s.clearedEras);
  const collected = useGameStore((s) => s.fragments);
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const resetGame = useGameStore((s) => s.resetGame);
  const hasProgress = useGameStore((s) => s.hasProgress);
  const canFaceBoss = useGameStore((s) => s.canFaceBoss);
  const isEraUnlocked = useGameStore((s) => s.isEraUnlocked);
  const bossDefeated = useGameStore((s) => s.bossDefeated);
  const bossBestScore = useGameStore((s) => s.bossBestScore);

  const [panel, setPanel] = useState<Panel>('main');

  /**
   * Continuar leva a zona mais avancada que ja esta liberada -- e no modo
   * desenvolvedor, a mais avancada que o jogador de fato concluiu, para o botao
   * nao jogar direto na Era 6 de quem ligou o modo so para espiar.
   */
  function currentEra(): EraId {
    const open = ERAS.filter((_, index) => index === 0 || clearedEras.includes(ERAS[index - 1]!));
    return open.at(-1) ?? 'mecanica';
  }

  function startNew(): void {
    if (hasProgress() && !window.confirm(ui.menu.newGameWarning)) return;
    resetGame();
    onPlay('mecanica');
  }

  /*
   * O progresso de cada era, lido do save: estrelas das duas missoes e
   * fragmentos achados. E leitura, nao regra -- serve para o menu mostrar o
   * quanto ja foi feito e o quanto falta.
   */
  const progress = useMemo(() => {
    const found = collected ?? [];
    return ERAS.map((era) => {
      const world = worldOfEra(era);
      const stations = world?.stations ?? [];
      const fragments = world ? fragmentsOf(world) : [];
      return {
        era,
        stars: stations.reduce((sum, s) => sum + (player.missions[s.missionId]?.stars ?? 0), 0),
        starsMax: stations.length * STARS_PER_MISSION,
        missions: stations.filter((s) => (player.missions[s.missionId]?.stars ?? 0) >= 1).length,
        fragments: fragments.filter((f) => found.includes(f.id)).length,
        fragmentsMax: fragments.length,
      };
    });
  }, [player.missions, collected]);

  const totals = progress.reduce(
    (sum, p) => ({
      stars: sum.stars + p.stars,
      starsMax: sum.starsMax + p.starsMax,
      fragments: sum.fragments + p.fragments,
      fragmentsMax: sum.fragmentsMax + p.fragmentsMax,
    }),
    { stars: 0, starsMax: 0, fragments: 0, fragmentsMax: 0 },
  );

  const now = currentEra();
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
        <MenuBanner era={now} reduceMotion={settings.reduceMotion} />
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
            <IconLevel size={16} />
            <strong>{player.level}</strong>
            <span className="label">{ui.hud.level}</span>
          </li>
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
            <button type="button" className="menu__primary" onClick={() => onPlay(currentEra())}>
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
          <button type="button" onClick={() => setPanel('zones')}>
            {ui.menu.zones}
          </button>
          <button type="button" onClick={() => setPanel('settings')}>
            {ui.menu.settings}
          </button>
          <button type="button" onClick={() => setPanel('about')}>
            {ui.menu.about}
          </button>
        </div>
      ) : null}

      {panel === 'zones' ? (
        <div className="menu__panel">
          <ul className="menu__zones">
            {progress.map((entry) => {
              const era = entry.era;
              const locked = !isEraUnlocked(era);
              const cleared = clearedEras.includes(era);
              return (
                <li key={era}>
                  <button
                    type="button"
                    className="menu__zone"
                    data-era={era}
                    disabled={locked}
                    onClick={() => onPlay(era)}
                    aria-label={locked ? `${ui.eras[era]}. ${ui.menu.locked}` : ui.eras[era]}
                  >
                    <strong>{ui.eras[era]}</strong>
                    <small>
                      {ui.eraSubtitles[era]} — {ui.minigames[era]}
                    </small>
                    <span className="menu__tag">
                      {locked
                        ? ui.menu.locked
                        : cleared
                          ? ui.quiz.passed
                          : `${entry.missions}/2 ${ui.world.missionsDone}`}
                    </span>
                    {locked ? null : (
                      <span className="menu__zoneScore">
                        <span className="menu__zoneStars">
                          <IconStar size={13} filled />
                          {entry.stars}/{entry.starsMax}
                        </span>
                        <span className="menu__zoneFragments">
                          <IconFragment size={13} />
                          {entry.fragments}/{entry.fragmentsMax}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setPanel('main')}>
            {ui.app.back}
          </button>
        </div>
      ) : null}

      {panel === 'settings' ? (
        <div className="menu__panel menu__actions">
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
            aria-pressed={settings.reduceMotion}
            onClick={() => setSettings({ reduceMotion: !settings.reduceMotion })}
          >
            {ui.settings.reduceMotion}
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
