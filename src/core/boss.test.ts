import { describe, expect, it } from 'vitest';
import {
  ATTACKS,
  answer,
  answerTo,
  attackById,
  attackFor,
  eraOfAttack,
  eraToPlay,
  initialBoss,
  neutralizes,
  roundsTaken,
  strikeDamage,
} from './boss';
import { BOSS, DIFFICULTY } from './constants';

const good = { ok: true, efficiency: 1 };
const bad = { ok: false, efficiency: 0 };

describe('chefao: ataques', () => {
  it('seis ataques, um por era', () => {
    expect(new Set(ATTACKS.map(eraOfAttack)).size).toBe(6);
    expect(attackById('vazamento').neutralizedBy).toBe('proteger');
    expect(() => attackById('nada' as never)).toThrow();
  });

  it('o anuncio e deterministico e nao repete o anterior', () => {
    for (let round = 1; round <= 30; round += 1) {
      expect(attackFor('s', round)).toEqual(attackFor('s', round));
      if (round > 1) expect(attackFor('s', round).id).not.toBe(attackFor('s', round - 1).id);
    }
  });
});

describe('chefao: luta', () => {
  it('comeca com vida cheia e coracoes', () => {
    const b = initialBoss('x');
    expect(b).toMatchObject({
      hp: BOSS.HP,
      hearts: DIFFICULTY.normal.BOSS_HEARTS,
      round: 1,
      over: null,
    });
    expect(eraToPlay(b)).toBe(eraOfAttack(b.announced));
    expect(answerTo(b)).toBe(b.announced.neutralizedBy);
  });

  it('responder bem machuca o BUG; o nivel da habilidade aumenta o golpe', () => {
    expect(strikeDamage(3, 1)).toBeGreaterThan(strikeDamage(1, 1));
    expect(strikeDamage(0, 1)).toBe(strikeDamage(1, 1));
    const r = answer(initialBoss('x'), 1, good);
    expect(r.blocked).toBe(true);
    expect(r.state.hp).toBe(BOSS.HP - r.damage);
    expect(r.state.hearts).toBe(DIFFICULTY.normal.BOSS_HEARTS);
    expect(r.state.round).toBe(2);
  });

  it('responder mal custa um coracao; sem coracao a luta acaba', () => {
    let b = initialBoss('x');
    for (let i = 0; i < DIFFICULTY.normal.BOSS_HEARTS; i += 1) b = answer(b, 1, bad).state;
    expect(b.over).toBe('lose');
    expect(answer(b, 1, good).state).toBe(b);
  });

  it('eficiencia baixa nao neutraliza', () => {
    expect(neutralizes({ ok: true, efficiency: BOSS.BLOCK_MIN_EFFICIENCY - 0.01 })).toBe(false);
    expect(neutralizes(good)).toBe(true);
  });

  it('quem responde tudo certo vence', () => {
    let b = initialBoss('x');
    while (!b.over) b = answer(b, 3, good).state;
    expect(b.over).toBe('win');
    expect(b.hearts).toBe(DIFFICULTY.normal.BOSS_HEARTS);
    expect(roundsTaken(b)).toBeGreaterThan(0);
  });
});
