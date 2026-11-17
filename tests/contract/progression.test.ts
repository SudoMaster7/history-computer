import { describe, expect, it } from 'vitest';
import { ERAS, POWER_OF_ERA } from '@/core/powers';
import { applyMissionResult, initialState, missionId, powersOf } from '@/core/progress';
import { BOSS_STAGE, STAGE_ORDER, abilitiesOf, nextStage, stageUnlocked } from '@/core/campaign';
import { referenceRun } from '@/core/stage';
import { answer, answerTo, eraToPlay, initialBoss, roundsTaken } from '@/core/boss';
import { getMinigame } from '@/core/registry';
import { bossScore } from '@/core/scoring';
import { DIFFICULTY } from '@/core/constants';
import type { Difficulty, EraId, Evaluation, PlayerState } from '@/core/types';
import { getStage } from '@/data/stages';
import { getMission } from '@/data/missions';
import { registerMinigames } from '@/minigames';

/**
 * CONTRATO: o jogo e zeravel.
 *
 * Este e o teste mais importante do projeto. Ele joga a campanha inteira usando
 * so as funcoes puras: em cada fase do mapa confere que ela esta aberta, CORRE a
 * fase com o robo de referencia ate o terminal (sem perder todos os coracoes),
 * RESOLVE o minijogo do fim pela logica dele mesmo, e exige que a fase seguinte
 * abra e que a habilidade da era chegue. No fim, vence o BUG Day 0 respondendo
 * cada ataque com o micro-desafio da era certa.
 *
 * Se alguem mexer na progressao e deixar o jogador preso em qualquer ponto --
 * fase que nao abre, buraco largo demais, portao sem solucao, minijogo que nao
 * fecha nem com a propria solucao de referencia, chefao invencivel -- este teste
 * falha dizendo exatamente onde travou.
 *
 * (D73: o mapa de fases substituiu as zonas, a porta e a prova. A promessa do
 * contrato nao mudou; mudou o caminho que ele percorre.)
 */

registerMinigames();

/** Joga um minijogo com a solucao de referencia dele e devolve a avaliacao. */
function playWithReference(era: EraId, seed: string, difficulty: Difficulty): Evaluation {
  const game = getMinigame(era);
  const instance = game.generate(seed, difficulty);
  return game.evaluate(instance, game.reference(instance));
}

/** Corre a fase e joga o minijogo do terminal, como um jogador faria. */
function playStage(player: PlayerState, id: string): PlayerState {
  const def = getStage(id);
  expect(def, `fase ${id} nao existe`).toBeDefined();
  // A fase fecha so com as habilidades que o jogador ja tem naquele ponto.
  const run = referenceRun(def!, abilitiesOf(player.missions));
  expect({ fase: id, chegou: run.done, recomecou: run.restarts }).toEqual({
    fase: id,
    chegou: true,
    recomecou: 0,
  });
  const mission = getMission(def!.missionId);
  expect(mission, `missao ${def!.missionId} nao existe`).toBeDefined();
  const evaluation = playWithReference(mission!.era, mission!.seed, mission!.difficulty);
  expect({ missao: mission!.id, concluida: evaluation.ok }).toEqual({
    missao: mission!.id,
    concluida: true,
  });
  return applyMissionResult(player, mission!.id, evaluation);
}

function clearCampaign(): PlayerState {
  let player = initialState();
  for (const id of STAGE_ORDER) player = playStage(player, id);
  return player;
}

describe('contrato: campanha completa, do inicio ao fim', () => {
  it('da para zerar as 12 fases sem travar em nenhuma', () => {
    let player = initialState();
    for (const id of STAGE_ORDER) {
      expect({ fase: id, aberta: stageUnlocked(id, player.missions) }).toEqual({
        fase: id,
        aberta: true,
      });
      expect(nextStage(player.missions)).toBe(id);
      player = playStage(player, id);
    }
    expect(stageUnlocked(BOSS_STAGE, player.missions)).toBe(true);
    for (const era of ERAS) {
      expect({ era, habilidade: abilitiesOf(player.missions).includes(POWER_OF_ERA[era]) }).toEqual(
        { era, habilidade: true },
      );
    }
  });

  it('cada fase fecha ate sem habilidade nenhuma (habilidade e bonus, nao chave)', () => {
    for (const id of STAGE_ORDER) {
      const run = referenceRun(getStage(id)!, []);
      expect({ fase: id, chegou: run.done, recomecou: run.restarts }).toEqual({
        fase: id,
        chegou: true,
        recomecou: 0,
      });
    }
  });

  it('cada fase fecha tambem com as seis habilidades (quem volta a uma fase antiga)', () => {
    for (const id of STAGE_ORDER) {
      const run = referenceRun(
        getStage(id)!,
        ERAS.map((era) => POWER_OF_ERA[era]),
      );
      expect({ fase: id, chegou: run.done, recomecou: run.restarts }).toEqual({
        fase: id,
        chegou: true,
        recomecou: 0,
      });
    }
  });

  it.each(['facil', 'normal', 'dificil'] as const)(
    'cada fase fecha na dificuldade %s, com a municao e os coracoes dela',
    (difficulty) => {
      for (const id of STAGE_ORDER) {
        const run = referenceRun(getStage(id)!, [], difficulty);
        expect({ fase: id, difficulty, chegou: run.done, recomecou: run.restarts }).toEqual({
          fase: id,
          difficulty,
          chegou: true,
          recomecou: 0,
        });
      }
    },
  );

  it('o robo de referencia abre todo portao sem erro', () => {
    for (const id of STAGE_ORDER) {
      const def = getStage(id)!;
      const run = referenceRun(def, []);
      expect({ fase: id, perfeitos: run.perfectGates }).toEqual({
        fase: id,
        perfeitos: def.gates.length,
      });
      expect(run.hits, `fase ${id}: o robo perdeu coracao demais`).toBeLessThan(
        DIFFICULTY.normal.HEARTS,
      );
    }
  });

  it('a solucao de referencia de cada minijogo rende as tres estrelas', () => {
    // Sem isso nenhuma habilidade chega ao nivel 3, e o chefao fica bem mais duro.
    const player = clearCampaign();
    for (const era of ERAS) {
      expect({ era, nivel: powersOf(player)[POWER_OF_ERA[era]] }).toEqual({ era, nivel: 3 });
    }
  });

  it('nenhuma fase abre antes da anterior ser concluida', () => {
    let player = initialState();
    for (let i = 0; i < STAGE_ORDER.length; i += 1) {
      for (const later of STAGE_ORDER.slice(i + 1)) {
        expect({ fase: later, abriuCedo: stageUnlocked(later, player.missions) }).toEqual({
          fase: later,
          abriuCedo: false,
        });
      }
      player = applyMissionResult(player, STAGE_ORDER[i]!, { ok: true, efficiency: 1 });
    }
  });

  it('a primeira fase esta aberta num save zerado', () => {
    expect(stageUnlocked(STAGE_ORDER[0]!, {})).toBe(true);
  });

  it('errar o minijogo nao tranca o jogador: pode tentar de novo', () => {
    let player = applyMissionResult(initialState(), missionId('mecanica', 'A'), {
      ok: false,
      efficiency: 0,
    });
    expect(stageUnlocked('mecanica-B', player.missions)).toBe(false);
    player = playStage(player, 'mecanica-A');
    expect(stageUnlocked('mecanica-B', player.missions)).toBe(true);
  });

  it('repetir uma fase nunca reduz estrelas nem pontuacao', () => {
    let player = playStage(initialState(), 'mecanica-A');
    const melhor = player.missions['mecanica-A']!;
    player = applyMissionResult(player, 'mecanica-A', { ok: true, efficiency: 0.1 });
    expect(player.missions['mecanica-A']).toEqual(melhor);
  });
});

describe('contrato: o BUG Day 0 fecha a campanha', () => {
  it('quem zerou as 12 fases vence o chefao jogando os micro-desafios', () => {
    const player = clearCampaign();
    const levels = powersOf(player);
    let boss = initialBoss('contrato-bug');
    let voltas = 0;

    while (!boss.over && voltas < 100) {
      voltas += 1;
      const era = eraToPlay(boss);
      const evaluation = playWithReference(era, `contrato-bug:${boss.round}`, 'micro');
      expect({ era, micro: evaluation.ok }).toEqual({ era, micro: true });
      boss = answer(boss, levels[answerTo(boss)], evaluation).state;
    }

    expect({ fim: boss.over, voltas }).toEqual({ fim: 'win', voltas });
    // Respondendo certo todas as rodadas, o Bit sai sem perder coracao.
    expect(boss.hearts).toBe(DIFFICULTY.normal.BOSS_HEARTS);
    expect(bossScore(boss.hearts, roundsTaken(boss))).toBeGreaterThan(0);
  });

  it('os seis micro-desafios fecham com a propria referencia', () => {
    for (const era of ERAS) {
      expect({ era, micro: playWithReference(era, 'micro-contrato', 'micro').ok }).toEqual({
        era,
        micro: true,
      });
    }
  });
});
