import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { RouteInstance, RouteSolution } from './logic';
import { destination, linkCost, neighbors, origin, pathCost } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import Gauge from '@/ui/Gauge';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<RouteInstance, RouteSolution>;

/* ----------------------------------------------------------- o mapa ---- */

const MAP_W = 320;
const MAP_H = 190;

/**
 * Onde cada maquina fica no desenho: origem a esquerda, destino a direita, e
 * as do meio em duas fileiras alternadas. Sai so do indice, entao a mesma rede
 * e sempre desenhada igual.
 */
function layout(nodes: number): { x: number; y: number }[] {
  const middle = Math.max(0, nodes - 2);
  const columns = Math.max(1, Math.ceil(middle / 2));
  const span = MAP_W - 56;
  return Array.from({ length: nodes }, (_, node) => {
    if (node === 0) return { x: 28, y: MAP_H / 2 };
    if (node === nodes - 1) return { x: MAP_W - 28, y: MAP_H / 2 };
    const k = node - 1;
    const column = Math.floor(k / 2);
    const top = k % 2 === 0;
    // Colunas vizinhas ficam em alturas diferentes, para os nomes nao baterem.
    const stagger = column % 2 === 0 ? 0 : 16;
    return {
      x: 28 + ((column + 1) * span) / (columns + 1),
      y: top ? 36 + stagger : MAP_H - 36 - stagger,
    };
  });
}

/** Nome curto, para caber embaixo da maquina no mapa. */
function shortName(name: string): string {
  return name.length > 9 ? `${name.slice(0, 8)}.` : name;
}

/**
 * A rede, desenhada. Mostra o mesmo que a lista de botoes -- e nada alem: so
 * aparecem as ligacoes ja percorridas e as que saem de onde o pacote esta. As
 * outras maquinas ficam como pontos apagados, porque um roteador so conhece os
 * vizinhos. E ilustracao: quem joga sao os botoes abaixo.
 */
function RouteMap({
  instance,
  path,
  options,
  nameOf,
}: {
  instance: RouteInstance;
  path: readonly number[];
  options: readonly number[];
  nameOf(node: number): string;
}) {
  const spots = layout(instance.nodes);
  const current = path[path.length - 1] as number;
  const target = destination(instance);
  const visited = new Set(path);
  const known = new Set<number>([...path, ...options, origin(), target]);
  const at = (node: number) => spots[node] as { x: number; y: number };

  return (
    <svg
      className="routeMap"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Vizinhos para onde da para mandar o pacote, com o atraso de cada um. */}
      {options.map((node) => {
        const a = at(current);
        const b = at(node);
        return (
          <g key={`o-${node}`}>
            <line className="routeMap__option" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text className="routeMap__cost" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4}>
              +{linkCost(instance, current, node)}
            </text>
          </g>
        );
      })}

      {/* O caminho que o pacote ja fez. */}
      {path.slice(1).map((node, index) => {
        const a = at(path[index] as number);
        const b = at(node);
        return (
          <line key={`p-${node}`} className="routeMap__done" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        );
      })}

      {spots.map((spot, node) => {
        const kind =
          node === current
            ? 'now'
            : node === target
              ? 'goal'
              : visited.has(node)
                ? 'visited'
                : options.includes(node)
                  ? 'option'
                  : 'unknown';
        const below = spot.y >= MAP_H / 2;
        return (
          <g key={node} className={`routeMap__node routeMap__node--${kind}`}>
            {node === current ? (
              <circle className="routeMap__pulse" cx={spot.x} cy={spot.y} r={13} />
            ) : null}
            <circle cx={spot.x} cy={spot.y} r={kind === 'unknown' ? 5 : 9} />
            {known.has(node) ? (
              <text className="routeMap__name" x={spot.x} y={below ? spot.y + 22 : spot.y - 14}>
                {shortName(nameOf(node))}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ a tela --- */

/**
 * Rota dos Pacotes. O pacote anda de vizinho em vizinho: a tela mostra apenas
 * as maquinas ligadas a onde ele esta, que e o que um roteador sabe.
 *
 * Um toque por salto, mais "voltar um salto". Nada de arrastar nem de mapa que
 * exija precisao de dedo.
 */
export default function RouteScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [path, setPath] = useState<number[]>([origin()]);
  const t = ui.route;

  const target = destination(instance);
  const nodeName = (node: number): string => {
    if (node === origin()) return t.originName;
    if (node === target) return t.destName;
    return t.nodeNames[node - 1] ?? `${t.node} ${node}`;
  };

  const current = path[path.length - 1] as number;
  const arrived = current === target;
  const used = path.length > 1 ? pathCost(instance, [...path]) : 0;
  /* Atraso acumulado: pathCost so vale para rota fechada, aqui a rota e parcial. */
  let spent = 0;
  for (let i = 0; i + 1 < path.length; i += 1) {
    spent += linkCost(instance, path[i] as number, path[i + 1] as number) ?? 0;
  }

  const options = neighbors(instance, current).filter((node) => !path.includes(node));
  const overBudget = spent > instance.maxCost;
  const solution: RouteSolution | null = arrived && Number.isFinite(used) ? path : null;

  return (
    <section className="route game-surface" aria-label={ui.minigames.redes}>
      <header className="route__head">
        <h2>{ui.minigames.redes}</h2>
        <p className="route__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <MinigameHelp era="redes" mode={mode} />

      <RouteMap
        instance={instance}
        path={path}
        options={arrived ? [] : options}
        nameOf={nodeName}
      />

      <div className="route__block">
        <h3>
          {t.delay}: {spent}/{instance.maxCost}
        </h3>
        <Gauge value={spent} max={instance.maxCost} />
        <ol className="route__path" aria-label={t.pathLabel}>
          {path.map((node, index) => (
            <li key={node} className={index === path.length - 1 ? 'route__hop--now' : 'route__hop'}>
              {nodeName(node)}
              {index + 1 < path.length ? (
                <span className="route__arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="route__block">
        <h3>{arrived ? t.arrivedTitle : `${t.from} ${nodeName(current)}`}</h3>
        {arrived ? (
          <p className="route__arrived">{t.arrived}</p>
        ) : (
          <ul className="route__options" aria-label={t.options}>
            {options.map((node) => {
              const cost = linkCost(instance, current, node) as number;
              return (
                <li key={node}>
                  <button
                    type="button"
                    className="route__option"
                    data-sfx="place"
                    onClick={() => setPath((p) => [...p, node])}
                    aria-label={`${t.sendTo} ${nodeName(node)}, ${t.delay} ${cost}`}
                  >
                    <span className="route__optionName">{nodeName(node)}</span>
                    <span className="route__optionCost">+{cost}</span>
                  </button>
                </li>
              );
            })}
            {options.length === 0 ? <li className="route__dead">{t.deadEnd}</li> : null}
          </ul>
        )}
      </div>

      <p
        className="route__status"
        role="status"
        data-state={overBudget ? 'warn' : arrived ? 'ok' : 'idle'}
      >
        {overBudget
          ? `${t.overBudget} (${spent}/${instance.maxCost})`
          : arrived
            ? t.allOk
            : t.keepGoing}
      </p>

      <div className="controls">
        <button
          type="button"
          disabled={path.length <= 1}
          data-sfx="erase"
          onClick={() => setPath((p) => p.slice(0, -1))}
        >
          {t.undo}
        </button>
        <button
          type="button"
          className="route__submit"
          data-ready={arrived && !overBudget}
          disabled={!solution}
          onClick={() => solution && onSubmit(solution)}
        >
          {ui.mission.submit}
          {arrived && !overBudget ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
