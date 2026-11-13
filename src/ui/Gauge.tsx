interface Props {
  value: number;
  max: number;
}

/**
 * Barra de orcamento dos minijogos: quanto do recurso (cartoes, portas, bits,
 * atraso, firewalls, sinais) ja foi gasto. Fica vermelha ao passar do limite.
 *
 * E so reforco visual: o numero exato ja esta escrito no titulo ao lado, por
 * isso a barra nao entra na leitura de tela.
 */
export default function Gauge({ value, max }: Props) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value) / max) : 0;
  const over = value > max;
  const full = !over && value === max;
  return (
    <span className="gauge" data-state={over ? 'over' : full ? 'full' : 'ok'} aria-hidden="true">
      <span className="gauge__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </span>
  );
}
