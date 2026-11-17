import type { EraId } from '@/core/types';
import type { RawStage, StageDef } from '@/core/stage';
import { parseStage } from '@/core/stage';
import raw from './stages.json';
import texts from './stages.pt-BR.json';

/** As 12 fases de plataforma, geradas por `tools/make-stages.py` (D75). */
export const RAW_STAGES: readonly RawStage[] = raw as RawStage[];

export const STAGES: readonly StageDef[] = RAW_STAGES.map(parseStage);

export interface StageText {
  title: string;
  intro: string;
  signs: string[];
  summary: string;
}

export const STAGE_TEXTS: Readonly<Record<string, StageText>> = texts;

export function getStage(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}

export function stagesOfEra(era: EraId): StageDef[] {
  return STAGES.filter((s) => s.era === era);
}

export function stageText(id: string): StageText | undefined {
  return STAGE_TEXTS[id];
}
