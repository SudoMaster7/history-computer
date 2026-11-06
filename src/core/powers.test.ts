import { describe, expect, it } from 'vitest';
import {
  eraUnlocked,
  previousEra,
  damageMultiplier,
  ERAS,
  ERA_OF_POWER,
  POWER_IDS,
  POWER_OF_ERA,
  POWER_REQUIRES,
  unlockedPowers,
} from './powers';
import { initialState } from './rpg';
import type { PlayerState, PowerId } from './types';

function withPowers(...owned: PowerId[]): PlayerState {
  const s = initialState();
  const powers = { ...s.powers };
  for (const p of owned) powers[p] = 1;
  return { ...s, powers };
}

describe('powers: arvore', () => {
  it('cada era tem um poder e o mapa inverso bate', () => {
    expect(ERAS).toHaveLength(6);
    expect(POWER_IDS).toHaveLength(6);
    for (const era of ERAS) {
      expect(ERA_OF_POWER[POWER_OF_ERA[era]]).toBe(era);
    }
  });

  it('as dependencias seguem a tabela do briefing', () => {
    expect(POWER_REQUIRES.repetir).toEqual([]);
    expect(POWER_REQUIRES.decidir).toEqual(['repetir']);
    expect(POWER_REQUIRES.codificar).toEqual(['repetir', 'decidir']);
    expect(POWER_REQUIRES.conectar).toEqual(['repetir', 'decidir', 'codificar']);
    expect(POWER_REQUIRES.proteger).toEqual(['decidir', 'codificar', 'conectar']);
    expect(POWER_REQUIRES.aprender).toEqual(['decidir', 'codificar']);
  });

  it('nenhum poder depende de si mesmo nem de um poder posterior', () => {
    POWER_IDS.forEach((p, i) => {
      for (const req of POWER_REQUIRES[p]) {
        expect(req).not.toBe(p);
        expect(POWER_IDS.indexOf(req)).toBeLessThan(i);
      }
    });
  });
});

describe('powers: entrada nas eras', () => {
  it('a primeira era esta sempre aberta', () => {
    expect(eraUnlocked('mecanica', [])).toBe(true);
  });

  it('uma era so abre quando a anterior foi concluida', () => {
    expect(eraUnlocked('logica', [])).toBe(false);
    expect(eraUnlocked('logica', ['mecanica'])).toBe(true);
    expect(eraUnlocked('codigo', ['mecanica'])).toBe(false);
    expect(eraUnlocked('codigo', ['mecanica', 'logica'])).toBe(true);
  });

  it('concluir uma era adiante nao pula as do meio', () => {
    expect(eraUnlocked('ia', ['mecanica', 'logica'])).toBe(false);
    expect(eraUnlocked('ia', ['seguranca'])).toBe(true);
  });

  it('previousEra devolve a era anterior, e null na primeira', () => {
    expect(previousEra('mecanica')).toBeNull();
    expect(previousEra('logica')).toBe('mecanica');
    expect(previousEra('ia')).toBe('seguranca');
  });
});

describe('powers: dano e desbloqueio', () => {
  it('multiplicador de dano por nivel do poder', () => {
    expect(damageMultiplier(0)).toBe(0);
    expect(damageMultiplier(1)).toBe(1.0);
    expect(damageMultiplier(2)).toBe(1.25);
    expect(damageMultiplier(3)).toBe(1.5);
  });

  it('unlockedPowers lista os poderes de nivel 1 ou mais', () => {
    expect(unlockedPowers(initialState())).toEqual([]);
    expect(unlockedPowers(withPowers('repetir', 'aprender'))).toEqual(['repetir', 'aprender']);
  });
});
