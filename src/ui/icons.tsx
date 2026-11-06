/**
 * Icones do jogo, em SVG inline.
 *
 * Tudo com o mesmo tracado (1.75) e a mesma caixa (24), para nao ficar um mais
 * grosso que o outro. Sao decorativos: ficam ao lado de um texto que ja diz a
 * mesma coisa, entao levam `aria-hidden` e nao entram na leitura de tela.
 *
 * Nada de emoji como icone: emoji muda de desenho conforme o sistema e nao
 * aceita a cor do tema.
 */

interface IconProps {
  /** Lado do icone em pixels. Use os tamanhos do tema: 16, 20 ou 24. */
  size?: number;
  className?: string;
}

function Svg({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Integridade da maquina: escudo, nao coracao -- o Bit e uma maquina. */
export function IconIntegrity(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v5.5c0 4 2.9 7.6 7 9.5 4.1-1.9 7-5.5 7-9.5V6l-7-3Z" />
      <path d="M9.2 12.1l2 2 3.6-4" />
    </Svg>
  );
}

/** Conhecimento: circuito que se ramifica a partir de um ponto. */
export function IconKnowledge(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 9.6V4m0 16v-5.6m2.4-2.4H20M4 12h5.6" />
      <circle cx="12" cy="3" r="1" />
      <circle cx="12" cy="21" r="1" />
      <circle cx="21" cy="12" r="1" />
      <circle cx="3" cy="12" r="1" />
    </Svg>
  );
}

/** Clock: acoes por turno. */
export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

/** Ano do mundo. */
export function IconYear(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5V6m8-2.5V6" />
    </Svg>
  );
}

/** Poder adquirido. */
export function IconPower(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3 5.5 13.2h5.2L10 21l7.8-10.4h-5.3L13 3Z" />
    </Svg>
  );
}

/** Mochila. */
export function IconBag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 8h15l-1.2 11.2a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8L4.5 8Z" />
      <path d="M8.8 8V6.2A3.2 3.2 0 0 1 12 3a3.2 3.2 0 0 1 3.2 3.2V8" />
    </Svg>
  );
}

/** Abre o painel de estado. */
export function IconStats(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 19.5V13m5 6.5V7m5 12.5v-9m5 9V4.5" />
    </Svg>
  );
}

/** Fecha o painel. */
export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

/** Nivel do jogador. */
export function IconLevel(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
    </Svg>
  );
}

/** Abre o menu do jogo. */
export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}
