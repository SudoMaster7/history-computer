import type { EraId, MissionDef, MissionLetter } from '@/core/types';
import raw from './missions.json';

export const MISSIONS: readonly MissionDef[] = raw as MissionDef[];

export function missionsOfEra(era: EraId): MissionDef[] {
  return MISSIONS.filter((m) => m.era === era);
}

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function missionOf(era: EraId, letter: MissionLetter): MissionDef | undefined {
  return MISSIONS.find((m) => m.era === era && m.letter === letter);
}
