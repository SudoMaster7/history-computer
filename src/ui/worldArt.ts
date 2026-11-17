/**
 * Enfeites em pixel art que a fase e a faixa do menu dividem: o fragmento de
 * memoria e o balao de "!".
 *
 * Tudo aqui e pixel art feita com `fillRect`, em coordenadas de pixel do mapa
 * (um tile = 16). Nao ha regra de jogo neste arquivo: ele so recebe "onde" e
 * "quando" e pinta. Quem decide o que aparece e quem chama.
 */

type Ctx = CanvasRenderingContext2D;

const INK = '#141a2e';
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
