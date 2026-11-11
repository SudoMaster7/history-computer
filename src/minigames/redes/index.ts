import type { MinigameModule } from '@/core/types';
import type { RouteInstance, RouteSolution } from './logic';
import { era, evaluate, generate, reference } from './logic';
import Screen from './Screen';

export const redesModule: MinigameModule<RouteInstance, RouteSolution> = {
  era,
  generate,
  evaluate,
  reference,
  Screen,
};

export type { RouteInstance, RouteSolution, RouteLink } from './logic';
export default redesModule;
