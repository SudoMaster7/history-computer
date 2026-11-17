import { describe, expect, it } from 'vitest';
import { damageMultiplier, ERAS, ERA_OF_POWER, POWER_IDS, POWER_OF_ERA } from './powers';

describe('powers', () => {
  it('cada era tem um poder e o mapa inverso bate', () => {
    expect(ERAS).toHaveLength(6);
    expect(POWER_IDS).toHaveLength(6);
    for (const era of ERAS) {
      expect(ERA_OF_POWER[POWER_OF_ERA[era]]).toBe(era);
    }
  });

  it('multiplicador de dano cresce com o nivel', () => {
    expect(damageMultiplier(0)).toBe(0);
    expect(damageMultiplier(1)).toBe(1);
    expect(damageMultiplier(2)).toBeGreaterThan(damageMultiplier(1));
    expect(damageMultiplier(3)).toBeGreaterThan(damageMultiplier(2));
  });
});
