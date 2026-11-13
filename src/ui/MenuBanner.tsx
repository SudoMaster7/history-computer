import { useEffect, useRef } from 'react';
import type { EraId } from '@/core/types';
import { TILE } from '@/core/world';
import { WORLD } from '@/core/constants';
import { drawBang, drawFragment } from './worldArt';

interface Props {
  era: EraId;
  reduceMotion: boolean;
}

/** Tamanho da cena, em tiles. */
const COLS = 15;
const ROWS = 5;
/** Linha do caminho, onde o Bit anda. */
const PATH_ROW = 3;
/** Coluna da tela onde o Bit fica: a cena passa por ele. */
const BIT_COL = 4;
/** Velocidade da paisagem, em pixels do mapa por segundo. */
const SPEED = 22;
const RES = WORLD.SCALE;
/** Intervalo minimo entre dois desenhos da faixa. */
const FRAME_MS = 33;

/** Indices no tileset (ver tools/make-sprites.mjs) e no spritesheet do Bit. */
const SPRITE_STATION = 6;
const BIT_ROW_RIGHT = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`nao carregou ${src}`));
    image.src = src;
  });
}

/** Numero estavel de 0 a 99 para uma coluna do mundo: decide o que nasce nela. */
function chance(column: number, salt: number): number {
  let h = (column * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % 100;
}

/**
 * Faixa de abertura do menu: a zona da era atual passando, com o Bit andando,
 * terminais com "!" e fragmentos pelo caminho. E a propria arte do jogo, viva,
 * em vez de uma fileira parada de tiles -- quem abre o jogo ja ve o que vai
 * fazer la dentro.
 *
 * Canvas 2D, como o mapa; a paisagem sai de uma conta sobre a coluna, sem
 * sorteio. Com "Reduzir animacoes" a cena e desenhada uma vez, parada.
 */
export default function MenuBanner({ era, reduceMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    let frame = 0;

    Promise.all([loadImage(`/sprites/tiles-${era}.png`), loadImage('/sprites/bit.png')])
      .then(([tiles, bit]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!alive || !canvas || !ctx) return;
        const size = WORLD.TILE;

        let last = 0;
        const draw = (now: number): void => {
          // A faixa e enfeite: 30 quadros por segundo bastam e poupam bateria.
          if (!reduceMotion && now - last < FRAME_MS) {
            frame = requestAnimationFrame(draw);
            return;
          }
          last = now;
          const t = reduceMotion ? 0 : now / 1000;
          const scroll = t * SPEED;
          const first = Math.floor(scroll / size);
          const shift = scroll - first * size;

          ctx.setTransform(RES, 0, 0, RES, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, COLS * size, ROWS * size);

          const sprite = (image: HTMLImageElement, sx: number, sy: number, x: number, y: number) =>
            ctx.drawImage(image, sx * size, sy * size, size, size, x, y, size, size);

          // Uma coluna a mais que a tela, para a borda direita nunca ficar vazia.
          for (let i = 0; i <= COLS; i += 1) {
            const column = first + i;
            const x = i * size - shift;
            for (let row = 0; row < ROWS; row += 1) {
              let tile: number = TILE.GRASS;
              if (row === PATH_ROW) tile = TILE.PATH;
              else if (row === 0) tile = chance(column, 1) < 78 ? TILE.TREE : TILE.GRASS;
              else if (row === 1) tile = chance(column, 2) < 22 ? TILE.TREE : TILE.GRASS;
              else if (row === ROWS - 1) tile = chance(column, 3) < 14 ? TILE.WATER : TILE.GRASS;
              sprite(tiles, tile, 0, x, row * size);
            }
            // De vez em quando, um terminal a beira do caminho.
            if (chance(column, 4) < 9) {
              const y = (PATH_ROW - 1) * size;
              sprite(tiles, TILE.GRASS, 0, x, y);
              sprite(tiles, SPRITE_STATION, 0, x, y);
              drawBang(ctx, x + 4.5, y - 9 + Math.abs(Math.sin(t * 4)) * -2);
            }
            // E fragmentos no caminho, que somem quando o Bit passa por eles.
            if (chance(column, 5) < 16 && x > BIT_COL * size + 6) {
              const bob = Math.sin(t * 3 + column);
              drawFragment(ctx, x + 4.5, PATH_ROW * size + 3 + bob * 1.2, (bob + 1) / 2);
            }
          }

          const step = reduceMotion ? 1 : Math.floor(now / WORLD.FRAME_MS) % WORLD.WALK_FRAMES;
          const hop = reduceMotion
            ? 0
            : -Math.abs(Math.sin((now / WORLD.WALK_MS_PER_TILE) * Math.PI)) * 1.2;
          sprite(bit, step, BIT_ROW_RIGHT, BIT_COL * size, PATH_ROW * size + hop);

          if (!reduceMotion) frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);
      })
      .catch(() => {
        /* Sem a arte, a faixa fica so com o fundo: o menu continua usavel. */
      });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [era, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="menu__banner"
      width={COLS * WORLD.TILE * RES}
      height={ROWS * WORLD.TILE * RES}
      aria-hidden="true"
    />
  );
}
