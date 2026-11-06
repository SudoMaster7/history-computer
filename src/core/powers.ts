import type { EraId, PlayerState, PowerId, PowerLevel } from './types';
import { POWERS } from './constants';

export const ERAS: readonly EraId[] = ['mecanica', 'logica', 'codigo', 'redes', 'seguranca', 'ia'];

export const POWER_IDS: readonly PowerId[] = [
  'repetir',
  'decidir',
  'codificar',
  'conectar',
  'proteger',
  'aprender',
];

export const POWER_OF_ERA: Record<EraId, PowerId> = {
  mecanica: 'repetir',
  logica: 'decidir',
  codigo: 'codificar',
  redes: 'conectar',
  seguranca: 'proteger',
  ia: 'aprender',
};

export const ERA_OF_POWER: Record<PowerId, EraId> = {
  repetir: 'mecanica',
  decidir: 'logica',
  codificar: 'codigo',
  conectar: 'redes',
  proteger: 'seguranca',
  aprender: 'ia',
};

/** Pre-requisitos (nivel >= 1) de cada poder. */
export const POWER_REQUIRES: Record<PowerId, PowerId[]> = {
  repetir: [],
  decidir: ['repetir'],
  codificar: ['repetir', 'decidir'],
  conectar: ['repetir', 'decidir', 'codificar'],
  proteger: ['decidir', 'codificar', 'conectar'],
  aprender: ['decidir', 'codificar'],
};

/** Poderes que faltam para entrar na era (nivel < 1). */
export function missingPowers(s: PlayerState, era: EraId): PowerId[] {
  const required = POWER_REQUIRES[POWER_OF_ERA[era]];
  return required.filter((p) => s.powers[p] < 1);
}

/**
 * Uma era abre quando a anterior foi concluida (missoes feitas e prova passada).
 * A primeira esta sempre aberta.
 */
export function eraUnlocked(era: EraId, clearedEras: readonly EraId[]): boolean {
  const index = ERAS.indexOf(era);
  if (index <= 0) return true;
  const previous = ERAS[index - 1];
  return previous !== undefined && clearedEras.includes(previous);
}

/** A era anterior, que precisa estar concluida para esta abrir. */
export function previousEra(era: EraId): EraId | null {
  const index = ERAS.indexOf(era);
  return index > 0 ? (ERAS[index - 1] ?? null) : null;
}

/** Multiplicador de dano do poder conforme seu nivel. */
export function damageMultiplier(level: PowerLevel): number {
  return POWERS.DAMAGE_MULTIPLIER[level] ?? 0;
}

/** Poderes com nivel >= 1. */
export function unlockedPowers(s: PlayerState): PowerId[] {
  return POWER_IDS.filter((p) => s.powers[p] >= 1);
}
