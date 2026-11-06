import type { EraId, MinigameModule } from './types';

const registry = new Map<EraId, MinigameModule<any, any>>();

export function registerMinigame<I, S>(m: MinigameModule<I, S>): void {
  registry.set(m.era, m as MinigameModule<any, any>);
}

export function getMinigame(era: EraId): MinigameModule<any, any> {
  const m = registry.get(era);
  if (!m) throw new Error(`Minijogo nao registrado para a era "${era}".`);
  return m;
}

export function hasMinigame(era: EraId): boolean {
  return registry.has(era);
}

export function registeredEras(): EraId[] {
  return [...registry.keys()];
}

/** Util apenas em testes. */
export function clearRegistry(): void {
  registry.clear();
}
