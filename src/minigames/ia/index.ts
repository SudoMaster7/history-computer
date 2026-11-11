import type { MinigameModule } from '@/core/types';
import type { ModelInstance, ModelSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const iaModule: MinigameModule<ModelInstance, ModelSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { ModelInstance, ModelSolution, ModelExample } from './logic';
export default iaModule;
