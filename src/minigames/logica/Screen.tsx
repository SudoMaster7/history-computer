import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { CircuitInstance, CircuitRef, CircuitSolution, GateType } from './logic';
import { arityOf, inputValue, rowCount, simulate } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import Gauge from '@/ui/Gauge';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<CircuitInstance, CircuitSolution>;

/** Porta em montagem: encaixe vazio e `null` ate o jogador ligar o fio. */
interface DraftGate {
  type: GateType;
  in: (CircuitRef | null)[];
}

/** Qual encaixe espera um fio: um encaixe de porta ou a saida do cofre. */
type Pending = { gate: number; slot: number } | { out: true } | null;

const TYPES: GateType[] = ['NOT', 'AND', 'OR'];

/**
 * Simbolo da porta, no tracado dos esquemas de eletronica: triangulo com bolinha
 * para NAO, meia-lua reta para E, meia-lua curva para OU. E enfeite ao lado do
 * nome, entao nao entra na leitura de tela.
 */
function GateIcon({ type }: { type: GateType }) {
  return (
    <svg
      className="gateIcon"
      width={26}
      height={18}
      viewBox="0 0 26 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {type === 'NOT' ? (
        <>
          <path d="M1 9h5M6 3v12l11-6L6 3ZM21.5 9H25" />
          <circle cx="19.2" cy="9" r="2" />
        </>
      ) : null}
      {type === 'AND' ? <path d="M1 5h5M1 13h5M6 2h6a7 7 0 0 1 0 14H6V2ZM19 9h6" /> : null}
      {type === 'OR' ? (
        <path d="M1 5h5.5M1 13h5.5M5 2h6c4 0 7 3 9 7-2 4-5 7-9 7H5c2.4-4.4 2.4-9.6 0-14ZM20 9h5" />
      ) : null}
    </svg>
  );
}

function sameRef(a: CircuitRef | null, b: CircuitRef): boolean {
  if (!a) return false;
  if ('input' in a && 'input' in b) return a.input === b.input;
  if ('gate' in a && 'gate' in b) return a.gate === b.gate;
  return false;
}

/**
 * Circuitos Logicos. Tudo por toque, em dois toques por fio: tocar no encaixe
 * vazio e depois na origem. Nada de arrastar.
 */
export default function CircuitScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [gates, setGates] = useState<DraftGate[]>([]);
  const [out, setOut] = useState<CircuitRef | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const t = ui.circuit;

  const names = t.inputNames;
  const gateLabel = (type: GateType): string => t.gates[type];
  const refLabel = (ref: CircuitRef | null): string => {
    if (!ref) return t.emptySlot;
    if ('input' in ref) return `${t.input} ${names[ref.input] ?? ref.input + 1}`;
    return `${t.gate} ${ref.gate + 1}`;
  };

  function addGate(type: GateType): void {
    setGates((current) => [...current, { type, in: new Array(arityOf(type)).fill(null) }]);
    setPending(null);
  }

  /** Apaga a porta e desliga os fios que apontavam para ela, sem baguncar o resto. */
  function removeGate(index: number): void {
    const fix = (ref: CircuitRef | null): CircuitRef | null => {
      if (!ref || !('gate' in ref)) return ref;
      if (ref.gate === index) return null;
      return ref.gate > index ? { gate: ref.gate - 1 } : ref;
    };
    setGates((current) =>
      current.filter((_, i) => i !== index).map((gate) => ({ ...gate, in: gate.in.map(fix) })),
    );
    setOut((current) => fix(current));
    setPending(null);
  }

  /** Liga a origem tocada no encaixe que estava esperando. */
  function wire(ref: CircuitRef): void {
    if (!pending) return;
    if ('out' in pending) {
      setOut(ref);
    } else {
      const { gate, slot } = pending;
      setGates((current) =>
        current.map((g, i) =>
          i === gate ? { ...g, in: g.in.map((value, s) => (s === slot ? ref : value)) } : g,
        ),
      );
    }
    setPending(null);
  }

  /** Origens validas para o encaixe que espera fio: so o que vem antes dele. */
  function sourcesFor(target: Pending): CircuitRef[] {
    if (!target) return [];
    const until = 'out' in target ? gates.length : target.gate;
    const refs: CircuitRef[] = [];
    for (let i = 0; i < instance.inputs; i += 1) refs.push({ input: i });
    for (let i = 0; i < until; i += 1) refs.push({ gate: i });
    return refs;
  }

  const complete =
    gates.length > 0 && out !== null && gates.every((gate) => gate.in.every((ref) => ref !== null));

  const solution: CircuitSolution | null = complete
    ? { gates: gates.map((gate) => ({ type: gate.type, in: gate.in as CircuitRef[] })), out: out! }
    : null;

  const outputs = solution ? simulate(instance, solution) : null;
  const rows = rowCount(instance.inputs);
  const used = gates.length;
  const full = used >= instance.maxGates;
  const wrong = outputs ? outputs.filter((value, row) => value !== instance.table[row]).length : -1;
  const sources = sourcesFor(pending);

  return (
    <section className="circuit game-surface" aria-label={ui.minigames.logica}>
      <header className="circuit__head">
        <h2>{ui.minigames.logica}</h2>
        <p className="circuit__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <MinigameHelp era="logica" mode={mode} />

      <div className="circuit__block">
        <h3>
          {t.table} — {t.gatesUsed}: {used}/{instance.maxGates}
        </h3>
        <Gauge value={used} max={instance.maxGates} />
        <table className="circuit__table">
          <thead>
            <tr>
              {Array.from({ length: instance.inputs }, (_, i) => (
                <th key={i} scope="col">
                  {names[i] ?? i + 1}
                </th>
              ))}
              <th scope="col">{t.wanted}</th>
              <th scope="col">{t.yours}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => {
              const mine = outputs ? outputs[row] : null;
              const ok = mine === null ? null : mine === instance.table[row];
              return (
                <tr
                  key={row}
                  className={
                    ok === false
                      ? 'circuit__row circuit__row--wrong'
                      : ok
                        ? 'circuit__row circuit__row--ok'
                        : 'circuit__row'
                  }
                >
                  {Array.from({ length: instance.inputs }, (_, i) => (
                    <td key={i} className="circuit__bit" data-on={inputValue(row, i)}>
                      {inputValue(row, i) ? '1' : '0'}
                    </td>
                  ))}
                  <td className="circuit__wanted" data-on={instance.table[row]}>
                    {instance.table[row] ? '1' : '0'}
                  </td>
                  <td
                    className="circuit__mine"
                    aria-label={ok === null ? t.pending : ok ? t.rowOk : t.rowWrong}
                  >
                    {mine === null ? '–' : `${mine ? '1' : '0'} ${ok ? '✓' : '✗'}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="circuit__gates" aria-label={t.board}>
        {gates.map((gate, index) => (
          <li key={index} className="circuit__gate">
            <span className="circuit__gateName">
              <GateIcon type={gate.type} />
              {index + 1}. {gateLabel(gate.type)}
            </span>
            <span className="circuit__slots">
              {gate.in.map((ref, slot) => {
                const waiting =
                  pending !== null &&
                  !('out' in pending) &&
                  pending.gate === index &&
                  pending.slot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={
                      waiting
                        ? 'circuit__slot circuit__slot--waiting'
                        : ref
                          ? 'circuit__slot circuit__slot--wired'
                          : 'circuit__slot'
                    }
                    aria-pressed={waiting}
                    onClick={() => setPending(waiting ? null : { gate: index, slot })}
                    aria-label={`${t.wireInto} ${t.gate} ${index + 1}, ${t.slot} ${
                      slot + 1
                    }: ${refLabel(ref)}`}
                  >
                    {ref ? refLabel(ref) : t.emptySlot}
                  </button>
                );
              })}
            </span>
            <button
              type="button"
              data-sfx="erase"
              onClick={() => removeGate(index)}
              aria-label={`${t.erase} ${t.gate} ${index + 1}`}
            >
              {t.eraseShort}
            </button>
          </li>
        ))}
        {gates.length === 0 ? <li className="circuit__empty">{t.emptyBoard}</li> : null}
      </ul>

      <div className="circuit__outRow">
        <span>{t.out}:</span>
        <button
          type="button"
          className={
            pending !== null && 'out' in pending
              ? 'circuit__slot circuit__slot--waiting'
              : out
                ? 'circuit__slot circuit__slot--wired'
                : 'circuit__slot'
          }
          aria-pressed={pending !== null && 'out' in pending}
          onClick={() =>
            setPending((current) => (current && 'out' in current ? null : { out: true }))
          }
          aria-label={`${t.wireInto} ${t.out}: ${refLabel(out)}`}
        >
          {refLabel(out)}
        </button>
      </div>

      {pending ? (
        <div className="controls circuit__sources" aria-label={t.pickSource}>
          {sources.map((ref) => (
            <button
              key={'input' in ref ? `i${ref.input}` : `g${ref.gate}`}
              type="button"
              className={
                sameRef(
                  'out' in pending ? out : (gates[pending.gate]?.in[pending.slot] ?? null),
                  ref,
                )
                  ? 'circuit__source circuit__source--current'
                  : 'circuit__source'
              }
              data-sfx="place"
              onClick={() => wire(ref)}
            >
              {refLabel(ref)}
            </button>
          ))}
          {sources.length === 0 ? <p className="circuit__help">{t.noSources}</p> : null}
        </div>
      ) : (
        <div className="controls circuit__palette" aria-label={t.palette}>
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="circuit__add"
              disabled={full}
              data-sfx="place"
              onClick={() => addGate(type)}
              aria-label={`${t.addGate} ${gateLabel(type)}`}
            >
              <GateIcon type={type} />
              {gateLabel(type)}
            </button>
          ))}
        </div>
      )}

      <p
        className="circuit__status"
        role="status"
        data-state={!complete ? 'idle' : wrong === 0 ? 'ok' : 'warn'}
      >
        {!complete ? t.incomplete : wrong === 0 ? t.allRowsOk : `${t.rowsWrong}: ${wrong}`}
      </p>

      <div className="controls">
        <button
          type="button"
          className="circuit__submit"
          data-ready={complete && wrong === 0}
          disabled={!solution}
          onClick={() => solution && onSubmit(solution)}
        >
          {ui.mission.submit}
          {complete && wrong === 0 ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
