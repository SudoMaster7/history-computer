/**
 * Som do jogo, sintetizado na hora com a Web Audio API.
 *
 * Nao ha arquivo de audio nem biblioteca: cada efeito e uma ou mais notas de
 * oscilador com envelope curto. Isso mantem o jogo leve, offline e sem licenca
 * de terceiros (ver ASSETS.md), e combina com a pixel art: e som de chip.
 *
 * O som comeca desligado (decisao do briefing) e so toca depois que o jogador
 * liga nos ajustes. O contexto de audio nasce no primeiro efeito pedido, que
 * sempre vem de um toque: navegador nenhum deixa tocar antes disso.
 */

export type SoundName =
  | 'tap'
  | 'step'
  | 'place'
  | 'erase'
  | 'ok'
  | 'fail'
  | 'star'
  | 'levelUp'
  | 'fragment'
  | 'talk'
  | 'door'
  | 'hit'
  | 'hurt'
  | 'block'
  | 'win'
  | 'lose';

type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

interface Note {
  /** Frequencia em Hz. */
  f: number;
  /** Para onde a frequencia desliza ate o fim da nota (opcional). */
  to?: number;
  /** Inicio, em segundos a partir de agora. */
  at: number;
  /** Duracao em segundos. */
  d: number;
  wave?: Wave;
  /** Volume de 0 a 1, antes do volume geral. */
  v?: number;
}

/** Volume geral: efeito de interface, nao trilha. Fica baixo de proposito. */
const MASTER = 0.16;

const SOUNDS: Record<SoundName, readonly Note[]> = {
  tap: [{ f: 660, at: 0, d: 0.04, wave: 'square', v: 0.35 }],
  step: [{ f: 150, to: 90, at: 0, d: 0.05, wave: 'triangle', v: 0.5 }],
  place: [{ f: 520, to: 780, at: 0, d: 0.07, wave: 'square', v: 0.4 }],
  erase: [{ f: 420, to: 210, at: 0, d: 0.08, wave: 'square', v: 0.35 }],
  ok: [
    { f: 523, at: 0, d: 0.09, wave: 'square', v: 0.5 },
    { f: 784, at: 0.09, d: 0.14, wave: 'square', v: 0.5 },
  ],
  fail: [
    { f: 300, to: 180, at: 0, d: 0.16, wave: 'sawtooth', v: 0.4 },
    { f: 170, to: 110, at: 0.15, d: 0.2, wave: 'sawtooth', v: 0.4 },
  ],
  star: [
    { f: 988, at: 0, d: 0.06, wave: 'square', v: 0.45 },
    { f: 1319, at: 0.06, d: 0.16, wave: 'square', v: 0.45 },
  ],
  levelUp: [
    { f: 523, at: 0, d: 0.1, wave: 'square', v: 0.5 },
    { f: 659, at: 0.1, d: 0.1, wave: 'square', v: 0.5 },
    { f: 784, at: 0.2, d: 0.1, wave: 'square', v: 0.5 },
    { f: 1047, at: 0.3, d: 0.28, wave: 'square', v: 0.55 },
  ],
  fragment: [
    { f: 880, at: 0, d: 0.07, wave: 'triangle', v: 0.7 },
    { f: 1175, at: 0.07, d: 0.07, wave: 'triangle', v: 0.7 },
    { f: 1760, at: 0.14, d: 0.2, wave: 'triangle', v: 0.6 },
  ],
  talk: [{ f: 440, at: 0, d: 0.025, wave: 'square', v: 0.22 }],
  door: [
    { f: 392, at: 0, d: 0.12, wave: 'triangle', v: 0.7 },
    { f: 523, at: 0.1, d: 0.12, wave: 'triangle', v: 0.7 },
    { f: 784, at: 0.2, d: 0.3, wave: 'triangle', v: 0.7 },
  ],
  hit: [
    { f: 220, to: 60, at: 0, d: 0.14, wave: 'sawtooth', v: 0.6 },
    { f: 880, to: 440, at: 0, d: 0.06, wave: 'square', v: 0.3 },
  ],
  hurt: [{ f: 180, to: 50, at: 0, d: 0.28, wave: 'sawtooth', v: 0.6 }],
  block: [
    { f: 1200, to: 1500, at: 0, d: 0.08, wave: 'triangle', v: 0.7 },
    { f: 1800, at: 0.07, d: 0.16, wave: 'triangle', v: 0.5 },
  ],
  win: [
    { f: 523, at: 0, d: 0.12, wave: 'square', v: 0.5 },
    { f: 659, at: 0.12, d: 0.12, wave: 'square', v: 0.5 },
    { f: 784, at: 0.24, d: 0.12, wave: 'square', v: 0.5 },
    { f: 1047, at: 0.36, d: 0.16, wave: 'square', v: 0.5 },
    { f: 784, at: 0.52, d: 0.1, wave: 'square', v: 0.5 },
    { f: 1047, at: 0.62, d: 0.4, wave: 'square', v: 0.55 },
  ],
  lose: [
    { f: 392, at: 0, d: 0.16, wave: 'triangle', v: 0.7 },
    { f: 330, at: 0.16, d: 0.16, wave: 'triangle', v: 0.7 },
    { f: 262, at: 0.32, d: 0.16, wave: 'triangle', v: 0.7 },
    { f: 196, at: 0.48, d: 0.4, wave: 'triangle', v: 0.7 },
  ],
};

let muted = true;
let context: AudioContext | null = null;

/** Liga ou desliga o som. Quem manda e o ajuste salvo do jogador. */
export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/**
 * Toca um efeito. `pitch` multiplica a frequencia: serve para a mesma nota
 * subir a cada estrela ou a cada acerto seguido, sem precisar de efeito novo.
 */
export function play(name: SoundName, pitch = 1): void {
  if (muted) return;
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + note.at;
    const end = start + note.d;
    const volume = (note.v ?? 0.5) * MASTER;

    osc.type = note.wave ?? 'square';
    osc.frequency.setValueAtTime(note.f * pitch, start);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to * pitch, end);

    // Ataque e queda curtos: sem isso cada nota comeca e termina com estalo.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
