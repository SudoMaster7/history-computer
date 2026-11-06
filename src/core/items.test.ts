import { describe, expect, it } from 'vitest';
import {
  ITEM_DEFS,
  addItem,
  carriedItems,
  countOf,
  hasItem,
  itemById,
  itemOfEra,
  spendItem,
} from './items';
import { ITEMS } from './constants';
import { ERAS } from './powers';

describe('catalogo de itens', () => {
  it('ha exatamente um item por era', () => {
    expect(ITEM_DEFS).toHaveLength(ERAS.length);
    for (const era of ERAS) expect(itemOfEra(era)).toBeDefined();
  });

  it('nao ha id repetido', () => {
    const ids = ITEM_DEFS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('itemById acha pelo id e devolve undefined no desconhecido', () => {
    expect(itemById('valvula-reserva')?.era).toBe('logica');
    expect(itemById('nao-existe')).toBeUndefined();
  });

  it('todo item tem efeito com valor positivo', () => {
    for (const item of ITEM_DEFS) expect(item.value).toBeGreaterThan(0);
  });
});

describe('mochila', () => {
  it('comeca vazia', () => {
    expect(countOf({}, 'valvula-reserva')).toBe(0);
    expect(hasItem({}, 'valvula-reserva')).toBe(false);
    expect(carriedItems({})).toEqual([]);
  });

  it('acrescenta e acumula', () => {
    let bag = addItem({}, 'valvula-reserva');
    expect(countOf(bag, 'valvula-reserva')).toBe(1);
    bag = addItem(bag, 'valvula-reserva');
    expect(countOf(bag, 'valvula-reserva')).toBe(2);
  });

  it('respeita o limite por item', () => {
    let bag = {};
    for (let i = 0; i < 10; i += 1) bag = addItem(bag, 'valvula-reserva');
    expect(countOf(bag, 'valvula-reserva')).toBe(ITEMS.MAX_PER_ITEM);
  });

  it('ignora item desconhecido e quantidade nao positiva', () => {
    expect(addItem({}, 'nao-existe')).toEqual({});
    expect(addItem({}, 'valvula-reserva', 0)).toEqual({});
    expect(addItem({}, 'valvula-reserva', -3)).toEqual({});
  });

  it('nao altera a mochila original', () => {
    const bag = { 'valvula-reserva': 1 };
    const next = addItem(bag, 'valvula-reserva');
    expect(bag['valvula-reserva']).toBe(1);
    expect(next['valvula-reserva']).toBe(2);
  });

  it('usar gasta um exemplar', () => {
    const bag = { 'valvula-reserva': 2 };
    const result = spendItem(bag, 'valvula-reserva');
    expect(result.used).toBe(true);
    expect(countOf(result.inventory, 'valvula-reserva')).toBe(1);
  });

  it('o ultimo exemplar sai da mochila', () => {
    const result = spendItem({ 'valvula-reserva': 1 }, 'valvula-reserva');
    expect(result.inventory).toEqual({});
    expect(hasItem(result.inventory, 'valvula-reserva')).toBe(false);
  });

  it('usar o que nao se tem devolve a mochila intacta', () => {
    const bag = { 'valvula-reserva': 1 };
    const result = spendItem(bag, 'chave-publica');
    expect(result.used).toBe(false);
    expect(result.inventory).toBe(bag);
  });

  it('carriedItems lista na ordem das eras', () => {
    const bag = { 'modelo-treinado': 1, 'cartao-perfurado': 1, 'valvula-reserva': 1 };
    expect(carriedItems(bag).map((i) => i.era)).toEqual(['mecanica', 'logica', 'ia']);
  });
});
