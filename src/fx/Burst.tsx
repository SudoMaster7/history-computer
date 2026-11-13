import type { CSSProperties } from 'react';

interface Props {
  /** Quantas particulas. */
  count?: number;
  /** Cores distribuidas entre as particulas (variaveis CSS ou hex). */
  colors?: readonly string[];
  /** Raio medio do estouro, em pixels. */
  spread?: number;
}

const DEFAULT_COLORS = ['var(--accent)', 'var(--warning)', 'var(--ok)', '#ffffff'];

/**
 * Estouro de particulas, so com CSS: cada particula e um quadradinho que sai do
 * centro numa direcao propria e some. Fica por cima de quem o chamou (o pai
 * precisa ter `position: relative`) e nao recebe toque.
 *
 * As direcoes saem do indice, nao de sorteio: o mesmo estouro e sempre igual,
 * e o componente nao muda entre uma renderizacao e outra.
 */
export default function Burst({ count = 18, colors = DEFAULT_COLORS, spread = 90 }: Props) {
  return (
    <span className="burst" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        // Angulo dourado: espalha bem sem sorteio.
        const angle = i * 2.399963;
        const reach = spread * (0.55 + ((i * 37) % 50) / 100);
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * reach)}px`,
          '--dy': `${Math.round(Math.sin(angle) * reach)}px`,
          '--delay': `${(i % 6) * 22}ms`,
          background: colors[i % colors.length],
        } as CSSProperties;
        return <i key={i} className="burst__bit" style={style} />;
      })}
    </span>
  );
}
