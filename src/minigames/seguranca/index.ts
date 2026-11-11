import type { MinigameModule } from '@/core/types';
import type { VaultInstance, VaultSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const segurancaModule: MinigameModule<VaultInstance, VaultSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { VaultInstance, VaultSolution, VaultLink } from './logic';
export default segurancaModule;
