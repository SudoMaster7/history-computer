import type { EraId } from '@/core/types';

/**
 * Desenho dos enfeites do mapa: marcadores, fragmentos e particulas.
 *
 * Tudo aqui e pixel art feita com `fillRect`, em coordenadas de pixel do mapa
 * (um tile = 16). Nao ha regra de jogo neste arquivo: ele so recebe "onde" e
 * "quando" e pinta. Quem decide o que aparece e `WorldScreen`.
 */

type Ctx = CanvasRenderingContext2D;

const INK = '#141a2e';
const GOLD = '#ffd34d';
const ACCENT = '#58e0c8';

/** Balao amarelo com "!": terminal com missao por fazer. */
export function drawBang(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y - 1, 7, 10);
  ctx.fillRect(x - 1, y, 9, 8);
  ctx.fillStyle = '#f2b544';
  ctx.fillRect(x + 1, y, 5, 8);
  ctx.fillRect(x, y + 1, 7, 6);
  ctx.fillRect(x + 3, y + 8, 1, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 3, y + 1, 1, 4);
  ctx.fillRect(x + 3, y + 6, 1, 1);
}

/** Balao de fala com reticencias: personagem com quem ainda nao se conversou. */
export function drawTalk(ctx: Ctx, x: number, y: number, beat: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y - 1, 9, 8);
  ctx.fillRect(x - 1, y, 11, 6);
  ctx.fillStyle = '#f2f5ff';
  ctx.fillRect(x + 1, y, 7, 6);
  ctx.fillRect(x, y + 1, 9, 4);
  ctx.fillRect(x + 4, y + 6, 1, 1);
  ctx.fillStyle = INK;
  for (let dot = 0; dot < 3; dot += 1) {
    // Um ponto por vez sobe um pixel: e o que faz o balao parecer "falando".
    ctx.fillRect(x + 2 + dot * 2, y + (beat === dot ? 2 : 3), 1, 1);
  }
}

/** Tres estrelinhas sobre o terminal concluido: as acesas sao as conquistadas. */
export function drawStarPips(ctx: Ctx, x: number, y: number, stars: number): void {
  for (let i = 0; i < 3; i += 1) {
    const px = x + i * 4;
    ctx.fillStyle = INK;
    ctx.fillRect(px - 1, y, 5, 3);
    ctx.fillRect(px, y - 1, 3, 5);
    ctx.fillStyle = i < stars ? GOLD : '#56617f';
    ctx.fillRect(px + 1, y, 1, 3);
    ctx.fillRect(px, y + 1, 3, 1);
  }
}

/** Seta para baixo, sobre a porta aberta. */
export function drawArrow(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 1, y - 1, 9, 3);
  ctx.fillRect(x, y + 1, 7, 2);
  ctx.fillRect(x + 1, y + 2, 5, 2);
  ctx.fillRect(x + 2, y + 3, 3, 2);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(x, y, 7, 1);
  ctx.fillRect(x + 1, y + 1, 5, 1);
  ctx.fillRect(x + 2, y + 2, 3, 1);
  ctx.fillRect(x + 3, y + 3, 1, 1);
}

/** Cadeado, sobre a porta trancada. */
export function drawLock(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y - 1, 5, 4);
  ctx.fillRect(x - 1, y + 2, 7, 6);
  ctx.fillStyle = '#c9d3ea';
  ctx.fillRect(x + 1, y, 3, 1);
  ctx.fillRect(x + 1, y + 1, 1, 2);
  ctx.fillRect(x + 3, y + 1, 1, 2);
  ctx.fillStyle = '#f2b544';
  ctx.fillRect(x, y + 3, 5, 4);
  ctx.fillStyle = INK;
  ctx.fillRect(x + 2, y + 4, 1, 2);
}

/** Fragmento de memoria: um losango que brilha. `glow` vai de 0 a 1. */
export function drawFragment(ctx: Ctx, x: number, y: number, glow: number): void {
  // Brilho em cruz, nao em quadrado: de longe le como luz, nao como ladrilho.
  ctx.fillStyle = `rgba(154, 243, 226, ${0.1 + glow * 0.16})`;
  ctx.fillRect(x - 2, y + 1, 11, 5);
  ctx.fillRect(x + 1, y - 2, 5, 11);
  // Contorno: o mesmo losango, um pixel maior, por baixo.
  ctx.fillStyle = INK;
  for (let dy = -4; dy <= 4; dy += 1) {
    const half = 4 - Math.abs(dy);
    ctx.fillRect(x + 3 - half, y + 3 + dy, half * 2 + 1, 1);
  }
  for (let dy = -3; dy <= 3; dy += 1) {
    const half = 3 - Math.abs(dy);
    ctx.fillStyle = dy < 0 ? '#9af3e2' : dy === 0 ? ACCENT : '#1d9e8a';
    ctx.fillRect(x + 3 - half, y + 3 + dy, half * 2 + 1, 1);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2, y + 2, 1, 1);
  ctx.fillRect(x + 3, y + 1, 1, 1);
}

/** Cantoneiras em volta da celula de destino. `pulse` vai de 0 a 1. */
export function drawTarget(ctx: Ctx, x: number, y: number, size: number, pulse: number): void {
  const inset = pulse * 2;
  const a = x + inset;
  const b = y + inset;
  const c = x + size - inset;
  const d = y + size - inset;
  ctx.fillStyle = `rgba(242, 245, 255, ${0.9 - pulse * 0.35})`;
  for (const [cx, cy, sx, sy] of [
    [a, b, 1, 1],
    [c, b, -1, 1],
    [a, d, 1, -1],
    [c, d, -1, -1],
  ] as const) {
    ctx.fillRect(sx > 0 ? cx : cx - 4, sy > 0 ? cy : cy - 1, 4, 1);
    ctx.fillRect(sx > 0 ? cx : cx - 1, sy > 0 ? cy : cy - 4, 1, 4);
  }
}

/* -------------------------------------------------------------- particulas -- */

export interface Particle {
  x: number;
  y: number;
  /** Velocidade em pixels do mapa por segundo. */
  vx: number;
  vy: number;
  /** Aceleracao vertical em pixels por segundo ao quadrado. */
  gravity: number;
  born: number;
  /** Duracao em milissegundos. */
  life: number;
  color: string;
  size: number;
}

/** Poeira do passo: tres graos que sobem pouco e somem. */
export function dustAt(x: number, y: number, now: number): Particle[] {
  return [-1, 0, 1].map((side) => ({
    x: x + 8 + side * 3,
    y: y + 14,
    vx: side * 7,
    vy: -6,
    gravity: 10,
    born: now,
    life: 320,
    color: 'rgba(238, 228, 204, 0.75)',
    size: 1,
  }));
}

/** Estouro do fragmento recolhido. As direcoes saem do indice, sem sorteio. */
export function sparkleAt(x: number, y: number, now: number): Particle[] {
  return Array.from({ length: 14 }, (_, i) => {
    const angle = i * 2.399963;
    const speed = 16 + (i % 4) * 7;
    return {
      x: x + 8,
      y: y + 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 12,
      gravity: 40,
      born: now,
      life: 520 + (i % 3) * 120,
      color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? ACCENT : GOLD,
      size: i % 4 === 0 ? 2 : 1,
    };
  });
}

/** Avanca e desenha as particulas; devolve as que ainda estao vivas. */
export function drawParticles(ctx: Ctx, particles: Particle[], now: number): Particle[] {
  const alive: Particle[] = [];
  for (const p of particles) {
    const age = now - p.born;
    if (age >= p.life) continue;
    const t = age / 1000;
    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t + 0.5 * p.gravity * t * t;
    ctx.globalAlpha = 1 - age / p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, p.size, p.size);
    alive.push(p);
  }
  ctx.globalAlpha = 1;
  return alive;
}

/* ---------------------------------------------------------------- ambiente -- */

/**
 * Ciscos no ar, um jeito por era: folha que cai no campo da Mecanica, faisca
 * que sobe das valvulas, pacote que cruza a rede. E o que diz "esta zona e
 * outra epoca" sem trocar a planta.
 */
const AMBIENT: Record<EraId, { color: string; vx: number; vy: number }> = {
  mecanica: { color: 'rgba(214, 236, 150, 0.6)', vx: 5, vy: 7 },
  logica: { color: 'rgba(255, 214, 102, 0.65)', vx: 0, vy: -8 },
  codigo: { color: 'rgba(110, 240, 170, 0.6)', vx: 0, vy: -10 },
  redes: { color: 'rgba(130, 190, 255, 0.65)', vx: 16, vy: 0 },
  seguranca: { color: 'rgba(196, 160, 255, 0.6)', vx: -4, vy: -6 },
  ia: { color: 'rgba(255, 150, 190, 0.6)', vx: 6, vy: -6 },
};

const MOTES = 12;

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/** Desenha os ciscos da era. A posicao sai so do tempo: nao ha estado guardado. */
export function drawAmbient(ctx: Ctx, era: EraId, width: number, height: number, t: number): void {
  const style = AMBIENT[era];
  ctx.fillStyle = style.color;
  for (let i = 0; i < MOTES; i += 1) {
    const baseX = (i * 73 + 11) % width;
    const baseY = (i * 131 + 37) % height;
    const sway = Math.sin(t * 1.3 + i * 1.9) * 3;
    const x = wrap(baseX + style.vx * t + (style.vx === 0 ? sway : 0), width);
    const y = wrap(baseY + style.vy * t + (style.vy === 0 ? sway : 0), height);
    // Pisca devagar, cada um no seu compasso.
    if (Math.sin(t * 2 + i * 2.7) < -0.6) continue;
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Brilho que corre sobre um tile de agua. */
export function drawShimmer(ctx: Ctx, x: number, y: number, t: number, phase: number): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  const a = Math.floor(wrap(t * 5 + phase * 3, 11));
  const b = Math.floor(wrap(t * 4 + phase * 7 + 5, 11));
  ctx.fillRect(x + 1 + a, y + 4, 3, 1);
  ctx.fillRect(x + 1 + b, y + 11, 3, 1);
}
