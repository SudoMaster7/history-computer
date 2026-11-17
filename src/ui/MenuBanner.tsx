import { useEffect, useRef } from 'react';
import type { EraId } from '@/core/types';
import { STAGE } from '@/core/constants';
import { drawBang, drawFragment } from './worldArt';

interface Props {
  era: EraId;
}

/** Tamanho da cena, em tiles. */
const COLS = 15;
const ROWS = 5;
/** Linha em que o Bit corre; o chao fica logo abaixo. */
const PATH_ROW = 3;
/** Coluna da tela onde o Bit fica: a cena passa por ele. */
const BIT_COL = 4;
/** Velocidade da paisagem, em pixels do mapa por segundo. */
const SPEED = 22;
const RES = 3;
const TILE_PX = STAGE.TILE;
/** Quadros e ritmo da corrida do Bit. */
const RUN_FRAMES = 3;
const RUN_FRAME_MS = 110;
/** Intervalo minimo entre dois desenhos da faixa. */
const FRAME_MS = 33;

/** Indices no tileset (ver tools/make-sprites.mjs) e no spritesheet do Bit. */
const SPRITE_SURFACE = 1;
const SPRITE_DEEP = 4;
const SPRITE_STATION = 6;
const SPRITE_DOOR = 7;
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
 * Faixa de abertura do menu: a fase da era atual passando de lado, com o Bit
 * correndo, portoes, terminais com "!" e fragmentos pelo caminho. E a propria arte do jogo, viva,
 * em vez de uma fileira parada de tiles -- quem abre o jogo ja ve o que vai
 * fazer la dentro.
 *
 * Canvas 2D, como o mapa; a paisagem sai de uma conta sobre a coluna, sem
 * sorteio.
 */
export default function MenuBanner({ era }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    let frame = 0;

    Promise.all([loadImage(`/sprites/tiles-${era}.png`), loadImage('/sprites/bit.png')])
      .then(([tiles, bit]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!alive || !canvas || !ctx) return;
        const size = TILE_PX;

        let last = 0;
        const draw = (now: number): void => {
          // A faixa e enfeite: 30 quadros por segundo bastam e poupam bateria.
          if (now - last < FRAME_MS) {
            frame = requestAnimationFrame(draw);
            return;
          }
          last = now;
          const t = now / 1000;
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
            sprite(tiles, SPRITE_SURFACE, 0, x, (PATH_ROW + 1) * size);
            // De vez em quando, um portao de conceito ou um terminal no caminho.
            const roll = chance(column, 4);
            if (roll < 6) {
              sprite(tiles, SPRITE_DOOR, 0, x, PATH_ROW * size);
              sprite(tiles, SPRITE_DOOR, 0, x, (PATH_ROW - 1) * size);
            } else if (roll < 11) {
              sprite(tiles, SPRITE_STATION, 0, x, PATH_ROW * size);
              drawBang(ctx, x + 4.5, (PATH_ROW - 1) * size + 4 - Math.abs(Math.sin(t * 4)) * 2);
            }
            if (chance(column, 7) < 20) sprite(tiles, SPRITE_DEEP, 0, x, (PATH_ROW + 1) * size);
            // E fragmentos no ar, que somem quando o Bit passa por eles.
            if (chance(column, 5) < 16 && x > BIT_COL * size + 6) {
              const bob = Math.sin(t * 3 + column);
              drawFragment(ctx, x + 4.5, (PATH_ROW - 1) * size + 3 + bob * 1.2, (bob + 1) / 2);
            }
          }

          const step = Math.floor(now / RUN_FRAME_MS) % RUN_FRAMES;
          const hop = -Math.abs(Math.sin((now / (RUN_FRAME_MS * 2)) * Math.PI)) * 1.2;
          sprite(bit, step, BIT_ROW_RIGHT, BIT_COL * size, PATH_ROW * size + hop);

          frame = requestAnimationFrame(draw);
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
  }, [era]);

  return (
    <canvas
      ref={canvasRef}
      className="menu__banner"
      width={COLS * TILE_PX * RES}
      height={ROWS * TILE_PX * RES}
      aria-hidden="true"
    />
  );
}
