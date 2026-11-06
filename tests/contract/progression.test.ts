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
import { findPath, isDoorOpen, missionsLeft } from '@/core/world';
import type { EraId, PlayerState } from '@/core/types';
import { worldOfEra } from '@/data/worlds';
import { QUIZ_BANK } from '@/data/quizzes';

/**
 * CONTRATO: o jogo e zeravel.
 *
 * Este e o teste mais importante do projeto. Ele joga a campanha inteira usando
 * so as funcoes puras: em cada era anda ate os dois terminais, conclui as duas
 * missoes, confere que a porta abre, faz a prova, recebe poder e item, e exige
 * que a era seguinte destranque.
 *
 * Se alguem mexer na progressao e deixar o jogador preso em qualquer ponto --
 * porta que nao abre, prova impossivel, era que nunca libera -- este teste
 * falha dizendo exatamente em qual era travou.
 */

/** Conclui uma missao com desempenho perfeito. */
function doMission(player: PlayerState, id: string): PlayerState {
  return applyMissionResult(player, id, { ok: true, efficiency: 1 });
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
