import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import { play } from '@/fx';
import ui from '@/data/ui.pt-BR.json';
import Frame from '../shared/Frame';
import { useRounds } from '../shared/useRounds';
import type { CircuitInstance, CircuitRound, CircuitSolution } from './logic';
import { gateOutputs, initialState, lights, signalsOf } from './logic';

/* Medidas do desenho do circuito, em unidades do viewBox. So aparencia. */
const WIDTH = 300;
const TOP = 6;
const NOT_Y = 26;
const FIRST_GATE_Y = 78;
const GATE_GAP = 62;
const GATE_W = 64;
const GATE_H = 30;
const PIN = 16;
const LAMP_DROP = 50;
const LAMP_R = 14;

function columnX(index: number, inputs: number): number {
  return (WIDTH * (index + 0.5)) / inputs;
}

interface GateBox {
  x: number;
  y: number;
}

/** Onde cada porta da cadeia fica: entre o que ela junta. */
function layout(round: CircuitRound): GateBox[] {
  const inputs = round.neg.length;
  const boxes: GateBox[] = [];
  round.gates.forEach((_, j) => {
    const left = j === 0 ? columnX(0, inputs) : (boxes[j - 1] as GateBox).x;
    const right = columnX(j + 1, inputs);
    boxes.push({ x: (left + right) / 2, y: FIRST_GATE_Y + j * GATE_GAP });
  });
  return boxes;
}

function flag(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * Circuitos Logicos: chaves em cima, portas no meio, lampada embaixo. O
 * circuito so mostra por onde o sinal passou DEPOIS de um teste -- antes disso
 * o jogador tem de pensar na regra da porta, que e o que a era ensina.
 */
export default function Screen({
  instance,
  mode,
  onSubmit,
  onExit,
}: MinigameScreenProps<CircuitInstance, CircuitSolution>) {
  const t = ui.circuit;
  const rounds = useRounds<boolean[]>(instance.rounds.length, onSubmit);
  const current = instance.rounds[rounds.round] as CircuitRound;

  const [state, setState] = useState<boolean[]>(() => initialState(current));
  /** As chaves do ultimo teste, enquanto ninguem mexeu nelas depois. */
  const [tested, setTested] = useState<boolean[] | null>(null);

  const inputs = current.neg.length;
  const boxes = layout(current);
  const lastBox = boxes[boxes.length - 1] as GateBox;
  const lampY = lastBox.y + GATE_H / 2 + LAMP_DROP;
  const height = lampY + LAMP_R + 8;

  const signals = tested ? signalsOf(current, tested) : null;
  const outputs = tested ? gateOutputs(current, tested) : null;
  const lit = tested ? lights(current, tested) : undefined;

  function toggle(index: number): void {
    if (rounds.done || current.locked[index] !== null) return;
    play('tap');
    setState((now) => now.map((on, i) => (i === index ? !on : on)));
    setTested(null);
  }

  function test(): void {
    if (rounds.done) return;
    const works = lights(current, state);
    play(works ? 'ok' : 'erase');
    setTested(state);
    rounds.record(state.slice(), works, !works);
  }

  function next(): void {
    const following = instance.rounds[rounds.round + 1];
    if (following) setState(initialState(following));
    setTested(null);
    rounds.next();
  }

  const names = t.names;
  const inputText = (i: number): string =>
    current.neg[i] ? `${t.not} ${names[i] ?? i}` : `${t.switch} ${names[i] ?? i}`;
  const description = current.gates
    .map((gate, j) => {
      const left = j === 0 ? inputText(0) : `${t.gate} ${j}`;
      return `${t.gate} ${j + 1}, ${t.gates[gate]}: ${t.joins} ${left} ${t.and} ${inputText(j + 1)}.`;
    })
    .join(' ');

  const status = rounds.done
    ? { text: t.lit, state: 'ok' as const }
    : rounds.missed && tested
      ? { text: t.dark, state: 'warn' as const }
      : { text: t.prompt, state: 'idle' as const };

  return (
    <Frame
      era="logica"
      className="circuit"
      mode={mode}
      help={mode === 'micro' ? t.microHelp : t.help}
      round={rounds.round}
      total={rounds.total}
      done={rounds.done}
      mistakes={rounds.mistakes}
      status={status}
      onNext={next}
      onExit={onExit}
    >
      <div className="mg__block">
        <h3>{t.switches}</h3>
        <div
          className="circuit__switches"
          style={{ gridTemplateColumns: `repeat(${inputs}, 1fr)` }}
          role="group"
          aria-label={t.switches}
        >
          {state.map((on, i) => {
            const locked = current.locked[i] !== null;
            const word = on ? t.on : t.off;
            return (
              <button
                key={i}
                type="button"
                className="circuit__switch"
                data-on={on}
                aria-pressed={on}
                aria-label={`${t.switch} ${names[i] ?? i}: ${word}${locked ? `, ${t.locked}` : ''}`}
                disabled={locked || rounds.done}
                onClick={() => toggle(i)}
              >
                <strong>{names[i] ?? i}</strong>
                <span>{locked ? `${word} (${t.locked})` : word}</span>
              </button>
            );
          })}
        </div>

        <svg
          className="circuit__diagram"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label={`${t.diagram}. ${description}`}
        >
          {current.neg.map((inverted, i) => {
            const x = columnX(i, inputs);
            const gate = boxes[Math.max(0, i - 1)] as GateBox;
            const pin = gate.x + (i === 0 ? -PIN : PIN);
            const bend = gate.y - GATE_H / 2 - 8;
            return (
              <g key={`in-${i}`}>
                <path
                  className="circuit__wire"
                  data-on={flag(tested?.[i])}
                  d={`M${x} ${TOP} V${NOT_Y}`}
                />
                <path
                  className="circuit__wire"
                  data-on={flag(signals?.[i])}
                  d={`M${x} ${NOT_Y} V${bend} H${pin} V${gate.y - GATE_H / 2}`}
                />
                {inverted ? (
                  <g className="circuit__not">
                    <rect x={x - 19} y={NOT_Y - 9} width={38} height={18} rx={9} />
                    <text x={x} y={NOT_Y + 4}>
                      {t.not}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {boxes.map((box, j) => {
            const below = boxes[j + 1];
            const on = flag(outputs?.[j]);
            return (
              <g key={`gate-${j}`}>
                {below ? (
                  <path
                    className="circuit__wire"
                    data-on={on}
                    d={`M${box.x} ${box.y + GATE_H / 2} V${below.y - GATE_H / 2 - 8} H${below.x - PIN} V${below.y - GATE_H / 2}`}
                  />
                ) : (
                  <path
                    className="circuit__wire"
                    data-on={on}
                    d={`M${box.x} ${box.y + GATE_H / 2} V${lampY - LAMP_R}`}
                  />
                )}
                <g className="circuit__gate" data-on={on}>
                  <rect
                    x={box.x - GATE_W / 2}
                    y={box.y - GATE_H / 2}
                    width={GATE_W}
                    height={GATE_H}
                    rx={8}
                  />
                  <text x={box.x} y={box.y + 5}>
                    {t.gates[current.gates[j] as 'AND' | 'OR']}
                  </text>
                </g>
              </g>
            );
          })}

          <circle
            className="circuit__lamp"
            data-on={flag(lit)}
            cx={lastBox.x}
            cy={lampY}
            r={LAMP_R}
          />
        </svg>
        <p className="mg__note">{t.legend}</p>
      </div>

      <button type="button" className="circuit__test" disabled={rounds.done} onClick={test}>
        {t.test}
      </button>
    </Frame>
  );
}
