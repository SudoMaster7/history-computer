import { useEffect, useState } from 'react';
import MainMenu from './ui/MainMenu';
import OverworldScreen from './ui/OverworldScreen';
import StageScreen from './ui/StageScreen';
import MissionRunner from './ui/MissionRunner';
import BossScreen from './ui/BossScreen';
import ErrorBoundary from './ui/ErrorBoundary';
import { eraOfStage } from '@/core/campaign';
import { getStage } from '@/data/stages';
import { stageFragmentId } from '@/core/stage';
import { registerMinigames } from '@/minigames';
import { useGameStore } from '@/store';
import { play, playMusic, setMuted } from '@/fx';
import type { SoundName, TrackName } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import './styles/app.css';
import './styles/fx.css';
import './styles/minigames.css';
import './styles/stage.css';
import './styles/pixel.css';

registerMinigames();

/**
 * O jogo e um mapa de fases (D73): menu -> mapa -> fase de plataforma -> o
 * minijogo da era no terminal do fim -> de volta ao mapa, com a fase seguinte
 * aberta. O chefao fecha a campanha.
 */
type View =
  | { screen: 'menu' }
  | { screen: 'map'; justCleared?: string | null }
  | { screen: 'stage'; id: string }
  | { screen: 'mission'; id: string }
  | { screen: 'boss' };

export default function App() {
  const settings = useGameStore((s) => s.settings);
  const collectFragment = useGameStore((s) => s.collectFragment);

  const [view, setView] = useState<View>({ screen: 'menu' });
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = (): void => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // O som obedece ao ajuste salvo. `!== false`: save antigo pode nao ter a chave.
  useEffect(() => {
    setMuted(settings.muted !== false);
  }, [settings.muted]);

  /*
   * A musica acompanha a tela: uma faixa no menu, uma no mapa, a da era na fase
   * e no minijogo dela, e uma no chefao.
   */
  const era = view.screen === 'stage' || view.screen === 'mission' ? eraOfStage(view.id) : null;
  const track: TrackName | null =
    settings.muted !== false || settings.music === false
      ? null
      : view.screen === 'menu'
        ? 'menu'
        : view.screen === 'boss'
          ? 'boss'
          : view.screen === 'map'
            ? 'map'
            : era;

  useEffect(() => {
    playMusic(track);
  }, [track]);

  // Saiu do jogo: a musica para junto.
  useEffect(() => () => playMusic(null), []);

  /*
   * Todo botao responde com som, de um lugar so: assim nenhuma tela esquece.
   * O botao pode escolher o proprio efeito com `data-sfx` (ou "none").
   */
  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!target || target.disabled) return;
      const sfx = target.dataset.sfx;
      if (sfx === 'none') return;
      play((sfx as SoundName | undefined) ?? 'tap');
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  /** A fase acabou no terminal: guarda os fragmentos e abre o minijogo. */
  function clearStage(id: string, collected: number[]): void {
    const def = getStage(id);
    if (def) for (const index of collected) collectFragment(stageFragmentId(def, index));
    setView({ screen: 'mission', id });
  }

  const toMap = (justCleared: string | null = null): void =>
    setView({ screen: 'map', justCleared });

  return (
    <div
      className="app"
      /* Faixa que esta tocando, para o teste de ponta a ponta conferir. */
      data-music={track ?? 'off'}
    >
      <div className="layout">
        <div className="stage">
          <ErrorBoundary fallback={<p className="pad">{ui.app.renderFail}</p>}>
            {view.screen === 'menu' ? (
              <>
                {offline ? <p className="app__offline">{ui.app.offline}</p> : null}
                <MainMenu onPlay={() => toMap()} onBoss={() => setView({ screen: 'boss' })} />
              </>
            ) : null}

            {view.screen === 'map' ? (
              <OverworldScreen
                justCleared={view.justCleared ?? null}
                onPlay={(id) => setView({ screen: 'stage', id })}
                onBoss={() => setView({ screen: 'boss' })}
                onMenu={() => setView({ screen: 'menu' })}
              />
            ) : null}

            {view.screen === 'stage' ? (
              <StageScreen
                key={view.id}
                stageId={view.id}
                onClear={(collected) => clearStage(view.id, collected)}
                onExit={() => toMap()}
              />
            ) : null}

            {view.screen === 'mission' ? (
              <MissionRunner missionId={view.id} onExit={() => toMap(view.id)} />
            ) : null}

            {view.screen === 'boss' ? <BossScreen seed="bug-day-0" onExit={() => toMap()} /> : null}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
