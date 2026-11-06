import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Cell, Facing, Npc, Station, WorldDef } from '@/core/world';
import {
  atDoor,
  cellAtPoint,
  facingTo,
  findPath,
  isDoorOpen,
  missionsLeft,
  npcAt,
  sameCell,
  stationAt,
} from '@/core/world';
import { WORLD } from '@/core/constants';
import { hasMinigame } from '@/core/registry';
import { npcProfile } from '@/data/npcs';
import { IconMenu } from './icons';
import { useGameStore } from '@/store';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  world: WorldDef;
  onOpenStation(missionId: string): void;
  onOpenDoor(): void;
  onMenu(): void;
  /** Avisa o tutorial do que aconteceu na tela. */
  onEvent?(event: 'moved' | 'station' | 'npc' | 'door'): void;
}

/** Indices das celulas desenhadas no tileset (ver tools/make-sprites.mjs). */
const SPRITE_STATION = 6;
const SPRITE_DOOR = 7;

/** Linha do spritesheet do personagem por direcao. */
const FACING_ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`nao carregou ${src}`));
    image.src = src;
  });
}

interface Art {
  tiles: HTMLImageElement;
  bit: HTMLImageElement;
  npcs: Record<string, HTMLImageElement>;
}

/**
 * Mapa visto de cima, desenhado em canvas 2D com a pixel art do projeto.
 * Controle: toque no destino. O caminho vem de `findPath` (logica pura em
 * core/world.ts); aqui so mora o desenho e a animacao.
 */
export default function WorldScreen({ world, onOpenStation, onOpenDoor, onMenu, onEvent }: Props) {
  const player = useGameStore((s) => s.player);
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);
  const vibration = useGameStore((s) => s.settings.vibration);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [cell, setCell] = useState<Cell>(world.spawn);
  const [message, setMessage] = useState<string>(ui.world.help);
  const [speaking, setSpeaking] = useState<Npc | null>(null);
  const [line, setLine] = useState(0);

  /** Estado da animacao, fora do render: o loop le daqui, nunca do estado React. */
  const walk = useRef({
    from: world.spawn,
    to: world.spawn,
    startedAt: 0,
    facing: 'down' as Facing,
    queue: [] as Cell[],
    frame: 0,
  });
  const frameId = useRef<number | null>(null);

  const stars: Record<string, number> = useMemo(
    () => Object.fromEntries(Object.entries(player.missions).map(([id, m]) => [id, m.stars])),
    [player.missions],
  );
  const doorOpen = isDoorOpen(world, stars);

  // Carrega a arte da zona: um tileset por era e um sprite por personagem.
  useEffect(() => {
    let alive = true;
    setArt(null);
    const ids = world.npcs.map((npc) => npc.id);
    Promise.all([
      // Caminho absoluto: relativo quebraria numa rota aninhada, porque
      // resolveria a partir da URL atual em vez da raiz do site.
      loadImage(`/sprites/tiles-${world.era}.png`),
      loadImage('/sprites/bit.png'),
      ...ids.map((id) => loadImage(`/sprites/npc-${id}.png`)),
    ])
      .then(([tiles, bit, ...people]) => {
        if (!alive || !tiles || !bit) return;
        const npcs: Record<string, HTMLImageElement> = {};
        ids.forEach((id, i) => {
          const image = people[i];
          if (image) npcs[id] = image;
        });
        setArt({ tiles, bit, npcs });
      })
      .catch(() => {
        if (alive) setMessage(ui.app.renderFail);
      });
    return () => {
      alive = false;
    };
  }, [world]);

  // Troca de zona: devolve o Bit ao ponto de entrada.
  useEffect(() => {
    walk.current = {
      from: world.spawn,
      to: world.spawn,
      startedAt: 0,
      facing: 'down',
      queue: [],
      frame: 0,
    };
    setCell(world.spawn);
    setSpeaking(null);
    setLine(0);
    setMessage(ui.world.help);
  }, [world]);

  const arrive = useCallback(
    (at: Cell): void => {
      const station = stationAt(world, at);
      if (station) {
        setMessage(ui.world.station);
        onEvent?.('station');
        return;
      }
      const npc = npcAt(world, at);
      if (npc) {
        setSpeaking(npc);
        setLine(0);
        onEvent?.('npc');
        return;
      }
      if (atDoor(world, at)) {
        setMessage(doorOpen ? ui.world.doorOpen : ui.world.doorClosed);
        onEvent?.('door');
        return;
      }
      setMessage(ui.world.help);
    },
    [world, doorOpen, onEvent],
  );

  /* ------------------------------------------------------------ desenho -- */

  const draw = useCallback(
    (now: number): void => {
      const canvas = canvasRef.current;
      if (!canvas || !art) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = walk.current;
      // Interpola a posicao entre a celula de origem e a de destino.
      const duration = reduceMotion ? 0 : WORLD.WALK_MS_PER_TILE;
      const progress =
        duration <= 0 || state.startedAt === 0
          ? 1
          : Math.min(1, (now - state.startedAt) / duration);
      const x = (state.from.col + (state.to.col - state.from.col) * progress) * WORLD.TILE;
      const y = (state.from.row + (state.to.row - state.from.row) * progress) * WORLD.TILE;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Chao.
      for (let row = 0; row < world.rows; row += 1) {
        for (let col = 0; col < world.cols; col += 1) {
          const tile = world.tiles[row * world.cols + col] ?? 0;
          ctx.drawImage(
            art.tiles,
            tile * WORLD.TILE,
            0,
            WORLD.TILE,
            WORLD.TILE,
            col * WORLD.TILE,
            row * WORLD.TILE,
            WORLD.TILE,
            WORLD.TILE,
          );
        }
      }

      // Porta e terminais.
      const object = (sprite: number, at: Cell): void => {
        ctx.drawImage(
          art.tiles,
          sprite * WORLD.TILE,
          0,
          WORLD.TILE,
          WORLD.TILE,
          at.col * WORLD.TILE,
          at.row * WORLD.TILE,
          WORLD.TILE,
          WORLD.TILE,
        );
      };
      object(SPRITE_DOOR, world.door);
      for (const station of world.stations) {
        object(SPRITE_STATION, station);
        // Missao feita: marca verde em cima do terminal.
        if ((stars[station.missionId] ?? 0) >= 1) {
          ctx.fillStyle = '#6ad08a';
          ctx.fillRect(station.col * WORLD.TILE + 11, station.row * WORLD.TILE + 1, 4, 4);
        }
      }

      // Personagens do mapa, cada um com o proprio sprite.
      for (const npc of world.npcs) {
        const image = art.npcs[npc.id];
        if (!image) continue;
        ctx.drawImage(
          image,
          WORLD.TILE,
          0,
          WORLD.TILE,
          WORLD.TILE,
          npc.col * WORLD.TILE,
          npc.row * WORLD.TILE,
          WORLD.TILE,
          WORLD.TILE,
        );
      }

      // O Bit. Parado usa o quadro do meio.
      const moving = progress < 1 || state.queue.length > 0;
      const frame = moving ? state.frame % WORLD.WALK_FRAMES : 1;
      ctx.drawImage(
        art.bit,
        frame * WORLD.TILE,
        FACING_ROW[state.facing] * WORLD.TILE,
        WORLD.TILE,
        WORLD.TILE,
        x,
        y,
        WORLD.TILE,
        WORLD.TILE,
      );
    },
    [art, reduceMotion, stars, world],
  );

  /* ---------------------------------------------------------- animacao --- */

  const stop = useCallback((): void => {
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  const run = useCallback(
    (path: Cell[]): void => {
      stop();
      const state = walk.current;
      state.queue = path;
      state.startedAt = 0;

      if (reduceMotion) {
        const last = path.at(-1);
        if (last) {
          state.facing = facingTo(state.from, last);
          state.from = last;
          state.to = last;
          state.queue = [];
          setCell(last);
          arrive(last);
        }
        draw(0);
        return;
      }

      let lastFrameAt = 0;
      const step = (now: number): void => {
        const current = walk.current;
        if (current.startedAt === 0) {
          const next = current.queue[0];
          if (!next) {
            frameId.current = null;
            draw(now);
            return;
          }
          current.from = current.to;
          current.to = next;
          current.facing = facingTo(current.from, next);
          current.startedAt = now;
          lastFrameAt = now;
        }

        if (now - lastFrameAt >= WORLD.FRAME_MS) {
          current.frame = (current.frame + 1) % WORLD.WALK_FRAMES;
          lastFrameAt = now;
        }

        draw(now);

        if (now - current.startedAt >= WORLD.WALK_MS_PER_TILE) {
          current.from = current.to;
          current.queue = current.queue.slice(1);
          current.startedAt = 0;
          setCell(current.to);
          if (current.queue.length === 0) {
            current.frame = 1;
            frameId.current = null;
            draw(now);
            arrive(current.to);
            return;
          }
        }
        frameId.current = requestAnimationFrame(step);
      };
      frameId.current = requestAnimationFrame(step);
    },
    [arrive, draw, reduceMotion, stop],
  );

  // Primeiro desenho e redesenho quando a arte ou o progresso mudam.
  useEffect(() => {
    if (art) draw(performance.now());
  }, [art, draw]);

  /* --------------------------------------------------------------- fala -- */

  const profile = speaking ? npcProfile(speaking.id) : undefined;

  const nextLine = useCallback((): void => {
    if (!profile) {
      setSpeaking(null);
      return;
    }
    setLine((current) => {
      if (current + 1 >= profile.lines.length) {
        setSpeaking(null);
        return 0;
      }
      return current + 1;
    });
  }, [profile]);

  /* -------------------------------------------------------------- toque -- */

  function handleTap(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (speaking) {
      nextLine();
      return;
    }
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    /*
     * O canvas tem tamanho fixo em pixels do mapa e e ampliado por CSS com
     * `object-fit: contain`, o que deixa barra lateral quando a proporcao da
     * caixa nao bate com a do mapa. Sem descontar a barra, todo toque sai
     * deslocado, e cada vez mais longe conforme a tela muda de formato.
     */
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const insetX = (rect.width - canvas.width * scale) / 2;
    // Vertical zero: o CSS ancora o mapa no topo (`object-position: top center`).
    const x = (event.clientX - rect.left - insetX) / scale;
    const y = (event.clientY - rect.top) / scale;

    const target = cellAtPoint(world, x, y);
    const current = walk.current.queue.length > 0 ? walk.current.to : cell;
    if (!target || sameCell(target, current)) return;

    const path = findPath(world, current, target);
    if (!path || path.length === 0) {
      setMessage(ui.world.unreachable);
      return;
    }
    if (vibration) navigator.vibrate?.(8);
    setMessage(ui.world.moving);
    onEvent?.('moved');
    run(path);
  }

  /* ------------------------------------------------------------- render -- */

  const station: Station | undefined = stationAt(world, cell);
  const npc = npcAt(world, cell);
  const onDoor = atDoor(world, cell);
  const stationDone = station ? (stars[station.missionId] ?? 0) >= 1 : false;
  const left = missionsLeft(world, stars);

  return (
    <section className="world" aria-label={`${ui.world.title}: ${ui.eras[world.era]}`}>
      <div className="world__frame">
        {art ? null : <p className="world__loading">{ui.world.loading}</p>}

        <button type="button" className="mapButton" aria-label={ui.app.menu} onClick={onMenu}>
          <IconMenu size={20} />
        </button>
        <canvas
          ref={canvasRef}
          className="world__canvas"
          width={world.cols * WORLD.TILE}
          height={world.rows * WORLD.TILE}
          onPointerDown={handleTap}
          /* Onde o Bit esta, para o teste de ponta a ponta conferir o andar. */
          data-cell={`${cell.col},${cell.row}`}
          role="application"
          aria-label={ui.world.tapHelp}
        />
        {profile ? (
          <div className="dialogue" role="status">
            <strong className="dialogue__name">{profile.name}</strong>
            <span className="dialogue__role">{profile.role}</span>
            <p className="dialogue__text">{profile.lines[line]}</p>
            <div className="dialogue__foot">
              <span className="dialogue__count">
                {line + 1}/{profile.lines.length}
              </span>
              <button type="button" onClick={nextLine}>
                {line + 1 >= profile.lines.length ? ui.menu.close : ui.tutorial.next}
              </button>
            </div>
          </div>
        ) : null}

        {profile ? null : (
          <div className="console">
            <p className="console__message" role="status">
              {stationDone && station ? ui.world.stationDone : message}
            </p>

            {station || npc || onDoor ? (
              <div className="console__actions">
                {station ? (
                  hasMinigame(world.era) ? (
                    <button
                      type="button"
                      className="action action--primary"
                      onClick={() => onOpenStation(station.missionId)}
                    >
                      {ui.world.enterStation}
                    </button>
                  ) : (
                    <button type="button" className="action" disabled>
                      {ui.world.stationSoon}
                    </button>
                  )
                ) : null}

                {npc && !speaking ? (
                  <button
                    type="button"
                    className="action action--primary"
                    onClick={() => {
                      setSpeaking(npc);
                      setLine(0);
                    }}
                  >
                    {ui.world.talk}
                  </button>
                ) : null}

                {onDoor ? (
                  <button
                    type="button"
                    className={doorOpen ? 'action action--primary' : 'action'}
                    disabled={!doorOpen}
                    onClick={onOpenDoor}
                  >
                    {doorOpen ? ui.world.enterDoor : `${ui.world.missionsLeft}: ${left.length}`}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
