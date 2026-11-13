import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Cell, Facing, Fragment, Npc, Station, WorldDef } from '@/core/world';
import {
  TILE,
  approachPath,
  atDoor,
  cellAtPoint,
  facingTo,
  fragmentsOf,
  isDoorOpen,
  missionsLeft,
  npcAt,
  sameCell,
  stationAt,
} from '@/core/world';
import { RPG, WORLD } from '@/core/constants';
import { hasMinigame } from '@/core/registry';
import { npcProfile } from '@/data/npcs';
import { fragmentFact } from '@/data/fragments';
import { play } from '@/fx';
import { IconFragment, IconMenu } from './icons';
import ZoneTracker from './ZoneTracker';
import type { Particle } from './worldArt';
import {
  buildGround,
  drawAmbient,
  drawArrow,
  drawBang,
  drawFragment,
  drawLock,
  drawParticles,
  drawShimmer,
  drawStarPips,
  drawTalk,
  drawTarget,
  dustAt,
  sparkleAt,
} from './worldArt';
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

/**
 * Pixels de tela por pixel do mapa, dentro do canvas. A pixel art continua em
 * 16 px por tile; o canvas so tem mais resolucao por baixo, para o Bit andar
 * liso (um terco de pixel por vez) e os marcadores nao ficarem serrilhados.
 */
const RES = WORLD.SCALE;

/** Intervalo entre desenhos com o Bit parado: uns 12 quadros por segundo. */
const IDLE_FRAME_MS = 80;

/** Quanto dura a fala sendo "digitada", por letra, em milissegundos. */
const TYPE_MS = 16;

/** Sobra minima abaixo do mapa (em px de tela) para o painel de objetivos abrir inteiro. */
const ROOMY_PX = 200;

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

interface Walk {
  from: Cell;
  to: Cell;
  startedAt: number;
  lastFrameAt: number;
  facing: Facing;
  queue: Cell[];
  frame: number;
}

function freshWalk(at: Cell): Walk {
  return { from: at, to: at, startedAt: 0, lastFrameAt: 0, facing: 'down', queue: [], frame: 1 };
}

/**
 * Mapa visto de cima, desenhado em canvas 2D com a pixel art do projeto.
 * Controle: toque no destino. O caminho vem de `approachPath` (logica pura em
 * core/world.ts); aqui so mora o desenho e a animacao.
 *
 * O mapa tem um laco de animacao proprio: agua que brilha, personagens que
 * respiram, marcadores que quicam, poeira no passo. Nada disso e regra -- com
 * "Reduzir animacoes" ligado o laco nao roda e o mapa e desenhado parado, com
 * os mesmos marcadores no mesmo lugar.
 */
export default function WorldScreen({ world, onOpenStation, onOpenDoor, onMenu, onEvent }: Props) {
  const player = useGameStore((s) => s.player);
  const collected = useGameStore((s) => s.fragments);
  const collectFragment = useGameStore((s) => s.collectFragment);
  const clearedEras = useGameStore((s) => s.clearedEras);
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);
  const vibration = useGameStore((s) => s.settings.vibration);
  const devMode = useGameStore((s) => s.settings.devMode);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [cell, setCell] = useState<Cell>(world.spawn);
  const [message, setMessage] = useState<string>(ui.world.help);
  const [speaking, setSpeaking] = useState<Npc | null>(null);
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(0);
  /** Personagens com quem ja se conversou nesta visita: perdem o balao de fala. */
  const [talked, setTalked] = useState<readonly string[]>([]);
  /** Fragmento que acabou de ser recolhido, para mostrar a curiosidade dele. */
  const [found, setFound] = useState<Fragment | null>(null);
  /** Sobra de tela abaixo do mapa, em px. Decide o tamanho do painel de objetivos. */
  const [room, setRoom] = useState(0);

  /** Estado da animacao, fora do render: o laco le daqui, nunca do estado React. */
  const walk = useRef<Walk>(freshWalk(world.spawn));
  const particles = useRef<Particle[]>([]);
  /** Celula de destino do ultimo toque, e quando ele aconteceu. */
  const target = useRef<{ cell: Cell; at: number } | null>(null);

  const stars: Record<string, number> = useMemo(
    () => Object.fromEntries(Object.entries(player.missions).map(([id, m]) => [id, m.stars])),
    [player.missions],
  );
  /* No modo desenvolvedor a porta nao cobra as missoes: da para ir direto a prova. */
  const doorOpen = devMode || isDoorOpen(world, stars);

  /* Os lugares saem da planta da zona (funcao pura); calcular uma vez por zona basta. */
  const fragments = useMemo(() => fragmentsOf(world), [world]);
  const pending = useMemo(
    // `?? []`: save antigo foi gravado antes de existir a lista de fragmentos.
    () => fragments.filter((fragment) => !(collected ?? []).includes(fragment.id)),
    [fragments, collected],
  );

  /* O chao e desenhado uma vez por zona; o laco so copia esta camada (ver worldArt). */
  const groundLayer = useMemo(
    () =>
      art
        ? buildGround(
            world,
            art.tiles,
            WORLD.TILE,
            {
              grass: TILE.GRASS,
              path: TILE.PATH,
              water: TILE.WATER,
              tree: TILE.TREE,
              wall: TILE.WALL,
            },
            world.era,
          )
        : null,
    [art, world],
  );
  const waterCells = useMemo(() => {
    const cells: Cell[] = [];
    world.tiles.forEach((tile, index) => {
      if (tile === TILE.WATER) {
        cells.push({ col: index % world.cols, row: Math.floor(index / world.cols) });
      }
    });
    return cells;
  }, [world]);

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
    walk.current = freshWalk(world.spawn);
    particles.current = [];
    target.current = null;
    setCell(world.spawn);
    setSpeaking(null);
    setLine(0);
    setTalked([]);
    setFound(null);
    setMessage(ui.world.help);
  }, [world]);

  // Mede a sobra abaixo do mapa. O mapa tem proporcao propria, entao em tela
  // alta sobra faixa -- e e nela que o painel de objetivos mora.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = (): void => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      const mapHeight = Math.min(height, (width * world.rows) / world.cols);
      frame.style.setProperty('--map-h', `${Math.round(mapHeight)}px`);
      setRoom(Math.round(height - mapHeight));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [world]);

  const startTalk = useCallback((npc: Npc): void => {
    setSpeaking(npc);
    setLine(0);
    setTyped(0);
    setFound(null);
    setTalked((current) => (current.includes(npc.id) ? current : [...current, npc.id]));
  }, []);

  const arrive = useCallback(
    (at: Cell): void => {
      const station = stationAt(world, at);
      if (station) {
        walk.current.facing = facingTo(at, station);
        setMessage(ui.world.station);
        onEvent?.('station');
        return;
      }
      const npc = npcAt(world, at);
      if (npc) {
        // Vira o Bit para quem ele veio falar.
        walk.current.facing = facingTo(at, npc);
        startTalk(npc);
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
    [world, doorOpen, onEvent, startTalk],
  );

  /** O Bit pisou numa celula: recolhe o fragmento que estiver nela. */
  const stepOn = useCallback(
    (at: Cell, now: number): void => {
      const fragment = pending.find((item) => sameCell(item, at));
      if (!fragment || !collectFragment(fragment.id)) return;
      particles.current.push(...sparkleAt(at.col * WORLD.TILE, at.row * WORLD.TILE, now));
      play('fragment');
      if (vibration) navigator.vibrate?.([12, 40, 12]);
      setFound(fragment);
    },
    [pending, collectFragment, vibration],
  );

  /*
   * O laco de animacao vive mais que uma renderizacao: ele chama estas funcoes
   * por referencia, para sempre pegar a versao atual sem precisar recomecar.
   */
  const arriveRef = useRef(arrive);
  const stepOnRef = useRef(stepOn);
  useEffect(() => {
    arriveRef.current = arrive;
    stepOnRef.current = stepOn;
  }, [arrive, stepOn]);

  /* ------------------------------------------------------------ desenho -- */

  const draw = useCallback(
    (now: number): void => {
      const canvas = canvasRef.current;
      if (!canvas || !art) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = WORLD.TILE;
      const state = walk.current;
      /** Parado (ajuste do jogador): tempo zero, nada se mexe. */
      const still = reduceMotion;
      const t = still ? 0 : now / 1000;

      // Interpola a posicao entre a celula de origem e a de destino.
      const progress =
        still || state.startedAt === 0
          ? 1
          : Math.min(1, (now - state.startedAt) / WORLD.WALK_MS_PER_TILE);
      const bitX = (state.from.col + (state.to.col - state.from.col) * progress) * size;
      const bitY = (state.from.row + (state.to.row - state.from.row) * progress) * size;
      const moving = !still && (progress < 1 || state.queue.length > 0);

      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, world.cols * size, world.rows * size);

      const sprite = (image: HTMLImageElement, sx: number, sy: number, x: number, y: number) =>
        ctx.drawImage(image, sx * size, sy * size, size, size, x, y, size, size);

      // Chao: a camada pronta, e por cima dela so o brilho da agua.
      if (groundLayer) ctx.drawImage(groundLayer, 0, 0);
      if (!still) {
        for (const spot of waterCells) {
          drawShimmer(ctx, spot.col * size, spot.row * size, t, spot.col + spot.row * 3);
        }
      }

      // Porta: aberta, ela pulsa e ganha a seta; trancada, o cadeado.
      sprite(art.tiles, SPRITE_DOOR, 0, world.door.col * size, world.door.row * size);
      const doorX = world.door.col * size;
      const doorY = world.door.row * size;
      if (doorOpen) {
        ctx.fillStyle = `rgba(255, 224, 130, ${0.16 + 0.14 * Math.sin(t * 4)})`;
        ctx.fillRect(doorX, doorY, size, size);
        drawArrow(ctx, doorX + 4.5, doorY - 7 + Math.sin(t * 5) * 1.5);
      } else {
        drawLock(ctx, doorX + 5.5, doorY - 8);
      }

      // Terminais: "!" quicando enquanto a missao esta por fazer, estrelas depois.
      for (const station of world.stations) {
        const x = station.col * size;
        const y = station.row * size;
        sprite(art.tiles, SPRITE_STATION, 0, x, y);
        const earned = stars[station.missionId] ?? 0;
        if (earned >= 1) drawStarPips(ctx, x + 2.5, y - 4, earned);
        else drawBang(ctx, x + 4.5, y - 10 + Math.abs(Math.sin(t * 4)) * -2);
      }

      // Fragmentos de memoria ainda por recolher.
      pending.forEach((fragment) => {
        const bob = Math.sin(t * 3 + fragment.index * 1.7);
        drawFragment(
          ctx,
          fragment.col * size + 4.5,
          fragment.row * size + 3 + bob * 1.2,
          (bob + 1) / 2,
        );
      });

      // Personagens do mapa: respiram, e olham para o Bit quando ele chega perto.
      const bitCell = state.queue.length > 0 || progress < 1 ? null : state.to;
      world.npcs.forEach((npc, index) => {
        const image = art.npcs[npc.id];
        if (!image) return;
        const near =
          bitCell !== null &&
          Math.abs(bitCell.col - npc.col) + Math.abs(bitCell.row - npc.row) === 1;
        const facing: Facing = near && bitCell ? facingTo(npc, bitCell) : 'down';
        const breath = Math.sin(t * 2.2 + index * 1.9) * 0.5;
        sprite(image, 1, FACING_ROW[facing], npc.col * size, npc.row * size + breath);
        if (!talked.includes(npc.id)) {
          drawTalk(ctx, npc.col * size + 3.5, npc.row * size - 8 + breath, Math.floor(t * 3) % 3);
        }
      });

      // Destino do toque: cantoneiras pulsando ate o Bit chegar.
      const goal = target.current;
      if (goal && moving) {
        drawTarget(
          ctx,
          goal.cell.col * size,
          goal.cell.row * size,
          size,
          (Math.sin(t * 8) + 1) / 2,
        );
      }

      // O Bit. Parado usa o quadro do meio e respira; andando, da um pulinho por passo.
      const frame = moving ? state.frame % WORLD.WALK_FRAMES : 1;
      const hop = moving ? -Math.abs(Math.sin(progress * Math.PI)) * 1.2 : Math.sin(t * 2.6) * 0.4;
      sprite(art.bit, frame, FACING_ROW[state.facing], bitX, bitY + hop);

      if (!still) {
        particles.current = drawParticles(ctx, particles.current, now);
        drawAmbient(ctx, world.era, world.cols * size, world.rows * size, t);
      }
    },
    [art, reduceMotion, stars, world, doorOpen, pending, talked, groundLayer, waterCells],
  );

  /* ---------------------------------------------------------- animacao --- */

  /** Avanca a caminhada um quadro. So mexe no estado da animacao (`walk`). */
  const advance = useCallback((now: number): void => {
    const state = walk.current;
    if (state.startedAt === 0) {
      const next = state.queue[0];
      if (!next) return;
      state.from = state.to;
      state.to = next;
      state.facing = facingTo(state.from, next);
      state.startedAt = now;
      state.lastFrameAt = now;
    }

    if (now - state.lastFrameAt >= WORLD.FRAME_MS) {
      state.frame = (state.frame + 1) % WORLD.WALK_FRAMES;
      state.lastFrameAt = now;
    }

    if (now - state.startedAt < WORLD.WALK_MS_PER_TILE) return;

    // Chegou na celula seguinte.
    state.from = state.to;
    state.queue = state.queue.slice(1);
    state.startedAt = 0;
    particles.current.push(...dustAt(state.to.col * WORLD.TILE, state.to.row * WORLD.TILE, now));
    play('step');
    setCell(state.to);
    stepOnRef.current(state.to, now);
    if (state.queue.length === 0) {
      state.frame = 1;
      target.current = null;
      arriveRef.current(state.to);
    }
  }, []);

  // O laco: anda, desenha, repete. Com "Reduzir animacoes" ele nem comeca --
  // o mapa e desenhado uma vez, e de novo sempre que algo mudar.
  useEffect(() => {
    if (!art) return;
    if (reduceMotion) {
      draw(0);
      return;
    }
    let last = 0;
    let id = requestAnimationFrame(function loop(now: number) {
      advance(now);
      /*
       * Com o Bit parado e sem particula no ar, so o ambiente se mexe (agua,
       * respiracao, marcadores), e isso nao precisa de 60 quadros por segundo.
       * Desenhar menos poupa bateria no celular, que e onde o jogo roda.
       */
      const state = walk.current;
      const busy = state.startedAt !== 0 || state.queue.length > 0 || particles.current.length > 0;
      if (busy || now - last >= IDLE_FRAME_MS) {
        draw(now);
        last = now;
      }
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [art, draw, advance, reduceMotion]);

  const run = useCallback(
    (path: Cell[]): void => {
      const state = walk.current;

      if (reduceMotion) {
        // Sem animacao: o Bit aparece no destino, e recolhe o que havia no caminho.
        const last = path.at(-1);
        if (!last) return;
        state.facing = facingTo(state.to, last);
        for (const step of path) stepOnRef.current(step, 0);
        state.from = last;
        state.to = last;
        state.queue = [];
        state.startedAt = 0;
        setCell(last);
        arrive(last);
        return;
      }

      // No meio de um passo, o passo termina antes de a rota nova comecar:
      // trocar a fila na hora faria o Bit saltar de uma celula para outra.
      state.queue = state.startedAt !== 0 ? [state.to, ...path] : path;
    },
    [arrive, reduceMotion],
  );

  /* --------------------------------------------------------------- fala -- */

  const profile = speaking ? npcProfile(speaking.id) : undefined;
  const fullLine = profile?.lines[line] ?? '';

  // A fala aparece letra por letra. E so apresentacao: o texto inteiro ja esta
  // na pagina para leitor de tela, e "Entendi" avanca a qualquer momento.
  useEffect(() => {
    if (!speaking) return;
    if (reduceMotion) {
      setTyped(fullLine.length);
      return;
    }
    setTyped(0);
    let shown = 0;
    const id = setInterval(() => {
      shown += 2;
      if (shown % 6 === 0) play('talk');
      setTyped(shown);
      if (shown >= fullLine.length) clearInterval(id);
    }, TYPE_MS * 2);
    return () => clearInterval(id);
  }, [speaking, fullLine, reduceMotion]);

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
    setFound(null);
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    /*
     * O canvas tem tamanho fixo em pixels e e ampliado por CSS com
     * `object-fit: contain`, o que deixa barra lateral quando a proporcao da
     * caixa nao bate com a do mapa. Sem descontar a barra, todo toque sai
     * deslocado, e cada vez mais longe conforme a tela muda de formato.
     */
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const insetX = (rect.width - canvas.width * scale) / 2;
    // Vertical zero: o CSS ancora o mapa no topo (`object-position: top center`).
    // Divide por RES porque o canvas tem RES pixels por pixel do mapa.
    const x = (event.clientX - rect.left - insetX) / scale / RES;
    const y = (event.clientY - rect.top) / scale / RES;

    const goal = cellAtPoint(world, x, y);
    const current = walk.current.queue.length > 0 ? walk.current.to : cell;
    if (!goal || sameCell(goal, current)) return;

    // Terminal, personagem e porta nao se atravessam: o Bit para ao lado.
    const path = approachPath(world, current, goal);
    if (!path) {
      setMessage(ui.world.unreachable);
      play('erase');
      return;
    }
    if (path.length === 0) {
      // Ja esta ao lado do que foi tocado: vira para ele e interage.
      if (walk.current.queue.length === 0) {
        walk.current.facing = facingTo(current, goal);
        arrive(current);
      }
      return;
    }
    if (vibration) navigator.vibrate?.(8);
    play('tap');
    target.current = { cell: goal, at: performance.now() };
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
  const roomy = room >= ROOMY_PX;

  return (
    <section
      className={`world world--${world.era}`}
      aria-label={`${ui.world.title}: ${ui.eras[world.era]}`}
    >
      <div ref={frameRef} className={roomy ? 'world__frame world__frame--roomy' : 'world__frame'}>
        {art ? null : <p className="world__loading">{ui.world.loading}</p>}

        <button type="button" className="mapButton" aria-label={ui.app.menu} onClick={onMenu}>
          <IconMenu size={20} />
        </button>
        <canvas
          ref={canvasRef}
          className="world__canvas"
          width={world.cols * WORLD.TILE * RES}
          height={world.rows * WORLD.TILE * RES}
          onPointerDown={handleTap}
          /* Onde o Bit esta, para o teste de ponta a ponta conferir o andar. */
          data-cell={`${cell.col},${cell.row}`}
          /* Colunas do mapa: o teste tira dai quantos pixels do canvas vale um tile. */
          data-cols={world.cols}
          role="application"
          aria-label={ui.world.tapHelp}
        />

        {/* Cartao de chegada: nome e epoca da zona, some sozinho. */}
        <div key={world.id} className="zoneCard" aria-hidden="true">
          <span className="zoneCard__years">{ui.eraSubtitles[world.era]}</span>
          <strong className="zoneCard__name">{ui.eras[world.era]}</strong>
        </div>

        {found && !speaking ? (
          <div className="fragmentToast" role="status">
            <span className="fragmentToast__icon" aria-hidden="true">
              <IconFragment size={20} />
            </span>
            <div className="fragmentToast__body">
              <strong className="fragmentToast__title">
                {ui.world.fragmentFound}
                <span className="fragmentToast__xp">
                  +{RPG.FRAGMENT_XP} {ui.world.fragmentXp}
                </span>
              </strong>
              <p className="fragmentToast__text">{fragmentFact(world.era, found.index)}</p>
            </div>
          </div>
        ) : null}

        {profile && speaking ? (
          <div className="dialogue" role="status">
            <div className="dialogue__head">
              <span
                className="dialogue__portrait"
                style={{ backgroundImage: `url('/sprites/npc-${speaking.id}.png')` }}
                aria-hidden="true"
              />
              <div className="dialogue__who">
                <strong className="dialogue__name">{profile.name}</strong>
                <span className="dialogue__role">{profile.role}</span>
              </div>
            </div>
            <p className="dialogue__text" aria-label={fullLine}>
              <span aria-hidden="true">{fullLine.slice(0, typed)}</span>
              {/* O resto fica invisivel, guardando o lugar: a caixa nao muda de altura. */}
              <span className="dialogue__rest" aria-hidden="true">
                {fullLine.slice(typed)}
              </span>
            </p>
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
          <div className="world__below">
            <ZoneTracker
              world={world}
              stars={stars}
              fragmentsFound={fragments.length - pending.length}
              fragmentsTotal={fragments.length}
              doorOpen={doorOpen}
              cleared={clearedEras.includes(world.era)}
              full={roomy}
            />

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
                      onClick={() => startTalk(npc)}
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
          </div>
        )}
      </div>
    </section>
  );
}
