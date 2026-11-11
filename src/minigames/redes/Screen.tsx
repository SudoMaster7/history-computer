import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { RouteInstance, RouteSolution } from './logic';
import { destination, linkCost, neighbors, origin, pathCost } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<RouteInstance, RouteSolution>;

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

      <div className="route__block">
        <h3>
          {t.delay}: {spent}/{instance.maxCost}
        </h3>
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

      <p className="route__status" role="status">
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
          onClick={() => setPath((p) => p.slice(0, -1))}
        >
          {t.undo}
        </button>
        <button
          type="button"
          className="route__submit"
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
