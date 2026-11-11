import type { MinigameModule } from '@/core/types';
import type { BitsInstance, BitsSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const codigoModule: MinigameModule<BitsInstance, BitsSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { BitsInstance, BitsSolution, BitsSymbol } from './logic';
export default codigoModule;
