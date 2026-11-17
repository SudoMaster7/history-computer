import type { EraId, MissionLetter, PowerId } from './types';
import { ERAS, POWER_OF_ERA } from './powers';

/**
 * A campanha como mapa de fases (D73), no estilo do mapa de Super Mario World:
 * duas fases por era, em ordem, e o chefao no fim.
 *
 * A fase tem o mesmo id da missao (`mecanica-A`), porque cada fase termina no
 * minijogo daquela missao: concluir a fase e concluir o minijogo (1 estrela ou
 * mais). As estrelas continuam saindo do minijogo, e e so isso que o save
 * guarda -- o que abre, o que fecha e que habilidade o Bit tem sai daqui.
 */

export const BOSS_STAGE = 'boss';

export const STAGE_LETTERS: readonly MissionLetter[] = ['A', 'B'];

export function stageId(era: EraId, letter: MissionLetter): string {
  return `${era}-${letter}`;
}

/** As 12 fases, na ordem do mapa (sem o chefao). */
export const STAGE_ORDER: readonly string[] = ERAS.flatMap((era) =>
  STAGE_LETTERS.map((letter) => stageId(era, letter)),
);

export type StarMap = Readonly<Record<string, { stars: number } | undefined>>;

export function stageCleared(id: string, missions: StarMap): boolean {
  return (missions[id]?.stars ?? 0) >= 1;
}

/** A era fecha com as duas fases concluidas. */
export function eraCleared(era: EraId, missions: StarMap): boolean {
  return STAGE_LETTERS.every((letter) => stageCleared(stageId(era, letter), missions));
}

export function clearedErasOf(missions: StarMap): EraId[] {
  return ERAS.filter((era) => eraCleared(era, missions));
}

/**
 * A fase abre quando a anterior foi concluida; a primeira esta sempre aberta,
 * e o chefao abre com as 12. O modo desenvolvedor (D53) abre tudo sem dar
 * progresso.
 */
export function stageUnlocked(id: string, missions: StarMap, devMode = false): boolean {
  if (devMode) return id === BOSS_STAGE || STAGE_ORDER.includes(id);
  if (id === BOSS_STAGE) return STAGE_ORDER.every((s) => stageCleared(s, missions));
  const index = STAGE_ORDER.indexOf(id);
  if (index < 0) return false;
  if (index === 0) return true;
  return stageCleared(STAGE_ORDER[index - 1]!, missions);
}

/** A proxima fase a jogar: a primeira nao concluida, ou o chefao. */
export function nextStage(missions: StarMap): string {
  return STAGE_ORDER.find((id) => !stageCleared(id, missions)) ?? BOSS_STAGE;
}

/** Habilidades do Bit (D76): uma por era fechada, como em Mega Man X. */
export function abilitiesOf(missions: StarMap): PowerId[] {
  return clearedErasOf(missions).map((era) => POWER_OF_ERA[era]);
}

/** Era de uma fase pelo id, ou null. */
export function eraOfStage(id: string): EraId | null {
  const era = id.split('-')[0] as EraId;
  return ERAS.includes(era) && STAGE_ORDER.includes(id) ? era : null;
}
