import type { EraId, PowerId, PowerLevel } from './types';
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

/** Multiplicador de dano do poder conforme seu nivel. */
export function damageMultiplier(level: PowerLevel): number {
  return POWERS.DAMAGE_MULTIPLIER[level] ?? 0;
}
