import type { EraId } from '@/core/types';
import raw from './fragments.pt-BR.json';

/**
 * Curiosidades dos fragmentos de memoria, por era. O `core` so sabe ONDE o
 * fragmento esta e qual o indice dele; o texto mora aqui, como o das falas.
 */
export const FRAGMENT_FACTS: Readonly<Record<EraId, readonly string[]>> = raw;

/** Curiosidade do fragmento `index` da era. Da a volta se faltar texto. */
export function fragmentFact(era: EraId, index: number): string {
  const facts = FRAGMENT_FACTS[era];
  return facts[index % Math.max(1, facts.length)] ?? '';
}
