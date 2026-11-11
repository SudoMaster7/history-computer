import type { Attack, BossAttackId, EraId, Evaluation, PlayerState, PowerId } from './types';
import { BOSS } from './constants';
import { createRng, randInt } from './rng';
import { ERA_OF_POWER, damageMultiplier } from './powers';
import { takeDamage, wouldReboot } from './rpg';

/**
 * BUG Day 0, o chefao.
 *
 * O combate e por turnos e tem uma regra so: o chefao ANUNCIA o ataque antes de
 * dar, e cada ataque e neutralizado por um poder especifico. O jogador responde
 * jogando a versao curta (micro) do minijogo daquele poder -- resolver bem o
 * micro-desafio e o que neutraliza o ataque e machuca o chefao.
 *
 * Ou seja: o chefao nao e um minijogo novo, e a prova final dos seis que o
 * jogador aprendeu. Por isso ele mora no nucleo, e nao numa tela: a regra do
 * combate e pura e testavel, e a tela so a desenha.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

/** Os seis ataques, cada um neutralizado pelo poder de uma era. */
export const ATTACKS: readonly Attack[] = [
  { id: 'clonagem', neutralizedBy: 'repetir', damage: BOSS.ATTACK_DAMAGE },
  { id: 'metamorfose', neutralizedBy: 'decidir', damage: BOSS.ATTACK_DAMAGE },
  { id: 'instrucaoCorrompida', neutralizedBy: 'codificar', damage: BOSS.ATTACK_DAMAGE },
  { id: 'pacotesPerdidos', neutralizedBy: 'conectar', damage: BOSS.ATTACK_DAMAGE },
  { id: 'vazamento', neutralizedBy: 'proteger', damage: BOSS.ATTACK_DAMAGE },
  { id: 'camuflagem', neutralizedBy: 'aprender', damage: BOSS.ATTACK_DAMAGE },
];

export function attackById(id: BossAttackId): Attack {
  const attack = ATTACKS.find((a) => a.id === id);
  if (!attack) throw new Error(`BUG Day 0: ataque desconhecido "${id}".`);
  return attack;
}

/** Era cujo micro-desafio responde a este ataque. */
export function eraOfAttack(attack: Attack): EraId {
  return ERA_OF_POWER[attack.neutralizedBy];
}

/** Ataque anunciado no turno. Deterministico: a mesma seed da a mesma luta. */
export function attackFor(seed: string, turn: number): Attack {
  const rng = createRng(`bug:${seed}:${turn}`);
  return ATTACKS[randInt(rng, 0, ATTACKS.length - 1)] as Attack;
}

export interface BossState {
  seed: string;
  /** Turno atual, a partir de 1. */
  turn: number;
  hp: number;
  hpMax: number;
  /** Ataque anunciado para este turno. */
  announced: Attack;
  /** Acoes que ainda cabem neste turno. */
  actionsLeft: number;
  /** Acoes por turno, vindas do clock da maquina. */
  clock: number;
  /** O ataque deste turno ja foi neutralizado. */
  blocked: boolean;
  /** Cargas de Patch acumuladas (uma por ataque neutralizado). */
  patch: number;
  /** Micro-desafios ja vencidos no Patch Day 0 em andamento, ou null. */
  patchRun: number | null;
  /** Escudo armado por item: bloqueia o ataque deste turno sem gastar acao. */
  shield: boolean;
  /** Dano extra do proximo golpe, em fracao (item Modelo Treinado). */
  bonus: number;
  /** Proxima resposta sai pronta, com eficiencia 1 (itens de dica). */
  auto: boolean;
  /** 'win' quando o chefao cai, 'lose' quando a maquina reinicia. */
  over: 'win' | 'lose' | null;
}

export function initialBoss(seed: string, player: PlayerState): BossState {
  return {
    seed,
    turn: 1,
    hp: BOSS.HP,
    hpMax: BOSS.HP,
    announced: attackFor(seed, 1),
    actionsLeft: player.clock,
    clock: player.clock,
    blocked: false,
    patch: 0,
    patchRun: null,
    shield: false,
    bonus: 0,
    auto: false,
    over: null,
  };
}

/** Poder certo para o ataque anunciado. */
export function answerTo(state: BossState): PowerId {
  return state.announced.neutralizedBy;
}

/** Era do micro-desafio que responde ao ataque anunciado. */
export function eraToPlay(state: BossState): EraId {
  return eraOfAttack(state.announced);
}

/** Dano ao chefao: base x multiplicador do poder x eficiencia x bonus de item. */
export function strikeDamage(level: number, efficiency: number, bonus = 0): number {
  const multiplier = damageMultiplier(Math.max(0, Math.min(3, Math.floor(level))) as 0 | 1 | 2 | 3);
  const raw = BOSS.BASE_DAMAGE * multiplier * Math.max(0, efficiency) * (1 + Math.max(0, bonus));
  return Math.round(raw);
}

/** O resultado do micro-desafio neutraliza o ataque anunciado? */
export function neutralizes(state: BossState, power: PowerId, evaluation: Evaluation): boolean {
  if (power !== answerTo(state)) return false;
  return evaluation.ok && evaluation.efficiency >= BOSS.BLOCK_MIN_EFFICIENCY;
}

export interface StrikeResult {
  state: BossState;
  /** Dano aplicado ao chefao nesta acao. */
  damage: number;
  /** Esta acao neutralizou o ataque anunciado. */
  blocked: boolean;
}

/**
 * Uma acao do jogador: ele escolheu um poder e jogou o micro-desafio dele.
 *
 * Responder com o poder errado nao e proibido -- machuca o chefao, mas nao
 * neutraliza o ataque anunciado, e o dano vem no fim do turno.
 */
export function strike(
  state: BossState,
  power: PowerId,
  level: number,
  evaluation: Evaluation,
): StrikeResult {
  if (state.over || state.actionsLeft <= 0) return { state, damage: 0, blocked: false };

  const blocked = neutralizes(state, power, evaluation);
  const damage = evaluation.ok ? strikeDamage(level, evaluation.efficiency, state.bonus) : 0;
  const hp = Math.max(0, state.hp - damage);

  const next: BossState = {
    ...state,
    hp,
    actionsLeft: state.actionsLeft - 1,
    blocked: state.blocked || blocked,
    patch: blocked ? Math.min(BOSS.PATCH_REQUIRED, state.patch + 1) : state.patch,
    // O bonus vale para um golpe so, e este foi ele.
    bonus: 0,
    over: hp <= 0 ? 'win' : state.over,
  };

  return { state: next, damage, blocked };
}

export interface TurnResult {
  state: BossState;
  player: PlayerState;
  /** Dano que a maquina levou no fim do turno. */
  damage: number;
}

/**
 * Fecha o turno: se o ataque anunciado nao foi neutralizado (nem por poder nem
 * por escudo), a maquina leva o dano. Depois o chefao anuncia o proximo ataque.
 *
 * A luta termina em derrota quando o dano reiniciaria a maquina -- o reinicio
 * em si fica com `takeDamage`, que e a regra do RPG inteiro.
 */
export function endTurn(state: BossState, player: PlayerState): TurnResult {
  if (state.over) return { state, player, damage: 0 };

  const neutralized = state.blocked || state.shield;
  const damage = neutralized ? 0 : state.announced.damage;
  const lost = damage > 0 && wouldReboot(player, damage);
  const nextPlayer = damage > 0 ? takeDamage(player, damage) : player;

  const turn = state.turn + 1;
  const next: BossState = {
    ...state,
    turn,
    announced: attackFor(state.seed, turn),
    actionsLeft: state.clock,
    blocked: false,
    shield: false,
    over: lost ? 'lose' : state.over,
  };

  return { state: next, player: nextPlayer, damage };
}

/** O turno acabou: nao sobrou acao, ou o ataque ja foi neutralizado. */
export function turnDone(state: BossState): boolean {
  return state.actionsLeft <= 0;
}

/** Ja ha carga para lancar o Patch Day 0. */
export function canLaunchPatch(state: BossState): boolean {
  return state.patch >= BOSS.PATCH_REQUIRED && state.patchRun === null && state.over === null;
}

/** Comeca o Patch Day 0: uma sequencia de micro-desafios seguidos. */
export function startPatch(state: BossState): BossState {
  if (!canLaunchPatch(state)) return state;
  return { ...state, patchRun: 0 };
}

/** Era do micro-desafio numero `step` do Patch Day 0. */
export function patchEra(state: BossState, step: number): EraId {
  const rng = createRng(`patch:${state.seed}:${state.turn}:${step}`);
  return eraOfAttack(ATTACKS[randInt(rng, 0, ATTACKS.length - 1)] as Attack);
}

export interface PatchResult {
  state: BossState;
  /** Dano do Patch Day 0, quando a sequencia foi concluida. */
  damage: number;
  /** A sequencia terminou (concluida ou interrompida por erro). */
  done: boolean;
}

/**
 * Um micro-desafio do Patch Day 0. Errar interrompe a sequencia e devolve as
 * cargas a zero: o patch e tudo ou nada, como um dia de correcao de verdade.
 */
export function patchStep(state: BossState, evaluation: Evaluation): PatchResult {
  if (state.patchRun === null || state.over) return { state, damage: 0, done: true };

  if (!evaluation.ok) {
    return { state: { ...state, patchRun: null, patch: 0 }, damage: 0, done: true };
  }

  const step = state.patchRun + 1;
  if (step < BOSS.PATCH_CHALLENGES) {
    return { state: { ...state, patchRun: step }, damage: 0, done: false };
  }

  const hp = Math.max(0, state.hp - BOSS.PATCH_DAMAGE);
  return {
    state: { ...state, hp, patch: 0, patchRun: null, over: hp <= 0 ? 'win' : state.over },
    damage: BOSS.PATCH_DAMAGE,
    done: true,
  };
}

/** Arma o escudo de um item: o ataque deste turno nao acerta a maquina. */
export function armShield(state: BossState): BossState {
  return state.over ? state : { ...state, shield: true };
}

/** Guarda o dano extra de um item para o proximo golpe. */
export function armBonus(state: BossState, value: number): BossState {
  if (state.over || !Number.isFinite(value) || value <= 0) return state;
  return { ...state, bonus: state.bonus + value };
}

/** Guarda uma resposta pronta: o proximo micro-desafio sai com eficiencia 1. */
export function armAuto(state: BossState): BossState {
  return state.over ? state : { ...state, auto: true };
}

/** O resultado que uma resposta pronta produz. */
export function autoEvaluation(): Evaluation {
  return { ok: true, efficiency: 1 };
}

/**
 * Gasta a resposta pronta. Fica separado de `strike` de proposito: quem tem o
 * item guardado e joga o micro-desafio na mao nao perde o item por isso.
 */
export function spendAuto(state: BossState): BossState {
  return state.auto ? { ...state, auto: false } : state;
}

/** Turnos gastos ate aqui, que e o que a pontuacao do chefao desconta. */
export function turnsTaken(state: BossState): number {
  return Math.max(0, state.turn - 1);
}
