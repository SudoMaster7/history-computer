import { audioContext } from './sound';

/**
 * Musica de fundo, sintetizada na hora como os efeitos: nao ha arquivo de audio.
 *
 * Cada faixa e uma partitura curta -- tom, escala, quatro acordes e uma melodia
 * de 32 passos -- tocada em laco por um sequenciador. Tres vozes de oscilador:
 * baixo, arpejo e melodia. Trocar de tela troca a faixa com uma passagem suave.
 *
 * Nada aqui e sorteado: a mesma faixa soa sempre igual. E a musica so toca com
 * o som ligado E o ajuste "Musica" ligado (quem decide e `App.tsx`).
 */

export type TrackName =
  | 'menu'
  | 'mecanica'
  | 'logica'
  | 'codigo'
  | 'redes'
  | 'seguranca'
  | 'ia'
  | 'quiz'
  | 'boss';

type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

/** Pausa na melodia. */
const R = null;

interface Track {
  /** Batidas por minuto; o passo do sequenciador e a colcheia. */
  bpm: number;
  /** Nota MIDI da tonica. */
  root: number;
  /** Semitons da escala a partir da tonica. */
  scale: readonly number[];
  /** Um acorde por compasso, em graus da escala. */
  chords: readonly (readonly number[])[];
  /** 32 passos (4 compassos de 8), em graus da escala; `R` e pausa. */
  melody: readonly (number | null)[];
  /** Ordem em que o arpejo percorre as notas do acorde, um item por passo. */
  arp: readonly number[];
  lead: Wave;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

/* Acordes em graus da escala (0 = tonica). */
const I = [0, 2, 4];
const II = [1, 3, 5];
const IV = [3, 5, 7];
const V = [4, 6, 8];
const VI = [5, 7, 9];
const VII = [6, 8, 10];

const UP_DOWN = [0, 1, 2, 1, 0, 1, 2, 1];
const ROLLING = [0, 2, 1, 2, 0, 2, 1, 2];
const DRIVING = [0, 0, 2, 0, 1, 0, 2, 0];

const TRACKS: Record<TrackName, Track> = {
  // Abertura: calma e clara, para quem acabou de chegar.
  menu: {
    bpm: 92,
    root: 60,
    scale: MAJOR,
    chords: [I, V, VI, IV],
    melody: [
      4,
      R,
      2,
      4,
      7,
      R,
      4,
      R,
      6,
      R,
      4,
      6,
      8,
      R,
      6,
      R,
      7,
      R,
      5,
      7,
      9,
      R,
      7,
      R,
      5,
      R,
      3,
      5,
      4,
      R,
      2,
      R,
    ],
    arp: UP_DOWN,
    lead: 'triangle',
  },
  // Mecanica: passo de oficina, quase uma cancao de roda.
  mecanica: {
    bpm: 104,
    root: 55,
    scale: MAJOR,
    chords: [I, IV, I, V],
    melody: [
      7,
      R,
      9,
      7,
      4,
      R,
      7,
      R,
      8,
      R,
      10,
      8,
      5,
      R,
      8,
      R,
      9,
      7,
      9,
      11,
      9,
      R,
      7,
      R,
      8,
      R,
      6,
      8,
      7,
      R,
      R,
      R,
    ],
    arp: ROLLING,
    lead: 'triangle',
  },
  // Valvulas e Logica: menor, de laboratorio a noite.
  logica: {
    bpm: 110,
    root: 57,
    scale: MINOR,
    chords: [I, VI, IV, V],
    melody: [
      7,
      R,
      R,
      9,
      8,
      R,
      7,
      R,
      5,
      R,
      7,
      R,
      9,
      R,
      R,
      R,
      10,
      R,
      R,
      9,
      8,
      R,
      7,
      R,
      6,
      R,
      8,
      R,
      7,
      R,
      R,
      R,
    ],
    arp: UP_DOWN,
    lead: 'square',
  },
  // Transistor e Linguagens: mais rapida e otimista -- a maquina ficou pequena.
  codigo: {
    bpm: 124,
    root: 62,
    scale: MAJOR,
    chords: [I, VI, IV, V],
    melody: [
      4,
      4,
      R,
      7,
      R,
      4,
      2,
      R,
      5,
      5,
      R,
      7,
      R,
      5,
      4,
      R,
      3,
      3,
      R,
      5,
      R,
      7,
      5,
      R,
      4,
      6,
      8,
      6,
      4,
      R,
      R,
      R,
    ],
    arp: DRIVING,
    lead: 'square',
  },
  // Redes: arpejos que vao e voltam, como pacote entre maquinas.
  redes: {
    bpm: 116,
    root: 52,
    scale: DORIAN,
    chords: [I, IV, I, VII],
    melody: [
      7,
      9,
      11,
      9,
      7,
      R,
      R,
      R,
      10,
      12,
      10,
      8,
      7,
      R,
      R,
      R,
      7,
      9,
      11,
      14,
      11,
      R,
      9,
      R,
      8,
      10,
      8,
      6,
      7,
      R,
      R,
      R,
    ],
    arp: ROLLING,
    lead: 'triangle',
  },
  // Seguranca: tensa, com o baixo marcando.
  seguranca: {
    bpm: 100,
    root: 59,
    scale: MINOR,
    chords: [I, IV, VI, V],
    melody: [
      7,
      R,
      R,
      R,
      8,
      R,
      7,
      R,
      5,
      R,
      R,
      R,
      6,
      R,
      5,
      R,
      9,
      R,
      R,
      R,
      8,
      R,
      7,
      R,
      6,
      R,
      8,
      R,
      7,
      R,
      R,
      R,
    ],
    arp: DRIVING,
    lead: 'sawtooth',
  },
  // IA: lidio, aberto e meio sonhador.
  ia: {
    bpm: 106,
    root: 53,
    scale: LYDIAN,
    chords: [I, II, I, VI],
    melody: [
      4,
      R,
      7,
      R,
      10,
      R,
      9,
      R,
      8,
      R,
      10,
      R,
      12,
      R,
      10,
      R,
      11,
      R,
      9,
      R,
      7,
      R,
      9,
      R,
      10,
      R,
      8,
      R,
      7,
      R,
      R,
      R,
    ],
    arp: UP_DOWN,
    lead: 'sine',
  },
  // Prova da era: suspense leve, sem pressa.
  quiz: {
    bpm: 126,
    root: 60,
    scale: MIXOLYDIAN,
    chords: [I, VII, IV, I],
    melody: [
      R,
      R,
      7,
      R,
      R,
      R,
      9,
      R,
      R,
      R,
      8,
      R,
      R,
      R,
      6,
      R,
      R,
      R,
      7,
      R,
      R,
      R,
      9,
      R,
      8,
      R,
      7,
      R,
      4,
      R,
      R,
      R,
    ],
    arp: ROLLING,
    lead: 'triangle',
  },
  // BUG Day 0: rapida, menor, o arpejo nao para.
  boss: {
    bpm: 148,
    root: 50,
    scale: MINOR,
    chords: [I, VII, VI, V],
    melody: [
      7,
      R,
      7,
      9,
      11,
      R,
      9,
      R,
      6,
      R,
      6,
      8,
      10,
      R,
      8,
      R,
      5,
      R,
      5,
      7,
      9,
      R,
      7,
      R,
      8,
      9,
      8,
      6,
      4,
      R,
      6,
      R,
    ],
    arp: DRIVING,
    lead: 'sawtooth',
  },
};

const STEPS_PER_BAR = 8;
/** Volume geral da musica: fica abaixo dos efeitos, que precisam ser ouvidos. */
const VOLUME = 0.5;
/** Quanto a frente do relogio de audio as notas sao agendadas, em segundos. */
const LOOKAHEAD = 0.25;
const TICK_MS = 80;
const FADE = 0.35;

let current: TrackName | null = null;
let gain: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextTime = 0;

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Grau da escala (pode passar de uma oitava) para nota MIDI. */
function degreeToMidi(track: Track, degree: number): number {
  const size = track.scale.length;
  const octave = Math.floor(degree / size);
  return track.root + octave * 12 + (track.scale[((degree % size) + size) % size] ?? 0);
}

function voice(
  ctx: AudioContext,
  out: GainNode,
  midi: number,
  at: number,
  duration: number,
  wave: Wave,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency(midi), at);
  // Ataque curto e queda ate o fim da nota: sem estalo, e com cara de chip.
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function schedule(ctx: AudioContext, out: GainNode, track: Track, index: number, at: number): void {
  const stepTime = 60 / track.bpm / 2;
  const inBar = index % STEPS_PER_BAR;
  const chord = track.chords[Math.floor(index / STEPS_PER_BAR) % track.chords.length] ?? I;

  // Baixo: a tonica do acorde no primeiro e no quinto passo do compasso.
  if (inBar === 0 || inBar === 4) {
    voice(ctx, out, degreeToMidi(track, chord[0] ?? 0) - 12, at, stepTime * 3.2, 'triangle', 0.1);
  }

  // Arpejo: uma nota do acorde por passo, baixinho.
  const tone = chord[(track.arp[inBar] ?? 0) % chord.length] ?? 0;
  voice(ctx, out, degreeToMidi(track, tone), at, stepTime * 0.9, 'square', 0.022);

  // Melodia.
  const note = track.melody[index % track.melody.length];
  if (note !== null && note !== undefined) {
    voice(ctx, out, degreeToMidi(track, note), at, stepTime * 1.7, track.lead, 0.05);
  }
}

function tick(): void {
  const ctx = audioContext();
  if (!ctx || !gain || !current) return;
  // Sem toque do jogador o navegador segura o audio; so espera, sem acumular notas.
  if (ctx.state !== 'running' || document.hidden) {
    nextTime = ctx.currentTime + 0.05;
    return;
  }
  const track = TRACKS[current];
  const stepTime = 60 / track.bpm / 2;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    schedule(ctx, gain, track, step, nextTime);
    step = (step + 1) % track.melody.length;
    nextTime += stepTime;
  }
}

function stop(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  const ctx = audioContext();
  if (ctx && gain) {
    const old = gain;
    old.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.setTargetAtTime(0.0001, ctx.currentTime, FADE / 4);
    setTimeout(() => old.disconnect(), FADE * 1500);
  }
  gain = null;
  current = null;
}

/**
 * Toca a faixa pedida em laco, ou para a musica com `null`. Pedir a faixa que
 * ja esta tocando nao faz nada, entao da para chamar a cada mudanca de tela.
 */
export function playMusic(track: TrackName | null): void {
  if (track === current) return;
  stop();
  if (!track) return;

  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  // Cada faixa tem o seu no de volume: a antiga some enquanto a nova entra.
  gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.setTargetAtTime(VOLUME, ctx.currentTime, FADE / 3);
  gain.connect(ctx.destination);

  current = track;
  step = 0;
  nextTime = ctx.currentTime + 0.08;
  timer = setInterval(tick, TICK_MS);
}
