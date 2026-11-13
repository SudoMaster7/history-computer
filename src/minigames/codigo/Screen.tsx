import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { BitsInstance, BitsSolution } from './logic';
import { isPrefixFree, prefixClashes, solutionCost } from './logic';
import { BITS } from '@/core/constants';
import MinigameHelp from '@/ui/MinigameHelp';
import Gauge from '@/ui/Gauge';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<BitsInstance, BitsSolution>;

/**
 * Mesa de Bits. Cada simbolo tem dois botoes grandes (0 e 1) e um de apagar:
 * o codigo cresce bit a bit, por toque, sem teclado e sem arrastar.
 */
export default function BitsScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(instance.symbols.map((s) => [s.id, ''])),
  );
  const t = ui.bits;

  function addBit(id: string, bit: '0' | '1'): void {
    setCodes((current) => {
      const code = current[id] ?? '';
      if (code.length >= BITS.MAX_CODE_LEN) return current;
      return { ...current, [id]: code + bit };
    });
  }

  function erase(id: string): void {
    setCodes((current) => ({ ...current, [id]: (current[id] ?? '').slice(0, -1) }));
  }

  const complete = instance.symbols.every((s) => (codes[s.id] ?? '').length > 0);
  const solution: BitsSolution | null = complete ? codes : null;

  const used = solution ? solutionCost(instance, solution) : 0;
  const clashes = prefixClashes(codes);
  const ambiguous = clashes.length > 0;
  const overBudget = used > instance.maxBits;
  const ready = complete && !ambiguous && !overBudget;

  /** Simbolos cujo codigo entra em conflito com o de outro. */
  const inClash = new Set(clashes.flat());

  return (
    <section className="bits game-surface" aria-label={ui.minigames.codigo}>
      <header className="bits__head">
        <h2>{ui.minigames.codigo}</h2>
        <p className="bits__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <MinigameHelp era="codigo" mode={mode} />

      <div className="bits__block">
        <h3>
          {t.budget}: {complete ? used : '–'}/{instance.maxBits} {t.bits}
        </h3>
        <Gauge value={complete ? used : 0} max={instance.maxBits} />
        <ul className="bits__table" aria-label={t.message}>
          {instance.symbols.map((symbol, order) => {
            const code = codes[symbol.id] ?? '';
            const clash = inClash.has(symbol.id);
            return (
              <li
                key={symbol.id}
                className={clash ? 'bits__row bits__row--clash' : 'bits__row'}
                aria-label={`${t.symbol} ${symbol.id}, ${symbol.weight} ${t.times}, ${t.code} ${
                  code.length > 0 ? code : t.empty
                }`}
              >
                <span className="bits__symbol" data-sym={order} aria-hidden="true">
                  {symbol.id}
                </span>
                <span className="bits__weight" aria-hidden="true">
                  {symbol.weight}
                  {t.timesShort}
                </span>
                {/* Cada bit e um transistor: aceso vale 1, apagado vale 0. */}
                <span className="bits__code" aria-hidden="true">
                  {code.length > 0
                    ? code.split('').map((bit, i) => (
                        <i key={i} className="bits__led" data-on={bit === '1'}>
                          {bit}
                        </i>
                      ))
                    : t.empty}
                </span>
                <span className="bits__buttons">
                  <button
                    type="button"
                    data-sfx="place"
                    onClick={() => addBit(symbol.id, '0')}
                    aria-label={`${t.addZero} ${symbol.id}`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    data-sfx="place"
                    onClick={() => addBit(symbol.id, '1')}
                    aria-label={`${t.addOne} ${symbol.id}`}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    disabled={code.length === 0}
                    data-sfx="erase"
                    onClick={() => erase(symbol.id)}
                    aria-label={`${t.erase} ${symbol.id}`}
                  >
                    {t.eraseShort}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* A fita, montada com os codigos escolhidos: e onde o gasto fica visivel. */}
      <div className="bits__block">
        <h3>{t.tape}</h3>
        <p className="bits__tape" aria-label={t.tape}>
          {complete
            ? instance.symbols.map((s, order) => (
                // Um trecho por simbolo, na cor dele: da para ver quem gasta a fita.
                <span key={s.id} className="bits__run" data-sym={order}>
                  {(codes[s.id] as string).repeat(s.weight)}
                </span>
              ))
            : t.tapeEmpty}
        </p>
      </div>

      <p
        className="bits__status"
        role="status"
        data-state={!complete ? 'idle' : ready ? 'ok' : 'warn'}
      >
        {!complete
          ? t.incomplete
          : ambiguous
            ? `${t.ambiguous}: ${clashes.map(([a, b]) => `${a}/${b}`).join(', ')}`
            : overBudget
              ? `${t.overBudget} (${used}/${instance.maxBits})`
              : t.allOk}
      </p>

      <div className="controls">
        <button
          type="button"
          className="bits__submit"
          data-ready={ready}
          disabled={!solution}
          onClick={() => solution && onSubmit(solution)}
        >
          {ui.mission.submit}
          {ready && isPrefixFree(Object.values(codes)) ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
