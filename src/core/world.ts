import { WORLD } from './constants';
import { createRng, shuffle } from './rng';
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

/** Ha um terminal, um personagem ou a porta nesta celula? */
export function isOccupied(world: WorldDef, col: number, row: number): boolean {
  const here = { col, row };
  return (
    sameCell(world.door, here) ||
    world.stations.some((station) => sameCell(station, here)) ||
    world.npcs.some((npc) => sameCell(npc, here))
  );
}

/**
 * Caminho que o Bit de fato anda: como `findPath`, mas sem atravessar terminal,
 * personagem ou porta -- e, quando o destino e um deles, parando na celula
 * livre ao lado (a de caminho mais curto).
 *
 * `findPath` continua respondendo "o chao deixa passar?", que e o que o
 * contrato de progressao confere. Esta aqui responde "por onde o Bit vai?".
 * Devolve `[]` quando o Bit ja esta ao lado do alvo, e `null` sem rota.
 */
export function approachPath(world: WorldDef, from: Cell, to: Cell): Cell[] | null {
  if (!isWalkable(world, from.col, from.row)) return null;
  if (!isWalkable(world, to.col, to.row)) return null;

  const free = (col: number, row: number): boolean =>
    isWalkable(world, col, row) && !isOccupied(world, col, row);

  // Destino ocupado: os alvos passam a ser as celulas livres em volta dele.
  const goals = isOccupied(world, to.col, to.row)
    ? NEIGHBORS.map((n) => ({ col: to.col + n.col, row: to.row + n.row })).filter((cell) =>
        free(cell.col, cell.row),
      )
    : [to];
  if (goals.some((goal) => sameCell(goal, from))) return [];

  const start = from.row * world.cols + from.col;
  const wanted = new Set(goals.map((goal) => goal.row * world.cols + goal.col));
  const cameFrom = new Map<number, number>([[start, -1]]);
  const queue: number[] = [start];
  let reached = -1;

  // Busca em largura: o primeiro alvo encontrado e o de caminho mais curto.
  for (let head = 0; head < queue.length && reached < 0; head += 1) {
    const current = queue[head] as number;
    const col = current % world.cols;
    const row = Math.floor(current / world.cols);
    for (const step of NEIGHBORS) {
      const nextCol = col + step.col;
      const nextRow = row + step.row;
      if (!free(nextCol, nextRow)) continue;
      const next = nextRow * world.cols + nextCol;
      if (cameFrom.has(next)) continue;
      cameFrom.set(next, current);
      if (wanted.has(next)) {
        reached = next;
        break;
      }
      queue.push(next);
    }
  }

  if (reached < 0) return null;

  const path: Cell[] = [];
  let cursor = reached;
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

/** Fragmento de memoria: um colecionavel do mapa, com id estavel para o save. */
export interface Fragment extends Cell {
  /** "<id da zona>:<indice>". O indice tambem escolhe a curiosidade mostrada. */
  id: string;
  index: number;
}

function gap(a: Cell, b: Cell): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/**
 * Onde ficam os fragmentos de memoria de uma zona.
 *
 * Nao estao no JSON do mapa de proposito: saem da propria planta, por sorteio
 * com seed fixa, entao toda zona nova ja nasce com os seus e a mesma zona da
 * sempre os mesmos lugares. So entra celula em que o Bit consegue pisar vindo
 * do ponto de entrada, fora de terminal, personagem, porta e da faixa do topo
 * (onde os botoes de canto cobririam o toque).
 */
export function fragmentsOf(world: WorldDef): Fragment[] {
  const taken: Cell[] = [world.door, ...world.stations, ...world.npcs];
  const candidates: Cell[] = [];
  for (let row = WORLD.FRAGMENT_TOP_MARGIN; row < world.rows; row += 1) {
    for (let col = 0; col < world.cols; col += 1) {
      const cell = { col, row };
      if (!isWalkable(world, col, row)) continue;
      if (taken.some((other) => sameCell(other, cell))) continue;
      if (gap(cell, world.spawn) < WORLD.FRAGMENT_MIN_GAP) continue;
      // A pe de verdade: desviando de terminal, personagem e porta.
      if (approachPath(world, world.spawn, cell) === null) continue;
      candidates.push(cell);
    }
  }

  // Fora do caminho principal sempre que der: fragmento e premio de quem explora.
  const offPath = candidates.filter((cell) => tileAt(world, cell.col, cell.row) !== TILE.PATH);
  const pool = offPath.length >= WORLD.FRAGMENTS_PER_ZONE ? offPath : candidates;

  const order = shuffle(createRng(`fragmentos:${world.id}`), pool);
  const chosen: Cell[] = [];
  // Primeiro tenta espalhar; se a zona for apertada, completa com o que sobrar.
  for (const minGap of [WORLD.FRAGMENT_MIN_GAP, 1]) {
    for (const cell of order) {
      if (chosen.length >= WORLD.FRAGMENTS_PER_ZONE) break;
      if (chosen.some((other) => gap(other, cell) < minGap)) continue;
      chosen.push(cell);
    }
  }

  return chosen.map((cell, index) => ({ ...cell, id: `${world.id}:${index}`, index }));
}

/** O fragmento que esta exatamente nesta celula, se houver. */
export function fragmentAt(world: WorldDef, cell: Cell): Fragment | undefined {
  return fragmentsOf(world).find((fragment) => sameCell(fragment, cell));
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

  // O Bit nao atravessa terminal nem personagem: confere que um nao tampa o outro.
  if (isOccupied(world, world.spawn.col, world.spawn.row)) add('spawn em celula ocupada');
  const approachable = (target: Cell, what: string): void => {
    if (!isWalkable(world, target.col, target.row)) return;
    if (approachPath(world, world.spawn, target) === null) add(`sem acesso a pe: ${what}`);
  };
  for (const station of world.stations) approachable(station, station.id);
  for (const npc of world.npcs) approachable(npc, npc.id);
  approachable(world.door, 'porta');

  return problems;
}
