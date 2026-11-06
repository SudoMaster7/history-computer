import type { EraId } from '@/core/types';
import raw from './npcs.pt-BR.json';

/** Personagem historico do mapa: quem e, o que fez e o que ele conta. */
export interface NpcProfile {
  era: EraId;
  name: string;
  role: string;
  lines: string[];
}

export const NPCS: Readonly<Record<string, NpcProfile>> = raw as Record<string, NpcProfile>;

export function npcProfile(id: string): NpcProfile | undefined {
  return NPCS[id];
}
