import { WORLD } from './constants';
import type { EraId } from './types';

/**
 * Mundo visto de cima (top-down), em grade de tiles.
 *
 * Puro e deterministico: sem React, canvas, DOM, relogio nem Math.random.
 * O desenho e a animacao ficam na camada de UI; aqui mora so a regra de
 * "onde da para andar" e "qual o caminho ate la".
 */

/** Tipos de tile. A ordem e o indice no tileset desenhado pela UI. */
export const TILE = {
  GRASS: 0,
  PATH: 1,
  TREE: 2,
  WATER: 3,
  WALL: 4,
  FLOOR: 5,
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

/** Caracteres usados para desenhar o mapa em texto, no JSON. */
const TILE_OF_CHAR: Record<string, TileId> = {
  '.': TILE.GRASS,
  ',': TILE.PATH,
  T: TILE.TREE,
  '~': TILE.WATER,
  '#': TILE.WALL,
  _: TILE.FLOOR,
};

const WALKABLE: ReadonlySet<number> = new Set<number>([TILE.GRASS, TILE.PATH, TILE.FLOOR]);

export interface Cell {
  col: number;
  row: number;
}

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Terminal: ao chegar nele o jogador abre o minijogo da missao. */
export interface Station extends Cell {
  id: string;
  missionId: string;
}

/**
 * Personagem parado no mapa. O `id` e a chave em `src/data/npcs.pt-BR.json`,
 * onde ficam nome, papel historico e as falas. O `core` nao le esse arquivo:
 * so guarda a chave e a posicao.
 */
export interface Npc extends Cell {
  id: string;
}

/**
 * Porta da zona. Nao guarda lista de exigencias: ela abre quando TODOS os
 * terminais da propria zona estao concluidos. Assim nao da para a porta pedir
 * uma missao que nao existe no mapa.
 */
export type Door = Cell;

export interface WorldDef {
  id: string;
  era: EraId;
  cols: number;
  rows: number;
  /** Tiles em ordem de leitura (linha por linha), com `cols * rows` itens. */
  tiles: readonly TileId[];
  spawn: Cell;
  stations: readonly Station[];
  npcs: readonly Npc[];
  door: Door;
}

/** Formato cru, como fica no JSON: o mapa e desenhado com caracteres. */
export interface RawWorld {
  id: string;
  era: EraId;
  /** Uma string por linha do mapa; todas do mesmo tamanho. */
  map: readonly string[];
  spawn: Cell;
  stations: readonly Station[];
  npcs: readonly Npc[];
  door: Door;
}

export function parseWorld(raw: RawWorld): WorldDef {
  const rows = raw.map.length;
  const cols = raw.map[0]?.length ?? 0;
  const tiles: TileId[] = [];
  for (const line of raw.map) {
    for (const char of line) {
      tiles.push(TILE_OF_CHAR[char] ?? TILE.GRASS);
    }
  }
  return {
    id: raw.id,
    era: raw.era,
    cols,
    rows,
    tiles,
    spawn: raw.spawn,
    stations: raw.stations,
    npcs: raw.npcs,
    door: raw.door,
  };
}

export function inBounds(world: WorldDef, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < world.cols && row < world.rows;
}

export function tileAt(world: WorldDef, col: number, row: number): TileId | undefined {
  if (!inBounds(world, col, row)) return undefined;
  return world.tiles[row * world.cols + col];
}

export function isWalkable(world: WorldDef, col: number, row: number): boolean {
  const tile = tileAt(world, col, row);
  return tile !== undefined && WALKABLE.has(tile);
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Converte um ponto em pixels do mapa para a celula correspondente. */
export function cellAtPoint(world: WorldDef, x: number, y: number): Cell | null {
  const col = Math.floor(x / WORLD.TILE);
  const row = Math.floor(y / WORLD.TILE);
  if (!inBounds(world, col, row)) return null;
  return { col, row };
}

/** Ordem fixa de vizinhos: mantem o caminho deterministico entre execucoes. */
const NEIGHBORS: readonly Cell[] = [
  { col: 0, row: 1 },
  { col: 1, row: 0 },
  { col: 0, row: -1 },
  { col: -1, row: 0 },
];

/**
 * Menor caminho em 4 direcoes, por busca em largura. Devolve as celulas a
 * percorrer (sem a de origem, com a de destino) ou `null` se nao houver rota.
 */
export function findPath(world: WorldDef, from: Cell, to: Cell): Cell[] | null {
  if (!isWalkable(world, to.col, to.row)) return null;
  if (!isWalkable(world, from.col, from.row)) return null;
  if (sameCell(from, to)) return [];

  const start = from.row * world.cols + from.col;
  const goal = to.row * world.cols + to.col;
  const cameFrom = new Map<number, number>([[start, -1]]);
  const queue: number[] = [start];

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as number;
    if (current === goal) break;
    const col = current % world.cols;
    const row = Math.floor(current / world.cols);
    for (const step of NEIGHBORS) {
      const nextCol = col + step.col;
      const nextRow = row + step.row;
      if (!isWalkable(world, nextCol, nextRow)) continue;
      const next = nextRow * world.cols + nextCol;
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(goal)) return null;

  const path: Cell[] = [];
  let cursor = goal;
  while (cursor !== start) {
    path.push({ col: cursor % world.cols, row: Math.floor(cursor / world.cols) });
    cursor = cameFrom.get(cursor) as number;
  }
  return path.reverse();
}

/** Direcao para onde o personagem olha ao ir de `from` para `to`. */
export function facingTo(from: Cell, to: Cell): Facing {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (dy !== 0) return dy > 0 ? 'down' : 'up';
  return 'down';
}

/** Celulas vizinhas (e a propria) de onde se pode interagir com um ponto. */
function isAdjacentOrSame(a: Cell, b: Cell): boolean {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  return dx + dy <= 1;
}

export function stationAt(world: WorldDef, cell: Cell): Station | undefined {
  return world.stations.find((s) => isAdjacentOrSame(s, cell));
}

export function npcAt(world: WorldDef, cell: Cell): Npc | undefined {
  return world.npcs.find((n) => isAdjacentOrSame(n, cell));
}

export function atDoor(world: WorldDef, cell: Cell): boolean {
  return isAdjacentOrSame(world.door, cell);
}

export function isDoorOpen(world: WorldDef, stars: Readonly<Record<string, number>>): boolean {
  return world.stations.every((station) => (stars[station.missionId] ?? 0) >= 1);
}

/** Missoes que ainda faltam para a porta abrir. */
export function missionsLeft(world: WorldDef, stars: Readonly<Record<string, number>>): Station[] {
  return world.stations.filter((station) => (stars[station.missionId] ?? 0) < 1);
}

export function spawnCell(world: WorldDef): Cell {
  return world.spawn;
}

/**
 * Problemas que impedem uma zona de entrar no jogo. Mapa com terminal em cima
 * de arvore, porta inalcancavel ou spawn em agua e bug de conteudo, nao de
 * codigo: o teste roda isto nas 6 zonas e exige lista vazia.
 */
export function validateWorld(world: WorldDef): string[] {
  const problems: string[] = [];
  const add = (message: string): void => {
    problems.push(message);
  };

  if (world.cols < 1 || world.rows < 1) add('mapa vazio');
  if (world.tiles.length !== world.cols * world.rows) {
    add(`mapa irregular: ${world.tiles.length} tiles para ${world.cols}x${world.rows}`);
  }
  if (!isWalkable(world, world.spawn.col, world.spawn.row)) add('spawn em tile bloqueado');

  const ids = new Set<string>();
  for (const station of world.stations) {
    if (ids.has(station.id)) add(`terminal repetido: ${station.id}`);
    ids.add(station.id);
    if (!inBounds(world, station.col, station.row)) add(`terminal fora do mapa: ${station.id}`);
  }
  for (const npc of world.npcs) {
    if (ids.has(npc.id)) add(`id repetido: ${npc.id}`);
    ids.add(npc.id);
    if (!inBounds(world, npc.col, npc.row)) add(`personagem fora do mapa: ${npc.id}`);
  }
  if (world.stations.length === 0) add('zona sem terminal: a porta nunca abriria');

  /** Um ponto de interesse e alcancavel se alguma celula vizinha tiver rota. */
  const reachable = (target: Cell, what: string): void => {
    const options = [
      target,
      ...NEIGHBORS.map((n) => ({ col: target.col + n.col, row: target.row + n.row })),
    ];
    const ok = options.some(
      (cell) =>
        isWalkable(world, cell.col, cell.row) && findPath(world, world.spawn, cell) !== null,
    );
    if (!ok) add(`inalcancavel a partir do spawn: ${what}`);
  };

  for (const station of world.stations) reachable(station, station.id);
  for (const npc of world.npcs) reachable(npc, npc.id);
  reachable(world.door, 'porta');

  return problems;
}
