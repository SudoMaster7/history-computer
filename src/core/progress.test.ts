import { describe, expect, it } from 'vitest';
import {
  applyMissionResult,
  eraOfMissionId,
  initialState,
  missionId,
  powerLevelFor,
  powersOf,
} from './progress';

const ok = (efficiency: number) => ({ ok: true, efficiency });

describe('progresso', () => {
  it('save zerado nao tem fase nem poder', () => {
    const s = initialState();
    expect(s.missions).toEqual({});
    expect(Object.values(powersOf(s)).every((l) => l === 0)).toBe(true);
  });

  it('guarda estrelas e pontuacao, e repetir nunca reduz', () => {
    let s = applyMissionResult(initialState(), 'mecanica-A', ok(1));
    expect(s.missions['mecanica-A']).toEqual({ stars: 3, bestScore: 1000 });
    s = applyMissionResult(s, 'mecanica-A', ok(0.5));
    expect(s.missions['mecanica-A']).toEqual({ stars: 3, bestScore: 1000 });
    s = applyMissionResult(s, 'mecanica-A', { ok: false, efficiency: 0 });
    expect(s.missions['mecanica-A']!.stars).toBe(3);
  });

  it('id de missao desconhecido nao muda nada', () => {
    const s = initialState();
    expect(applyMissionResult(s, 'nada-A', ok(1))).toBe(s);
  });

  it('o nivel da habilidade sai das estrelas das duas fases', () => {
    let s = applyMissionResult(initialState(), 'logica-A', ok(1));
    expect(powerLevelFor(s, 'logica')).toBe(0);
    s = applyMissionResult(s, 'logica-B', ok(0.6));
    expect(powerLevelFor(s, 'logica')).toBe(1);
    s = applyMissionResult(s, 'logica-B', ok(0.9));
    expect(powerLevelFor(s, 'logica')).toBe(2);
    s = applyMissionResult(s, 'logica-B', ok(1));
    expect(powersOf(s).decidir).toBe(3);
  });

  it('ids de missao', () => {
    expect(missionId('redes', 'B')).toBe('redes-B');
    expect(eraOfMissionId('redes-B')).toBe('redes');
    expect(eraOfMissionId('xyz-A')).toBeNull();
  });
});
