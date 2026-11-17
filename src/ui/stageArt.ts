import type { EraId } from '@/core/types';
import type { EnemyKind, RunState, StageDef } from '@/core/stage';
import { STAGE_TILE, enemyPosition, stageTileAt } from '@/core/stage';
import { STAGE } from '@/core/constants';
import { drawFragment } from './worldArt';

/**
 * Desenho da fase vista de lado. Nenhuma regra mora aqui: recebe a planta e o
 * `RunState` e pinta. A arte reaproveita o que o gerador ja faz (D65): o Bit
 * andando para a direita sai da linha 2 de `bit.png`, e o chao, os blocos, o
 * portao e o terminal saem do tileset da era. O que nao existia em pixel art
 * (engrenagem, faisca, torre, programa, espinho) e pintado com `fillRect`.
 */

type Ctx = CanvasRenderingContext2D;

const T = STAGE.TILE;
const INK = '#141a2e';

/** Indices no tileset da era (ver tools/make-sprites.mjs). */
const TILESET = { DEEP: 4, BLOCK: 5, STATION: 6, DOOR: 7 } as const;

/** Linha do `bit.png` com o Bit virado para a direita. */
const BIT_RIGHT_ROW = 2;
/** Linha do `bit.png` com o Bit virado para a esquerda. */
const BIT_LEFT_ROW = 1;

/** Ceu de cada era, de cima para baixo. */
const SKY: Record<EraId, [string, string]> = {
  mecanica: ['#3b2a1e', '#7a5434'],
  logica: ['#1f2433', '#4a4a3a'],
  codigo: ['#0f2a26', '#245a4b'],
  redes: ['#0f1c3a', '#24467a'],
  seguranca: ['#1d1236', '#43307a'],
  ia: ['#2a0f1f', '#6a2a48'],
};

/** Cor da peca de cada era (engrenagem, faisca, torre). */
const METAL: Record<EraId, string> = {
  mecanica: '#c98a45',
  logica: '#d9b23a',
  codigo: '#4cc0a0',
  redes: '#5a9cf0',
  seguranca: '#9a72f0',
  ia: '#f06a92',
};

/** Cores, formas e antena dos programas da Era 6 (mesma ordem de `gate.programColors`). */
export const PROGRAM_COLORS = ['#e8504a', '#4cc66a', '#4a8be8'] as const;

export interface StageArt {
  tiles: HTMLImageElement;
  bit: HTMLImageElement;
}

/** Largura e altura da janela da fase, em px da fase. */
export const VIEW_W = T * 12;
export const VIEW_H = T * 8;
/** As duas linhas de cima da planta sao so ceu: a janela comeca abaixo delas. */
const VIEW_TOP = T * 2;

/** Onde a camera fica: o Bit a um terco da largura. */
export function cameraX(def: StageDef, s: RunState): number {
  const max = Math.max(0, def.cols * T - VIEW_W);
  return Math.round(Math.max(0, Math.min(max, s.x - VIEW_W / 3)));
}

function tile(ctx: Ctx, art: StageArt, index: number, x: number, y: number): void {
  ctx.drawImage(art.tiles, index * T, 0, T, T, x, y, T, T);
}

function drawSky(ctx: Ctx, era: EraId, cam: number, t: number): void {
  const [top, bottom] = SKY[era];
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Duas camadas de silhueta em paralaxe: da a sensacao de corrida.
  for (let layer = 0; layer < 2; layer += 1) {
    const speed = layer === 0 ? 0.2 : 0.45;
    const h = layer === 0 ? 46 : 30;
    ctx.fillStyle = layer === 0 ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.28)';
    const offset = (cam * speed) % 48;
    for (let x = -offset - 48; x < VIEW_W + 48; x += 48) {
      const seed = Math.floor((x + cam * speed) / 48);
      const bump = ((seed * 37) % 5) * 4;
      ctx.fillRect(Math.round(x), VIEW_H - h - bump - 32, 32, h + bump);
    }
  }
  // Brilhos lentos no ceu.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 6; i += 1) {
    const x = (i * 53 - cam * 0.1 + VIEW_W * 2) % VIEW_W;
    const y = 8 + ((i * 29) % 40);
    if ((Math.floor(t / 400) + i) % 3 !== 0) ctx.fillRect(Math.round(x), y, 1, 1);
  }
}

function drawSpike(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK;
  for (let k = 0; k < 2; k += 1) {
    const bx = x + k * 8;
    for (let row = 0; row < 8; row += 1) ctx.fillRect(bx + 4 - row / 2, y + 8 + row, row + 1, 1);
  }
  ctx.fillStyle = '#d9dde8';
  for (let k = 0; k < 2; k += 1) {
    const bx = x + k * 8;
    for (let row = 1; row < 7; row += 1)
      ctx.fillRect(bx + 4 - row / 2 + 0.5, y + 8 + row, Math.max(1, row - 1), 1);
  }
}

function drawGear(ctx: Ctx, x: number, y: number, color: string, t: number): void {
  const cx = x + 6;
  const cy = y + 6;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2 + t / 160;
    ctx.fillRect(Math.round(cx + Math.cos(a) * 5) - 1, Math.round(cy + Math.sin(a) * 5) - 1, 2, 2);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
  // Olhos bravos: e inimigo, nao enfeite.
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 3, cy - 2, 1, 1);
  ctx.fillRect(cx + 2, cy - 2, 1, 1);
}

function drawFlyer(ctx: Ctx, x: number, y: number, color: string, t: number): void {
  const flap = Math.floor(t / 90) % 2;
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y + 3, 6, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y + 4, 4, 4);
  ctx.fillStyle = '#fff4c2';
  ctx.fillRect(x + 5, y + 5, 2, 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + (flap ? 2 : 5), 3, 2);
  ctx.fillRect(x + 9, y + (flap ? 2 : 5), 3, 2);
}

function drawTurret(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y + 2, 12, 10);
  ctx.fillRect(x - 4, y + 4, 5, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 3, 10, 8);
  ctx.fillRect(x - 3, y + 5, 4, 2);
  ctx.fillStyle = '#ff5f6d';
  ctx.fillRect(x + 4, y + 5, 2, 2);
}

/** Numero estavel por coluna, para o enfeite do chao nao piscar entre quadros. */
function hash(col: number): number {
  let h = Math.imul(col ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) % 100;
}

/** Enfeite por cima do chao, por era: grama, parafusos, fios, pedras... */
function drawGroundDetail(ctx: Ctx, era: EraId, col: number, x: number, y: number): void {
  const roll = hash(col);
  if (roll > 45) return;
  const color: Record<EraId, string> = {
    mecanica: '#6b8a3a',
    logica: '#c9a227',
    codigo: '#3ad0a0',
    redes: '#5a9cf0',
    seguranca: '#9a72f0',
    ia: '#f06a92',
  };
  ctx.fillStyle = color[era];
  if (roll < 15) {
    // Tufo.
    ctx.fillRect(x + 3, y - 2, 1, 2);
    ctx.fillRect(x + 5, y - 3, 1, 3);
    ctx.fillRect(x + 7, y - 2, 1, 2);
  } else if (roll < 30) {
    // Parafuso ou pedrinha.
    ctx.fillStyle = INK;
    ctx.fillRect(x + 9, y - 2, 4, 2);
    ctx.fillStyle = color[era];
    ctx.fillRect(x + 10, y - 2, 2, 1);
  } else {
    // Fio passando rente ao chao.
    ctx.fillRect(x, y + 3, T, 1);
  }
}

/** Chao que cai: tijolo rachado; treme rachando e some enquanto esta caido. */
function drawCrumble(
  ctx: Ctx,
  art: StageArt,
  x: number,
  y: number,
  state: number | undefined,
  t: number,
): void {
  if (state !== undefined && state < 0) {
    // Caido: so a marca de onde ele estava.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 2, y, T - 4, 1);
    return;
  }
  const shake = state !== undefined && state > 0 ? Math.round(Math.sin(t / 30) * 1) : 0;
  tile(ctx, art, TILESET.BLOCK, x + shake, y);
  ctx.fillStyle = 'rgba(20, 26, 46, 0.35)';
  ctx.fillRect(x + shake, y, T, T);
  ctx.fillStyle = INK;
  // Rachaduras.
  ctx.fillRect(x + 4 + shake, y + 2, 1, 5);
  ctx.fillRect(x + 5 + shake, y + 7, 3, 1);
  ctx.fillRect(x + 8 + shake, y + 8, 1, 5);
  ctx.fillRect(x + 11 + shake, y + 3, 1, 4);
  ctx.strokeStyle = INK;
  ctx.strokeRect(x + 0.5 + shake, y + 0.5, T - 1, T - 1);
}

/** Mola: base, espiral e tampa amarela que pulsa. */
function drawSpring(ctx: Ctx, x: number, y: number, t: number): void {
  const squash = Math.round((Math.sin(t / 160) + 1) / 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 2, y - 7 + squash, 12, 4);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(x + 3, y - 6 + squash, 10, 2);
  ctx.fillStyle = '#d9dde8';
  for (let k = 0; k < 3; k += 1) ctx.fillRect(x + 4 + (k % 2) * 2, y - 3 + k, 6, 1);
}

/** Bateria de municao: corpo, polo e um raio. */
function drawBattery(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y + 1, 8, 10);
  ctx.fillRect(x + 2, y - 1, 4, 2);
  ctx.fillStyle = '#58e089';
  ctx.fillRect(x + 1, y + 2, 6, 8);
  ctx.fillStyle = '#d9dde8';
  ctx.fillRect(x + 3, y, 2, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y + 3, 1, 3);
  ctx.fillRect(x + 3, y + 5, 2, 1);
  ctx.fillRect(x + 3, y + 6, 1, 3);
}

/**
 * Cortina de energia acima da porta: linhas finas que sobem devagar. Fraca de
 * proposito -- e aviso de "nao passa", nao uma segunda porta.
 */
function drawBarrier(ctx: Ctx, x: number, doorY: number, t: number): void {
  const height = doorY;
  if (height <= 0) return;
  ctx.fillStyle = 'rgba(88, 224, 200, 0.10)';
  ctx.fillRect(x + 3, 0, T - 6, height);
  ctx.fillStyle = 'rgba(88, 224, 200, 0.35)';
  ctx.fillRect(x + 3, 0, 1, height);
  ctx.fillRect(x + T - 4, 0, 1, height);
  // Faiscas subindo pela cortina.
  const shift = Math.floor(t / 60) % 12;
  ctx.fillStyle = 'rgba(154, 243, 226, 0.55)';
  for (let k = height - shift; k > 0; k -= 12) ctx.fillRect(x + 6 + ((k / 12) % 2) * 3, k, 1, 3);
}

/** Programa da Era 6: cor, forma e antena sao as caracteristicas que o jogador compara. */
export function drawProgram(ctx: Ctx, x: number, y: number, attrs: readonly number[]): void {
  const color = PROGRAM_COLORS[attrs[0] ?? 0] ?? PROGRAM_COLORS[0];
  const shape = attrs[1] ?? 0;
  const antenna = (attrs[2] ?? 0) === 1;
  if (antenna) {
    ctx.fillStyle = INK;
    ctx.fillRect(x + 5, y - 5, 2, 6);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x + 4, y - 6, 4, 3);
  }
  ctx.fillStyle = INK;
  ctx.fillStyle = color;
  if (shape === 0) {
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else if (shape === 1) {
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, 12, 12);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, 10, 10);
  } else {
    ctx.fillStyle = INK;
    for (let row = 0; row < 12; row += 1) ctx.fillRect(x + 6 - row / 2 - 0.5, y + row, row + 1, 1);
    ctx.fillStyle = color;
    for (let row = 2; row < 11; row += 1) ctx.fillRect(x + 6 - row / 2 + 0.5, y + row, row - 1, 1);
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 3, y + 6, 2, 2);
  ctx.fillRect(x + 7, y + 6, 2, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y + 7, 1, 1);
  ctx.fillRect(x + 7, y + 7, 1, 1);
}

/** Saltador: mola com olhos, que encolhe quando toca o chao. */
function drawHopper(ctx: Ctx, x: number, y: number, color: string, low: boolean): void {
  const squash = low ? 2 : 0;
  ctx.fillStyle = INK;
  ctx.fillRect(x + 1, y + 1 + squash, 10, 8 - squash);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2 + squash, 8, 6 - squash);
  // Mola.
  ctx.fillStyle = INK;
  for (let k = 0; k < 3 - (low ? 1 : 0); k += 1) ctx.fillRect(x + 3 + (k % 2) * 3, y + 9 + k, 3, 1);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 3, y + 4 + squash, 2, 2);
  ctx.fillRect(x + 7, y + 4 + squash, 2, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y + 5 + squash, 1, 1);
  ctx.fillRect(x + 7, y + 5 + squash, 1, 1);
}

/** Blindado: engrenagem atras de uma placa de metal; as luzes contam a resistencia. */
function drawArmored(ctx: Ctx, x: number, y: number, color: string, hp: number, t: number): void {
  drawGear(ctx, x, y, color, t);
  ctx.fillStyle = INK;
  ctx.fillRect(x - 2, y + 1, 5, 11);
  ctx.fillStyle = '#9fb0cf';
  ctx.fillRect(x - 1, y + 2, 3, 9);
  ctx.fillStyle = '#ff5f6d';
  for (let k = 0; k < hp; k += 1) ctx.fillRect(x + 3 + k * 4, y - 3, 2, 2);
}

/** Pingo de oleo: pendurado num fio enquanto espera, gota quando cai. */
function drawDropper(ctx: Ctx, x: number, y: number, hanging: boolean): void {
  if (hanging) {
    ctx.fillStyle = 'rgba(217, 221, 232, 0.6)';
    ctx.fillRect(x + 5, y - 20, 1, 20);
  }
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y, 6, 12);
  ctx.fillRect(x + 1, y + 4, 10, 7);
  ctx.fillStyle = '#3d2a52';
  ctx.fillRect(x + 4, y + 1, 4, 10);
  ctx.fillRect(x + 2, y + 5, 8, 5);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(x + 3, y + 6, 2, 2);
  ctx.fillRect(x + 7, y + 6, 2, 2);
}

function drawEnemy(
  ctx: Ctx,
  kind: EnemyKind,
  era: EraId,
  x: number,
  y: number,
  t: number,
  attrs: readonly number[],
): void {
  if (kind === 'walker') drawGear(ctx, x, y, METAL[era], t);
  else if (kind === 'flyer') drawFlyer(ctx, x, y, METAL[era], t);
  else if (kind === 'turret') drawTurret(ctx, x, y, METAL[era]);
  else drawProgram(ctx, x, y, attrs);
}

function drawExtra(
  ctx: Ctx,
  kind: EnemyKind,
  era: EraId,
  x: number,
  y: number,
  t: number,
  state: { hp: number; vy: number; y: number },
): boolean {
  if (kind === 'hopper') drawHopper(ctx, x, y, METAL[era], y >= Math.round(state.y) - 1);
  else if (kind === 'armored') drawArmored(ctx, x, y, METAL[era], state.hp, t);
  else if (kind === 'dropper') drawDropper(ctx, x, y, state.vy === 0);
  else return false;
  return true;
}

function drawSign(ctx: Ctx, x: number, y: number, read: boolean): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x + 7, y + 6, 2, 10);
  ctx.fillRect(x + 1, y, 14, 9);
  ctx.fillStyle = read ? '#8a7a5a' : '#e8c27a';
  ctx.fillRect(x + 2, y + 1, 12, 7);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y + 3, 8, 1);
  ctx.fillRect(x + 4, y + 5, 6, 1);
}

function drawFlag(ctx: Ctx, x: number, y: number, reached: boolean): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x + 4, y, 2, 16);
  ctx.fillStyle = reached ? '#58e089' : '#9fb0cf';
  ctx.fillRect(x + 6, y + 1, 7, 5);
}

/** A fase inteira num quadro. `t` e o relogio da tela, so para enfeite. */
export function drawStage(ctx: Ctx, def: StageDef, s: RunState, art: StageArt, t: number): void {
  const cam = cameraX(def, s);
  drawSky(ctx, def.era, cam, t);

  const c0 = Math.max(0, Math.floor(cam / T));
  const c1 = Math.min(def.cols - 1, Math.ceil((cam + VIEW_W) / T));
  ctx.save();
  ctx.translate(-cam, -VIEW_TOP);

  // Chao, blocos e espinhos.
  for (let row = 0; row < def.rows; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const id = stageTileAt(def, col, row);
      const x = col * T;
      const y = row * T;
      if (id === STAGE_TILE.GROUND) {
        const above = stageTileAt(def, col, row - 1);
        const top = above !== STAGE_TILE.GROUND && above !== STAGE_TILE.SPRING;
        // A superficie e o estilo da fase (D82); por baixo, a parede da era.
        tile(ctx, art, top ? def.style : TILESET.DEEP, x, y);
        if (top) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x, y, T, 1);
          drawGroundDetail(ctx, def.era, col, x, y);
        }
      } else if (id === STAGE_TILE.CRUMBLE) {
        drawCrumble(ctx, art, x, y, s.crumble[row * def.cols + col], t);
      } else if (id === STAGE_TILE.SPRING) {
        tile(ctx, art, def.style, x, y);
        drawSpring(ctx, x, y, t);
      } else if (id === STAGE_TILE.BLOCK) {
        tile(ctx, art, TILESET.BLOCK, x, y);
        ctx.strokeStyle = INK;
        ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      } else if (id === STAGE_TILE.SPIKE) {
        drawSpike(ctx, x, y);
      }
    }
  }

  // Placas e checkpoints.
  def.signs.forEach((sign, i) => drawSign(ctx, sign.col * T, sign.row * T, i < s.signsRead));
  def.checkpoints.forEach((c, i) => drawFlag(ctx, c.col * T, c.row * T, i <= s.checkpoint));

  // Portoes (D88): UMA porta na altura do Bit. Acima dela, uma cortina de energia
  // fraca ate o topo diz que nao da para pular por cima -- a coluna inteira
  // continua bloqueada na regra (core/stage). Aberto, so o batente.
  def.gates.forEach((g, i) => {
    const open = s.gates[i]?.solved;
    // A celula logo acima do chao, na coluna do portao.
    let floorRow = g.row;
    while (floorRow + 1 < def.rows && stageTileAt(def, g.col, floorRow + 1) !== STAGE_TILE.GROUND) {
      floorRow += 1;
    }
    const x = g.col * T;
    const y = floorRow * T;
    if (open) {
      // Batente aberto: dois postes baixos e a passagem livre.
      ctx.fillStyle = INK;
      ctx.fillRect(x, y, 3, T);
      ctx.fillRect(x + T - 3, y, 3, T);
      ctx.fillStyle = 'rgba(88, 224, 200, 0.45)';
      ctx.fillRect(x + 1, y + 1, 1, T - 2);
      ctx.fillRect(x + T - 2, y + 1, 1, T - 2);
      return;
    }
    drawBarrier(ctx, x, y, t);
    tile(ctx, art, TILESET.DOOR, x, y);
    // Moldura escura e lampada de "pense aqui" piscando em cima da porta.
    ctx.strokeStyle = INK;
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
    const glow = 0.45 + 0.35 * Math.sin(t / 220);
    ctx.fillStyle = INK;
    ctx.fillRect(x + 4, y - 5, 8, 4);
    ctx.fillStyle = `rgba(88, 224, 200, ${glow})`;
    ctx.fillRect(x + 5, y - 4, 6, 2);
  });

  // Terminal no fim.
  tile(ctx, art, TILESET.STATION, def.goal.col * T, def.goal.row * T);
  ctx.fillStyle = `rgba(255, 211, 77, ${0.5 + 0.4 * Math.sin(t / 180)})`;
  ctx.fillRect(
    def.goal.col * T + 6,
    def.goal.row * T - 6 + Math.round(Math.sin(t / 200) * 2),
    4,
    4,
  );

  // Recargas de municao.
  def.ammo.forEach((a, i) => {
    if (s.ammoTaken[i]) return;
    const bob = Math.round(Math.sin(t / 240 + i) * 1.5);
    drawBattery(ctx, a.col * T + 4, a.row * T + 3 + bob);
  });

  // Fragmentos.
  def.fragments.forEach((f, i) => {
    if (s.collected[i]) return;
    const bob = Math.round(Math.sin(t / 260 + i) * 2);
    drawFragment(ctx, f.col * T + 5, f.row * T + 4 + bob, (Math.sin(t / 300 + i) + 1) / 2);
  });

  // Inimigos.
  def.enemies.forEach((d, i) => {
    const e = s.enemies[i];
    if (!e?.alive) return;
    const at = enemyPosition(def, s, i);
    const x = Math.round(at.x);
    const y = Math.round(at.y);
    if (!drawExtra(ctx, d.kind, def.era, x, y, t, e))
      drawEnemy(ctx, d.kind, def.era, x, y, t, d.attrs);
  });

  // Tiros.
  for (const shot of s.shots) {
    if (shot.travelled < 0) continue;
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(shot.x) - 1, Math.round(shot.y) - 1, 6, 6);
    ctx.fillStyle = shot.enemy ? '#ff9a3c' : '#9af3e2';
    ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 4, 4);
  }

  // O Bit (pisca enquanto invulneravel).
  if (s.invuln === 0 || Math.floor(s.invuln / 4) % 2 === 0) {
    // Parado, a pose do meio; andando, o ciclo de passos; no ar, um quadro so.
    const frame = s.grounded && s.dir !== 0 ? Math.floor(s.tick / 6) % 3 : 1;
    const x = Math.round(s.x - (T - STAGE.BODY_W) / 2);
    const y = Math.round(s.y - (T - STAGE.BODY_H));
    if (s.shield) {
      ctx.fillStyle = 'rgba(88, 224, 200, 0.25)';
      ctx.fillRect(x - 2, y - 2, T + 4, T + 4);
    }
    const row = s.facing === 1 ? BIT_RIGHT_ROW : BIT_LEFT_ROW;
    ctx.drawImage(art.bit, frame * T, row * T, T, T, x, y, T, T);
  }

  ctx.restore();
}
