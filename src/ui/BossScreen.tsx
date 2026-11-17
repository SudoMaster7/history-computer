import { useEffect, useMemo, useState } from 'react';
import type { EraId, Evaluation } from '@/core/types';
import type { BossState } from '@/core/boss';
import { answer, answerTo, eraToPlay, initialBoss, roundsTaken } from '@/core/boss';
import { POWERS } from '@/core/constants';
import { powersOf } from '@/core/progress';
import { getMinigame } from '@/core/registry';
import { bossScore } from '@/core/scoring';
import { difficultyOf, useGameStore } from '@/store';
import { Burst, play } from '@/fx';
import type { SoundName } from '@/fx';
import { IconHeart } from './icons';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  /** Semente da luta: a mesma semente da sempre a mesma sequencia de ataques. */
  seed: string;
  onExit(): void;
}

/** O que a tela esta mostrando agora. */
type Step =
  | { kind: 'announce' }
  | { kind: 'micro' }
  | { kind: 'result'; damage: number; blocked: boolean };

const ATTACK_TEXT = ui.boss.attacks as unknown as Record<string, { name: string; text: string }>;

/** Nivel maximo da habilidade, lido da tabela de multiplicadores. */
const MAX_POWER_LEVEL = POWERS.DAMAGE_MULTIPLIER.length - 1;

/** O que a arena esta mostrando. E so visual: nao entra em nenhuma regra. */
type StageFx = 'idle' | 'hit' | 'attack' | 'win' | 'lose';

const FX_SOUND: Partial<Record<StageFx, SoundName>> = {
  hit: 'hit',
  attack: 'hurt',
  win: 'win',
  lose: 'lose',
};

/**
 * BUG Day 0, a ultima parada do mapa (D77).
 *
 * A tela nao decide nada: cada resposta chama `answer` (core/boss) e desenha o
 * estado que volta. O micro-desafio e o minijogo da era do ataque anunciado,
 * na dificuldade 'micro' -- o chefao e a prova final dos seis minijogos.
 */
export default function BossScreen({ seed, onExit }: Props) {
  const player = useGameStore((s) => s.player);
  const finishBoss = useGameStore((s) => s.finishBoss);
  const devMode = useGameStore((s) => s.settings.devMode === true);
  const vibration = useGameStore((s) => s.settings.vibration);

  const [difficulty] = useState(() => difficultyOf(useGameStore.getState().settings));
  const [boss, setBoss] = useState<BossState>(() => initialBoss(seed, difficulty));
  const [step, setStep] = useState<Step>({ kind: 'announce' });
  const [fx, setFx] = useState<StageFx>('idle');
  const t = ui.boss;

  useEffect(() => {
    const sound = FX_SOUND[fx];
    if (sound) play(sound);
    if (fx === 'attack' && vibration) navigator.vibrate?.([30, 40, 30]);
  }, [fx, vibration]);

  // A luta acabou: registra uma vez.
  useEffect(() => {
    if (!boss.over) return;
    finishBoss(boss.over === 'win', bossScore(boss.hearts, roundsTaken(boss)));
    setFx(boss.over);
  }, [boss, finishBoss]);

  const power = answerTo(boss);
  // No modo desenvolvedor a luta vale com as habilidades no nivel maximo.
  const level = devMode ? MAX_POWER_LEVEL : powersOf(player)[power];
  const attack = ATTACK_TEXT[boss.announced.id] ?? { name: boss.announced.id, text: '' };

  function resolve(evaluation: Evaluation): void {
    const result = answer(boss, level, evaluation);
    setBoss(result.state);
    setStep({ kind: 'result', damage: result.damage, blocked: result.blocked });
    setFx(result.blocked ? 'hit' : 'attack');
  }

  if (boss.over) {
    const won = boss.over === 'win';
    return (
      <section className="boss game-surface pad" aria-label={t.title}>
        <BossStage boss={boss} fx={fx} />
        <h2 className="boss__verdict">{won ? t.win : t.lose}</h2>
        <p>{won ? t.winText : t.loseText}</p>
        <p className="boss__score">
          {t.score}: {bossScore(boss.hearts, roundsTaken(boss))}
        </p>
        <p className="boss__turns">
          {t.turnsTaken}: {roundsTaken(boss)}
        </p>
        <div className="controls">
          <button
            type="button"
            className="boss__primary"
            onClick={() => {
              setBoss(initialBoss(seed, difficulty));
              setStep({ kind: 'announce' });
              setFx('idle');
            }}
          >
            {t.retry}
          </button>
          <button type="button" onClick={onExit}>
            {t.leave}
          </button>
        </div>
      </section>
    );
  }

  if (step.kind === 'micro') {
    return (
      <MicroRunner
        era={eraToPlay(boss)}
        seed={`${seed}:${boss.round}`}
        label={`${attack.name} · ${ui.abilities[power].name}`}
        onDone={resolve}
        onGiveUp={() => resolve({ ok: false, efficiency: 0 })}
      />
    );
  }

  return (
    <section className="boss game-surface" aria-label={t.title}>
      <header className="boss__head">
        <h2>{t.title}</h2>
        <p className="boss__sub">{t.subtitle}</p>
      </header>

      <BossStage boss={boss} fx={fx} />

      {step.kind === 'result' ? (
        <div className="boss__block">
          <p className="boss__damage">{step.blocked ? t.blocked : t.notBlocked}</p>
          <p className="boss__damage">
            {step.blocked ? `${t.damageDealt}: ${step.damage}` : t.heartLost}
          </p>
          <button
            type="button"
            className="boss__primary"
            onClick={() => {
              setStep({ kind: 'announce' });
              setFx('idle');
            }}
          >
            {t.nextTurn}
          </button>
        </div>
      ) : (
        <div className="boss__block boss__block--attack">
          <p className="label">
            {t.turn} {boss.round} · {t.announced}
          </p>
          <p className="boss__attack">{attack.name}</p>
          <p className="boss__attackText">{attack.text}</p>
          <p className="boss__answer">
            {t.neutralizedBy}: <strong>{ui.powers[power]}</strong> ({ui.minigames[eraToPlay(boss)]})
          </p>
          <button
            type="button"
            className="boss__primary"
            onClick={() => setStep({ kind: 'micro' })}
          >
            {t.answerWith} {ui.abilities[power].name}
          </button>
        </div>
      )}

      <div className="controls">
        <button type="button" onClick={onExit}>
          {t.leave}
        </button>
      </div>
    </section>
  );
}

/**
 * A arena: o Bit de um lado, o BUG do outro. So leitura do estado (D55): o
 * jogador precisa VER o golpe acertar e o BUG se desfazer no fim.
 */
function BossStage({ boss, fx }: { boss: BossState; fx: StageFx }) {
  const t = ui.boss;
  const bugFrame = fx === 'win' ? 2 : fx === 'hit' ? 1 : 0;
  const bitFrame = fx === 'attack' || fx === 'lose' ? 0 : 1;
  const bossRatio = boss.hpMax > 0 ? Math.max(0, boss.hp) / boss.hpMax : 0;
  const LINES: Record<StageFx, string> = {
    idle: t.stageIdle,
    hit: t.stageHit,
    attack: t.stageAttack,
    win: t.stageWin,
    lose: t.stageLose,
  };

  return (
    <div className={`bossStage bossStage--${fx}`} aria-label={t.stage}>
      <div className="bossStage__row">
        <div className="bossStage__side">
          <span
            className="bossStage__bit"
            style={{ '--frame': bitFrame } as React.CSSProperties}
            aria-hidden="true"
          />
          <span className="bossStage__name">{t.bitName}</span>
          <span className="bossStage__hearts" aria-label={`${ui.stage.hearts}: ${boss.hearts}`}>
            {Array.from({ length: boss.heartsMax }, (_, i) => (
              <span key={i} data-full={i < boss.hearts} aria-hidden="true">
                <IconHeart size={18} />
              </span>
            ))}
          </span>
        </div>

        <div className="bossStage__side bossStage__side--bug">
          {fx === 'win' ? <Burst count={28} spread={110} /> : null}
          <span
            className="bossStage__bug"
            style={{ '--frame': bugFrame } as React.CSSProperties}
            aria-hidden="true"
          />
          <span className="bossStage__name">{t.title}</span>
          <span
            className="bossStage__bar"
            role="meter"
            aria-valuenow={Math.max(0, boss.hp)}
            aria-valuemin={0}
            aria-valuemax={boss.hpMax}
            aria-label={`${t.hp} ${Math.max(0, boss.hp)} ${t.of} ${boss.hpMax}`}
          >
            <span
              className="bossStage__ghost"
              style={{ width: `${Math.round(bossRatio * 100)}%` }}
            />
            <span
              className="bossStage__fill bossStage__fill--bug"
              style={{ width: `${Math.round(bossRatio * 100)}%` }}
            />
          </span>
        </div>
      </div>

      <p className="bossStage__line" role="status">
        {LINES[fx]}
      </p>
    </div>
  );
}

/** Roda a versao curta do minijogo de uma era e devolve a avaliacao. */
function MicroRunner({
  era,
  seed,
  label,
  onDone,
  onGiveUp,
}: {
  era: EraId;
  seed: string;
  label: string;
  onDone(evaluation: Evaluation): void;
  onGiveUp(): void;
}) {
  const game = useMemo(() => getMinigame(era), [era]);
  const instance = useMemo(() => game.generate(seed, 'micro'), [game, seed]);

  const Screen = game.Screen as React.ComponentType<{
    instance: unknown;
    mode: 'mission' | 'micro';
    onSubmit(solution: unknown): void;
    onExit(): void;
  }>;

  return (
    <div className="boss__micro">
      <p className="boss__microLabel">{label}</p>
      <Screen
        instance={instance}
        mode="micro"
        onSubmit={(solution) => onDone(game.evaluate(instance, solution))}
        onExit={onGiveUp}
      />
    </div>
  );
}
