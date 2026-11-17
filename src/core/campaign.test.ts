import { describe, expect, it } from 'vitest';
import {
  BOSS_STAGE,
  STAGE_ORDER,
  abilitiesOf,
  clearedErasOf,
  eraCleared,
  eraOfStage,
  nextStage,
  stageUnlocked,
} from './campaign';

const done = (...ids: string[]): Record<string, { stars: number }> =>
  Object.fromEntries(ids.map((id) => [id, { stars: 1 }]));

describe('campanha: mapa de fases', () => {
  it('sao 12 fases, duas por era, na ordem das eras', () => {
    expect(STAGE_ORDER).toHaveLength(12);
    expect(STAGE_ORDER.slice(0, 3)).toEqual(['mecanica-A', 'mecanica-B', 'logica-A']);
    expect(STAGE_ORDER.at(-1)).toBe('ia-B');
  });

  it('num save zerado so a primeira fase abre', () => {
    expect(STAGE_ORDER.filter((id) => stageUnlocked(id, {}))).toEqual(['mecanica-A']);
    expect(stageUnlocked(BOSS_STAGE, {})).toBe(false);
    expect(nextStage({})).toBe('mecanica-A');
  });

  it('cada fase abre com a anterior concluida; zero estrela nao conta', () => {
    expect(stageUnlocked('mecanica-B', done('mecanica-A'))).toBe(true);
    expect(stageUnlocked('mecanica-B', { 'mecanica-A': { stars: 0 } })).toBe(false);
    expect(stageUnlocked('logica-A', done('mecanica-A'))).toBe(false);
  });

  it('a era fecha com as duas fases e da a habilidade dela', () => {
    const m = done('mecanica-A', 'mecanica-B', 'logica-A');
    expect(eraCleared('mecanica', m)).toBe(true);
    expect(eraCleared('logica', m)).toBe(false);
    expect(clearedErasOf(m)).toEqual(['mecanica']);
    expect(abilitiesOf(m)).toEqual(['repetir']);
  });

  it('o chefao abre com as 12 fases', () => {
    const all = done(...STAGE_ORDER);
    expect(stageUnlocked(BOSS_STAGE, all)).toBe(true);
    expect(nextStage(all)).toBe(BOSS_STAGE);
    expect(abilitiesOf(all)).toHaveLength(6);
  });

  it('modo desenvolvedor abre tudo, mas nao inventa fase', () => {
    expect(stageUnlocked('ia-B', {}, true)).toBe(true);
    expect(stageUnlocked(BOSS_STAGE, {}, true)).toBe(true);
    expect(stageUnlocked('nada-A', {}, true)).toBe(false);
  });

  it('le a era pelo id da fase', () => {
    expect(eraOfStage('redes-B')).toBe('redes');
    expect(eraOfStage('redes-C')).toBeNull();
  });
});
