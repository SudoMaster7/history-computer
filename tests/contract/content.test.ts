import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ERAS, POWER_OF_ERA } from '@/core/powers';
import { STAGE_ORDER } from '@/core/campaign';
import { validateStage } from '@/core/stage';
import type { GadgetKind } from '@/core/gadgets';
import { RAW_STAGES, STAGES, STAGE_TEXTS, getStage } from '@/data/stages';
import { FRAGMENT_FACTS } from '@/data/fragments';
import missions from '@/data/missions.json';
import { MINIGAME_BRIEFS } from '@/data/minigameBriefs';
import { registerMinigames } from '@/minigames';
import { registeredEras } from '@/core/registry';
import ui from '@/data/ui.pt-BR.json';

/**
 * CONTRATO: o conteudo fecha.
 *
 * A maior parte das quebras neste projeto nao e de codigo, e de dado: uma fase
 * apontando para missao que nao existe, uma placa sem texto, um portao da era
 * errada, um sprite que ninguem gerou. Nada disso aparece no typecheck, e so
 * aparece no jogo quando alguem abre aquela fase.
 *
 * Estes testes olham os arquivos de dados cruzados uns com os outros, e os
 * arquivos de imagem no disco.
 */

const ROOT = process.cwd();
const strings = ui as unknown as Record<string, Record<string, unknown>>;

function spriteExists(file: string): boolean {
  return existsSync(join(ROOT, 'public', 'sprites', file));
}

/** A ideia de cada era vira um tipo de portao (D75). */
const GADGET_OF_ERA: Record<string, GadgetKind> = {
  mecanica: 'pattern',
  logica: 'circuit',
  codigo: 'bits',
  redes: 'route',
  seguranca: 'cipher',
  ia: 'classify',
};

describe('contrato: cada era esta completa', () => {
  registerMinigames();

  it.each(ERAS)('era %s tem minijogo registrado', (era) => {
    // Era sem minijogo: a fase acaba num terminal vazio, e a campanha trava ali.
    expect({ era, registrada: registeredEras().includes(era) }).toEqual({
      era,
      registrada: true,
    });
  });

  it.each(ERAS)('era %s tem duas fases, duas missoes, poder e habilidade', (era) => {
    expect(STAGES.filter((s) => s.era === era).map((s) => s.id)).toEqual([`${era}-A`, `${era}-B`]);
    expect(missions.filter((m) => m.era === era)).toHaveLength(2);
    const power = POWER_OF_ERA[era];
    expect(power, `falta o poder da era ${era}`).toBeDefined();
    const ability = (strings['abilities'] as Record<string, { name?: string; text?: string }>)[
      power
    ];
    expect(ability?.name?.length ?? 0).toBeGreaterThan(0);
    expect(ability?.text?.length ?? 0).toBeGreaterThan(10);
  });

  it.each(ERAS)('era %s tem todos os textos de interface', (era) => {
    for (const secao of ['eras', 'eraSubtitles', 'minigames']) {
      const valor = strings[secao]?.[era];
      expect({ secao, era, texto: typeof valor }).toEqual({ secao, era, texto: 'string' });
      expect(String(valor).length).toBeGreaterThan(0);
    }
  });
});

describe('contrato: fases e dados cruzados', () => {
  it('ha uma fase para cada passo do mapa, na mesma ordem', () => {
    expect(STAGES.map((s) => s.id)).toEqual([...STAGE_ORDER]);
  });

  it.each(STAGE_ORDER)('a fase %s passa na validacao de montagem', (id) => {
    const index = STAGES.findIndex((s) => s.id === id);
    expect({ fase: id, problemas: validateStage(STAGES[index]!, RAW_STAGES[index]) }).toEqual({
      fase: id,
      problemas: [],
    });
  });

  it.each(STAGE_ORDER)('a fase %s termina numa missao que existe', (id) => {
    const def = getStage(id)!;
    const mission = missions.find((m) => m.id === def.missionId);
    expect({ fase: id, missao: def.missionId, era: mission?.era }).toEqual({
      fase: id,
      missao: def.missionId,
      era: def.era,
    });
  });

  it.each(STAGE_ORDER)('a fase %s ensina a ideia da propria era', (id) => {
    const def = getStage(id)!;
    expect(def.gates.length, `fase ${id} sem portao de conceito`).toBeGreaterThan(0);
    for (const gate of def.gates) {
      expect({ fase: id, portao: gate.data.kind }).toEqual({
        fase: id,
        portao: GADGET_OF_ERA[def.era],
      });
    }
  });

  it.each(STAGE_ORDER)('a fase %s tem titulo, abertura, resumo e uma frase por placa', (id) => {
    const def = getStage(id)!;
    const text = STAGE_TEXTS[id];
    expect(text, `fase ${id} sem texto em stages.pt-BR.json`).toBeDefined();
    expect(text!.title.length).toBeGreaterThan(3);
    expect(text!.intro.length).toBeGreaterThan(40);
    expect(text!.summary.length).toBeGreaterThan(40);
    expect({ fase: id, placas: text!.signs.length }).toEqual({
      fase: id,
      placas: def.signs.length,
    });
    for (const sign of text!.signs) expect(sign.length).toBeGreaterThan(20);
  });

  it('nao ha texto de fase orfao, sem fase', () => {
    expect(Object.keys(STAGE_TEXTS).filter((id) => !getStage(id))).toEqual([]);
  });

  it('as plantas das fases sao diferentes umas das outras', () => {
    expect(new Set(STAGES.map((s) => s.tiles.join(''))).size).toBe(STAGES.length);
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
    // A fase desenha o Bit de perfil a partir da linha "direita" deste arquivo.
    expect(spriteExists('bit.png')).toBe(true);
  });

  it('ha sprite do BUG Day 0', () => {
    // A arena do chefao desenha este arquivo; sem ele o combate fica sem imagem.
    expect(spriteExists('bug.png')).toBe(true);
  });
});

describe('contrato: fragmentos de memoria', () => {
  /*
   * Cada fase espalha tres fragmentos, e cada um mostra uma curiosidade da era:
   * a fase A usa as tres primeiras, a B as tres seguintes. Se faltar texto, dois
   * fragmentos repetem a mesma frase -- o jogador acha que o jogo travou num so.
   */
  it.each(ERAS)('a era %s tem uma curiosidade por fragmento', (era) => {
    const facts = FRAGMENT_FACTS[era];
    const needed = STAGES.filter((s) => s.era === era).reduce((n, s) => n + s.fragments.length, 0);
    expect(Array.isArray(facts)).toBe(true);
    expect({ era, textos: facts.length >= needed }).toEqual({ era, textos: true });
    expect(new Set(facts).size).toBe(facts.length);
    for (const fact of facts) {
      // Frase de verdade, que ensine alguma coisa.
      expect(fact.length, `curiosidade curta demais na era ${era}`).toBeGreaterThan(60);
    }
  });
});

describe('contrato: textos em pt-BR', () => {
  it('as secoes de interface que as telas usam continuam existindo', () => {
    for (const secao of [
      'app',
      'menu',
      'map',
      'stage',
      'gate',
      'abilities',
      'powers',
      'eras',
      'eraSubtitles',
      'minigames',
      'mission',
      'settings',
      'boss',
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
    varre('fases', STAGE_TEXTS);
    expect(vazios).toEqual([]);
  });
});

describe('contrato: todo minijogo explica e ajuda', () => {
  /*
   * Um minijogo sem explicacao e sem dica vira quebra-cabeca solto: o jogador
   * fecha a fase sem saber o que aquilo tinha a ver com a historia da
   * computacao, que e o assunto do jogo. E quem trava nao tem para onde ir.
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
