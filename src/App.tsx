import { useCallback, useEffect, useState } from 'react';
import Hud from './ui/Hud';
import Quiz from './ui/Quiz';
import MainMenu from './ui/MainMenu';
import WorldScreen from './ui/WorldScreen';
import MissionRunner from './ui/MissionRunner';
import BossScreen from './ui/BossScreen';
import Tutorial from './ui/Tutorial';
import { TUTORIAL_STEPS } from './ui/tutorialSteps';
import ErrorBoundary from './ui/ErrorBoundary';
import { ERAS } from '@/core/powers';
import { worldOfEra } from '@/data/worlds';
import { registerMinigames } from '@/minigames';
import { useGameStore } from '@/store';
import { play, playMusic, setMuted } from '@/fx';
import type { SoundName, TrackName } from '@/fx';
import type { EraId } from '@/core/types';
import ui from '@/data/ui.pt-BR.json';
import './styles/app.css';
import './styles/fx.css';

registerMinigames();

/** A era seguinte na linha do tempo, ou null se esta foi a ultima. */
function nextEra(era: EraId): EraId | null {
  const index = ERAS.indexOf(era);
  return index >= 0 && index + 1 < ERAS.length ? (ERAS[index + 1] ?? null) : null;
}

type View =
  | { screen: 'menu' }
  | { screen: 'world'; era: EraId }
  | { screen: 'mission'; era: EraId; missionId: string }
  | { screen: 'quiz'; era: EraId }
  | { screen: 'boss' };

export default function App() {
  const settings = useGameStore((s) => s.settings);
  const openQuiz = useGameStore((s) => s.openQuiz);
  const closeQuiz = useGameStore((s) => s.closeQuiz);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const finishTutorial = useGameStore((s) => s.finishTutorial);
  const canFaceBoss = useGameStore((s) => s.canFaceBoss);

  const [view, setView] = useState<View>({ screen: 'menu' });
  const [offline, setOffline] = useState(false);
  const [step, setStep] = useState(0);

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
   * A musica acompanha a tela: uma faixa no menu, uma por era (que segue
   * tocando dentro da missao), uma na prova e uma no chefao. So toca com o som
   * ligado e o ajuste "Musica" ligado; `!== false` porque save antigo nao tem
   * a chave, e o padrao dela e ligada.
   */
  const track: TrackName | null =
    settings.muted !== false || settings.music === false
      ? null
      : view.screen === 'menu'
        ? 'menu'
        : view.screen === 'boss'
          ? 'boss'
          : view.screen === 'quiz'
            ? 'quiz'
            : view.era;

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

  const advance = useCallback(
    (to: number): void => {
      setStep((current) => {
        if (to <= current) return current;
        if (to >= TUTORIAL_STEPS.length) {
          finishTutorial();
          return current;
        }
        return to;
      });
    },
    [finishTutorial],
  );

  /** O tutorial anda conforme o jogador faz a acao pedida na zona. */
  const onWorldEvent = useCallback(
    (event: 'moved' | 'station' | 'npc' | 'door'): void => {
      if (tutorialDone) return;
      if (event === 'moved') advance(1);
      if (event === 'station') advance(2);
    },
    [advance, tutorialDone],
  );

  function goMenu(): void {
    closeQuiz();
    setView({ screen: 'menu' });
  }

  function enterQuiz(era: EraId): void {
    openQuiz(era);
    setView({ screen: 'quiz', era });
  }

  /**
   * Prova passada: segue para a zona da era seguinte. Depois da ultima era, o
   * que resta e o chefao -- e ele so abre com as seis eras concluidas.
   */
  function afterQuiz(era: EraId): void {
    closeQuiz();
    const next = nextEra(era);
    if (next) {
      setView({ screen: 'world', era: next });
      return;
    }
    setView(canFaceBoss() ? { screen: 'boss' } : { screen: 'menu' });
  }

  const showTutorial = !tutorialDone && view.screen === 'world' && view.era === 'mecanica';

  return (
    <div
      className={settings.reduceMotion ? 'app reduce-motion' : 'app'}
      /* Faixa que esta tocando, para o teste de ponta a ponta conferir. */
      data-music={track ?? 'off'}
    >
      <div className="layout">
        <div className="stage">
          <ErrorBoundary fallback={<p className="pad">{ui.app.renderFail}</p>}>
            {view.screen === 'menu' ? (
              <>
                {offline ? <p className="app__offline">{ui.app.offline}</p> : null}
                <MainMenu
                  onPlay={(era) => setView({ screen: 'world', era })}
                  onBoss={() => setView({ screen: 'boss' })}
                />
              </>
            ) : null}

            {view.screen === 'world'
              ? (() => {
                  const world = worldOfEra(view.era);
                  if (!world) return <p className="pad">{ui.app.renderFail}</p>;
                  return (
                    <>
                      <WorldScreen
                        world={world}
                        onOpenStation={(missionId) =>
                          setView({ screen: 'mission', era: view.era, missionId })
                        }
                        onOpenDoor={() => enterQuiz(view.era)}
                        onMenu={goMenu}
                        onEvent={onWorldEvent}
                      />
                      {showTutorial ? (
                        <Tutorial
                          step={step}
                          onNext={() => advance(step + 1)}
                          onSkip={finishTutorial}
                        />
                      ) : null}
                    </>
                  );
                })()
              : null}

            {view.screen === 'mission' ? (
              <MissionRunner
                missionId={view.missionId}
                onExit={() => {
                  if (!tutorialDone) advance(3);
                  setView({ screen: 'world', era: view.era });
                }}
              />
            ) : null}

            {view.screen === 'boss' ? <BossScreen seed="bug-day-0" onExit={goMenu} /> : null}

            {view.screen === 'menu' ? null : <Hud />}

            {view.screen === 'quiz' ? (
              <Quiz
                era={view.era}
                onFinish={() => afterQuiz(view.era)}
                onExit={() => {
                  closeQuiz();
                  setView({ screen: 'world', era: view.era });
                }}
              />
            ) : null}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
