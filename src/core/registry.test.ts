import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRegistry,
  getMinigame,
  hasMinigame,
  registerMinigame,
  registeredEras,
} from './registry';
import type { MinigameModule } from './types';

const fake: MinigameModule<{ n: number }, number> = {
  era: 'mecanica',
  generate: (seed) => ({ n: seed.length }),
  evaluate: (instance, solution) => ({
    ok: solution === instance.n,
    efficiency: solution === instance.n ? 1 : 0,
  }),
  reference: (instance) => instance.n,
  Screen: () => null,
};

describe('registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registra e devolve o minijogo da era', () => {
    registerMinigame(fake);
    expect(hasMinigame('mecanica')).toBe(true);
    expect(getMinigame('mecanica')).toBe(fake);
    expect(registeredEras()).toEqual(['mecanica']);
  });

  it('lanca erro para era sem minijogo', () => {
    expect(hasMinigame('ia')).toBe(false);
    expect(() => getMinigame('ia')).toThrow(/nao registrado/);
  });

  it('o ultimo registro da era substitui o anterior', () => {
    registerMinigame(fake);
    const outro = { ...fake };
    registerMinigame(outro);
    expect(getMinigame('mecanica')).toBe(outro);
    expect(registeredEras()).toHaveLength(1);
  });
});
