import { useCallback, useEffect, useState } from 'react';
import Hud from './ui/Hud';
import Quiz from './ui/Quiz';
import MainMenu from './ui/MainMenu';
import WorldScreen from './ui/WorldScreen';
import MissionRunner from './ui/MissionRunner';
import Tutorial from './ui/Tutorial';
import { TUTORIAL_STEPS } from './ui/tutorialSteps';
import ErrorBoundary from './ui/ErrorBoundary';
import { ERAS } from '@/core/powers';
import { worldOfEra } from '@/data/worlds';
import { registerMinigames } from '@/minigames';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import ui from '@/data/ui.pt-BR.json';
import './styles/app.css';

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
  | { screen: 'quiz'; era: EraId };

export default function App() {
  const settings = useGameStore((s) => s.settings);
  const openQuiz = useGameStore((s) => s.openQuiz);
  const closeQuiz = useGameStore((s) => s.closeQuiz);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const finishTutorial = useGameStore((s) => s.finishTutorial);

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

  /** Prova passada: segue para a zona da era seguinte, se houver. */
  function afterQuiz(era: EraId): void {
    closeQuiz();
    const next = nextEra(era);
    setView(next ? { screen: 'world', era: next } : { screen: 'menu' });
  }

  const showTutorial = !tutorialDone && view.screen === 'world' && view.era === 'mecanica';

  return (
    <div className={settings.reduceMotion ? 'app reduce-motion' : 'app'}>
      <div className="layout">
        <div className="stage">
          <ErrorBoundary fallback={<p className="pad">{ui.app.renderFail}</p>}>
            {view.screen === 'menu' ? (
              <>
                {offline ? <p className="app__offline">{ui.app.offline}</p> : null}
                <MainMenu onPlay={(era) => setView({ screen: 'world', era })} />
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
