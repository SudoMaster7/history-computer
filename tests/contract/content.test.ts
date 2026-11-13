import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ERAS, POWER_OF_ERA } from '@/core/powers';
import { ITEM_DEFS, itemOfEra } from '@/core/items';
import { buildQuiz } from '@/core/quiz';
import { isWalkable, validateWorld } from '@/core/world';
import { WORLDS, worldOfEra } from '@/data/worlds';
import { NPCS, npcProfile } from '@/data/npcs';
import { QUIZ_BANK } from '@/data/quizzes';
import { FRAGMENT_FACTS } from '@/data/fragments';
import { WORLD } from '@/core/constants';
import missions from '@/data/missions.json';
import { MINIGAME_BRIEFS } from '@/data/minigameBriefs';
import { registerMinigames } from '@/minigames';
import { registeredEras } from '@/core/registry';
import ui from '@/data/ui.pt-BR.json';

/**
 * CONTRATO: o conteudo fecha.
 *
 * A maior parte das quebras neste projeto nao e de codigo, e de dado: um
 * personagem acrescentado no mapa sem ficha, um terminal apontando para missao
 * que nao existe, um sprite que ninguem gerou. Nada disso aparece no
 * typecheck, e so aparece no jogo quando alguem abre aquela tela.
 *
 * Estes testes olham os arquivos de dados cruzados uns com os outros, e os
 * arquivos de imagem no disco.
 */

const ROOT = process.cwd();
const strings = ui as unknown as Record<string, Record<string, unknown>>;

function spriteExists(file: string): boolean {
  return existsSync(join(ROOT, 'public', 'sprites', file));
}

describe('contrato: cada era esta completa', () => {
  registerMinigames();

  it.each(ERAS)('era %s tem minijogo registrado', (era) => {
    // Era sem minijogo cai no aviso de "terminal em construcao": o ciclo da
    // era nao fecha, e a campanha trava ali para quem quer os poderes no nivel 3.
    expect({ era, registrada: registeredEras().includes(era) }).toEqual({
      era,
      registrada: true,
    });
  });

  it.each(ERAS)('era %s tem zona, missoes, poder, item e prova', (era) => {
    const world = worldOfEra(era);
    expect(world, `falta a zona da era ${era}`).toBeDefined();
    expect(POWER_OF_ERA[era], `falta o poder da era ${era}`).toBeDefined();
    expect(itemOfEra(era), `falta o item da era ${era}`).toBeDefined();
    expect(buildQuiz(era, 'contrato', QUIZ_BANK), `falta prova da era ${era}`).not.toBeNull();
    expect(missions.filter((m) => m.era === era)).toHaveLength(2);
  });

  it.each(ERAS)('era %s tem todos os textos de interface', (era) => {
    for (const secao of ['eras', 'eraSubtitles', 'minigames']) {
      const valor = strings[secao]?.[era];
      expect({ secao, era, texto: typeof valor }).toEqual({ secao, era, texto: 'string' });
      expect(String(valor).length).toBeGreaterThan(0);
    }
  });
});

describe('contrato: zonas e dados cruzados', () => {
  it('toda zona passa na validacao de montagem', () => {
    for (const world of WORLDS) {
      expect({ zona: world.id, problemas: validateWorld(world) }).toEqual({
        zona: world.id,
        problemas: [],
      });
    }
  });

  it('todo terminal aponta para uma missao que existe', () => {
    const ids = new Set(missions.map((m) => m.id));
    for (const world of WORLDS) {
      for (const station of world.stations) {
        expect({
          zona: world.id,
          missao: station.missionId,
          existe: ids.has(station.missionId),
        }).toEqual({ zona: world.id, missao: station.missionId, existe: true });
      }
    }
  });

  it('todo personagem no mapa tem ficha com nome, papel e falas', () => {
    for (const world of WORLDS) {
      for (const npc of world.npcs) {
        const perfil = npcProfile(npc.id);
        expect({ zona: world.id, npc: npc.id, temFicha: perfil !== undefined }).toEqual({
          zona: world.id,
          npc: npc.id,
          temFicha: true,
        });
        expect(perfil?.era).toBe(world.era);
        expect(perfil?.name.trim().length).toBeGreaterThan(0);
        expect(perfil?.role.trim().length).toBeGreaterThan(0);
        expect(perfil?.lines.length).toBeGreaterThanOrEqual(3);
        for (const fala of perfil?.lines ?? []) {
          expect({ npc: npc.id, falaCurta: fala.length < 40 }).toEqual({
            npc: npc.id,
            falaCurta: false,
          });
        }
      }
    }
  });

  it('nao ha ficha de personagem orfa, sem lugar em nenhum mapa', () => {
    const colocados = new Set(WORLDS.flatMap((w) => w.npcs.map((n) => n.id)));
    const orfas = Object.keys(NPCS).filter((id) => !colocados.has(id));
    expect(orfas).toEqual([]);
  });

  it('as plantas das zonas sao diferentes umas das outras', () => {
    const plantas = WORLDS.map((w) => w.tiles.join(''));
    expect(new Set(plantas).size).toBe(WORLDS.length);
  });
});

describe('contrato: os botoes de canto nao escondem caminho', () => {
  /*
   * O botao de menu e o distintivo de estado flutuam sobre os cantos de cima
   * do mapa, e um toque ali atinge o botao, nao o mapa. Se um dia uma zona
   * puser chao caminhavel embaixo deles, aquele pedaco do mapa fica
   * inalcancavel por toque -- e o jogo e so por toque.
   */
  const CANTOS = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const;

  it.each(WORLDS.map((w) => w.id))('zona %s tem cantos de cima bloqueados', (id) => {
    const world = WORLDS.find((w) => w.id === id)!;
    for (const [dx, dy] of CANTOS) {
      for (const col of [dx, world.cols - 1 - dx]) {
        expect({ zona: id, col, row: dy, caminhavel: isWalkable(world, col, dy) }).toEqual({
          zona: id,
          col,
          row: dy,
          caminhavel: false,
        });
      }
    }
  });
});

describe('contrato: a arte existe no disco', () => {
  it('ha um tileset para cada era', () => {
    for (const era of ERAS) {
      expect({
        era,
        arquivo: `tiles-${era}.png`,
        existe: spriteExists(`tiles-${era}.png`),
      }).toEqual({ era, arquivo: `tiles-${era}.png`, existe: true });
    }
  });

  it('ha sprite do Bit', () => {
    expect(spriteExists('bit.png')).toBe(true);
  });

  it('ha sprite do BUG Day 0', () => {
    // A arena do chefao desenha este arquivo; sem ele o combate fica sem imagem.
    expect(spriteExists('bug.png')).toBe(true);
  });

  it('ha um sprite para cada personagem colocado no mapa', () => {
    // Esquecer isto e o erro classico: o personagem some do mapa em silencio.
    for (const world of WORLDS) {
      for (const npc of world.npcs) {
        const arquivo = `npc-${npc.id}.png`;
        expect({ npc: npc.id, arquivo, existe: spriteExists(arquivo) }).toEqual({
          npc: npc.id,
          arquivo,
          existe: true,
        });
      }
    }
  });
});

describe('contrato: itens', () => {
  it('todo item tem nome e descricao na interface', () => {
    for (const item of ITEM_DEFS) {
      const texto = strings['items']?.[item.id] as { name?: string; text?: string } | undefined;
      expect({ item: item.id, temTexto: texto !== undefined }).toEqual({
        item: item.id,
        temTexto: true,
      });
      expect(texto?.name?.length ?? 0).toBeGreaterThan(0);
      expect(texto?.text?.length ?? 0).toBeGreaterThan(10);
    }
  });
});

describe('contrato: fragmentos de memoria', () => {
  /*
   * Cada zona espalha FRAGMENTS_PER_ZONE fragmentos, e cada um mostra uma
   * curiosidade da era. Se faltar texto, dois fragmentos da mesma zona repetem
   * a mesma frase -- o jogador acha que o jogo travou num so.
   */
  it.each(ERAS)('a era %s tem uma curiosidade por fragmento', (era) => {
    const facts = FRAGMENT_FACTS[era];
    expect(Array.isArray(facts)).toBe(true);
    expect({ era, textos: facts.length >= WORLD.FRAGMENTS_PER_ZONE }).toEqual({
      era,
      textos: true,
    });
    expect(new Set(facts).size).toBe(facts.length);
    for (const fact of facts) {
      // Frase de verdade, que ensine alguma coisa.
      expect(fact.length, `curiosidade curta demais na era ${era}`).toBeGreaterThan(60);
    }
  });
});

describe('contrato: banco de perguntas', () => {
  it('cada era tem perguntas suficientes para montar a prova', () => {
    for (const era of ERAS) {
      const total = QUIZ_BANK.filter((q) => q.era === era).length;
      expect({ era, perguntas: total, suficiente: total >= 4 }).toEqual({
        era,
        perguntas: total,
        suficiente: true,
      });
    }
  });

  it('toda pergunta tem 4 alternativas distintas e explicacao', () => {
    for (const q of QUIZ_BANK) {
      expect({ id: q.id, alternativas: q.options.length }).toEqual({ id: q.id, alternativas: 4 });
      expect({ id: q.id, repetidas: new Set(q.options).size !== 4 }).toEqual({
        id: q.id,
        repetidas: false,
      });
      expect({ id: q.id, explicacaoCurta: q.explain.length < 30 }).toEqual({
        id: q.id,
        explicacaoCurta: false,
      });
    }
  });

  it('nao ha id de pergunta repetido', () => {
    const ids = QUIZ_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('contrato: textos em pt-BR', () => {
  it('as secoes de interface que as telas usam continuam existindo', () => {
    for (const secao of [
      'app',
      'menu',
      'hud',
      'powers',
      'eras',
      'eraSubtitles',
      'minigames',
      'mission',
      'settings',
      'world',
      'quiz',
      'items',
      'tutorial',
      'loom',
    ]) {
      expect({ secao, existe: strings[secao] !== undefined }).toEqual({ secao, existe: true });
    }
  });

  it('nenhum texto visivel ficou vazio', () => {
    const vazios: string[] = [];
    const varre = (prefixo: string, valor: unknown): void => {
      if (typeof valor === 'string') {
        if (valor.trim().length === 0) vazios.push(prefixo);
        return;
      }
      if (valor && typeof valor === 'object') {
        for (const [chave, dentro] of Object.entries(valor)) varre(`${prefixo}.${chave}`, dentro);
      }
    };
    varre('ui', ui);
    expect(vazios).toEqual([]);
  });
});

describe('contrato: todo minijogo explica e ajuda', () => {
  /*
   * Um minijogo sem explicacao e sem dica vira quebra-cabeca solto: o jogador
   * fecha a missao sem saber o que aquilo tinha a ver com a historia da
   * computacao, que e o assunto do jogo. E quem trava nao tem para onde ir --
   * so sair da missao.
   *
   * Entao: era com minijogo registrado tem de ter o texto. Quem implementar o
   * minijogo da era 3 vai esbarrar aqui ANTES de entregar sem isso.
   */
  registerMinigames();
  const eras = registeredEras();

  it('ha minijogo registrado para checar', () => {
    expect(eras.length).toBeGreaterThan(0);
  });

  it.each(eras)('a era %s explica o que o minijogo representa', (era) => {
    const brief = MINIGAME_BRIEFS[era];
    expect(brief, `falta o texto do minijogo da era ${era} em minigames.pt-BR.json`).toBeDefined();
    for (const campo of ['machine', 'represents', 'power', 'lesson'] as const) {
      const texto = brief?.[campo];
      expect({ era, campo, tipo: typeof texto }).toEqual({ era, campo, tipo: 'string' });
      // Frase de verdade, nao rotulo de uma palavra.
      expect(String(texto).length, `${era}.${campo} curto demais`).toBeGreaterThan(40);
    }
  });

  it.each(eras)('a era %s tem dicas em ordem, da mais geral a mais concreta', (era) => {
    const hints = MINIGAME_BRIEFS[era]?.hints;
    expect(Array.isArray(hints)).toBe(true);
    expect(hints?.length ?? 0, `era ${era} com menos de 2 dicas`).toBeGreaterThanOrEqual(2);
    for (const hint of hints ?? []) {
      expect(typeof hint).toBe('string');
      expect(hint.length, `dica curta demais na era ${era}`).toBeGreaterThan(30);
    }
  });
});
