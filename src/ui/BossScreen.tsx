import { useEffect, useMemo, useState } from 'react';
import type { EraId, Evaluation, PlayerState, PowerId } from '@/core/types';
import type { BossState } from '@/core/boss';
import {
  answerTo,
  armAuto,
  armBonus,
  armShield,
  autoEvaluation,
  canLaunchPatch,
  endTurn,
  eraToPlay,
  initialBoss,
  patchEra,
  patchStep,
  spendAuto,
  startPatch,
  strike,
  turnDone,
  turnsTaken,
} from '@/core/boss';
import { BOSS, POWERS } from '@/core/constants';
import { ERA_OF_POWER, POWER_IDS, unlockedPowers } from '@/core/powers';
import { carriedItems, countOf, itemById } from '@/core/items';
import { getMinigame, hasMinigame } from '@/core/registry';
import { bossScore } from '@/core/scoring';
import { useGameStore } from '@/store';
import { itemText } from './itemText';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  /** Semente da luta: a mesma semente da sempre a mesma sequencia de ataques. */
  seed: string;
  onExit(): void;
}

/** O que a tela esta mostrando agora. */
type Stage =
  | { kind: 'turn' }
  | { kind: 'micro'; power: PowerId }
  | { kind: 'patch'; step: number }
  | { kind: 'strike'; damage: number; blocked: boolean }
  | { kind: 'turnEnd'; damage: number }
  | { kind: 'patchEnd'; damage: number; failed: boolean };

const ATTACK_TEXT = ui.boss.attacks as unknown as Record<string, { name: string; text: string }>;

/** Nivel maximo de poder, lido da tabela de multiplicadores. */
const MAX_POWER_LEVEL = POWERS.DAMAGE_MULTIPLIER.length - 1;

/** O que a arena esta mostrando. E so visual: nao entra em nenhuma regra. */
type StageFx = 'idle' | 'hit' | 'miss' | 'blocked' | 'attack' | 'patch' | 'win' | 'lose';

/** Quanto tempo o efeito fica na tela antes de a arena voltar a encarar. */
const FX_MS = 900;

/**
 * BUG Day 0.
 *
 * A tela nao decide nada do combate: cada toque chama uma funcao pura de
 * `core/boss` e desenha o estado que ela devolve. O micro-desafio e o minijogo
 * da era do poder escolhido, na dificuldade 'micro' -- ou seja, o chefao nao
 * traz mecanica nova nenhuma, e a prova final das seis que o jogador aprendeu.
 */
export default function BossScreen({ seed, onExit }: Props) {
  const player = useGameStore((s) => s.player);
  const syncPlayer = useGameStore((s) => s.syncPlayer);
  const spendItem = useGameStore((s) => s.spendItem);
  const finishBoss = useGameStore((s) => s.finishBoss);
  const devMode = useGameStore((s) => s.settings.devMode);

  const [boss, setBoss] = useState<BossState>(() => initialBoss(seed, player));
  const [stage, setStage] = useState<Stage>({ kind: 'turn' });
  /** O que a arena esta mostrando: e so visual, nunca muda a regra. */
  const [fx, setFx] = useState<StageFx>('idle');
  const t = ui.boss;

  /*
   * No modo desenvolvedor os seis poderes entram na luta, no nivel maximo: sem
   * isso nao daria para testar o chefao num save que ainda nao tem poder nenhum.
   */
  const powers = (devMode ? [...POWER_IDS] : unlockedPowers(player)).filter((power) =>
    hasMinigame(ERA_OF_POWER[power]),
  );
  const levelOf = (power: PowerId): number => (devMode ? MAX_POWER_LEVEL : player.powers[power]);
  const items = carriedItems(player.items);
  const score = bossScore(player.hp, turnsTaken(boss));

  // O fim da luta entra no save uma vez por luta.
  useEffect(() => {
    if (!boss.over) return;
    setFx(boss.over === 'win' ? 'win' : 'lose');
    finishBoss(boss.over === 'win', boss.over === 'win' ? score : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss.over]);

  /*
   * O golpe, o bloqueio e o ataque duram um instante e a arena volta a encarar.
   * O fim da luta nao volta: ali o quadro fica como terminou.
   */
  useEffect(() => {
    if (fx === 'idle' || fx === 'win' || fx === 'lose') return;
    const id = setTimeout(() => setFx('idle'), FX_MS);
    return () => clearTimeout(id);
  }, [fx]);

  /** Aplica uma resposta ao ataque: dano no chefao e, se couber, bloqueio. */
  function resolveStrike(from: BossState, power: PowerId, evaluation: Evaluation): void {
    const result = strike(from, power, levelOf(power), evaluation);
    setBoss(result.state);
    setFx(result.blocked ? 'blocked' : result.damage > 0 ? 'hit' : 'miss');
    setStage({ kind: 'strike', damage: result.damage, blocked: result.blocked });
  }

  /** Fecha o turno: a maquina leva o dano do ataque que nao foi neutralizado. */
  function closeTurn(): void {
    const result = endTurn(boss, player);
    setBoss(result.state);
    syncPlayer(result.player);
    setFx(result.damage > 0 ? 'attack' : 'blocked');
    setStage({ kind: 'turnEnd', damage: result.damage });
  }

  function resolvePatch(evaluation: Evaluation): void {
    const result = patchStep(boss, evaluation);
    setBoss(result.state);
    if (!result.done) {
      setStage({ kind: 'patch', step: result.state.patchRun ?? 0 });
      return;
    }
    setFx(result.damage > 0 ? 'patch' : 'miss');
    setStage({ kind: 'patchEnd', damage: result.damage, failed: result.damage === 0 });
  }

  /** Usa um item da mochila: cada tipo arma um efeito diferente no combate. */
  function applyItem(id: string): void {
    const def = itemById(id);
    if (!def || !spendItem(id)) return;
    if (def.kind === 'shield') setBoss((current) => armShield(current));
    if (def.kind === 'power') setBoss((current) => armBonus(current, def.value));
    if (def.kind === 'hint') setBoss((current) => armAuto(current));
  }

  // --- fim da luta ---
  if (boss.over) {
    const won = boss.over === 'win';
    return (
      <section className="boss game-surface pad" aria-label={t.title}>
        <BossStage boss={boss} player={player} fx={fx} />
        <h2>{won ? t.win : t.lose}</h2>
        <p>{won ? t.winText : t.loseText}</p>
        <p className="boss__score">
          {t.score}: {won ? score : 0}
        </p>
        <p className="boss__turns">
          {t.turnsTaken}: {turnsTaken(boss)}
        </p>
        <div className="controls">
          <button
            type="button"
            className="boss__primary"
            onClick={() => {
              setBoss(initialBoss(seed, player));
              setFx('idle');
              setStage({ kind: 'turn' });
            }}
          >
            {t.retry}
          </button>
          <button type="button" onClick={onExit}>
            {ui.app.backToMenu}
          </button>
        </div>
      </section>
    );
  }

  // --- micro-desafio: resposta ao ataque, ou um passo do Patch Day 0 ---
  if (stage.kind === 'micro' || stage.kind === 'patch') {
    const patching = stage.kind === 'patch';
    const era: EraId = patching ? patchEra(boss, stage.step) : ERA_OF_POWER[stage.power];
    const label = patching
      ? `${t.patchTitle}: ${t.patchStep} ${stage.step + 1}/${BOSS.PATCH_CHALLENGES}`
      : `${ATTACK_TEXT[boss.announced.id]?.name ?? boss.announced.id} — ${ui.powers[stage.power]}`;

    return (
      <MicroRunner
        era={era}
        seed={`${seed}:${boss.turn}:${patching ? `p${stage.step}` : `a${boss.actionsLeft}`}`}
        label={label}
        onDone={(evaluation) =>
          patching ? resolvePatch(evaluation) : resolveStrike(boss, stage.power, evaluation)
        }
        onGiveUp={() => setStage({ kind: 'turn' })}
      />
    );
  }

  // --- resultado de uma acao, do fim do turno ou do patch ---
  if (stage.kind === 'strike' || stage.kind === 'turnEnd' || stage.kind === 'patchEnd') {
    const closing = stage.kind === 'strike' && turnDone(boss);
    return (
      <section className="boss game-surface pad" aria-label={t.title}>
        <BossStage boss={boss} player={player} fx={fx} />
        <BossMeter boss={boss} />

        {stage.kind === 'strike' ? (
          <>
            <p>{stage.blocked ? t.blocked : t.wrongPower}</p>
            <p className="boss__damage">
              {t.damageDealt}: {stage.damage > 0 ? stage.damage : t.noDamage}
            </p>
          </>
        ) : null}

        {stage.kind === 'turnEnd' ? (
          <>
            <p>{stage.damage > 0 ? t.notBlocked : t.blocked}</p>
            <p className="boss__damage">
              {t.damageTaken}: {stage.damage > 0 ? stage.damage : t.noDamage}
            </p>
          </>
        ) : null}

        {stage.kind === 'patchEnd' ? (
          <>
            <p>{stage.failed ? t.patchFailed : t.patchDone}</p>
            <p className="boss__damage">
              {t.damageDealt}: {stage.damage > 0 ? stage.damage : t.noDamage}
            </p>
          </>
        ) : null}

        <div className="controls">
          <button
            type="button"
            className="boss__primary"
            onClick={() => (closing ? closeTurn() : setStage({ kind: 'turn' }))}
          >
            {closing ? t.nextTurn : t.continueTurn}
          </button>
        </div>
      </section>
    );
  }

  // --- o turno: escolher poder, usar item, lancar o patch ---
  const attack = ATTACK_TEXT[boss.announced.id] ?? { name: boss.announced.id, text: '' };
  const right = answerTo(boss);

  return (
    <section className="boss game-surface" aria-label={t.title}>
      <header className="boss__head">
        <h2>{t.title}</h2>
        <p className="boss__sub">{t.subtitle}</p>
      </header>

      <BossStage boss={boss} player={player} fx={fx} />
      <BossMeter boss={boss} />

      <div className="boss__block">
        <h3>{t.announced}</h3>
        <p className="boss__attack">{attack.name}</p>
        <p className="boss__attackText">{attack.text}</p>
        <p className="boss__answer">
          {t.neutralizedBy}: <strong>{ui.powers[right]}</strong> ({ui.eras[eraToPlay(boss)]})
        </p>
      </div>

      <div className="boss__block">
        <h3>{t.pick}</h3>
        <div className="controls boss__powers">
          {powers.map((power) => (
            <button
              key={power}
              type="button"
              className={power === right ? 'boss__power boss__power--right' : 'boss__power'}
              onClick={() => setStage({ kind: 'micro', power })}
              aria-label={`${t.answerWith} ${ui.powers[power]}`}
            >
              {ui.powers[power]}
            </button>
          ))}
        </div>
        <p className="boss__hint">{t.wrongPower}</p>

        {boss.auto ? (
          <div className="controls">
            <button
              type="button"
              onClick={() => {
                const gasto = spendAuto(boss);
                setBoss(gasto);
                resolveStrike(gasto, right, autoEvaluation());
              }}
            >
              {t.useAuto}
            </button>
          </div>
        ) : null}

        {canLaunchPatch(boss) ? (
          <div className="controls">
            <button
              type="button"
              className="boss__patch"
              onClick={() => {
                setBoss(startPatch(boss));
                setStage({ kind: 'patch', step: 0 });
              }}
            >
              {t.launchPatch}
            </button>
          </div>
        ) : null}
      </div>

      <div className="boss__block">
        <h3>{t.items}</h3>
        {items.length === 0 ? (
          <p className="boss__empty">{t.noItems}</p>
        ) : (
          <ul className="boss__items">
            {items.map((item) => {
              const text = itemText(item.id);
              const count = countOf(player.items, item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => applyItem(item.id)}
                    aria-label={`${ui.items.use} ${text.name}`}
                  >
                    {text.name}
                    {count > 1 ? ` x${count}` : ''}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {boss.shield ? <p className="boss__armed">{t.shieldArmed}</p> : null}
        {boss.bonus > 0 ? <p className="boss__armed">{t.bonusArmed}</p> : null}
        {boss.auto ? <p className="boss__armed">{t.autoArmed}</p> : null}
      </div>

      <div className="controls">
        <button type="button" onClick={onExit}>
          {t.leave}
        </button>
      </div>
    </section>
  );
}

/**
 * A arena: o Bit de um lado, o BUG do outro, e as duas barras de integridade.
 *
 * E so leitura do estado -- a arena nao decide nada e nao guarda regra. Ela
 * existe porque um combate sem imagem vira formulario: o jogador precisa VER o
 * golpe acertar, o ataque bater no escudo e o BUG se desfazer no fim.
 *
 * Os dois sprites sao os mesmos arquivos de pixel art do resto do jogo
 * (`/sprites/bit.png` e `/sprites/bug.png`, gerados por `tools/make-sprites.mjs`),
 * desenhados por `background-position` em vez de canvas: o combate nao precisa
 * de laco de animacao, so de quadro certo e um efeito curto de CSS.
 */
function BossStage({ boss, player, fx }: { boss: BossState; player: PlayerState; fx: StageFx }) {
  const t = ui.boss;

  /** Quadro do BUG: 0 parado, 1 atingido, 2 desfeito. */
  const bugFrame = fx === 'win' ? 2 : fx === 'hit' || fx === 'patch' ? 1 : 0;
  /** Quadro do Bit: o do meio e a pose parada; os outros dois sao passo. */
  const bitFrame = fx === 'attack' || fx === 'lose' ? 0 : fx === 'blocked' ? 2 : 1;

  const bossRatio = boss.hpMax > 0 ? Math.max(0, boss.hp) / boss.hpMax : 0;
  const playerRatio = player.hpMax > 0 ? Math.max(0, player.hp) / player.hpMax : 0;

  const LINES: Record<StageFx, string> = {
    idle: t.stageIdle,
    miss: t.stageIdle,
    hit: t.stageHit,
    blocked: t.stageBlocked,
    attack: t.stageAttack,
    patch: t.stagePatch,
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
          <span
            className="bossStage__bar"
            role="meter"
            aria-valuenow={Math.max(0, player.hp)}
            aria-valuemin={0}
            aria-valuemax={player.hpMax}
            aria-label={`${t.yourHp} ${Math.max(0, player.hp)} ${ui.hud.of} ${player.hpMax}`}
          >
            <span
              className="bossStage__fill bossStage__fill--bit"
              style={{ width: `${Math.round(playerRatio * 100)}%` }}
            />
          </span>
        </div>

        <div className="bossStage__side bossStage__side--bug">
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
            aria-label={`${t.hp} ${Math.max(0, boss.hp)} ${ui.hud.of} ${boss.hpMax}`}
          >
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

/**
 * Os numeros do combate. A barra de integridade mora na arena, logo acima --
 * aqui ficam so os contadores, para o mesmo valor nao virar dois medidores
 * iguais para quem usa leitor de tela.
 */
function BossMeter({ boss }: { boss: BossState }) {
  const t = ui.boss;
  return (
    <ul className="boss__stats">
      <li>
        {t.hp}: {Math.max(0, boss.hp)}/{boss.hpMax}
      </li>
      <li>
        {t.turn}: {boss.turn}
      </li>
      <li>
        {t.actions}: {Math.max(0, boss.actionsLeft)}/{boss.clock}
      </li>
      <li>
        {t.patchCharges}: {boss.patch}/{BOSS.PATCH_REQUIRED}
      </li>
    </ul>
  );
}

/**
 * Roda a versao curta do minijogo de uma era e devolve a avaliacao.
 *
 * E o mesmo `evaluate` da missao: o chefao nao tem regra propria dentro do
 * minijogo, so usa o resultado dele.
 */
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
