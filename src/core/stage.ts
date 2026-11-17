import { ABILITY, DIFFICULTY, STAGE } from './constants';
import type { EraId, GameDifficulty, PowerId } from './types';
import type { GadgetData, GadgetState } from './gadgets';
import { initialGadget, isVirus, pressTarget, referencePresses, validateGadget } from './gadgets';

/**
 * Fase de plataforma vista de lado (D73-D76, D81).
 *
 * Controle de Mega Man e Mario: o Bit anda enquanto o jogador SEGURA uma
 * direcao, pula (mais alto quanto mais tempo segura Pular) e atira. Encostado
 * num portao fechado, o painel do portao aparece. Tudo
 * aqui e regra pura, em passo fixo: a mesma fase com a mesma sequencia de
 * toques da sempre o mesmo resultado. A tela so desenha o `RunState` e toca o
 * som dos `events`.
 */

/** Tiles da fase. A ordem e o indice no tileset lateral desenhado pela UI. */
export const STAGE_TILE = {
  AIR: 0,
  GROUND: 1,
  BLOCK: 2,
  SPIKE: 3,
  /** Chao que cai: some um tempo depois de pisado, e volta. */
  CRUMBLE: 4,
  /** Mola: quem cai em cima e lancado para o alto. */
  SPRING: 5,
} as const;

export type StageTileId = (typeof STAGE_TILE)[keyof typeof STAGE_TILE];

const TILE_OF_CHAR: Record<string, StageTileId> = {
  '.': STAGE_TILE.AIR,
  '#': STAGE_TILE.GROUND,
  '=': STAGE_TILE.BLOCK,
  '^': STAGE_TILE.SPIKE,
  x: STAGE_TILE.CRUMBLE,
  j: STAGE_TILE.SPRING,
};

/** Caracteres de entidade: no mapa, a celula deles e ar. */
const ENEMY_OF_CHAR: Record<string, EnemyKind> = {
  w: 'walker',
  f: 'flyer',
  t: 'turret',
  p: 'program',
  h: 'hopper',
  a: 'armored',
  v: 'dropper',
};

export interface StageCell {
  col: number;
  row: number;
}

/**
 * Inimigos: engrenagem que anda (walker), faisca que voa (flyer), torre que
 * dispara (turret), saltador que anda aos pulinhos (hopper), blindado que
 * aguenta dois tiros (armored), pingo que cai do alto quando o Bit chega
 * (dropper), e o programa da Era 6 (program), que pode ser virus ou seguro.
 */
export type EnemyKind =
  | 'walker'
  | 'flyer'
  | 'turret'
  | 'hopper'
  | 'armored'
  | 'dropper'
  | 'program';

export interface EnemyDef extends StageCell {
  kind: EnemyKind;
  /** Programa (Era 6): caracteristicas (cor, forma, antena). */
  attrs: number[];
  /** Programa: indice do portao-detector a que ele pertence. */
  gate: number;
}

/** Portao: coluna inteira bloqueada ate o dispositivo dele ser resolvido. */
export interface GateDef {
  col: number;
  /** Linha marcada no mapa (onde o painel e desenhado). */
  row: number;
  data: GadgetData;
}

/** Formato cru, como fica no JSON gerado por `tools/make-stages.py`. */
export interface RawStage {
  id: string;
  era: EraId;
  missionId: string;
  map: string[];
  /** Um por coluna com `D`, da esquerda para a direita. */
  gadgets: GadgetData[];
  /** Caracteristicas de cada `p`, da esquerda para a direita. */
  programs?: number[][];
  /** Estilo do terreno: o indice do tile de superficie no tileset da era. */
  style?: number;
}

export interface StageDef {
  id: string;
  era: EraId;
  missionId: string;
  cols: number;
  rows: number;
  tiles: readonly StageTileId[];
  spawn: StageCell;
  goal: StageCell;
  checkpoints: readonly StageCell[];
  fragments: readonly StageCell[];
  /** Recargas de municao (`m` na planta). */
  ammo: readonly StageCell[];
  signs: readonly StageCell[];
  enemies: readonly EnemyDef[];
  gates: readonly GateDef[];
  /** Estilo do terreno (tile de superficie no tileset da era). */
  style: number;
}

export function parseStage(raw: RawStage): StageDef {
  const rows = raw.map.length;
  const cols = Math.max(0, ...raw.map.map((line) => line.length));
  const tiles: StageTileId[] = [];
  let spawn: StageCell = { col: 0, row: 0 };
  let goal: StageCell = { col: cols - 1, row: 0 };
  const checkpoints: StageCell[] = [];
  const fragments: StageCell[] = [];
  const ammo: StageCell[] = [];
  const signs: StageCell[] = [];
  const enemies: EnemyDef[] = [];
  const gateCols = new Map<number, number>();

  raw.map.forEach((line, row) => {
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col] ?? '.';
      tiles.push(TILE_OF_CHAR[ch] ?? STAGE_TILE.AIR);
      if (ch === 'S') spawn = { col, row };
      else if (ch === 'G') goal = { col, row };
      else if (ch === 'C') checkpoints.push({ col, row });
      else if (ch === 'F') fragments.push({ col, row });
      else if (ch === 'm') ammo.push({ col, row });
      else if (ch === 'i') signs.push({ col, row });
      else if (ch === 'D' && !gateCols.has(col)) gateCols.set(col, row);
      else if (ENEMY_OF_CHAR[ch]) {
        enemies.push({ col, row, kind: ENEMY_OF_CHAR[ch]!, attrs: [], gate: -1 });
      }
    }
  });

  const byCol = <T extends StageCell>(list: T[]): T[] =>
    list.sort((a, b) => a.col - b.col || a.row - b.row);

  const gates: GateDef[] = [...gateCols.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([col, row], i) => ({
      col,
      row,
      data: raw.gadgets[i] ?? { kind: 'classify', attr: 0, value: -1 },
    }));

  // Programas: caracteristicas na ordem do mapa, e o portao-detector logo a frente.
  let program = 0;
  for (const enemy of byCol(enemies)) {
    if (enemy.kind !== 'program') continue;
    enemy.attrs = raw.programs?.[program] ?? [];
    enemy.gate = gates.findIndex((g) => g.col > enemy.col);
    program += 1;
  }

  return {
    id: raw.id,
    era: raw.era,
    missionId: raw.missionId,
    cols,
    rows,
    tiles,
    spawn,
    goal,
    checkpoints: byCol(checkpoints),
    fragments: byCol(fragments),
    ammo: byCol(ammo),
    signs: byCol(signs),
    enemies: byCol(enemies),
    gates,
    style: raw.style ?? 1,
  };
}

export function stageTileAt(def: StageDef, col: number, row: number): StageTileId {
  if (col < 0 || col >= def.cols || row < 0 || row >= def.rows) return STAGE_TILE.AIR;
  return def.tiles[row * def.cols + col] ?? STAGE_TILE.AIR;
}

function isSolidTile(tile: StageTileId): boolean {
  return (
    tile === STAGE_TILE.GROUND ||
    tile === STAGE_TILE.BLOCK ||
    tile === STAGE_TILE.SPRING ||
    tile === STAGE_TILE.CRUMBLE
  );
}

/** Fragmento recolhido nesta fase: id salvo no progresso. */
export function stageFragmentId(def: StageDef, index: number): string {
  return `${def.id}:${index}`;
}

// --- estado da corrida -------------------------------------------------------

export interface EnemyState {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  hp: number;
  /** Relogio proprio (vaivem do voador, pulo do saltador, disparo da torre). */
  t: number;
  /** Pingo: velocidade de queda (0 = ainda pendurado; -1 = ja no chao). */
  vy: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  /** Tiro do Bit ou de uma torre. */
  enemy: boolean;
}

export interface RunState {
  tick: number;
  /** Canto superior esquerdo do corpo do Bit, em px da fase. */
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  coyote: number;
  airJumps: number;
  /** Para onde o Bit andou neste passo: 1 frente, -1 tras, 0 parado (D81). */
  dir: -1 | 0 | 1;
  /** Para onde o Bit olha (e atira): o ultimo lado em que andou. */
  facing: -1 | 1;
  hearts: number;
  /** Coracoes do comeco da fase, pela dificuldade. */
  heartsMax: number;
  /** Municao: cada toque em Atirar gasta uma (D82). */
  ammo: number;
  /** Recargas de municao ja pegas. */
  ammoTaken: boolean[];
  /**
   * Chao que cai, por indice do tile: positivo = passos ate cair (rachando);
   * negativo = passos ate voltar (caido). Sem chave = inteiro.
   */
  crumble: Record<number, number>;
  difficulty: GameDifficulty;
  invuln: number;
  /** Escudo (Proteger) pronto para o proximo golpe. */
  shield: boolean;
  /** Ultimo checkpoint alcancado (-1 = ponto de partida). */
  checkpoint: number;
  cooldown: number;
  enemies: EnemyState[];
  shots: Shot[];
  gates: GadgetState[];
  collected: boolean[];
  /** Quantas placas ja foram lidas. */
  signsRead: number;
  /** Portao fechado em que o Bit esta encostado, ou null. */
  atGate: number | null;
  done: boolean;
  /** Vezes que os coracoes acabaram e a fase recomecou. */
  restarts: number;
  /** Coracoes perdidos ao todo. */
  hits: number;
  abilities: readonly PowerId[];
}

/**
 * O que esta apertado neste passo. `left`, `right` e `jumpHeld` valem enquanto o
 * botao esta segurado; `jump` e `shoot` sao o toque (so no passo em que apertou).
 */
export interface RunInput {
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  /** Pular continua segurado: sem isso a subida e cortada (pulo baixo). */
  jumpHeld?: boolean;
  shoot?: boolean;
  /** Peca do painel do portao em que o Bit esta encostado. */
  target?: number;
}

export type RunEvent =
  | { type: 'jump' }
  | { type: 'shoot' }
  | { type: 'land' }
  | { type: 'hit' }
  | { type: 'shield' }
  | { type: 'fall' }
  | { type: 'restart' }
  | { type: 'kill'; enemy: number }
  | { type: 'wrongTarget'; enemy: number }
  | { type: 'fragment'; index: number }
  | { type: 'checkpoint'; index: number }
  | { type: 'sign'; index: number }
  | { type: 'gate'; gate: number }
  | { type: 'press'; gate: number; mistake: boolean }
  | { type: 'gateOpen'; gate: number; perfect: boolean }
  | { type: 'ammo'; index: number }
  | { type: 'empty' }
  | { type: 'spring' }
  | { type: 'crumble' }
  | { type: 'stomp'; enemy: number }
  | { type: 'goal' };

const T = STAGE.TILE;

/** Velocidade de quem anda (para a esquerda, na direcao do Bit). */
const SPEED_OF: Partial<Record<EnemyKind, number>> = {
  walker: STAGE.WALKER_SPEED,
  hopper: STAGE.HOPPER_SPEED,
  armored: STAGE.ARMOR_SPEED,
  program: STAGE.PROGRAM_SPEED,
};

/** Quem anda pelo chao e da meia-volta na beirada e na parede. */
const PATROLS: ReadonlySet<EnemyKind> = new Set<EnemyKind>(['walker', 'hopper', 'armored']);

function enemyStart(e: EnemyDef): EnemyState {
  return {
    alive: true,
    x: e.col * T + (T - STAGE.ENEMY_SIZE) / 2,
    y: e.row * T + (T - STAGE.ENEMY_SIZE),
    vx: -(SPEED_OF[e.kind] ?? 0),
    hp: e.kind === 'turret' ? STAGE.TURRET_HP : e.kind === 'armored' ? STAGE.ARMOR_HP : 1,
    t: 0,
    vy: 0,
  };
}

/** Posicao do Bit de pe numa celula. */
function standAt(cell: StageCell): { x: number; y: number } {
  return { x: cell.col * T + (T - STAGE.BODY_W) / 2, y: (cell.row + 1) * T - STAGE.BODY_H };
}

export function initialRun(
  def: StageDef,
  abilities: readonly PowerId[] = [],
  difficulty: GameDifficulty = 'normal',
): RunState {
  const at = standAt(def.spawn);
  const level = DIFFICULTY[difficulty];
  return {
    tick: 0,
    x: at.x,
    y: at.y,
    vy: 0,
    grounded: false,
    coyote: 0,
    airJumps: 0,
    dir: 0,
    facing: 1,
    hearts: level.HEARTS,
    heartsMax: level.HEARTS,
    ammo: level.AMMO,
    ammoTaken: def.ammo.map(() => false),
    crumble: {},
    difficulty,
    invuln: 0,
    shield: abilities.includes('proteger'),
    checkpoint: -1,
    cooldown: 0,
    enemies: def.enemies.map(enemyStart),
    shots: [],
    gates: def.gates.map((g) => initialGadget(g.data)),
    collected: def.fragments.map(() => false),
    signsRead: 0,
    atGate: null,
    done: false,
    restarts: 0,
    hits: 0,
    abilities: [...abilities],
  };
}

function cloneRun(s: RunState): RunState {
  return {
    ...s,
    enemies: s.enemies.map((e) => ({ ...e })),
    shots: s.shots.map((shot) => ({ ...shot })),
    gates: s.gates.map((g) => ({
      ...g,
      toggles: [...g.toggles],
      path: [...g.path],
      lastTest: g.lastTest ? [...g.lastTest] : null,
    })),
    collected: [...s.collected],
    ammoTaken: [...s.ammoTaken],
    crumble: { ...s.crumble },
  };
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Celula bloqueada: chao, bloco ou coluna de portao ainda fechado. */
export function isBlocked(def: StageDef, s: RunState, col: number, row: number): boolean {
  if (col < 0) return true;
  if (row < 0) return false;
  const tile = stageTileAt(def, col, row);
  if (tile === STAGE_TILE.CRUMBLE) {
    if ((s.crumble[row * def.cols + col] ?? 0) >= 0) return true;
  } else if (isSolidTile(tile)) {
    return true;
  }
  return def.gates.some((g, i) => g.col === col && !s.gates[i]?.solved);
}

function boxBlocked(
  def: StageDef,
  s: RunState,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const c0 = Math.floor(x / T);
  const c1 = Math.floor((x + w - 0.001) / T);
  const r0 = Math.floor(y / T);
  const r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) if (isBlocked(def, s, c, r)) return true;
  }
  return false;
}

/**
 * O corpo encosta em algum espinho? O espinho ocupa so a metade de baixo do
 * tile -- e o que o desenho mostra, e quem pula na hora certa passa por cima.
 */
function touchesSpike(def: StageDef, x: number, y: number, w: number, h: number): boolean {
  const c0 = Math.floor(x / T);
  const c1 = Math.floor((x + w - 0.001) / T);
  const r0 = Math.floor(y / T);
  const r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (stageTileAt(def, c, r) !== STAGE_TILE.SPIKE) continue;
      if (overlaps(x, y, w, h, c * T, r * T + T / 2, T, T / 2)) return true;
    }
  }
  return false;
}

/** Onde o inimigo `i` esta agora (o voador e o saltador oscilam em volta da posicao). */
export function enemyPosition(def: StageDef, s: RunState, i: number): { x: number; y: number } {
  const e = s.enemies[i]!;
  const kind = def.enemies[i]?.kind;
  if (kind === 'flyer') {
    const phase = (2 * Math.PI * e.t) / STAGE.FLYER_PERIOD;
    return { x: e.x, y: e.y + Math.sin(phase) * STAGE.FLYER_AMP };
  }
  if (kind === 'hopper') {
    const phase = (Math.PI * e.t) / STAGE.HOPPER_PERIOD;
    return { x: e.x, y: e.y - Math.abs(Math.sin(phase)) * STAGE.HOPPER_HEIGHT };
  }
  return { x: e.x, y: e.y };
}

const enemyBox = enemyPosition;

/** Programa seguro: nao machuca, e atirar nele e o erro. */
function isSafeProgram(def: StageDef, i: number): boolean {
  const e = def.enemies[i];
  if (!e || e.kind !== 'program') return false;
  const gate = def.gates[e.gate]?.data;
  return !(gate && gate.kind === 'classify' && isVirus(gate, e.attrs));
}

/** Quem pode ser derrotado com um pisao (blindado e torre machucam quem pisa). */
const STOMPABLE: ReadonlySet<EnemyKind> = new Set<EnemyKind>([
  'walker',
  'flyer',
  'hopper',
  'dropper',
  'program',
]);

/** Folga, em px, para o pisao contar mesmo pegando o inimigo de leve. */
const STOMP_MARGIN = 4;

/** Indices dos tiles logo abaixo dos pes do Bit. */
function underFeet(def: StageDef, s: RunState): number[] {
  const row = Math.floor((s.y + STAGE.BODY_H + 1) / T);
  const c0 = Math.floor((s.x + 1) / T);
  const c1 = Math.floor((s.x + STAGE.BODY_W - 1) / T);
  const out: number[] = [];
  for (let c = c0; c <= c1; c += 1) {
    if (c >= 0 && c < def.cols && row >= 0 && row < def.rows) out.push(row * def.cols + c);
  }
  return out;
}

/** Volta ao ultimo checkpoint; os programas de detectores abertos voltam ao inicio. */
function respawn(def: StageDef, s: RunState): void {
  const cell = s.checkpoint >= 0 ? def.checkpoints[s.checkpoint]! : def.spawn;
  const at = standAt(cell);
  s.x = at.x;
  s.y = at.y;
  s.vy = 0;
  s.grounded = false;
  s.atGate = null;
  s.invuln = STAGE.INVULN_STEPS;
  s.shots = [];
  s.shield = s.abilities.includes('proteger');
  s.dir = 0;
  s.facing = 1;
  // Nunca volta sem tiro nenhum: um detector da Era 6 so abre derrubando virus.
  s.ammo = Math.max(s.ammo, STAGE.AMMO_RESPAWN_MIN);
  s.crumble = {};
  def.enemies.forEach((e, i) => {
    if (e.kind === 'program' && !s.gates[e.gate]?.solved) s.enemies[i] = enemyStart(e);
  });
}

/**
 * Tira um coracao. `fatal` (buraco, espinho, virus que escapou) ignora a
 * invulnerabilidade e devolve o Bit ao checkpoint. Sem coracao, a fase
 * recomeca do zero -- sem "game over" e sem perder nada salvo.
 */
function hurt(def: StageDef, s: RunState, events: RunEvent[], fatal: boolean): RunState {
  if (!fatal && s.invuln > 0) return s;
  if (!fatal && s.shield) {
    s.shield = false;
    s.invuln = STAGE.INVULN_STEPS;
    events.push({ type: 'shield' });
    return s;
  }
  s.hearts -= 1;
  s.hits += 1;
  events.push({ type: fatal ? 'fall' : 'hit' });
  if (s.hearts <= 0) {
    const fresh = initialRun(def, s.abilities, s.difficulty);
    events.push({ type: 'restart' });
    return { ...fresh, restarts: s.restarts + 1, hits: s.hits };
  }
  if (fatal) respawn(def, s);
  else s.invuln = STAGE.INVULN_STEPS;
  return s;
}

/** Avanca a corrida um passo. Puro: devolve um estado novo. */
export function stepRun(
  def: StageDef,
  prev: RunState,
  input: RunInput = {},
): { state: RunState; events: RunEvent[] } {
  if (prev.done) return { state: prev, events: [] };
  let s = cloneRun(prev);
  const events: RunEvent[] = [];
  const has = (p: PowerId): boolean => s.abilities.includes(p);
  /** A fase recomecou neste passo (acabaram os coracoes): o resto do passo nao vale. */
  const restarted = (): boolean => s.restarts !== prev.restarts;
  s.tick += 1;
  if (s.invuln > 0) s.invuln -= 1;
  if (s.cooldown > 0) s.cooldown -= 1;

  // 0. Chao que cai: o que racha cai, o que caiu volta (se o Bit nao estiver ali).
  for (const key of Object.keys(s.crumble)) {
    const idx = Number(key);
    const v = s.crumble[idx]!;
    if (v > 1) s.crumble[idx] = v - 1;
    else if (v === 1) s.crumble[idx] = -STAGE.CRUMBLE_FALLEN_STEPS;
    else if (v < -1) s.crumble[idx] = v + 1;
    else {
      const col = idx % def.cols;
      const row = Math.floor(idx / def.cols);
      const inside = overlaps(s.x, s.y, STAGE.BODY_W, STAGE.BODY_H, col * T, row * T, T, T);
      if (!inside) delete s.crumble[idx];
    }
  }

  // 1. Painel do portao.
  if (s.atGate !== null && input.target !== undefined) {
    const gate = def.gates[s.atGate];
    const state = s.gates[s.atGate];
    if (gate && state) {
      const result = pressTarget(gate.data, state, input.target);
      if (result.state !== state) {
        s.gates[s.atGate] = result.state;
        events.push({ type: 'press', gate: s.atGate, mistake: result.mistake });
        if (result.opened) {
          events.push({ type: 'gateOpen', gate: s.atGate, perfect: result.state.perfect });
          s.atGate = null;
        }
      }
    }
  }

  // 1b. Direcao: anda enquanto o botao esta segurado; os dois juntos se anulam.
  s.dir = input.right && !input.left ? 1 : input.left && !input.right ? -1 : 0;
  if (s.dir !== 0) s.facing = s.dir;

  // 2. Pulo (e pulo duplo com Decidir).
  if (input.jump) {
    if (s.grounded || s.coyote > 0) {
      s.vy = -STAGE.JUMP_SPEED;
      s.grounded = false;
      s.coyote = 0;
      events.push({ type: 'jump' });
    } else if (s.airJumps > 0) {
      s.airJumps -= 1;
      s.vy = -STAGE.JUMP_SPEED;
      events.push({ type: 'jump' });
    }
  } else if (!input.jumpHeld && s.vy < -STAGE.JUMP_CUT_SPEED) {
    // Soltou Pular ainda subindo: pulo baixo.
    s.vy = -STAGE.JUMP_CUT_SPEED;
  }

  // 3. Tiro (rajada com Repetir). Cada toque gasta uma municao (D82).
  if (input.shoot && s.cooldown <= 0 && s.ammo <= 0) {
    s.cooldown = STAGE.SHOT_COOLDOWN;
    events.push({ type: 'empty' });
  } else if (input.shoot && s.cooldown <= 0) {
    s.ammo -= 1;
    const count = has('repetir') ? ABILITY.BURST : 1;
    for (let i = 0; i < count; i += 1) {
      s.shots.push({
        x:
          s.facing === 1
            ? s.x + STAGE.BODY_W - i * ABILITY.BURST_GAP_PX
            : s.x - 4 + i * ABILITY.BURST_GAP_PX,
        y: s.y + STAGE.BODY_H / 2 - 2,
        vx: STAGE.SHOT_SPEED * s.facing,
        vy: 0,
        travelled: -i * ABILITY.BURST_GAP_PX,
        enemy: false,
      });
    }
    s.cooldown = STAGE.SHOT_COOLDOWN;
    events.push({ type: 'shoot' });
  }

  // 4. Corrida na direcao escolhida, com colisao.
  const speed =
    STAGE.RUN_SPEED * s.dir * (!s.grounded && has('conectar') ? ABILITY.LONG_JUMP_FACTOR : 1);
  if (speed !== 0 && !boxBlocked(def, s, s.x + speed, s.y, STAGE.BODY_W, STAGE.BODY_H)) {
    s.x += speed;
  } else if (speed !== 0) {
    // Encosta na parede, sem atravessar.
    let step = speed;
    while (
      Math.abs(step) > 0.05 &&
      boxBlocked(def, s, s.x + step, s.y, STAGE.BODY_W, STAGE.BODY_H)
    ) {
      step /= 2;
    }
    if (Math.abs(step) > 0.05) s.x += step;
  }

  // 5. Gravidade.
  const wasGrounded = s.grounded;
  s.vy = Math.min(s.vy + STAGE.GRAVITY, STAGE.MAX_FALL);
  const ny = s.y + s.vy;
  if (!boxBlocked(def, s, s.x, ny, STAGE.BODY_W, STAGE.BODY_H)) {
    s.y = ny;
    s.grounded = false;
  } else if (s.vy > 0) {
    // Pousa no topo do tile.
    s.y = Math.floor((ny + STAGE.BODY_H) / T) * T - STAGE.BODY_H;
    s.vy = 0;
    s.grounded = true;
    // Caiu numa mola: lancado para o alto.
    if (underFeet(def, s).some((idx) => def.tiles[idx] === STAGE_TILE.SPRING)) {
      s.vy = -STAGE.SPRING_SPEED;
      s.grounded = false;
      events.push({ type: 'spring' });
    }
  } else {
    // Bateu a cabeca.
    s.y = Math.floor(s.y / T) * T;
    s.vy = 0;
  }
  if (s.grounded) {
    // Pisou em chao que cai: comeca a rachar.
    for (const idx of underFeet(def, s)) {
      if (def.tiles[idx] === STAGE_TILE.CRUMBLE && s.crumble[idx] === undefined) {
        const steps = STAGE.CRUMBLE_STEPS * DIFFICULTY[s.difficulty].CRUMBLE_FACTOR;
        s.crumble[idx] = Math.max(2, Math.round(steps));
        events.push({ type: 'crumble' });
      }
    }
    s.coyote = STAGE.COYOTE_STEPS;
    s.airJumps = has('decidir') ? 1 : 0;
    if (!wasGrounded && s.tick > 1) events.push({ type: 'land' });
  } else if (s.coyote > 0) {
    s.coyote -= 1;
  }

  // 6. Encostou num portao fechado?
  const front = s.x + STAGE.BODY_W;
  const at = def.gates.findIndex(
    (g, i) =>
      !s.gates[i]?.solved && g.col * T - front <= STAGE.GATE_REACH_PX && g.col * T - front >= -1,
  );
  const atGate = at >= 0 ? at : null;
  if (atGate !== null && atGate !== s.atGate) events.push({ type: 'gate', gate: atGate });
  s.atGate = atGate;

  // 7. Inimigos (so os que estao perto se mexem).
  const size = STAGE.ENEMY_SIZE;
  def.enemies.forEach((d, i) => {
    const e = s.enemies[i]!;
    if (restarted() || !e.alive || Math.abs(e.x - s.x) > STAGE.ACTIVE_PX) return;
    e.t += 1;
    // Virus nunca "escapa" (D87): se o Bit passar dele, ele da meia-volta e vem
    // atras. O programa seguro so segue o caminho dele.
    if (d.kind === 'program' && !isSafeProgram(def, i)) {
      const toward = s.x + STAGE.BODY_W / 2 < e.x + size / 2 ? -1 : 1;
      e.vx = toward * STAGE.PROGRAM_SPEED;
    }
    if (PATROLS.has(d.kind) || d.kind === 'program') {
      const nx = e.x + e.vx;
      const ahead = e.vx < 0 ? nx : nx + size;
      const col = Math.floor(ahead / T);
      const feet = Math.floor((e.y + size + 1) / T);
      const body = Math.floor((e.y + size - 1) / T);
      const wall = isBlocked(def, s, col, body);
      const floor = isBlocked(def, s, col, feet);
      if (d.kind !== 'program' && (wall || !floor)) e.vx = -e.vx;
      else if (!wall && floor) e.x = nx;
    }
    if (d.kind === 'dropper') {
      // Pendurado ate o Bit chegar perto; ai cai, e no chao vira obstaculo.
      if (e.vy === 0 && e.x - (s.x + STAGE.BODY_W) < STAGE.DROP_TRIGGER_PX) e.vy = STAGE.GRAVITY;
      if (e.vy > 0) {
        e.vy = Math.min(e.vy + STAGE.GRAVITY, STAGE.MAX_FALL);
        const ny = e.y + e.vy;
        const landed = isBlocked(
          def,
          s,
          Math.floor((e.x + size / 2) / T),
          Math.floor((ny + size) / T),
        );
        if (landed) {
          e.y = Math.floor((ny + size) / T) * T - size;
          e.vy = -1;
        } else {
          e.y = ny;
        }
      }
    }
    if (d.kind === 'turret' && e.t % STAGE.TURRET_PERIOD === 0 && e.x > s.x) {
      s.shots.push({
        x: e.x - 4,
        y: e.y + size / 2 - 2,
        vx: -STAGE.TURRET_SHOT_SPEED,
        vy: 0,
        travelled: 0,
        enemy: true,
      });
    }
  });

  if (restarted()) return { state: s, events };

  // 8. Tiros.
  const kept: Shot[] = [];
  for (const shot of s.shots) {
    if (restarted()) return { state: s, events };
    if (!shot.enemy && has('aprender')) {
      // Mira: corrige a altura na direcao do inimigo vivo mais perto a frente.
      let best: { dx: number; y: number } | null = null;
      def.enemies.forEach((d, i) => {
        const e = s.enemies[i]!;
        if (!e.alive || isSafeProgram(def, i) || d.kind === 'program') return;
        const dx = e.x - shot.x;
        if (dx > 0 && dx < STAGE.SHOT_RANGE && (!best || dx < best.dx)) {
          best = { dx, y: enemyBox(def, s, i).y + size / 2 };
        }
      });
      const target = best as { dx: number; y: number } | null;
      if (target)
        shot.y +=
          Math.sign(target.y - shot.y) * Math.min(ABILITY.HOMING_PX, Math.abs(target.y - shot.y));
    }
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.travelled += Math.abs(shot.vx);
    if (shot.travelled > STAGE.SHOT_RANGE) continue;
    if (shot.travelled >= 0 && boxBlocked(def, s, shot.x, shot.y, 4, 4)) continue;

    let spent = false;
    if (shot.enemy) {
      if (overlaps(shot.x, shot.y, 4, 4, s.x, s.y, STAGE.BODY_W, STAGE.BODY_H)) {
        s = hurt(def, s, events, false);
        spent = true;
      }
    } else if (shot.travelled >= 0) {
      // Tiro do Bit apaga tiro de torre.
      for (const other of s.shots) {
        if (
          other.enemy &&
          other.travelled < STAGE.SHOT_RANGE &&
          overlaps(shot.x, shot.y, 4, 4, other.x, other.y, 4, 4)
        ) {
          other.travelled = STAGE.SHOT_RANGE + 1;
          spent = true;
        }
      }
      for (let i = 0; i < s.enemies.length && !spent; i += 1) {
        const e = s.enemies[i]!;
        if (!e.alive) continue;
        const box = enemyBox(def, s, i);
        if (!overlaps(shot.x, shot.y, 4, 4, box.x, box.y, size, size)) continue;
        if (isSafeProgram(def, i)) {
          // Programa seguro e imune (D87): o tiro bate e se desfaz, so com o aviso
          // de que era o alvo errado. Sem coracao perdido -- a rajada que passa do
          // virus e pega quem vem atras nao pune quem mirou certo.
          events.push({ type: 'wrongTarget', enemy: i });
          spent = true;
          continue;
        }
        e.hp -= 1;
        if (e.hp <= 0) {
          e.alive = false;
          events.push({ type: 'kill', enemy: i });
        }
        spent = !has('codificar') || e.alive;
      }
    }
    if (!spent) kept.push(shot);
  }
  if (restarted()) return { state: s, events };
  s.shots = kept.filter((shot) => shot.travelled <= STAGE.SHOT_RANGE);

  // 9. Encostar em inimigo (programa seguro nao machuca). Caindo por cima de
  // quem nao tem armadura nem canhao, e pisao, como no Mario.
  def.enemies.forEach((d, i) => {
    if (restarted() || !s.enemies[i]?.alive || isSafeProgram(def, i)) return;
    const box = enemyBox(def, s, i);
    if (!overlaps(s.x, s.y, STAGE.BODY_W, STAGE.BODY_H, box.x, box.y, size, size)) return;
    const fromAbove = s.vy > 0 && s.y + STAGE.BODY_H - s.vy <= box.y + STOMP_MARGIN;
    if (fromAbove && STOMPABLE.has(d.kind)) {
      s.enemies[i]!.alive = false;
      s.vy = -STAGE.STOMP_BOUNCE;
      events.push({ type: 'stomp', enemy: i }, { type: 'kill', enemy: i });
      return;
    }
    s = hurt(def, s, events, false);
  });

  // 10. Espinho e buraco.
  if (!restarted() && touchesSpike(def, s.x + 1, s.y + 2, STAGE.BODY_W - 2, STAGE.BODY_H - 2)) {
    s = hurt(def, s, events, true);
  }
  if (!restarted() && s.y > def.rows * T) s = hurt(def, s, events, true);
  if (restarted()) return { state: s, events };

  // 11. Fragmentos, checkpoints, placas.
  def.fragments.forEach((f, i) => {
    if (s.collected[i]) return;
    if (
      overlaps(s.x, s.y, STAGE.BODY_W, STAGE.BODY_H, f.col * T + 2, f.row * T + 2, T - 4, T - 4)
    ) {
      s.collected[i] = true;
      events.push({ type: 'fragment', index: i });
    }
  });
  def.ammo.forEach((a, i) => {
    if (s.ammoTaken[i]) return;
    if (
      overlaps(s.x, s.y, STAGE.BODY_W, STAGE.BODY_H, a.col * T + 2, a.row * T + 2, T - 4, T - 4)
    ) {
      s.ammoTaken[i] = true;
      s.ammo = Math.min(STAGE.AMMO_MAX, s.ammo + DIFFICULTY[s.difficulty].AMMO_PICKUP);
      events.push({ type: 'ammo', index: i });
    }
  });
  def.checkpoints.forEach((c, i) => {
    if (i > s.checkpoint && s.x >= c.col * T) {
      s.checkpoint = i;
      s.shield = has('proteger');
      events.push({ type: 'checkpoint', index: i });
    }
  });
  while (s.signsRead < def.signs.length) {
    const sign = def.signs[s.signsRead]!;
    if (front < sign.col * T - STAGE.SIGN_REACH_PX) break;
    events.push({ type: 'sign', index: s.signsRead });
    s.signsRead += 1;
  }

  // 12. Detector: o portao abre quando os virus dele caem.
  def.gates.forEach((g, gi) => {
    const state = s.gates[gi];
    if (!state || state.solved || g.data.kind !== 'classify') return;
    const pending = def.enemies.some(
      (e, i) =>
        e.kind === 'program' && e.gate === gi && !isSafeProgram(def, i) && s.enemies[i]?.alive,
    );
    if (pending) return;
    s.gates[gi] = { ...state, solved: true, perfect: true };
    events.push({ type: 'gateOpen', gate: gi, perfect: true });
    if (s.atGate === gi) s.atGate = null;
  });

  // 13. Terminal no fim da fase.
  const goal = def.goal;
  if (overlaps(s.x, s.y, STAGE.BODY_W, STAGE.BODY_H, goal.col * T, goal.row * T, T, T)) {
    s.done = true;
    events.push({ type: 'goal' });
  }

  return { state: s, events };
}

// --- robo de referencia --------------------------------------------------------

/**
 * O toque que o robo de referencia daria agora. Ele joga como um jogador
 * cuidadoso: pula buraco, parede e espinho na beirada, atira em inimigo a
 * frente (nunca em programa seguro) e resolve cada portao sem errar.
 */
export function botInput(def: StageDef, s: RunState): RunInput {
  // O robo segura para a frente e segura o pulo inteiro, como quem joga com calma.
  const input: RunInput = { right: true, jumpHeld: true };
  const W = STAGE.BODY_W;
  const H = STAGE.BODY_H;

  if (s.atGate !== null) {
    const gate = def.gates[s.atGate];
    const state = s.gates[s.atGate];
    if (gate && state && gate.data.kind !== 'classify' && s.tick % STAGE.BOT_PANEL_STEPS === 0) {
      const presses = referencePresses(gate.data);
      const done =
        gate.data.kind === 'circuit' || gate.data.kind === 'bits'
          ? state.toggles.filter(Boolean).length
          : gate.data.kind === 'route'
            ? state.path.length
            : state.at;
      input.target = presses[done];
    }
  }

  // Atira no que esta a frente, na altura do tiro.
  const shotY = s.y + H / 2 - 2;
  const size = STAGE.ENEMY_SIZE;
  // O primeiro alvo na linha de tiro: se for programa seguro, espera ele passar.
  let nearest = -1;
  let nearestDx = Infinity;
  def.enemies.forEach((_, i) => {
    const e = s.enemies[i]!;
    if (!e.alive) return;
    const box = enemyBox(def, s, i);
    const dx = box.x - (s.x + W);
    const inLine = shotY + 4 > box.y - 2 && shotY < box.y + size + 2;
    if (inLine && dx > -size && dx < STAGE.BOT_SHOOT_PX && dx < nearestDx) {
      nearest = i;
      nearestDx = dx;
    }
  });
  const threat = nearest >= 0 && !isSafeProgram(def, nearest);
  const incoming = s.shots.some(
    (shot) => shot.enemy && shot.x > s.x && shot.x - s.x < STAGE.BOT_SHOOT_PX,
  );
  // Um tiro de cada vez: o segundo poderia passar do alvo e pegar um programa seguro.
  const inFlight = s.shots.some((shot) => !shot.enemy);
  if ((threat || incoming) && s.cooldown <= 0 && !inFlight && s.ammo > 0) input.shoot = true;

  if (!s.grounded || s.atGate !== null) return input;

  // Pula na beirada do buraco, antes da parede e antes do espinho.
  const lookX = s.x + W + STAGE.BOT_LOOK_PX;
  const col = Math.floor(lookX / T);
  const feetRow = Math.floor((s.y + H + 1) / T);
  const bodyRow = Math.floor((s.y + H - 1) / T);
  const gateAhead = def.gates.some((g, i) => g.col === col && !s.gates[i]?.solved);
  const pit = !isBlocked(def, s, col, feetRow);
  const wall = !gateAhead && isBlocked(def, s, col, bodyRow);
  const spike = stageTileAt(def, col, bodyRow) === STAGE_TILE.SPIKE;
  if (pit || wall || spike) input.jump = true;
  return input;
}

export interface RunReport {
  done: boolean;
  steps: number;
  hits: number;
  restarts: number;
  collected: number;
  perfectGates: number;
}

/** Joga a fase inteira com o robo de referencia. E o que o contrato usa. */
export function referenceRun(
  def: StageDef,
  abilities: readonly PowerId[] = [],
  difficulty: GameDifficulty = 'normal',
): RunReport {
  let s = initialRun(def, abilities, difficulty);
  let steps = 0;
  while (!s.done && steps < STAGE.MAX_STEPS && s.restarts === 0) {
    s = stepRun(def, s, botInput(def, s)).state;
    steps += 1;
  }
  return {
    done: s.done,
    steps,
    hits: s.hits,
    restarts: s.restarts,
    collected: s.collected.filter(Boolean).length,
    perfectGates: s.gates.filter((g) => g.perfect).length,
  };
}

/** Confere a planta da fase. Lista vazia = ok. A corrida em si e conferida por `referenceRun`. */
export function validateStage(def: StageDef, raw?: RawStage): string[] {
  const errors: string[] = [];
  if (raw) {
    raw.map.forEach((line, row) => {
      if (line.length !== def.cols)
        errors.push(`linha ${row} com ${line.length} colunas, esperado ${def.cols}`);
    });
    const count = (ch: string): number => raw.map.join('').split(ch).length - 1;
    if (count('S') !== 1) errors.push('a fase precisa de exatamente um S (partida)');
    if (count('G') !== 1) errors.push('a fase precisa de exatamente um G (terminal)');
    if (raw.gadgets.length !== def.gates.length) {
      errors.push(`${def.gates.length} portoes no mapa e ${raw.gadgets.length} dispositivos`);
    }
    const programs = def.enemies.filter((e) => e.kind === 'program').length;
    if ((raw.programs?.length ?? 0) !== programs) errors.push('programas sem caracteristicas');
  }
  if (!isSolidTile(stageTileAt(def, def.spawn.col, def.spawn.row + 1)))
    errors.push('partida sem chao');
  if (!isSolidTile(stageTileAt(def, def.goal.col, def.goal.row + 1)))
    errors.push('terminal sem chao');
  def.gates.forEach((g, i) => {
    for (const e of validateGadget(g.data)) errors.push(`portao ${i}: ${e}`);
    if (!def.checkpoints.some((c) => c.col < g.col))
      errors.push(`portao ${i} sem checkpoint antes`);
  });
  def.enemies.forEach((e, i) => {
    if (e.kind !== 'program') return;
    const gate = def.gates[e.gate];
    if (!gate || gate.data.kind !== 'classify') errors.push(`programa ${i} sem detector a frente`);
    if (!def.checkpoints.some((c) => c.col < e.col))
      errors.push(`programa ${i} sem checkpoint antes`);
  });
  return errors;
}
