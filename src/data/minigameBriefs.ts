import type { EraId } from '@/core/types';
import raw from './minigames.pt-BR.json';

/**
 * O que o minijogo da era esta representando, e as dicas de como resolve-lo.
 *
 * Existe porque um minijogo sem isso vira quebra-cabeca solto: o jogador fecha
 * a missao sem saber o que aquilo tinha a ver com a historia da computacao, que
 * e o assunto do jogo.
 */
export interface MinigameBrief {
  /** A maquina real que o minijogo imita, com nome e ano. */
  machine: string;
  /** O que aquela maquina fazia, em linguagem de quem nunca viu. */
  represents: string;
  /** A funcionalidade da era, ligada ao poder que a missao entrega. */
  power: string;
  /** Por que o desafio do minijogo e esse, e nao outro. */
  lesson: string;
  /** Dicas em ordem, da mais geral para a mais concreta. */
  hints: string[];
}

export const MINIGAME_BRIEFS: Readonly<Partial<Record<EraId, MinigameBrief>>> = raw as Partial<
  Record<EraId, MinigameBrief>
>;

export function briefOfEra(era: EraId): MinigameBrief | undefined {
  return MINIGAME_BRIEFS[era];
}
