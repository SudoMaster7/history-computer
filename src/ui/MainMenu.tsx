import { useState } from 'react';
import { ERAS } from '@/core/powers';
import { worldOfEra } from '@/data/worlds';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  onPlay(era: EraId): void;
  /** Abre o chefao. So aparece com as seis eras concluidas. */
  onBoss(): void;
}

type Panel = 'main' | 'zones' | 'settings' | 'about';

/** Menu inicial do jogo: continuar, comecar de novo, escolher zona e ajustes. */
export default function MainMenu({ onPlay, onBoss }: Props) {
  const player = useGameStore((s) => s.player);
  const clearedEras = useGameStore((s) => s.clearedEras);
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

  return (
    <section className="menu game-surface" aria-label={ui.menu.title}>
      <h1 className="menu__title">{ui.menu.title}</h1>
      <p className="menu__tagline">{ui.menu.tagline}</p>

      {/* Faixa de abertura: os proprios tiles do jogo, com o Bit em cima. */}
      <div className="menu__art" aria-hidden="true">
        <span className="menu__hero" />
      </div>

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
            {ERAS.map((era) => {
              const locked = !isEraUnlocked(era);
              const world = worldOfEra(era);
              const done = world
                ? world.stations.filter((s) => (player.missions[s.missionId]?.stars ?? 0) >= 1)
                    .length
                : 0;
              const cleared = clearedEras.includes(era);
              return (
                <li key={era}>
                  <button
                    type="button"
                    className="menu__zone"
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
                          : `${done}/2 ${ui.world.missionsDone}`}
                    </span>
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
            aria-pressed={settings.reduceMotion}
            onClick={() => setSettings({ reduceMotion: !settings.reduceMotion })}
          >
            {ui.settings.reduceMotion}
          </button>
          <button
            type="button"
            aria-pressed={settings.vibration}
            onClick={() => setSettings({ vibration: !settings.vibration })}
          >
            {ui.settings.vibration}
          </button>
          <button
            type="button"
            className={settings.devMode ? 'menu__dev menu__dev--on' : 'menu__dev'}
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
