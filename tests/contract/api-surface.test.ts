import { describe, expect, it } from 'vitest';
import * as constants from '@/core/constants';
import * as boss from '@/core/boss';
import * as campaign from '@/core/campaign';
import * as gadgets from '@/core/gadgets';
import * as stage from '@/core/stage';
import * as powers from '@/core/powers';
import * as registry from '@/core/registry';
import * as rng from '@/core/rng';
import * as progress from '@/core/progress';
import * as scoring from '@/core/scoring';

/**
 * CONTRATO: a superficie publica do nucleo.
 *
 * Cada nome aqui e usado por alguma tela, por um minijogo ou por um teste.
 * Apagar ou renomear um deles quebra quem chama -- as vezes so em runtime,
 * numa tela que ninguem abriu durante a mudanca.
 *
 * COMO MEXER NISTO (vale para pessoas e para agentes):
 *   1. Acrescentar nome novo: adicione na lista. E so isso.
 *   2. Renomear ou remover: atualize TODOS os pontos de uso primeiro, rode a
 *      suite inteira, e so entao mexa aqui -- na mesma mudanca, com o motivo
 *      escrito na nota em docs/changes/.
 * Nunca "conserte" este teste apagando o nome para a suite ficar verde.
 */

function exported(mod: object): string[] {
  return Object.keys(mod).sort();
}

describe('contrato: superficie publica do nucleo', () => {
  it('core/constants', () => {
    expect(exported(constants)).toEqual([
      'ABILITY',
      'BITS',
      'BOSS',
      'CIRCUIT',
      'DIFFICULTY',
      'LOOM',
      'MODEL',
      'POWERS',
      'ROUTE',
      'SCORING',
      'STAGE',
      'STORAGE',
      'TIME',
      'VAULT',
    ]);
  });

  it('core/rng', () => {
    expect(exported(rng)).toEqual([
      'createRng',
      'dailySeed',
      'hashSeed',
      'pick',
      'randInt',
      'shuffle',
    ]);
  });

  it('core/stage', () => {
    expect(exported(stage)).toEqual([
      'STAGE_TILE',
      'botInput',
      'enemyPosition',
      'initialRun',
      'isBlocked',
      'parseStage',
      'referenceRun',
      'stageFragmentId',
      'stageTileAt',
      'stepRun',
      'validateStage',
    ]);
  });

  it('core/gadgets', () => {
    expect(exported(gadgets)).toEqual([
      'bestRoute',
      'bitWeight',
      'bitsValue',
      'cipherText',
      'circuitLights',
      'circuitOutputs',
      'circuitSignals',
      'initialGadget',
      'isVirus',
      'patternMissing',
      'patternSequence',
      'pressTarget',
      'referencePresses',
      'routeCost',
      'routeLayers',
      'routeWidth',
      'shiftLetter',
      'targetCount',
      'validateGadget',
    ]);
  });

  it('core/campaign', () => {
    expect(exported(campaign)).toEqual([
      'BOSS_STAGE',
      'STAGE_LETTERS',
      'STAGE_ORDER',
      'abilitiesOf',
      'clearedErasOf',
      'eraCleared',
      'eraOfStage',
      'nextStage',
      'stageCleared',
      'stageId',
      'stageUnlocked',
    ]);
  });

  it('core/boss', () => {
    expect(exported(boss)).toEqual([
      'ATTACKS',
      'answer',
      'answerTo',
      'attackById',
      'attackFor',
      'eraOfAttack',
      'eraToPlay',
      'initialBoss',
      'neutralizes',
      'roundsTaken',
      'strikeDamage',
    ]);
  });

  it('core/powers', () => {
    expect(exported(powers)).toEqual([
      'ERAS',
      'ERA_OF_POWER',
      'POWER_IDS',
      'POWER_OF_ERA',
      'damageMultiplier',
    ]);
  });

  it('core/progress', () => {
    expect(exported(progress)).toEqual([
      'applyMissionResult',
      'eraOfMissionId',
      'initialState',
      'missionId',
      'powerLevelFor',
      'powersOf',
    ]);
  });

  it('core/scoring', () => {
    expect(exported(scoring)).toEqual([
      'bossScore',
      'clampEfficiency',
      'missionScore',
      'mistakeEfficiency',
      'starsFor',
    ]);
  });

  it('core/registry', () => {
    expect(exported(registry)).toEqual([
      'clearRegistry',
      'getMinigame',
      'hasMinigame',
      'registerMinigame',
      'registeredEras',
    ]);
  });
});

describe('contrato: formato das constantes de balanceamento', () => {
  it('as chaves de cada grupo nao somem sem aviso', () => {
    expect(Object.keys(constants.STAGE).sort()).toEqual([
      'ACTIVE_PX',
      'AMMO_MAX',
      'AMMO_RESPAWN_MIN',
      'ARMOR_HP',
      'ARMOR_SPEED',
      'BODY_H',
      'BODY_W',
      'BOT_LOOK_PX',
      'BOT_PANEL_STEPS',
      'BOT_SHOOT_PX',
      'COYOTE_STEPS',
      'CRUMBLE_FALLEN_STEPS',
      'CRUMBLE_STEPS',
      'DROP_TRIGGER_PX',
      'ENEMY_SIZE',
      'FLYER_AMP',
      'FLYER_PERIOD',
      'GATE_REACH_PX',
      'GRAVITY',
      'HOPPER_HEIGHT',
      'HOPPER_PERIOD',
      'HOPPER_SPEED',
      'INVULN_STEPS',
      'JUMP_CUT_SPEED',
      'JUMP_SPEED',
      'MAX_FALL',
      'MAX_STEPS',
      'PROGRAM_SPEED',
      'RUN_SPEED',
      'SHOT_COOLDOWN',
      'SHOT_RANGE',
      'SHOT_SPEED',
      'SIGN_REACH_PX',
      'SPRING_SPEED',
      'STEPS_PER_SECOND',
      'STOMP_BOUNCE',
      'TILE',
      'TURRET_HP',
      'TURRET_PERIOD',
      'TURRET_SHOT_SPEED',
      'WALKER_SPEED',
    ]);
    expect(Object.keys(constants.ABILITY).sort()).toEqual([
      'BURST',
      'BURST_GAP_PX',
      'HOMING_PX',
      'LONG_JUMP_FACTOR',
    ]);
    expect(Object.keys(constants.BOSS).sort()).toEqual([
      'BASE_DAMAGE',
      'BLOCK_MIN_EFFICIENCY',
      'HP',
    ]);
  });

  it('os valores continuam dentro de faixas que fazem o jogo funcionar', () => {
    // Nao travam o numero exato (balancear e permitido), travam o absurdo.
    const { STAGE } = constants;
    expect(STAGE.TILE).toBe(16);
    // Toda dificuldade tem coracao e municao, e quanto mais dificil, menos de cada.
    const { facil, normal, dificil } = constants.DIFFICULTY;
    for (const level of [facil, normal, dificil]) {
      expect(level.HEARTS).toBeGreaterThanOrEqual(1);
      expect(level.BOSS_HEARTS).toBeGreaterThanOrEqual(1);
      expect(level.AMMO).toBeGreaterThanOrEqual(STAGE.AMMO_RESPAWN_MIN);
      expect(level.AMMO_PICKUP).toBeGreaterThan(0);
    }
    expect(facil.HEARTS).toBeGreaterThan(normal.HEARTS);
    expect(normal.HEARTS).toBeGreaterThan(dificil.HEARTS);
    expect(facil.AMMO).toBeGreaterThan(dificil.AMMO);
    // O pulo tem de vencer um buraco de 3 tiles: tempo no ar x velocidade.
    const airSteps = (2 * STAGE.JUMP_SPEED) / STAGE.GRAVITY;
    expect(airSteps * STAGE.RUN_SPEED).toBeGreaterThan(3 * STAGE.TILE + STAGE.BODY_W);
    // E uma parede de 2 tiles: altura maxima do pulo.
    expect(STAGE.JUMP_SPEED ** 2 / (2 * STAGE.GRAVITY)).toBeGreaterThan(2 * STAGE.TILE);
    expect(constants.BOSS.BLOCK_MIN_EFFICIENCY).toBeLessThanOrEqual(
      constants.SCORING.MISTAKE_FLOOR,
    );
  });
});
