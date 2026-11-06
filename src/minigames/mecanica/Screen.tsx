import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { LoomGroup, LoomInstance, LoomSolution } from './logic';
import { expand, solutionCost } from './logic';
import { LOOM } from '@/core/constants';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<LoomInstance, LoomSolution>;

const COLOR_STYLE: Record<string, string> = {
  a: 'var(--era-mecanica)',
  b: 'var(--era-logica)',
  c: 'var(--era-codigo)',
};

/**
 * Tear de Engrenagens. Tudo por toque: tocar na cor adiciona ao grupo atual,
 * tocar em "repetir" ajusta as voltas do grupo, tocar num grupo da fita apaga.
 */
export default function LoomScreen({ instance, mode, onSubmit, onExit }: Props) {
  const [groups, setGroups] = useState<LoomSolution>([]);
  const t = ui.loom;

  const produced = expand(groups);
  const used = solutionCost(groups);
  const left = instance.maxCards - used;

  function addColor(color: string): void {
    setGroups((current) => {
      const last = current.at(-1);
      // Cores entram no ultimo grupo enquanto ele nao tiver repeticao.
      if (last && last.times === 1) {
        return [...current.slice(0, -1), { ...last, colors: [...last.colors, color] }];
      }
      return [...current, { colors: [color], times: 1 }];
    });
  }

  function bumpRepeat(index: number): void {
    setGroups((current) =>
      current.map((group, i) => {
        if (i !== index) return group;
        const next = group.times >= LOOM.MAX_REPEAT ? 1 : group.times + 1;
        return { ...group, times: next };
      }),
    );
  }

  function removeGroup(index: number): void {
    setGroups((current) => current.filter((_, i) => i !== index));
  }

  /** Abre um grupo vazio: as proximas cores entram nele, nao no grupo anterior. */
  function startGroup(): void {
    setGroups((current) => {
      const last = current.at(-1);
      if (!last || last.colors.length === 0) return current;
      return [...current, { colors: [], times: 1 }];
    });
  }

  const matches =
    produced.length === instance.target.length &&
    produced.every((c, i) => c === instance.target[i]);

  return (
    <section className="loom game-surface" aria-label={ui.minigames.mecanica}>
      <header className="loom__head">
        <h2>{ui.minigames.mecanica}</h2>
        <p className="loom__help">{mode === 'micro' ? t.microHelp : t.help}</p>
      </header>

      <div className="loom__block">
        <h3>{t.target}</h3>
        <ol className="loom__tape" aria-label={t.target}>
          {instance.target.map((color, i) => (
            <li
              key={`t-${i}`}
              className="loom__cell"
              style={{ background: COLOR_STYLE[color] }}
              aria-label={`${t.color} ${color}`}
            />
          ))}
        </ol>
      </div>

      <div className="loom__block">
        <h3>
          {t.yours} — {t.cards}: {used}/{instance.maxCards}
        </h3>
        <ol className="loom__tape" aria-label={t.yours}>
          {produced.map((color, i) => (
            <li
              key={`p-${i}`}
              className={
                color === instance.target[i] ? 'loom__cell' : 'loom__cell loom__cell--wrong'
              }
              style={{ background: COLOR_STYLE[color] }}
              aria-label={`${t.color} ${color}`}
            />
          ))}
          {produced.length === 0 ? <li className="loom__empty">{t.empty}</li> : null}
        </ol>
      </div>

      <ul className="loom__groups" aria-label={t.program}>
        {groups.map((group: LoomGroup, index) => (
          <li key={`g-${index}`} className="loom__group">
            <span className="loom__groupColors">
              {group.colors.map((color, i) => (
                <i
                  key={i}
                  className="loom__chip"
                  style={{ background: COLOR_STYLE[color] }}
                  aria-hidden="true"
                />
              ))}
            </span>
            <button
              type="button"
              onClick={() => bumpRepeat(index)}
              aria-label={`${t.repeat} ${t.group} ${index + 1}: ${group.times}`}
            >
              x{group.times}
            </button>
            <button
              type="button"
              onClick={() => removeGroup(index)}
              aria-label={`${t.erase} ${t.group} ${index + 1}`}
            >
              {t.eraseShort}
            </button>
          </li>
        ))}
      </ul>

      <div className="controls loom__palette">
        {instance.colors.map((color) => (
          <button
            key={color}
            type="button"
            className="loom__paletteCard"
            style={{ background: COLOR_STYLE[color] }}
            disabled={left <= 0}
            onClick={() => addColor(color)}
            aria-label={`${t.addColor} ${color}`}
          />
        ))}
        <button type="button" onClick={startGroup} disabled={left <= 0}>
          {t.newGroup}
        </button>
      </div>

      <div className="controls">
        <button
          type="button"
          className="loom__submit"
          disabled={groups.length === 0}
          onClick={() => onSubmit(groups.filter((g) => g.colors.length > 0))}
        >
          {ui.mission.submit}
          {matches ? ' ✓' : ''}
        </button>
        <button type="button" onClick={onExit}>
          {ui.mission.exit}
        </button>
      </div>
    </section>
  );
}
