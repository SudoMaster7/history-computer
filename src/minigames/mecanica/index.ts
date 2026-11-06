import type { MinigameModule } from '@/core/types';
import type { LoomInstance, LoomSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const mecanicaModule: MinigameModule<LoomInstance, LoomSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { LoomInstance, LoomSolution } from './logic';
export default mecanicaModule;
