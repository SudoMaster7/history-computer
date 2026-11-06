import { describe, expect, it } from 'vitest';
import * as constants from '@/core/constants';
import * as items from '@/core/items';
import * as powers from '@/core/powers';
import * as quiz from '@/core/quiz';
import * as registry from '@/core/registry';
import * as rng from '@/core/rng';
import * as rpg from '@/core/rpg';
import * as scoring from '@/core/scoring';
import * as world from '@/core/world';

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
      'BOSS',
      'ERA_YEARS',
      'ITEMS',
      'LOOM',
      'POWERS',
      'QUIZ',
      'RPG',
      'SCORING',
      'STORAGE',
      'TIME',
      'WORLD',
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

  it('core/world', () => {
    expect(exported(world)).toEqual([
      'TILE',
      'atDoor',
      'cellAtPoint',
      'facingTo',
      'findPath',
      'inBounds',
      'isDoorOpen',
      'isWalkable',
      'missionsLeft',
      'npcAt',
      'parseWorld',
      'sameCell',
      'spawnCell',
      'stationAt',
      'tileAt',
      'validateWorld',
    ]);
  });

  it('core/quiz', () => {
    expect(exported(quiz)).toEqual(['buildQuiz', 'gradeQuiz', 'isCorrect']);
  });

  it('core/items', () => {
    expect(exported(items)).toEqual([
      'ITEM_DEFS',
      'addItem',
      'carriedItems',
      'countOf',
      'hasItem',
      'itemById',
      'itemOfEra',
      'spendItem',
    ]);
  });

  it('core/powers', () => {
    expect(exported(powers)).toEqual([
      'ERAS',
      'ERA_OF_POWER',
      'POWER_IDS',
      'POWER_OF_ERA',
      'POWER_REQUIRES',
      'damageMultiplier',
      'eraUnlocked',
      'missingPowers',
      'previousEra',
      'unlockedPowers',
    ]);
  });

  it('core/rpg', () => {
    expect(exported(rpg)).toEqual([
      'ERA_START_YEAR',
      'applyMissionResult',
      'applyQuizResult',
      'clockFor',
      'consumeItem',
      'eraOfMissionId',
      'fullHeal',
      'gainXp',
      'heal',
      'hpMaxFor',
      'initialState',
      'missionId',
      'missionXp',
      'powerLevelFor',
      'recomputePowers',
      'takeDamage',
      'worldYear',
      'wouldReboot',
      'xpToNextLevel',
    ]);
  });

  it('core/scoring', () => {
    expect(exported(scoring)).toEqual(['bossScore', 'clampEfficiency', 'missionScore', 'starsFor']);
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
    expect(Object.keys(constants.RPG).sort()).toEqual([
      'CLOCK_BASE',
      'CLOCK_LEVEL_UPS',
      'HP_BASE',
      'HP_PER_LEVEL',
      'MAX_LEVEL',
      'MISSION_HEAL_RATIO',
      'MISSION_XP_BASE',
      'MISSION_XP_PER_STAR',
      'REBOOT_HP_RATIO',
      'START_YEAR',
      'XP_PER_LEVEL',
    ]);
    expect(Object.keys(constants.QUIZ).sort()).toEqual([
      'PASS_RATIO',
      'QUESTIONS',
      'XP_PER_CORRECT',
    ]);
    expect(Object.keys(constants.WORLD).sort()).toEqual([
      'FRAME_MS',
      'SCALE',
      'TILE',
      'WALK_FRAMES',
      'WALK_MS_PER_TILE',
    ]);
    expect(Object.keys(constants.ITEMS).sort()).toEqual([
      'HEAL_VALUE',
      'MAX_PER_ITEM',
      'POWER_VALUE',
    ]);
  });

  it('os valores continuam dentro de faixas que fazem o jogo funcionar', () => {
    // Nao travam o numero exato (balancear e permitido), travam o absurdo.
    expect(constants.QUIZ.QUESTIONS).toBeGreaterThanOrEqual(3);
    expect(constants.QUIZ.PASS_RATIO).toBeGreaterThan(0);
    expect(constants.QUIZ.PASS_RATIO).toBeLessThanOrEqual(1);
    expect(constants.RPG.MAX_LEVEL).toBeGreaterThanOrEqual(6);
    expect(constants.WORLD.TILE).toBe(16);
    expect(constants.ITEMS.MAX_PER_ITEM).toBeGreaterThanOrEqual(1);
  });
});
