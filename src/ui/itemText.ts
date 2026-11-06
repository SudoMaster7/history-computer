import ui from '@/data/ui.pt-BR.json';

/** Nome e descricao de um item, pelo id. O JSON e indexado por string. */
const TEXTS = ui.items as unknown as Record<string, { name: string; text: string }>;

export function itemText(id: string): { name: string; text: string } {
  return TEXTS[id] ?? { name: id, text: '' };
}
