import type { EraId } from '@/core/types';
import type { RawWorld, WorldDef } from '@/core/world';
import { parseWorld } from '@/core/world';
import raw from './worlds.json';

export const WORLDS: readonly WorldDef[] = (raw as RawWorld[]).map(parseWorld);

export function worldOfEra(era: EraId): WorldDef | undefined {
  return WORLDS.find((w) => w.era === era);
}

export function getWorld(id: string): WorldDef | undefined {
  return WORLDS.find((w) => w.id === id);
}
