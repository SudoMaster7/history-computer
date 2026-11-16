import { useEffect, useState } from 'react';

/**
 * Conta de 0 ate `target` em `ms` milissegundos, para o numero "subir" na tela
 * em vez de aparecer pronto.
 */
export function useCountUp(target: number, ms: number, delay = 0): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (ms <= 0) {
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
  }, [target, ms, delay]);

  return value;
}
