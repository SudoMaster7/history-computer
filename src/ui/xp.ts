import { xpToNextLevel } from '@/core/rpg';
import type { PlayerState } from '@/core/types';

/**
 * Conhecimento acumulado desde o nivel 1. O save guarda so o que falta para o
 * proximo nivel; para dizer "ganhou quanto?" quando o ganho atravessa um nivel
 * e preciso somar os niveis ja fechados. E conta de apresentacao: a regra de
 * XP continua em `core/rpg`.
 */
export function totalXp(player: PlayerState): number {
  let total = player.xp;
  for (let level = 1; level < player.level; level += 1) total += xpToNextLevel(level);
  return total;
}
