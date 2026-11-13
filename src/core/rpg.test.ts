import { describe, expect, it } from 'vitest';
import {
  applyMissionResult,
  clockFor,
  collectFragment,
  eraOfMissionId,
  fullHeal,
  gainXp,
  heal,
  hpMaxFor,
  applyQuizResult,
  consumeItem,
  initialState,
  missionId,
  missionXp,
  powerLevelFor,
  takeDamage,
  worldYear,
  wouldReboot,
  xpToNextLevel,
} from './rpg';
import { QUIZ, RPG } from './constants';
import type { Evaluation, PlayerState } from './types';

const ok = (efficiency: number): Evaluation => ({ ok: true, efficiency });

describe('rpg: estado inicial', () => {
  it('comeca no nivel 1, vida cheia, clock 2 e sem poderes', () => {
    const s = initialState();
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
    expect(s.hp).toBe(110);
    expect(s.hpMax).toBe(110);
    expect(s.clock).toBe(2);
    expect(s.year).toBe(RPG.START_YEAR);
    expect(Object.values(s.powers).every((p) => p === 0)).toBe(true);
    expect(s.missions).toEqual({});
    expect(s.items).toEqual({});
  });
});

describe('rpg: tabelas de nivel', () => {
  it('vida maxima = 100 + 10 por nivel, limitada ao nivel 10', () => {
    expect(hpMaxFor(1)).toBe(110);
    expect(hpMaxFor(10)).toBe(200);
    expect(hpMaxFor(99)).toBe(200);
    expect(hpMaxFor(0)).toBe(110);
  });

  it('clock = 2 e sobe nos niveis 4 e 8', () => {
    expect(clockFor(1)).toBe(2);
    expect(clockFor(3)).toBe(2);
    expect(clockFor(4)).toBe(3);
    expect(clockFor(7)).toBe(3);
    expect(clockFor(8)).toBe(4);
    expect(clockFor(10)).toBe(4);
  });

  it('XP para o proximo nivel = 100 x nivel', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(5)).toBe(500);
  });
});

describe('rpg: XP e nivel', () => {
  it('acumula XP sem subir de nivel', () => {
    const s = gainXp(initialState(), 60);
    expect(s.level).toBe(1);
    expect(s.xp).toBe(60);
  });

  it('sobe de nivel, deixa a vida cheia e guarda o resto do XP', () => {
    const s = gainXp(initialState(), 130);
    expect(s.level).toBe(2);
    expect(s.xp).toBe(30);
    expect(s.hpMax).toBe(120);
    expect(s.hp).toBe(120);
  });

  it('sobe varios niveis de uma vez e aumenta o clock', () => {
    const s = gainXp(initialState(), 100 + 200 + 300 + 10);
    expect(s.level).toBe(4);
    expect(s.xp).toBe(10);
    expect(s.clock).toBe(3);
  });

  it('para no nivel maximo', () => {
    const s = gainXp(initialState(), 100000);
    expect(s.level).toBe(RPG.MAX_LEVEL);
    expect(s.hpMax).toBe(200);
    expect(s.xp).toBeLessThanOrEqual(xpToNextLevel(RPG.MAX_LEVEL));
  });

  it('ignora valores invalidos', () => {
    const s = initialState();
    expect(gainXp(s, 0)).toBe(s);
    expect(gainXp(s, -10)).toBe(s);
    expect(gainXp(s, Number.NaN)).toBe(s);
  });
});

describe('rpg: vida', () => {
  it('tira vida normalmente', () => {
    expect(takeDamage(initialState(), 30).hp).toBe(80);
  });

  it('a vida zerada reinicia a maquina com 50%', () => {
    const almost: PlayerState = { ...initialState(), hp: 5 };
    expect(wouldReboot(almost, 10)).toBe(true);
    expect(takeDamage(almost, 10).hp).toBe(55);
    expect(takeDamage(almost, 999).hp).toBe(55);
  });

  it('wouldReboot e falso quando sobra vida', () => {
    expect(wouldReboot(initialState(), 10)).toBe(false);
  });

  it('ignora dano invalido', () => {
    const s = initialState();
    expect(takeDamage(s, 0)).toBe(s);
    expect(takeDamage(s, Number.NaN)).toBe(s);
  });

  it('cura por porcentagem sem passar do maximo', () => {
    const hurt: PlayerState = { ...initialState(), hp: 40 };
    expect(heal(hurt, 0.25).hp).toBe(40 + 28);
    expect(heal(hurt, 10).hp).toBe(110);
    expect(heal(hurt, 0)).toBe(hurt);
    expect(fullHeal(hurt).hp).toBe(110);
  });
});

describe('rpg: prova da era', () => {
  it('credita XP por acerto mesmo reprovando, e nao tira vida', () => {
    const hurt = takeDamage(initialState(), 30);
    const s = applyQuizResult(hurt, 'mecanica', { correct: 2, total: 4, passed: false });
    expect(s.xp).toBe(2 * QUIZ.XP_PER_CORRECT);
    expect(s.hp).toBe(hurt.hp);
    expect(s.items).toEqual({});
  });

  it('passar entrega o item da era e cura por inteiro', () => {
    const hurt = takeDamage(initialState(), 50);
    const s = applyQuizResult(hurt, 'mecanica', { correct: 4, total: 4, passed: true });
    expect(s.items['cartao-perfurado']).toBe(1);
    expect(s.hp).toBe(s.hpMax);
  });

  it('cada era entrega o proprio item', () => {
    const s = applyQuizResult(initialState(), 'logica', { correct: 4, total: 4, passed: true });
    expect(s.items['valvula-reserva']).toBe(1);
    expect(s.items['cartao-perfurado']).toBeUndefined();
  });
});

describe('rpg: itens', () => {
  it('usar a valvula reserva restaura vida e gasta o item', () => {
    let s = applyQuizResult(initialState(), 'logica', { correct: 4, total: 4, passed: true });
    s = takeDamage(s, 60);
    const before = s.hp;
    const { player, used } = consumeItem(s, 'valvula-reserva');
    expect(used).toBe(true);
    expect(player.hp).toBe(before + 40);
    expect(player.items['valvula-reserva']).toBeUndefined();
  });

  it('a cura pelo item nunca passa da vida maxima', () => {
    const s = applyQuizResult(initialState(), 'logica', { correct: 4, total: 4, passed: true });
    const { player } = consumeItem(s, 'valvula-reserva');
    expect(player.hp).toBe(player.hpMax);
  });

  it('usar item que nao se tem nao muda nada', () => {
    const s = initialState();
    const { player, used } = consumeItem(s, 'valvula-reserva');
    expect(used).toBe(false);
    expect(player).toBe(s);
  });
});

describe('rpg: missoes e poderes', () => {
  it('monta e le o id da missao', () => {
    expect(missionId('redes', 'B')).toBe('redes-B');
    expect(eraOfMissionId('redes-B')).toBe('redes');
    expect(eraOfMissionId('inexistente-B')).toBeNull();
  });

  it('XP da missao = 50 + 30 por estrela', () => {
    expect(missionXp(0)).toBe(50);
    expect(missionXp(3)).toBe(140);
  });

  it('a missao nao tira vida e cura 25% ao concluir', () => {
    const hurt: PlayerState = { ...initialState(), hp: 40 };
    const s = applyMissionResult(hurt, 'mecanica-A', ok(0.9));
    expect(s.hp).toBeGreaterThan(hurt.hp);
  });

  it('registra estrelas e melhor pontuacao', () => {
    const s = applyMissionResult(initialState(), 'mecanica-A', ok(1.0));
    expect(s.missions['mecanica-A']).toEqual({ stars: 3, bestScore: 1000 });
  });

  it('em repeticao pior, mantem o melhor resultado e nao da XP', () => {
    const first = applyMissionResult(initialState(), 'mecanica-A', ok(1.0));
    const second = applyMissionResult(first, 'mecanica-A', ok(0.4));
    expect(second.missions['mecanica-A']).toEqual({ stars: 3, bestScore: 1000 });
    expect(second.xp).toBe(first.xp);
    expect(second.level).toBe(first.level);
  });

  it('em repeticao melhor, conta so a melhoria de XP', () => {
    const first = applyMissionResult(initialState(), 'mecanica-A', ok(0.5));
    const second = applyMissionResult(first, 'mecanica-A', ok(1.0));
    const totalXp = (s: PlayerState) => (s.level - 1) * 100 + s.xp;
    expect(totalXp(first)).toBe(80);
    expect(totalXp(second)).toBe(140);
  });

  it('missao falhada registra 0 estrelas e nao cura', () => {
    const hurt: PlayerState = { ...initialState(), hp: 40 };
    const s = applyMissionResult(hurt, 'mecanica-A', { ok: false, efficiency: 1.2 });
    expect(s.missions['mecanica-A']).toEqual({ stars: 0, bestScore: 0 });
    expect(s.hp).toBe(40);
  });

  it('ignora id de missao desconhecido', () => {
    const s = initialState();
    expect(applyMissionResult(s, 'xpto-A', ok(1))).toBe(s);
  });

  it('o poder chega ao nivel 1 ao concluir a missao B da era', () => {
    let s = applyMissionResult(initialState(), 'mecanica-A', ok(1.0));
    expect(s.powers.repetir).toBe(0);
    s = applyMissionResult(s, 'mecanica-B', ok(0.5));
    expect(s.powers.repetir).toBe(1);
  });

  it('nivel 2 com 2 estrelas nas duas missoes e nivel 3 com 3 estrelas', () => {
    let s = applyMissionResult(initialState(), 'mecanica-A', ok(0.9));
    s = applyMissionResult(s, 'mecanica-B', ok(0.9));
    expect(s.powers.repetir).toBe(2);
    s = applyMissionResult(s, 'mecanica-A', ok(1.0));
    s = applyMissionResult(s, 'mecanica-B', ok(1.0));
    expect(s.powers.repetir).toBe(3);
  });

  it('powerLevelFor e 0 sem a missao B', () => {
    const s = applyMissionResult(initialState(), 'logica-A', ok(1));
    expect(powerLevelFor(s, 'logica')).toBe(0);
  });

  it('o ano do mundo avanca com a era conquistada', () => {
    let s = initialState();
    expect(worldYear(s)).toBe(1642);
    s = applyMissionResult(s, 'redes-B', ok(1));
    expect(s.year).toBe(1969);
    expect(worldYear(s)).toBe(1969);
  });

  it('o ano do mundo nunca retrocede', () => {
    let s = applyMissionResult(initialState(), 'ia-B', ok(1));
    expect(s.year).toBe(2012);
    s = applyMissionResult(s, 'mecanica-B', ok(1));
    expect(s.year).toBe(2012);
  });
});

describe('rpg: fragmentos de memoria', () => {
  it('fragmento novo rende XP e entra na lista', () => {
    const result = collectFragment(initialState(), [], 'world-mecanica:0');
    expect(result.gained).toBe(true);
    expect(result.player.xp).toBe(RPG.FRAGMENT_XP);
    expect(result.collected).toEqual(['world-mecanica:0']);
  });

  it('fragmento repetido nao rende de novo', () => {
    const first = collectFragment(initialState(), [], 'world-mecanica:0');
    const again = collectFragment(first.player, first.collected, 'world-mecanica:0');
    expect(again.gained).toBe(false);
    expect(again.player).toBe(first.player);
    expect(again.collected).toEqual(['world-mecanica:0']);
  });
});
