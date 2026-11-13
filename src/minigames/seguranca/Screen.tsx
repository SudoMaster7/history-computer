import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { VaultInstance, VaultSolution } from './logic';
import { entry, openPath, reachable, vault, vaultExposed } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import Gauge from '@/ui/Gauge';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<VaultInstance, VaultSolution>;

/* ----------------------------------------------------------- o mapa ---- */

const MAP_W = 320;
const MAP_H = 140;

/**
 * Onde cada maquina fica no desenho. A rede e em camadas (toda ligacao aponta
 * para a camada seguinte), entao a coluna de cada maquina e a distancia dela
 * ate a entrada. E so desenho: a regra de quem alcanca quem fica em `logic`.
 */
function layout(instance: VaultInstance): { x: number; y: number }[] {
  const depth: number[] = new Array(instance.nodes).fill(-1);
  depth[entry()] = 0;
  const queue = [entry()];
  while (queue.length > 0) {
    const node = queue.shift() as number;
    for (const link of instance.links) {
      if (link.from !== node || (depth[link.to] as number) >= 0) continue;
      depth[link.to] = (depth[node] as number) + 1;
      queue.push(link.to);
    }
  }
  const last = Math.max(1, ...depth);
  const columns = new Map<number, number[]>();
  depth.forEach((d, node) => {
    const column = d < 0 ? last : d;
    columns.set(column, [...(columns.get(column) ?? []), node]);
  });

  const spots: { x: number; y: number }[] = new Array(instance.nodes);
  for (const [column, nodes] of columns) {
    nodes.forEach((node, index) => {
      spots[node] = {
        x: 30 + (column * (MAP_W - 60)) / last,
        y: ((index + 1) * MAP_H) / (nodes.length + 1),
      };
    });
  }
  return spots;
}

/**
 * A rede, desenhada: a entrada do invasor a esquerda, o cofre a direita. As
 * ligacoes por onde o invasor ainda passa aparecem em vermelho correndo; as
 * bloqueadas, cortadas por um firewall. E o mesmo estado dos botoes abaixo,
 * que continuam sendo o controle.
 */
function VaultMap({
  instance,
  firewalls,
}: {
  instance: VaultInstance;
  firewalls: readonly number[];
}) {
  const spots = layout(instance);
  const reached = reachable(instance, firewalls);
  const target = vault(instance);
  const sealed = !reached.has(target);

  return (
    <svg
      className="vaultMap"
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      aria-hidden="true"
      focusable="false"
    >
      {instance.links.map((link, index) => {
        const a = spots[link.from] as { x: number; y: number };
        const b = spots[link.to] as { x: number; y: number };
        const cut = firewalls.includes(index);
        const hot = !cut && reached.has(link.from);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={index}>
            <line
              className={
                cut
                  ? 'vaultMap__link vaultMap__link--cut'
                  : hot
                    ? 'vaultMap__link vaultMap__link--hot'
                    : 'vaultMap__link'
              }
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
            {cut ? (
              <g className="vaultMap__wall">
                <rect x={mx - 6} y={my - 6} width={12} height={12} rx={2} />
                <path d={`M${mx - 3} ${my - 3}l6 6m0-6-6 6`} />
              </g>
            ) : null}
          </g>
        );
      })}

      {spots.map((spot, node) => {
        const kind = node === entry() ? 'entry' : node === target ? 'vault' : 'machine';
        const state =
          node === target ? (sealed ? 'safe' : 'exposed') : reached.has(node) ? 'hot' : 'safe';
        return (
          <g key={node} className={`vaultMap__node vaultMap__node--${kind}`} data-state={state}>
            {kind === 'vault' ? (
              <rect x={spot.x - 12} y={spot.y - 12} width={24} height={24} rx={4} />
            ) : (
              <circle cx={spot.x} cy={spot.y} r={kind === 'entry' ? 11 : 10} />
            )}
            <text x={spot.x} y={spot.y + 3.5}>
              {kind === 'entry' ? '!' : kind === 'vault' ? '$' : node}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------ a tela --- */

/**
 * Cofre Criptografico. Cada ligacao da rede e um botao que liga e desliga o
 * firewall: um toque por ligacao, e a tela diz na hora se ainda sobrou caminho
 * aberto para o invasor.
 */
export default function VaultScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [firewalls, setFirewalls] = useState<number[]>([]);
  const t = ui.vault;

  const nodeName = (node: number): string => {
    if (node === entry()) return t.entryName;
    if (node === vault(instance)) return t.vaultName;
    return `${t.machine} ${node}`;
  };

  function toggle(index: number): void {
    setFirewalls((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );
  }

  const exposed = vaultExposed(instance, firewalls);
  const leak = exposed ? openPath(instance, firewalls) : null;
  const used = firewalls.length;
  const overBudget = used > instance.maxFirewalls;
  const ready = !exposed && !overBudget && used > 0;

  return (
    <section className="vault game-surface" aria-label={ui.minigames.seguranca}>
      <header className="vault__head">
        <h2>{ui.minigames.seguranca}</h2>
        <p className="vault__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <MinigameHelp era="seguranca" mode={mode} />

      <VaultMap instance={instance} firewalls={firewalls} />

      <div className="vault__block">
        <h3>
          {t.firewalls}: {used}/{instance.maxFirewalls}
        </h3>
        <Gauge value={used} max={instance.maxFirewalls} />
        <ul className="vault__links" aria-label={t.linksLabel}>
          {instance.links.map((link, index) => {
            const on = firewalls.includes(index);
            return (
              <li key={index}>
                <button
                  type="button"
                  className={on ? 'vault__link vault__link--cut' : 'vault__link'}
                  aria-pressed={on}
                  data-sfx={on ? 'erase' : 'place'}
                  onClick={() => toggle(index)}
                  aria-label={`${on ? t.removeFirewall : t.putFirewall}: ${nodeName(
                    link.from,
                  )} ${t.toward} ${nodeName(link.to)}`}
                >
                  <span className="vault__linkName">
                    {nodeName(link.from)}
                    <span aria-hidden="true"> → </span>
                    {nodeName(link.to)}
                  </span>
                  <span className="vault__linkState" aria-hidden="true">
                    {on ? t.cut : t.openLink}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p
        className="vault__status"
        role="status"
        data-state={used === 0 ? 'idle' : ready ? 'ok' : 'warn'}
      >
        {/*
          O que o jogador precisa saber primeiro e se sobrou caminho aberto --
          cofre fechado gastando firewall demais ainda e cofre fechado, e o
          excesso aparece depois, como aviso de eficiencia.
        */}
        {used === 0
          ? t.nothingDone
          : leak
            ? `${t.stillOpen}: ${leak.map(nodeName).join(' → ')}`
            : overBudget
              ? `${t.sealed} ${t.overBudget} (${used}/${instance.maxFirewalls})`
              : t.sealed}
      </p>

      <div className="controls">
        <button
          type="button"
          disabled={used === 0}
          data-sfx="erase"
          onClick={() => setFirewalls([])}
        >
          {t.clear}
        </button>
        <button
          type="button"
          className="vault__submit"
          data-ready={ready}
          disabled={exposed || used === 0}
          onClick={() => onSubmit(firewalls)}
        >
          {ui.mission.submit}
          {ready ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
