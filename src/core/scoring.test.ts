import { describe, expect, it } from 'vitest';
import { bossScore, clampEfficiency, missionScore, mistakeEfficiency, starsFor } from './scoring';
import { SCORING } from './constants';

describe('scoring', () => {
  it('nao da estrela quando a missao nao foi concluida', () => {
    expect(starsFor(1.5, false)).toBe(0);
  });

  it('aplica os limiares de estrelas', () => {
    expect(starsFor(0.5, true)).toBe(1);
    expect(starsFor(0.84, true)).toBe(1);
    expect(starsFor(0.85, true)).toBe(2);
    expect(starsFor(0.99, true)).toBe(2);
    expect(starsFor(1.0, true)).toBe(3);
    expect(starsFor(1.4, true)).toBe(3);
  });

  it('limita a eficiencia ao maximo e trata valores invalidos', () => {
    expect(clampEfficiency(2)).toBe(SCORING.EFFICIENCY_MAX);
    expect(clampEfficiency(-1)).toBe(0);
    expect(clampEfficiency(Number.NaN)).toBe(0);
    expect(clampEfficiency(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('missionScore = round(1000 x eficiencia), maximo 1500', () => {
    expect(missionScore(1)).toBe(1000);
    expect(missionScore(0.853)).toBe(853);
    expect(missionScore(1.5)).toBe(1500);
    expect(missionScore(9)).toBe(1500);
    expect(missionScore(0)).toBe(0);
  });

  it('bossScore = 2000 + 300 x coracoes - 60 x rodadas, minimo 200', () => {
    expect(bossScore(3, 5)).toBe(2000 + 900 - 300);
    expect(bossScore(0, 0)).toBe(2000);
    expect(bossScore(0, 100)).toBe(SCORING.BOSS_SCORE_MIN);
    expect(bossScore(-50, -5)).toBe(2000);
  });

  it('erro em minijogo custa estrela, nunca a missao', () => {
    expect(mistakeEfficiency(0)).toBe(1);
    expect(starsFor(mistakeEfficiency(0), true)).toBe(3);
    expect(starsFor(mistakeEfficiency(1), true)).toBe(2);
    expect(starsFor(mistakeEfficiency(2), true)).toBe(2);
    expect(starsFor(mistakeEfficiency(3), true)).toBe(1);
    // Por mais erros que haja, a eficiencia para no piso.
    expect(mistakeEfficiency(50)).toBe(SCORING.MISTAKE_FLOOR);
    // Valor invalido conta como nenhum erro, e fracao e arredondada para baixo.
    expect(mistakeEfficiency(Number.NaN)).toBe(1);
    expect(mistakeEfficiency(-3)).toBe(1);
    expect(mistakeEfficiency(1.9)).toBe(mistakeEfficiency(1));
  });
});
