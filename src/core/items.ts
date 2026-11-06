import type { EraId } from './types';
import { ITEMS as BALANCE } from './constants';

/**
 * Itens do jogo. Cada era entrega um item ao fim do quiz, e o item tem efeito
 * concreto: nao e colecionavel decorativo.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export type ItemKind =
  /** Restaura integridade na hora em que e usado. */
  | 'heal'
  /** Revela uma dica dentro do minijogo. */
  | 'hint'
  /** Bloqueia o proximo ataque do chefao. */
  | 'shield'
  /** Aumenta o dano do proximo ataque ao chefao. */
  | 'power';

export interface ItemDef {
  id: string;
  era: EraId;
  kind: ItemKind;
  /** Quanto o efeito vale: vida curada, dano extra em fracao, etc. */
  value: number;
}

/**
 * Um item por era, ligado ao que aquela era inventou. O nome e a descricao
 * ficam em `src/data/ui.pt-BR.json` (secao `items`).
 */
export const ITEM_DEFS: readonly ItemDef[] = [
  { id: 'cartao-perfurado', era: 'mecanica', kind: 'hint', value: 1 },
  { id: 'valvula-reserva', era: 'logica', kind: 'heal', value: BALANCE.HEAL_VALUE },
  { id: 'fita-magnetica', era: 'codigo', kind: 'hint', value: 1 },
  { id: 'pacote-roteado', era: 'redes', kind: 'shield', value: 1 },
  { id: 'chave-publica', era: 'seguranca', kind: 'shield', value: 1 },
  { id: 'modelo-treinado', era: 'ia', kind: 'power', value: BALANCE.POWER_VALUE },
];

export function itemById(id: string): ItemDef | undefined {
  return ITEM_DEFS.find((item) => item.id === id);
}

export function itemOfEra(era: EraId): ItemDef | undefined {
  return ITEM_DEFS.find((item) => item.era === era);
}

/** Quantos exemplares de um item o jogador tem. */
export type Inventory = Readonly<Record<string, number>>;

export function countOf(inventory: Inventory, id: string): number {
  return inventory[id] ?? 0;
}

export function hasItem(inventory: Inventory, id: string): boolean {
  return countOf(inventory, id) > 0;
}

/** Acrescenta itens ao inventario, respeitando o limite por item. */
export function addItem(inventory: Inventory, id: string, amount = 1): Inventory {
  if (!itemById(id) || amount <= 0) return inventory;
  const next = Math.min(BALANCE.MAX_PER_ITEM, countOf(inventory, id) + amount);
  return { ...inventory, [id]: next };
}

/**
 * Gasta um item. Devolve o inventario intacto e `used: false` quando nao ha
 * exemplar, para a UI nao precisar checar antes.
 */
export function spendItem(
  inventory: Inventory,
  id: string,
): { inventory: Inventory; used: boolean } {
  const have = countOf(inventory, id);
  if (have <= 0) return { inventory, used: false };
  const next = { ...inventory };
  if (have === 1) delete next[id];
  else next[id] = have - 1;
  return { inventory: next, used: true };
}

/** Itens que o jogador tem, na ordem das eras. */
export function carriedItems(inventory: Inventory): ItemDef[] {
  return ITEM_DEFS.filter((item) => hasItem(inventory, item.id));
}
