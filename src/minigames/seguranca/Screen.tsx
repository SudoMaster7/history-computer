import { useState } from 'react';
import type { MinigameScreenProps } from '@/core/types';
import type { VaultInstance, VaultSolution } from './logic';
import { entry, openPath, vault, vaultExposed } from './logic';
import MinigameHelp from '@/ui/MinigameHelp';
import ui from '@/data/ui.pt-BR.json';

type Props = MinigameScreenProps<VaultInstance, VaultSolution>;

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

      <div className="vault__block">
        <h3>
          {t.firewalls}: {used}/{instance.maxFirewalls}
        </h3>
        <ul className="vault__links" aria-label={t.linksLabel}>
          {instance.links.map((link, index) => {
            const on = firewalls.includes(index);
            return (
              <li key={index}>
                <button
                  type="button"
                  className={on ? 'vault__link vault__link--cut' : 'vault__link'}
                  aria-pressed={on}
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

      <p className="vault__status" role="status">
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
        <button type="button" disabled={used === 0} onClick={() => setFirewalls([])}>
          {t.clear}
        </button>
        <button
          type="button"
          className="vault__submit"
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
