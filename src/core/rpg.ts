import type {
  EraId,
  Evaluation,
  MissionProgress,
  PlayerState,
  PowerId,
  PowerLevel,
  Stars,
} from './types';
import type { QuizResult } from './quiz';
import { ERA_YEARS, POWERS, QUIZ, RPG } from './constants';
import { missionScore, starsFor } from './scoring';
import { ERAS, POWER_OF_ERA } from './powers';
import { addItem, itemById, itemOfEra, spendItem } from './items';

/** Vida maxima no nivel informado. */
export function hpMaxFor(level: number): number {
  return RPG.HP_BASE + RPG.HP_PER_LEVEL * clampLevel(level);
}

/** Acoes por turno no nivel informado. */
export function clockFor(level: number): number {
  const lvl = clampLevel(level);
  return RPG.CLOCK_BASE + RPG.CLOCK_LEVEL_UPS.filter((l) => lvl >= l).length;
}

/** XP necessario para sair do nivel informado. */
export function xpToNextLevel(level: number): number {
  return RPG.XP_PER_LEVEL * clampLevel(level);
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(RPG.MAX_LEVEL, Math.floor(level)));
}

/** Ano de abertura de cada era. Os numeros moram em `constants.ts`. */
export const ERA_START_YEAR: Record<EraId, number> = ERA_YEARS;

export function initialState(): PlayerState {
  const level = 1;
  return {
    level,
    xp: 0,
    hp: hpMaxFor(level),
    hpMax: hpMaxFor(level),
    clock: clockFor(level),
    powers: {
      repetir: 0,
      decidir: 0,
      codificar: 0,
      conectar: 0,
      proteger: 0,
      aprender: 0,
    },
    missions: {},
    year: RPG.START_YEAR,
    items: {},
  };
}

/** Ganha XP, subindo de nivel quantas vezes couber. Vida fica cheia a cada nivel. */
export function gainXp(s: PlayerState, amount: number): PlayerState {
  if (!Number.isFinite(amount) || amount <= 0) return s;
  let level = s.level;
  let xp = s.xp + Math.floor(amount);
  let leveled = false;

  while (level < RPG.MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    leveled = true;
  }
  if (level >= RPG.MAX_LEVEL) {
    level = RPG.MAX_LEVEL;
    xp = Math.min(xp, xpToNextLevel(RPG.MAX_LEVEL));
  }

  const hpMax = hpMaxFor(level);
  return {
    ...s,
    level,
    xp,
    hpMax,
    hp: leveled ? hpMax : Math.min(s.hp, hpMax),
    clock: clockFor(level),
  };
}

/** Tira vida. Ao chegar a 0, a maquina reinicia com 50% da vida maxima. */
export function takeDamage(s: PlayerState, amount: number): PlayerState {
  if (!Number.isFinite(amount) || amount <= 0) return s;
  const hp = s.hp - Math.floor(amount);
  if (hp > 0) return { ...s, hp };
  return { ...s, hp: Math.max(1, Math.round(s.hpMax * RPG.REBOOT_HP_RATIO)) };
}

/** True quando o dano aplicado causaria o reinicio da maquina. */
export function wouldReboot(s: PlayerState, amount: number): boolean {
  return s.hp - Math.floor(amount) <= 0;
}

/** Cura `pct` (fracao de 0..1) da vida maxima, sem passar do limite. */
export function heal(s: PlayerState, pct: number): PlayerState {
  if (!Number.isFinite(pct) || pct <= 0) return s;
  const hp = Math.min(s.hpMax, s.hp + Math.round(s.hpMax * pct));
  return { ...s, hp };
}

/** Vida cheia (usado no reinicio do portao e em testes). */
export function fullHeal(s: PlayerState): PlayerState {
  return { ...s, hp: s.hpMax };
}

export function missionId(era: EraId, letter: 'A' | 'B'): string {
  return `${era}-${letter}`;
}

export function eraOfMissionId(id: string): EraId | null {
  const era = id.split('-')[0] as EraId | undefined;
  return era && ERAS.includes(era) ? era : null;
}

/** Nivel do poder da era segundo as estrelas das missoes A e B. */
export function powerLevelFor(s: PlayerState, era: EraId): PowerLevel {
  const a = s.missions[missionId(era, 'A')];
  const b = s.missions[missionId(era, 'B')];
  // Nivel 1 ao concluir a missao B da era.
  if (!b || b.stars < 1) return 0;
  const minStars = Math.min(a?.stars ?? 0, b.stars);
  if (minStars >= POWERS.LEVEL_3_MIN_STARS) return 3;
  if (minStars >= POWERS.LEVEL_2_MIN_STARS) return 2;
  return 1;
}

/** XP bruto de uma missao conforme as estrelas obtidas. */
export function missionXp(stars: Stars): number {
  return RPG.MISSION_XP_BASE + RPG.MISSION_XP_PER_STAR * stars;
}

/**
 * XP ja creditado por uma missao. Uma tentativa falhada (0 estrelas) nao credita nada,
 * por isso a primeira conclusao paga o valor inteiro e so as repeticoes pagam a melhoria.
 */
function xpAlreadyEarned(progress: MissionProgress | undefined): number {
  return progress && progress.stars > 0 ? missionXp(progress.stars) : 0;
}

/**
 * Aplica o resultado de uma missao: estrelas, melhor pontuacao, XP (so a melhoria),
 * +25% de vida, nivel do poder da era e avanco do ano do mundo.
 * Missoes nunca tiram vida.
 */
export function applyMissionResult(s: PlayerState, id: string, e: Evaluation): PlayerState {
  const era = eraOfMissionId(id);
  if (!era) return s;

  const previous = s.missions[id] ?? { stars: 0 as Stars, bestScore: 0 };
  const stars = starsFor(e.efficiency, e.ok);
  const score = e.ok ? missionScore(e.efficiency) : 0;

  const bestStars = Math.max(previous.stars, stars) as Stars;
  const bestScore = Math.max(previous.bestScore, score);

  // Primeira conclusao paga integral; repeticoes pagam so a melhoria.
  const xpGain = Math.max(
    0,
    xpAlreadyEarned({ stars: bestStars, bestScore }) - xpAlreadyEarned(previous),
  );

  let next: PlayerState = {
    ...s,
    missions: { ...s.missions, [id]: { stars: bestStars, bestScore } },
  };

  if (e.ok) next = heal(next, RPG.MISSION_HEAL_RATIO);
  if (xpGain > 0) next = gainXp(next, xpGain);

  next = { ...next, powers: recomputePowers(next) };
  next = { ...next, year: Math.max(next.year, worldYear(next)) };
  return next;
}

/** Recalcula o nivel de todos os poderes a partir das estrelas das missoes. */
export function recomputePowers(s: PlayerState): Record<PowerId, PowerLevel> {
  const out = { ...s.powers };
  for (const era of ERAS) {
    out[POWER_OF_ERA[era]] = powerLevelFor(s, era);
  }
  return out;
}

/** Ano do mundo: ano da era mais avancada ja conquistada. */
export function worldYear(s: PlayerState): number {
  let year: number = RPG.START_YEAR;
  for (const era of ERAS) {
    if (s.powers[POWER_OF_ERA[era]] >= 1) year = Math.max(year, ERA_START_YEAR[era]);
  }
  return year;
}

/**
 * Recompensa da prova da era: XP por acerto e, se passou, o item daquela era.
 * A prova nunca tira vida -- errar custa tempo, nao integridade.
 */
export function applyQuizResult(s: PlayerState, era: EraId, result: QuizResult): PlayerState {
  let next = gainXp(s, result.correct * QUIZ.XP_PER_CORRECT);
  if (!result.passed) return next;
  const item = itemOfEra(era);
  if (item) next = { ...next, items: addItem(next.items, item.id) };
  return fullHeal(next);
}

/**
 * Recolhe um fragmento de memoria do mapa: rende XP uma vez so. `collected` e a
 * lista do que ja foi recolhido; fragmento repetido devolve tudo como estava.
 */
export function collectFragment(
  s: PlayerState,
  collected: readonly string[],
  id: string,
): { player: PlayerState; collected: string[]; gained: boolean } {
  if (collected.includes(id)) return { player: s, collected: [...collected], gained: false };
  return { player: gainXp(s, RPG.FRAGMENT_XP), collected: [...collected, id], gained: true };
}

/** Usa um item da mochila. Devolve o estado intacto quando nao ha o item. */
export function consumeItem(s: PlayerState, id: string): { player: PlayerState; used: boolean } {
  const result = spendItem(s.items, id);
  if (!result.used) return { player: s, used: false };
  let next: PlayerState = { ...s, items: result.inventory };
  const def = itemById(id);
  if (def?.kind === 'heal') next = { ...next, hp: Math.min(next.hpMax, next.hp + def.value) };
  return { player: next, used: true };
}
