import { describe, expect, it } from 'vitest';
import {
  TILE,
  atDoor,
  cellAtPoint,
  facingTo,
  findPath,
  inBounds,
  isDoorOpen,
  isWalkable,
  missionsLeft,
  npcAt,
  parseWorld,
  sameCell,
  spawnCell,
  stationAt,
  tileAt,
  validateWorld,
} from './world';
import type { RawWorld } from './world';
import { WORLD } from './constants';
import { ERAS } from './powers';
import { WORLDS, worldOfEra } from '@/data/worlds';
import missions from '@/data/missions.json';
import { npcProfile } from '@/data/npcs';

/** Mapa de teste 5x5: uma parede no meio obriga o caminho a desviar. */
const raw: RawWorld = {
  id: 'test',
  era: 'mecanica',
  map: ['.....', '.TTT.', '.....', '.~~~.', '.....'],
  spawn: { col: 0, row: 0 },
  stations: [{ id: 's1', missionId: 'mecanica-A', col: 4, row: 0 }],
  npcs: [{ id: 'ada', col: 2, row: 2 }],
  door: { col: 2, row: 4 },
};
const world = parseWorld(raw);

describe('parseWorld', () => {
  it('le o mapa em texto para uma grade de tiles', () => {
    expect(world.cols).toBe(5);
    expect(world.rows).toBe(5);
    expect(world.tiles).toHaveLength(25);
    expect(tileAt(world, 0, 0)).toBe(TILE.GRASS);
    expect(tileAt(world, 1, 1)).toBe(TILE.TREE);
    expect(tileAt(world, 1, 3)).toBe(TILE.WATER);
  });

  it('trata caractere desconhecido como chao', () => {
    const odd = parseWorld({ ...raw, map: ['?'] });
    expect(tileAt(odd, 0, 0)).toBe(TILE.GRASS);
  });

  it('le paredes e piso das zonas fechadas', () => {
    const indoor = parseWorld({ ...raw, map: ['#_'] });
    expect(tileAt(indoor, 0, 0)).toBe(TILE.WALL);
    expect(tileAt(indoor, 1, 0)).toBe(TILE.FLOOR);
  });
});

describe('grade', () => {
  it('reconhece o que esta dentro do mapa', () => {
    expect(inBounds(world, 0, 0)).toBe(true);
    expect(inBounds(world, 4, 4)).toBe(true);
    expect(inBounds(world, 5, 0)).toBe(false);
    expect(inBounds(world, -1, 0)).toBe(false);
    expect(tileAt(world, 9, 9)).toBeUndefined();
  });

  it('arvore e agua bloqueiam; grama, caminho e piso nao', () => {
    expect(isWalkable(world, 0, 0)).toBe(true);
    expect(isWalkable(world, 1, 1)).toBe(false);
    expect(isWalkable(world, 2, 3)).toBe(false);
    expect(isWalkable(world, 9, 9)).toBe(false);
  });

  it('converte um ponto em pixels para a celula', () => {
    expect(cellAtPoint(world, 0, 0)).toEqual({ col: 0, row: 0 });
    expect(cellAtPoint(world, WORLD.TILE * 2 + 3, WORLD.TILE + 1)).toEqual({ col: 2, row: 1 });
    expect(cellAtPoint(world, WORLD.TILE * 99, 0)).toBeNull();
  });

  it('sameCell compara coluna e linha', () => {
    expect(sameCell({ col: 1, row: 2 }, { col: 1, row: 2 })).toBe(true);
    expect(sameCell({ col: 1, row: 2 }, { col: 2, row: 1 })).toBe(false);
  });

  it('spawnCell devolve o ponto de entrada', () => {
    expect(spawnCell(world)).toEqual({ col: 0, row: 0 });
  });
});

describe('findPath', () => {
  it('anda em linha reta quando nao ha obstaculo', () => {
    const path = findPath(world, { col: 0, row: 0 }, { col: 4, row: 0 });
    expect(path).not.toBeNull();
    expect(path).toHaveLength(4);
    expect(path?.at(-1)).toEqual({ col: 4, row: 0 });
  });

  it('desvia da parede de arvores', () => {
    const path = findPath(world, { col: 2, row: 0 }, { col: 2, row: 2 });
    expect(path).not.toBeNull();
    // O caminho direto (2 passos) passaria pela arvore em (2,1).
    expect(path?.length).toBeGreaterThan(2);
    for (const step of path ?? []) {
      expect(isWalkable(world, step.col, step.row)).toBe(true);
    }
  });

  it('o caminho nao inclui a origem e termina no destino', () => {
    const from = { col: 0, row: 0 };
    const path = findPath(world, from, { col: 0, row: 2 });
    expect(path?.some((c) => sameCell(c, from))).toBe(false);
    expect(path?.at(-1)).toEqual({ col: 0, row: 2 });
  });

  it('ir para onde ja se esta devolve caminho vazio', () => {
    expect(findPath(world, { col: 0, row: 0 }, { col: 0, row: 0 })).toEqual([]);
  });

  it('nao ha caminho para tile bloqueado nem para fora do mapa', () => {
    expect(findPath(world, { col: 0, row: 0 }, { col: 1, row: 1 })).toBeNull();
    expect(findPath(world, { col: 0, row: 0 }, { col: 9, row: 9 })).toBeNull();
  });

  it('nao ha caminho partindo de tile bloqueado', () => {
    expect(findPath(world, { col: 1, row: 1 }, { col: 0, row: 0 })).toBeNull();
  });

  it('devolve null quando a area esta isolada', () => {
    const closed = parseWorld({
      ...raw,
      map: ['.T.', 'TTT', '.T.'],
      spawn: { col: 0, row: 0 },
    });
    expect(findPath(closed, { col: 0, row: 0 }, { col: 2, row: 2 })).toBeNull();
  });

  it('e deterministico: a mesma consulta devolve o mesmo caminho', () => {
    const a = findPath(world, { col: 0, row: 0 }, { col: 4, row: 4 });
    const b = findPath(world, { col: 0, row: 0 }, { col: 4, row: 4 });
    expect(a).toEqual(b);
  });

  it('acha sempre o caminho mais curto', () => {
    // De (0,0) a (4,0) em linha reta: 4 passos, nem um a mais.
    expect(findPath(world, { col: 0, row: 0 }, { col: 4, row: 0 })).toHaveLength(4);
    // De (0,0) a (0,2) descendo pela coluna livre: 2 passos.
    expect(findPath(world, { col: 0, row: 0 }, { col: 0, row: 2 })).toHaveLength(2);
  });
});

describe('facingTo', () => {
  it('escolhe a direcao pelo maior deslocamento', () => {
    expect(facingTo({ col: 0, row: 0 }, { col: 3, row: 1 })).toBe('right');
    expect(facingTo({ col: 3, row: 0 }, { col: 0, row: 1 })).toBe('left');
    expect(facingTo({ col: 0, row: 0 }, { col: 0, row: 2 })).toBe('down');
    expect(facingTo({ col: 0, row: 2 }, { col: 0, row: 0 })).toBe('up');
  });

  it('sem deslocamento, olha para baixo', () => {
    expect(facingTo({ col: 1, row: 1 }, { col: 1, row: 1 })).toBe('down');
  });
});

describe('pontos de interesse', () => {
  it('o terminal responde na propria celula e nas vizinhas', () => {
    expect(stationAt(world, { col: 4, row: 0 })?.id).toBe('s1');
    expect(stationAt(world, { col: 3, row: 0 })?.id).toBe('s1');
    expect(stationAt(world, { col: 2, row: 0 })).toBeUndefined();
    // Na diagonal nao conta.
    expect(stationAt(world, { col: 3, row: 1 })).toBeUndefined();
  });

  it('o personagem responde por proximidade', () => {
    expect(npcAt(world, { col: 2, row: 2 })?.id).toBe('ada');
    expect(npcAt(world, { col: 0, row: 0 })).toBeUndefined();
  });

  it('a porta responde por proximidade', () => {
    expect(atDoor(world, { col: 2, row: 4 })).toBe(true);
    expect(atDoor(world, { col: 1, row: 4 })).toBe(true);
    expect(atDoor(world, { col: 0, row: 0 })).toBe(false);
  });

  it('a porta so abre com os terminais da propria zona concluidos', () => {
    expect(isDoorOpen(world, {})).toBe(false);
    expect(isDoorOpen(world, { 'mecanica-A': 0 })).toBe(false);
    expect(isDoorOpen(world, { 'mecanica-A': 1 })).toBe(true);
    expect(isDoorOpen(world, { 'mecanica-A': 3 })).toBe(true);
  });

  it('missionsLeft lista o que falta para a porta abrir', () => {
    expect(missionsLeft(world, {}).map((s) => s.missionId)).toEqual(['mecanica-A']);
    expect(missionsLeft(world, { 'mecanica-A': 2 })).toEqual([]);
  });
});

describe('validateWorld', () => {
  it('aprova um mapa bem montado', () => {
    expect(validateWorld(world)).toEqual([]);
  });

  it('recusa spawn em tile bloqueado', () => {
    const bad = parseWorld({ ...raw, spawn: { col: 1, row: 1 } });
    expect(validateWorld(bad).join(' ')).toMatch(/spawn em tile bloqueado/);
  });

  it('recusa mapa irregular e mapa vazio', () => {
    const ragged = parseWorld({ ...raw, map: ['.....', '...'] });
    expect(validateWorld(ragged).join(' ')).toMatch(/mapa irregular/);
    const empty = parseWorld({ ...raw, map: [] });
    expect(validateWorld(empty).join(' ')).toMatch(/mapa vazio/);
  });

  it('recusa ids repetidos', () => {
    const dup = parseWorld({
      ...raw,
      stations: [
        { id: 'x', missionId: 'mecanica-A', col: 4, row: 0 },
        { id: 'x', missionId: 'mecanica-B', col: 0, row: 2 },
      ],
      npcs: [{ id: 'x', col: 2, row: 2 }],
    });
    const problems = validateWorld(dup).join(' ');
    expect(problems).toMatch(/terminal repetido/);
    expect(problems).toMatch(/id repetido/);
  });

  it('recusa ponto fora do mapa', () => {
    const out = parseWorld({
      ...raw,
      stations: [{ id: 's1', missionId: 'mecanica-A', col: 99, row: 0 }],
      npcs: [{ id: 'ada', col: 0, row: 99 }],
    });
    const problems = validateWorld(out).join(' ');
    expect(problems).toMatch(/terminal fora do mapa/);
    expect(problems).toMatch(/personagem fora do mapa/);
  });

  it('recusa zona sem terminal, em que a porta nunca abriria', () => {
    const none = parseWorld({ ...raw, stations: [] });
    expect(validateWorld(none).join(' ')).toMatch(/zona sem terminal/);
  });

  it('recusa terminal cercado, sem rota a partir do spawn', () => {
    const walled = parseWorld({
      ...raw,
      map: ['..TTT', '..T.T', '..TTT', '.....', '.....'],
      stations: [{ id: 's1', missionId: 'mecanica-A', col: 3, row: 1 }],
      npcs: [],
      door: { col: 0, row: 4 },
    });
    expect(validateWorld(walled).join(' ')).toMatch(/inalcancavel a partir do spawn: s1/);
  });
});

describe('as 6 zonas do jogo', () => {
  it('ha exatamente uma zona por era', () => {
    expect(WORLDS).toHaveLength(ERAS.length);
    for (const era of ERAS) expect(worldOfEra(era)).toBeDefined();
  });

  it('nenhuma zona tem problema de montagem', () => {
    for (const w of WORLDS) {
      expect({ id: w.id, problems: validateWorld(w) }).toEqual({ id: w.id, problems: [] });
    }
  });

  it('cada zona tem dois terminais ligados as missoes daquela era', () => {
    const ids = new Set(missions.map((m) => m.id));
    for (const w of WORLDS) {
      expect(w.stations).toHaveLength(2);
      for (const station of w.stations) {
        expect(ids.has(station.missionId)).toBe(true);
        expect(station.missionId.startsWith(w.era)).toBe(true);
      }
    }
  });

  it('a porta de cada zona depende das duas missoes daquela era', () => {
    for (const w of WORLDS) {
      const ids = w.stations.map((s) => s.missionId).sort();
      expect(ids).toEqual([`${w.era}-A`, `${w.era}-B`]);
      expect(isDoorOpen(w, {})).toBe(false);
      expect(isDoorOpen(w, Object.fromEntries(ids.map((id) => [id, 1])))).toBe(true);
    }
  });

  it('ha rota do spawn ate cada terminal, personagem e porta', () => {
    for (const w of WORLDS) {
      const targets = [...w.stations, ...w.npcs, w.door];
      for (const target of targets) {
        const path = findPath(w, w.spawn, { col: target.col, row: target.row });
        expect({ zone: w.id, to: target, reachable: path !== null }).toEqual({
          zone: w.id,
          to: target,
          reachable: true,
        });
      }
    }
  });

  it('cada zona tem tres personagens, todos com ficha e falas', () => {
    for (const w of WORLDS) {
      expect({ zone: w.id, npcs: w.npcs.length }).toEqual({ zone: w.id, npcs: 3 });
      for (const npc of w.npcs) {
        const profile = npcProfile(npc.id);
        expect({ id: npc.id, found: profile !== undefined }).toEqual({ id: npc.id, found: true });
        expect(profile?.era).toBe(w.era);
        expect(profile?.name.length).toBeGreaterThan(0);
        expect(profile?.role.length).toBeGreaterThan(0);
        expect(profile?.lines.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('as zonas sao plantas diferentes umas das outras', () => {
    const shapes = WORLDS.map((w) => w.tiles.join(''));
    expect(new Set(shapes).size).toBe(WORLDS.length);
  });
});
