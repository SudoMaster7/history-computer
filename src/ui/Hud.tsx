import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store';
import { xpToNextLevel } from '@/core/rpg';
import { POWER_IDS } from '@/core/powers';
import { carriedItems, countOf } from '@/core/items';
import { itemText } from './itemText';
import {
  IconBag,
  IconClock,
  IconClose,
  IconIntegrity,
  IconKnowledge,
  IconLevel,
  IconPower,
  IconStats,
  IconYear,
} from './icons';
import ui from '@/data/ui.pt-BR.json';

/**
 * Barra segmentada, no lugar da barra lisa: o jogador le "quanto falta" em
 * blocos, sem precisar interpretar uma porcentagem. Os blocos tambem combinam
 * com a pixel art do mapa, que e feita de quadradinhos.
 */
function SegmentedBar({
  value,
  max,
  tone,
  label,
  icon,
}: {
  value: number;
  max: number;
  tone: 'hp' | 'xp';
  label: string;
  icon: React.ReactNode;
}) {
  const SEGMENTS = 20;
  const filled = max > 0 ? Math.round((value / max) * SEGMENTS) : 0;
  const low = tone === 'hp' && value / Math.max(1, max) <= 0.25;

  return (
    <div
      className={low ? 'meter meter--low' : 'meter'}
      data-tone={tone}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${label} ${value} de ${max}`}
    >
      <div className="meter__head">
        <span className="meter__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="label">{label}</span>
        <span className="meter__value">
          {value}
          <span className="meter__max">/{max}</span>
        </span>
      </div>
      <div className="meter__track" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={i < filled ? 'meter__seg meter__seg--on' : 'meter__seg'} />
        ))}
      </div>
    </div>
  );
}

/**
 * Estado da maquina.
 *
 * Fica recolhido atras de um botao para o mapa e as falas ficarem em primeiro
 * plano. O botao nao e so um gatilho: ele mostra a integridade em miniatura,
 * porque perder vida sem ver e o tipo de surpresa que irrita.
 */
export default function Hud() {
  const player = useGameStore((s) => s.player);
  const spendItem = useGameStore((s) => s.spendItem);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const needed = xpToNextLevel(player.level);
  const items = carriedItems(player.items);
  const hpRatio = player.hpMax > 0 ? player.hp / player.hpMax : 0;
  const unlocked = POWER_IDS.filter((id) => player.powers[id] > 0).length;

  // Fecha no Esc e devolve o foco ao botao, como qualquer painel sobreposto.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={open ? 'statusChip statusChip--open' : 'statusChip'}
        aria-expanded={open}
        aria-controls="hud-panel"
        aria-label={`${ui.hud.label}. ${ui.hud.hp} ${player.hp} ${ui.hud.of} ${player.hpMax}. ${ui.hud.level} ${player.level}.`}
        onClick={() => setOpen((v) => !v)}
      >
        <IconStats size={18} />
        <span className="statusChip__gauge" aria-hidden="true">
          <span
            className="statusChip__fill"
            data-low={hpRatio <= 0.25}
            style={{ width: `${Math.round(hpRatio * 100)}%` }}
          />
        </span>
        <span className="statusChip__level" aria-hidden="true">
          {ui.hud.levelShort} {player.level}
        </span>
      </button>

      {open ? (
        <>
          <div className="hudScrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="hud-panel"
            ref={panelRef}
            className="hudPanel"
            role="dialog"
            aria-modal="false"
            aria-label={ui.hud.label}
            tabIndex={-1}
          >
            <div className="hudPanel__bar">
              <span className="hudPanel__title label">{ui.hud.label}</span>
              <button
                type="button"
                className="iconButton"
                aria-label={ui.menu.close}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="hudPanel__body">
              <SegmentedBar
                value={player.hp}
                max={player.hpMax}
                tone="hp"
                label={ui.hud.hp}
                icon={<IconIntegrity size={16} />}
              />
              <SegmentedBar
                value={player.xp}
                max={needed}
                tone="xp"
                label={ui.hud.xp}
                icon={<IconKnowledge size={16} />}
              />

              <ul className="statGrid">
                <li className="stat">
                  <IconLevel size={16} />
                  <span className="label">{ui.hud.level}</span>
                  <strong>{player.level}</strong>
                </li>
                <li className="stat">
                  <IconClock size={16} />
                  <span className="label">{ui.hud.clockShort}</span>
                  <strong>{player.clock}</strong>
                </li>
                <li className="stat">
                  <IconYear size={16} />
                  <span className="label">{ui.hud.yearShort}</span>
                  <strong>{player.year}</strong>
                </li>
              </ul>

              <section className="hudSection">
                <h3 className="label hudSection__title">
                  <IconPower size={14} />
                  {ui.hud.powers}
                  <span className="hudSection__count">
                    {unlocked}/{POWER_IDS.length}
                  </span>
                </h3>
                <ul className="powerList">
                  {POWER_IDS.map((id) => {
                    const level = player.powers[id];
                    return (
                      <li
                        key={id}
                        className={level > 0 ? 'power power--on' : 'power'}
                        aria-label={`${ui.powers[id]}: ${
                          level > 0 ? `${ui.hud.powerLevel} ${level}` : ui.hud.locked
                        }`}
                      >
                        <span className="power__name" aria-hidden="true">
                          {ui.powers[id]}
                        </span>
                        <span className="power__pips" aria-hidden="true">
                          {[1, 2, 3].map((step) => (
                            <span
                              key={step}
                              className={level >= step ? 'power__pip power__pip--on' : 'power__pip'}
                            />
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="hudSection">
                <h3 className="label hudSection__title">
                  <IconBag size={14} />
                  {ui.items.title}
                </h3>
                {items.length === 0 ? (
                  <p className="hudEmpty">{ui.items.empty}</p>
                ) : (
                  <ul className="itemList">
                    {items.map((item) => {
                      const text = itemText(item.id);
                      const count = countOf(player.items, item.id);
                      /* So o item de uso imediato tem botao; os de combate ficam guardados. */
                      const usable = item.kind === 'heal';
                      return (
                        <li key={item.id} className="item">
                          <div className="item__info">
                            <strong className="item__name">
                              {text.name}
                              {count > 1 ? <span className="item__count">x{count}</span> : null}
                            </strong>
                            <span className="item__text">{text.text}</span>
                          </div>
                          {usable ? (
                            <button
                              type="button"
                              className="item__use"
                              aria-label={`${ui.items.use} ${text.name}`}
                              onClick={() => spendItem(item.id)}
                            >
                              {ui.items.use}
                            </button>
                          ) : (
                            <span className="item__held">{ui.items.held}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
