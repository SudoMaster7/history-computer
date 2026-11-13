import { useEffect, useState } from 'react';

/**
 * Conta de 0 ate `target` em `ms` milissegundos, para o numero "subir" na tela
 * em vez de aparecer pronto. Com `enabled` falso (ajuste "Reduzir animacoes")
 * devolve o valor final direto.
 */
export function useCountUp(target: number, ms: number, enabled: boolean, delay = 0): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || ms <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number): void => {
      if (start === 0) start = now + delay;
      const progress = Math.min(1, Math.max(0, (now - start) / ms));
      // Desacelera no fim: o numero "assenta" em vez de bater.
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, enabled, delay]);

  return value;
}
