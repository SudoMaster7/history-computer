import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { useRounds } from '../shared/useRounds';
import type { RouteInstance, RouteMap, RouteNode, RouteSolution } from './logic';
import { bestCost, neighborsOf, pathCost } from './logic';

/* Medidas do mapa, em unidades do viewBox. So aparencia. */
const WIDTH = 300;
const SIDE = 34;
const ROW_GAP = 66;
const TOP = 30;
const NODE_R = 13;

function pos(node: RouteNode): { x: number; y: number } {
  return { x: SIDE + node.x * (WIDTH - SIDE * 2), y: TOP + node.row * ROW_GAP };
}

/**
 * Rota dos Pacotes: o mapa inteiro fica a vista, e o jogador manda o pacote
 * para uma vizinha de cada vez. O mapa e desenho; quem recebe o toque sao os
 * botoes das vizinhas, que tem o tamanho de alvo exigido.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<RouteInstance, RouteSolution>) {
  const t = ui.route;
  // O registro guarda os saltos; o caminho enviado comeca na origem.
  const rounds = useRounds<number>(instance.rounds.length, (log) =>
    onSubmit(log.map((hops, i) => [(instance.rounds[i] as RouteMap).origin, ...hops])),
  );

  const map = instance.rounds[rounds.round] as RouteMap;
  const path = [map.origin, ...rounds.entries];
  const here = path[path.length - 1] as number;
  const spent = pathCost(map, path) ?? 0;
  const best = bestCost(map);
  const options = neighborsOf(map, here).sort((a, b) => a.id - b.id);

  function nameOf(id: number): string {
    if (id === map.origin) return t.originName;
    if (id === map.dest) return t.destName;
    return t.nodeNames[(id - 1) % t.nodeNames.length] as string;
  }

  function send(id: number): void {
    if (rounds.done) return;
    const arrived = id === map.dest;
    play(arrived ? 'ok' : 'step');
    rounds.record(id, arrived);
  }

  const walked = (a: number, b: number): boolean =>
    path.some(
      (id, i) => i > 0 && ((path[i - 1] === a && id === b) || (path[i - 1] === b && id === a)),
    );

  const status = !rounds.done
    ? { text: t.prompt, state: 'idle' as const }
    : spent <= best
      ? { text: `${t.arrivedBest} ${spent}.`, state: 'ok' as const }
      : { text: `${t.arrived} ${spent}. ${t.best} ${best}.`, state: 'warn' as const };

  const height = TOP * 2 + (map.rows - 1) * ROW_GAP;

  return (
    <Frame
      era="redes"
      className="route"
      mode={mode}
      help={mode === 'micro' ? t.microHelp : t.help}
      round={rounds.round}
      total={rounds.total}
      done={rounds.done}
      status={status}
      onNext={rounds.next}
      onExit={onExit}
    >
      <div className="mg__block">
        <h3>
          {t.total}: {spent}
        </h3>
        <svg className="routeMap" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={t.map}>
          {map.links.map((link) => {
            const a = pos(map.nodes[link.a] as RouteNode);
            const b = pos(map.nodes[link.b] as RouteNode);
            const open = !rounds.done && (link.a === here || link.b === here);
            const state = walked(link.a, link.b) ? 'done' : open ? 'option' : 'idle';
            return (
              <g key={`${link.a}-${link.b}`}>
                <line
                  className="routeMap__link"
                  data-state={state}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
                <text className="routeMap__cost" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4}>
                  {link.cost}
                </text>
              </g>
            );
          })}
          {map.nodes.map((node) => {
            const { x, y } = pos(node);
            const state =
              node.id === here
                ? 'now'
                : node.id === map.dest
                  ? 'goal'
                  : path.includes(node.id)
                    ? 'visited'
                    : 'idle';
            return (
              <g key={node.id} className="routeMap__node" data-state={state}>
                <circle cx={x} cy={y} r={NODE_R} />
                <text className="routeMap__name" x={x} y={y + NODE_R + 11}>
                  {nameOf(node.id)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ol className="route__path" aria-label={t.pathLabel}>
        {path.map((id, i) => (
          <li
            key={i}
            className={i === path.length - 1 ? 'route__hop route__hop--now' : 'route__hop'}
          >
            {nameOf(id)}
          </li>
        ))}
      </ol>

      {rounds.done ? null : (
        <ul className="route__options" aria-label={t.options}>
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="route__option"
                aria-label={`${t.sendTo} ${nameOf(option.id)}, ${t.delayShort} ${option.cost}`}
                onClick={() => send(option.id)}
              >
                <span className="route__optionName">{nameOf(option.id)}</span>
                <span className="route__optionCost">
                  {t.delayShort} {option.cost}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
