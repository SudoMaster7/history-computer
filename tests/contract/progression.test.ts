import { describe, expect, it } from 'vitest';
import { ERAS, POWER_OF_ERA, eraUnlocked } from '@/core/powers';
import { itemOfEra } from '@/core/items';
import { buildQuiz, gradeQuiz } from '@/core/quiz';
import {
  applyMissionResult,
  applyQuizResult,
  initialState,
  missionId,
  takeDamage,
} from '@/core/rpg';
import {
  ATTACKS,
  answerTo,
  attackFor,
  canLaunchPatch,
  eraOfAttack,
  endTurn,
  eraToPlay,
  initialBoss,
  patchEra,
  patchStep,
  startPatch,
  strike,
  turnDone,
  turnsTaken,
} from '@/core/boss';
import { findPath, isDoorOpen, missionsLeft } from '@/core/world';
import { getMinigame } from '@/core/registry';
import { bossScore } from '@/core/scoring';
import type { Difficulty, EraId, Evaluation, PlayerState } from '@/core/types';
import { worldOfEra } from '@/data/worlds';
import { getMission } from '@/data/missions';
import { QUIZ_BANK } from '@/data/quizzes';
import { registerMinigames } from '@/minigames';

/**
 * CONTRATO: o jogo e zeravel.
 *
 * Este e o teste mais importante do projeto. Ele joga a campanha inteira usando
 * so as funcoes puras: em cada era anda ate os dois terminais, RESOLVE os dois
 * minijogos pela logica deles mesmos, confere que a porta abre, faz a prova,
 * recebe poder e item, e exige que a era seguinte destranque. No fim, encara o
 * BUG Day 0 respondendo cada ataque com o micro-desafio do poder certo.
 *
 * Se alguem mexer na progressao e deixar o jogador preso em qualquer ponto --
 * porta que nao abre, prova impossivel, era que nunca libera, minijogo que nao
 * fecha nem com a propria solucao de referencia, chefao invencivel -- este teste
 * falha dizendo exatamente onde travou.
 */

registerMinigames();

/** Joga um minijogo com a solucao de referencia dele e devolve a avaliacao. */
function playWithReference(era: EraId, seed: string, difficulty: Difficulty): Evaluation {
  const game = getMinigame(era);
  const instance = game.generate(seed, difficulty);
  return game.evaluate(instance, game.reference(instance));
}

/** Conclui uma missao jogando o minijogo da era, nao fingindo o resultado. */
function doMission(player: PlayerState, id: string): PlayerState {
  const mission = getMission(id);
  expect(mission, `missao ${id} nao existe`).toBeDefined();
  const evaluation = playWithReference(mission!.era, mission!.seed, mission!.difficulty);
  expect({ missao: id, concluida: evaluation.ok }).toEqual({ missao: id, concluida: true });
  return applyMissionResult(player, id, evaluation);
}

/** Faz a prova da era acertando tudo. */
function passQuiz(player: PlayerState, era: EraId): PlayerState {
  const quiz = buildQuiz(era, `quiz-${era}-v1`, QUIZ_BANK);
  expect(quiz, `era ${era} sem prova montavel`).not.toBeNull();
  const answers = quiz!.questions.map((q) => q.options.findIndex((o) => o.correct));
  const result = gradeQuiz(quiz!, answers);
  expect({ era, aprovado: result.passed }).toEqual({ era, aprovado: true });
  return applyQuizResult(player, era, result);
}

/** Zera as seis eras e devolve o jogador como ele chega ao chefao. */
function clearCampaign(): PlayerState {
  let player = initialState();
  for (const era of ERAS) {
    player = doMission(player, missionId(era, 'A'));
    player = doMission(player, missionId(era, 'B'));
    player = passQuiz(player, era);
  }
  return player;
}

describe('contrato: campanha completa, do inicio ao fim', () => {
  it('da para zerar as 6 eras sem travar em nenhuma', () => {
    let player = initialState();
    const cleared: EraId[] = [];

    for (const era of ERAS) {
      // 1. A era tem de estar aberta quando chega a vez dela.
      expect({ era, aberta: eraUnlocked(era, cleared) }).toEqual({ era, aberta: true });

      const world = worldOfEra(era);
      expect(world, `era ${era} sem zona`).toBeDefined();

      // 2. Da para andar do ponto de entrada ate cada terminal e ate a porta.
      for (const alvo of [...world!.stations, world!.door]) {
        const caminho = findPath(world!, world!.spawn, { col: alvo.col, row: alvo.row });
        expect({ era, alvo, alcancavel: caminho !== null }).toEqual({
          era,
          alvo,
          alcancavel: true,
        });
      }

      // 3. A porta comeca fechada e so abre com as duas missoes feitas.
      const stars = (p: PlayerState): Record<string, number> =>
        Object.fromEntries(Object.entries(p.missions).map(([k, m]) => [k, m.stars]));

      expect({ era, portaAberta: isDoorOpen(world!, stars(player)) }).toEqual({
        era,
        portaAberta: false,
      });

      player = doMission(player, missionId(era, 'A'));
      expect({ era, faltam: missionsLeft(world!, stars(player)).length }).toEqual({
        era,
        faltam: 1,
      });

      player = doMission(player, missionId(era, 'B'));
      expect({ era, portaAberta: isDoorOpen(world!, stars(player)) }).toEqual({
        era,
        portaAberta: true,
      });

      // 4. A prova passa e entrega poder e item.
      player = passQuiz(player, era);
      cleared.push(era);

      expect({ era, poder: player.powers[POWER_OF_ERA[era]] >= 1 }).toEqual({ era, poder: true });
      const item = itemOfEra(era)!;
      expect({ era, item: item.id, naMochila: (player.items[item.id] ?? 0) >= 1 }).toEqual({
        era,
        item: item.id,
        naMochila: true,
      });
    }

    // Fim da campanha: tudo concluido, todos os poderes, todos os itens.
    expect(cleared).toEqual([...ERAS]);
    for (const era of ERAS) {
      expect(player.powers[POWER_OF_ERA[era]]).toBeGreaterThanOrEqual(1);
      expect(player.items[itemOfEra(era)!.id]).toBeGreaterThanOrEqual(1);
    }
    expect(player.level).toBeGreaterThan(1);
  });

  it('a solucao de referencia de cada minijogo rende as tres estrelas', () => {
    // Sem isso nenhum poder chega ao nivel 3, e o chefao fica bem mais duro.
    const player = clearCampaign();
    for (const era of ERAS) {
      expect({ era, poder: player.powers[POWER_OF_ERA[era]] }).toEqual({ era, poder: 3 });
    }
  });

  it('nenhuma era abre antes da anterior ser concluida', () => {
    for (let i = 1; i < ERAS.length; i += 1) {
      const era = ERAS[i]!;
      const anteriores = ERAS.slice(0, i - 1);
      expect({ era, abreSemAAnterior: eraUnlocked(era, anteriores) }).toEqual({
        era,
        abreSemAAnterior: false,
      });
      expect(eraUnlocked(era, ERAS.slice(0, i))).toBe(true);
    }
  });

  it('a primeira era esta aberta num save zerado', () => {
    expect(eraUnlocked(ERAS[0]!, [])).toBe(true);
  });

  it('reprovar na prova nao tranca o jogador nem tira vida', () => {
    let player = initialState();
    player = doMission(player, missionId('mecanica', 'A'));
    player = doMission(player, missionId('mecanica', 'B'));
    player = takeDamage(player, 50);
    const vidaAntes = player.hp;

    // Zera a prova: nenhuma resposta certa.
    const quiz = buildQuiz('mecanica', 'quiz-mecanica-v1', QUIZ_BANK)!;
    const result = gradeQuiz(quiz, []);
    expect(result.passed).toBe(false);

    const depois = applyQuizResult(player, 'mecanica', result);
    expect(depois.hp).toBe(vidaAntes);
    // Pode tentar de novo quantas vezes quiser, e dessa vez passa.
    const aprovado = passQuiz(depois, 'mecanica');
    expect(aprovado.items[itemOfEra('mecanica')!.id]).toBe(1);
  });

  it('as missoes nunca tiram vida do jogador', () => {
    let player = takeDamage(initialState(), 40);
    const vidaAntes = player.hp;
    player = applyMissionResult(player, missionId('mecanica', 'A'), { ok: false, efficiency: 0 });
    expect(player.hp).toBe(vidaAntes);
    player = doMission(player, missionId('mecanica', 'A'));
    expect(player.hp).toBeGreaterThan(vidaAntes);
  });

  it('repetir uma missao nunca reduz estrelas nem pontuacao', () => {
    let player = doMission(initialState(), missionId('mecanica', 'A'));
    const melhor = player.missions[missionId('mecanica', 'A')]!;
    player = applyMissionResult(player, missionId('mecanica', 'A'), { ok: true, efficiency: 0.1 });
    const depois = player.missions[missionId('mecanica', 'A')]!;
    expect(depois.stars).toBe(melhor.stars);
    expect(depois.bestScore).toBe(melhor.bestScore);
  });
});

describe('contrato: o BUG Day 0 fecha a campanha', () => {
  it('quem zerou as seis eras vence o chefao jogando os micro-desafios', () => {
    let player = clearCampaign();
    let boss = initialBoss('contrato-bug', player);
    let voltas = 0;

    /*
     * A luta e jogada como um jogador jogaria: ve o ataque anunciado, abre o
     * micro-desafio da era do poder que neutraliza aquele ataque, resolve, e
     * fecha o turno. Nada de resultado fingido -- se um dos seis minijogos nao
     * fechar na versao 'micro', este teste cai.
     */
    while (!boss.over && voltas < 200) {
      voltas += 1;

      if (canLaunchPatch(boss)) {
        boss = startPatch(boss);
        for (let step = 0; boss.patchRun !== null; step += 1) {
          const era = patchEra(boss, step);
          const evaluation = playWithReference(era, `patch-${step}`, 'micro');
          expect({ era, patch: evaluation.ok }).toEqual({ era, patch: true });
          boss = patchStep(boss, evaluation).state;
        }
        continue;
      }

      const power = answerTo(boss);
      const era = eraToPlay(boss);
      const evaluation = playWithReference(era, `turno-${boss.turn}-${boss.actionsLeft}`, 'micro');
      expect({ era, micro: evaluation.ok }).toEqual({ era, micro: true });

      boss = strike(boss, power, player.powers[power], evaluation).state;

      if (turnDone(boss) && !boss.over) {
        const fim = endTurn(boss, player);
        boss = fim.state;
        player = fim.player;
      }
    }

    expect({ fim: boss.over, voltas }).toEqual({ fim: 'win', voltas });
    // Respondendo certo todos os turnos, a maquina sai sem um arranhao.
    expect(player.hp).toBe(player.hpMax);
    expect(bossScore(player.hp, turnsTaken(boss))).toBeGreaterThan(0);
  });

  it('todo ataque do chefao tem micro-desafio registrado para responder', () => {
    // Ataque sem minijogo registrado seria ataque impossivel de neutralizar.
    for (const attack of ATTACKS) {
      const era = eraOfAttack(attack);
      expect(ERAS).toContain(era);
      expect(() => getMinigame(era)).not.toThrow();
    }
    for (let turn = 1; turn <= 50; turn += 1) {
      expect(ATTACKS).toContain(attackFor('cobertura', turn));
    }
  });
});
