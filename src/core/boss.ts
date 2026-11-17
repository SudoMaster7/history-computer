import type { Attack, BossAttackId, EraId, Evaluation, GameDifficulty, PowerId } from './types';
import { BOSS, DIFFICULTY } from './constants';
import { createRng, randInt } from './rng';
import { ERA_OF_POWER, damageMultiplier } from './powers';

/**
 * BUG Day 0, o chefao do fim do mapa (D77).
 *
 * Uma regra so, como antes: o chefao ANUNCIA o ataque, e cada ataque e
 * neutralizado pela ideia de uma era. O jogador responde jogando a versao
 * curta (micro) do minijogo daquela era. Respondeu bem: o ataque se desfaz e o
 * BUG leva o golpe, mais forte quanto maior a habilidade da era. Respondeu
 * mal: o Bit perde um coracao. Sem coracao, a luta acaba e pode recomecar.
 *
 * O chefao nao traz mecanica nova (D48): e a prova final dos seis minijogos.
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

/** Os seis ataques, cada um neutralizado pelo poder de uma era. */
export const ATTACKS: readonly Attack[] = [
  { id: 'clonagem', neutralizedBy: 'repetir' },
  { id: 'metamorfose', neutralizedBy: 'decidir' },
  { id: 'instrucaoCorrompida', neutralizedBy: 'codificar' },
  { id: 'pacotesPerdidos', neutralizedBy: 'conectar' },
  { id: 'vazamento', neutralizedBy: 'proteger' },
  { id: 'camuflagem', neutralizedBy: 'aprender' },
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

/**
 * Ataque anunciado na rodada. Deterministico, e nunca repete o da rodada
 * anterior: a luta passa por eras diferentes.
 */
export function attackFor(seed: string, round: number): Attack {
  const rng = createRng(`bug:${seed}:${round}`);
  const pick = randInt(rng, 0, ATTACKS.length - 1);
  if (round > 1 && ATTACKS[pick]?.id === attackFor(seed, round - 1).id) {
    return ATTACKS[(pick + 1) % ATTACKS.length] as Attack;
  }
  return ATTACKS[pick] as Attack;
}

export interface BossState {
  seed: string;
  /** Rodada atual, a partir de 1. */
  round: number;
  hp: number;
  hpMax: number;
  hearts: number;
  /** Coracoes do comeco da luta, pela dificuldade. */
  heartsMax: number;
  /** Ataque anunciado para esta rodada. */
  announced: Attack;
  /** 'win' quando o chefao cai, 'lose' quando os coracoes acabam. */
  over: 'win' | 'lose' | null;
}

export function initialBoss(seed: string, difficulty: GameDifficulty = 'normal'): BossState {
  const hearts = DIFFICULTY[difficulty].BOSS_HEARTS;
  return {
    seed,
    round: 1,
    hp: BOSS.HP,
    hpMax: BOSS.HP,
    hearts,
    heartsMax: hearts,
    announced: attackFor(seed, 1),
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

/** Dano ao chefao: base x multiplicador da habilidade x eficiencia. */
export function strikeDamage(level: number, efficiency: number): number {
  const lvl = Math.max(0, Math.min(3, Math.floor(level))) as 0 | 1 | 2 | 3;
  // Sem a habilidade (so no modo desenvolvedor), o golpe ainda vale como nivel 1.
  const multiplier = damageMultiplier(lvl === 0 ? 1 : lvl);
  return Math.round(BOSS.BASE_DAMAGE * multiplier * Math.max(0, efficiency));
}

/** O resultado do micro-desafio neutraliza o ataque? */
export function neutralizes(evaluation: Evaluation): boolean {
  return evaluation.ok && evaluation.efficiency >= BOSS.BLOCK_MIN_EFFICIENCY;
}

export interface AnswerResult {
  state: BossState;
  /** Dano no BUG nesta rodada. */
  damage: number;
  /** O ataque foi neutralizado (senao, o Bit perdeu um coracao). */
  blocked: boolean;
}

/** Responde ao ataque anunciado com o resultado do micro-desafio da era dele. */
export function answer(state: BossState, level: number, evaluation: Evaluation): AnswerResult {
  if (state.over) return { state, damage: 0, blocked: false };
  const blocked = neutralizes(evaluation);
  const damage = blocked ? strikeDamage(level, evaluation.efficiency) : 0;
  const hp = Math.max(0, state.hp - damage);
  const hearts = blocked ? state.hearts : state.hearts - 1;
  const round = state.round + 1;
  return {
    state: {
      ...state,
      hp,
      hearts,
      round,
      announced: attackFor(state.seed, round),
      over: hp <= 0 ? 'win' : hearts <= 0 ? 'lose' : null,
    },
    damage,
    blocked,
  };
}

/** Rodadas jogadas ate agora (para a pontuacao). */
export function roundsTaken(state: BossState): number {
  return state.round - 1;
}
