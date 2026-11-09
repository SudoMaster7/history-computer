import type { MinigameModule } from '@/core/types';
import type { CircuitInstance, CircuitSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const logicaModule: MinigameModule<CircuitInstance, CircuitSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { CircuitInstance, CircuitSolution, Gate, GateType, CircuitRef } from './logic';
export default logicaModule;
