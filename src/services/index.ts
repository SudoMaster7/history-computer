import type { Api } from './api';
import { localApi } from './localApi';

/** `supabaseApi` entra na fase 6, escolhido por variavel de ambiente. */
export function createApi(): Api {
  return localApi;
}

export type { Api } from './api';
export * from './api';
