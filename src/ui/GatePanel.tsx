import type { GadgetData, GadgetState } from '@/core/gadgets';
import {
  bitWeight,
  cipherText,
  isVirus,
  patternSequence,
  routeCost,
  routeLayers,
  routeWidth,
} from '@/core/gadgets';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  data: GadgetData;
  state: GadgetState;
  /** A placa logo antes do portao: o conceito, numa frase. */
  sign?: string;
  /** O ultimo toque foi errado. */
  wrong: boolean;
  onPress(index: number): void;
}

const t = ui.gate;
const loomNames = ui.loom.colorNames as Record<string, string>;

/**
 * Painel do portao de conceito (D75). O Bit esta parado; aqui o jogador pensa
 * e toca. Cada era mostra a sua ideia do jeito que o minijogo dela vai mostrar
 * depois -- e de proposito: a fase e o ensaio do minijogo.
 *
 * Nada de regra aqui: o que abre o portao e `pressTarget`, no nucleo.
 */
export default function GatePanel({ data, state, sign, wrong, onPress }: Props) {
  return (
    <section className={`gatePanel gatePanel--${data.kind}`} aria-label={t.title}>
      {sign ? <p className="gatePanel__sign">{sign}</p> : null}
      <p className="gatePanel__help">{t[data.kind]}</p>
      <Body data={data} state={state} onPress={onPress} />
      <p className="gatePanel__status" role="status" data-state={wrong ? 'warn' : 'idle'}>
        {wrong
          ? ui.stage.wrong
          : state.mistakes > 0
            ? `${ui.stage.mistakes}: ${state.mistakes}`
            : ''}
      </p>
    </section>
  );
}

function Body({ data, state, onPress }: Omit<Props, 'sign' | 'wrong'>) {
  switch (data.kind) {
    case 'pattern': {
      const cloth = patternSequence(data);
      return (
        <>
          <ol className="gatePanel__cloth" aria-label={t.cloth}>
            {cloth.map((color, i) => {
              const hidden = i >= data.shown + state.at;
              return (
                <li
                  key={i}
                  className="gatePanel__thread"
                  data-color={hidden ? 'none' : color}
                  aria-label={hidden ? t.missing : loomNames[color]}
                >
                  {hidden ? '?' : ''}
                </li>
              );
            })}
          </ol>
          <div className="gatePanel__keys">
            {data.colors.map((color, i) => (
              <button
                key={color}
                type="button"
                className="gatePanel__color"
                data-color={color}
                data-sfx="none"
                onClick={() => onPress(i)}
              >
                {loomNames[color]}
              </button>
            ))}
          </div>
        </>
      );
    }

    case 'circuit': {
      const outputs = state.lastTest;
      const lit = outputs ? outputs.at(-1) === 1 : null;
      return (
        <>
          <p className="gatePanel__formula">
            {data.neg.map((neg, i) => (
              <span key={i}>
                {i > 0 ? (
                  <strong className="gatePanel__op">
                    {' '}
                    {data.gates[i - 1] === 'AND' ? t.and : t.or}{' '}
                  </strong>
                ) : null}
                {neg ? `${t.not} ` : ''}
                {t.switch} {i + 1}
              </span>
            ))}
            <span className="gatePanel__lamp" data-lit={lit === true}>
              {' → '}
              {t.lamp}
            </span>
          </p>
          <div className="gatePanel__keys">
            {data.neg.map((neg, i) => (
              <button
                key={i}
                type="button"
                className="gatePanel__switch"
                aria-pressed={state.toggles[i] === true}
                data-sfx="none"
                onClick={() => onPress(i)}
              >
                {t.switch} {i + 1}
                {neg ? ` (${t.not})` : ''}: {state.toggles[i] ? t.on : t.off}
              </button>
            ))}
            <button
              type="button"
              className="gatePanel__action"
              data-sfx="none"
              onClick={() => onPress(data.neg.length)}
            >
              {t.test}
            </button>
          </div>
          {outputs && lit === false ? <p className="gatePanel__note">{t.lampOff}</p> : null}
        </>
      );
    }

    case 'bits': {
      const on = state.toggles
        .map((b, i) => (b ? bitWeight(data.width, i) : 0))
        .filter((v) => v > 0);
      return (
        <>
          <p className="gatePanel__target">
            {t.target}: <strong>{data.value}</strong>
          </p>
          <div className="gatePanel__keys gatePanel__keys--bits">
            {Array.from({ length: data.width }, (_, i) => (
              <button
                key={i}
                type="button"
                className="gatePanel__bit"
                aria-pressed={state.toggles[i] === true}
                aria-label={`${t.bit} ${bitWeight(data.width, i)}`}
                data-sfx="none"
                onClick={() => onPress(i)}
              >
                <small>{bitWeight(data.width, i)}</small>
                <strong>{state.toggles[i] ? 1 : 0}</strong>
              </button>
            ))}
          </div>
          <p className="gatePanel__note">{on.length > 0 ? on.join(' + ') : '0'}</p>
          <div className="gatePanel__keys">
            <button
              type="button"
              className="gatePanel__action"
              data-sfx="none"
              onClick={() => onPress(data.width)}
            >
              {t.record}
            </button>
          </div>
          {state.lastTest ? (
            <p className="gatePanel__note">
              {t.recorded}: {state.lastTest[0]}
            </p>
          ) : null}
        </>
      );
    }

    case 'route': {
      const layer = state.path.length;
      const from = state.path.at(-1);
      const width = routeWidth(data, layer);
      const costTo = (j: number): number =>
        layer === 0 ? (data.first[j] ?? 0) : (data.links[layer - 1]?.[from ?? 0]?.[j] ?? 0);
      return (
        <>
          <RouteMap data={data} path={state.path} />
          <p className="gatePanel__note">
            {t.total}: {routeCost(data, state.path)}
          </p>
          <div className="gatePanel__keys">
            {Array.from({ length: width }, (_, j) => (
              <button
                key={j}
                type="button"
                className="gatePanel__hop"
                data-sfx="none"
                onClick={() => onPress(j)}
              >
                {t.machine} {String.fromCharCode(65 + j)} · {t.delay} {costTo(j)}
              </button>
            ))}
          </div>
        </>
      );
    }

    case 'cipher': {
      const coded = cipherText(data);
      return (
        <>
          <p className="gatePanel__target">
            {t.message}:{' '}
            {[...coded].map((c, i) => (
              <span key={i} className="gatePanel__letter" data-now={i === state.at}>
                {c}
              </span>
            ))}
          </p>
          <p className="gatePanel__note">
            {t.key} {data.shift}: {t.keyText.replace('{n}', String(data.shift))}
          </p>
          <p className="gatePanel__note">
            {t.decoded}:{' '}
            <strong>{data.word.slice(0, state.at).padEnd(data.word.length, '_')}</strong>
          </p>
          <div className="gatePanel__keys">
            {(data.choices[state.at] ?? []).map((letter, i) => (
              <button
                key={`${state.at}-${letter}`}
                type="button"
                className="gatePanel__letterKey"
                data-sfx="none"
                onClick={() => onPress(i)}
              >
                {letter}
              </button>
            ))}
          </div>
        </>
      );
    }

    case 'classify':
      return <Examples data={data} />;
  }
}

/** A rede da Era 4 em miniatura: origem, fileiras de maquinas e destino. */
function RouteMap({
  data,
  path,
}: {
  data: Extract<GadgetData, { kind: 'route' }>;
  path: number[];
}) {
  const layers = routeLayers(data);
  const cols = layers + 2;
  const W = 300;
  const H = 120;
  const x = (c: number): number => 20 + (c * (W - 40)) / (cols - 1);
  const yOf = (layer: number, j: number): number => {
    const width = layer < 0 || layer >= layers ? 1 : routeWidth(data, layer);
    return width === 1 ? H / 2 : 20 + (j * (H - 40)) / (width - 1);
  };
  const lines: { x1: number; y1: number; x2: number; y2: number; cost: number; on: boolean }[] = [];
  data.first.forEach((cost, j) =>
    lines.push({ x1: x(0), y1: H / 2, x2: x(1), y2: yOf(0, j), cost, on: path[0] === j }),
  );
  data.links.forEach((rows, l) =>
    rows.forEach((row, i) =>
      row.forEach((cost, j) =>
        lines.push({
          x1: x(l + 1),
          y1: yOf(l, i),
          x2: x(l + 2),
          y2: yOf(l + 1, j),
          cost,
          on: path[l] === i && path[l + 1] === j,
        }),
      ),
    ),
  );
  data.last.forEach((cost, i) =>
    lines.push({
      x1: x(layers),
      y1: yOf(layers - 1, i),
      x2: x(layers + 1),
      y2: H / 2,
      cost,
      on: path.length === layers && path[layers - 1] === i,
    }),
  );
  return (
    <svg className="gatePanel__route" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.route}>
      {lines.map((l, k) => (
        <g key={k} data-on={l.on}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          <text x={(l.x1 + l.x2) / 2} y={(l.y1 + l.y2) / 2 - 3}>
            {l.cost}
          </text>
        </g>
      ))}
      <circle cx={x(0)} cy={H / 2} r={8} data-kind="end" />
      <circle cx={x(layers + 1)} cy={H / 2} r={8} data-kind="end" />
      {Array.from({ length: layers }, (_, l) =>
        Array.from({ length: routeWidth(data, l) }, (_, j) => (
          <g key={`${l}-${j}`}>
            <circle cx={x(l + 1)} cy={yOf(l, j)} r={8} data-on={path[l] === j} />
            <text x={x(l + 1)} y={yOf(l, j) + 4} data-kind="label">
              {String.fromCharCode(65 + j)}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}

/** Exemplos carimbados da Era 6: o jogador acha a regra comparando. */
export function Examples({ data }: { data: Extract<GadgetData, { kind: 'classify' }> }) {
  const examples = data.examples ?? [];
  if (examples.length === 0) return null;
  return (
    <div className="gatePanel__examples">
      <p className="gatePanel__note">{t.examples}</p>
      <ul>
        {examples.map((attrs, i) => {
          const virus = isVirus(data, attrs);
          return (
            <li key={i} data-virus={virus}>
              <span
                className="gatePanel__program"
                data-shape={attrs[1]}
                data-color={attrs[0]}
                data-antenna={attrs[2] === 1}
                aria-hidden="true"
              />
              <span>
                {t.programColors[attrs[0] ?? 0]}, {t.programShapes[attrs[1] ?? 0]},{' '}
                {t.programAntenna[attrs[2] ?? 0]}
              </span>
              <strong>{virus ? t.virus : t.safe}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
