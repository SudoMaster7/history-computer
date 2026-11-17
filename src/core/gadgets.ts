/**
 * Dispositivos de conceito das fases (D75).
 *
 * Cada era ensina a ideia do seu minijogo com um portao que so abre quando o
 * conceito e usado: completar um padrao (Tear), armar chaves de um circuito
 * (Circuitos), ligar bits que somam um numero (Mesa de Bits), escolher a rota
 * de menor atraso (Rota), decifrar uma letra (Cofre) e separar virus de
 * programas seguros (Detector).
 *
 * O Bit para sozinho diante do portao fechado; o jogador pensa parado e toca
 * nas pecas do painel. Puro e deterministico, como todo o nucleo: as funcoes
 * aqui sao pequenas de proposito -- a versao completa de cada ideia continua
 * no `logic.ts` do minijogo, que o nucleo nao importa.
 */

export type GateKind = 'AND' | 'OR';

/** Era 1: o tecido mostra um trecho que se repete; faltam os ultimos fios. */
export interface PatternGadget {
  kind: 'pattern';
  /** O trecho que se repete, em cores ('a', 'b', 'c'). */
  unit: string[];
  /** Fios ja tecidos, a vista. */
  shown: number;
  /** Fios que faltam: o jogador escolhe um por vez. */
  hidden: number;
  /** Cores oferecidas no painel. */
  colors: string[];
}

/** Era 2: chaves, NAO nos fios e portas em cadeia; a lampada abre o portao. */
export interface CircuitGadget {
  kind: 'circuit';
  neg: boolean[];
  gates: GateKind[];
}

/** Era 3: bits 8/4/2/1; gravar o numero pedido abre o portao. */
export interface BitsGadget {
  kind: 'bits';
  width: number;
  value: number;
}

/**
 * Era 4: rede em fileiras. `first[j]` e o atraso da origem ate a maquina j da
 * primeira fileira; `links[l][i][j]` vai da maquina i da fileira l ate a
 * maquina j da fileira seguinte; `last[i]` vai da ultima fileira ao destino.
 */
export interface RouteGadget {
  kind: 'route';
  first: number[];
  links: number[][][];
  last: number[];
}

/** Era 5: palavra cifrada com chave de Cesar; escolhe-se a letra certa de cada casa. */
export interface CipherGadget {
  kind: 'cipher';
  /** A palavra em claro (o que o jogador tem de descobrir). */
  word: string;
  /** Casas que cada letra andou para a frente. */
  shift: number;
  /** Letras oferecidas em cada casa; uma delas e a certa. */
  choices: string[][];
}

/** Era 6: programas com caracteristicas; e virus quem tem `attrs[attr] === value`. */
export interface ClassifyGadget {
  kind: 'classify';
  attr: number;
  value: number;
  /** Exemplos carimbados mostrados na placa: caracteristicas de cada um. */
  examples?: number[][];
}

export type GadgetData =
  | PatternGadget
  | CircuitGadget
  | BitsGadget
  | RouteGadget
  | CipherGadget
  | ClassifyGadget;

export type GadgetKind = GadgetData['kind'];

export interface GadgetState {
  solved: boolean;
  /** Toques errados neste portao. */
  mistakes: number;
  /** Rota: o caminho escolhido foi o de menor atraso. Nos outros, resolvido sem erro. */
  perfect: boolean;
  /** Quantas escolhas certas ja entraram (padrao, cifra). */
  at: number;
  /** Chaves (circuito) ou bits (mesa) ligados. */
  toggles: boolean[];
  /** Rota: maquina escolhida em cada fileira. */
  path: number[];
  /** Circuito: saida de cada porta no ultimo teste. Mesa: [valor gravado]. */
  lastTest: number[] | null;
}

export interface PressResult {
  state: GadgetState;
  mistake: boolean;
  /** O portao acabou de abrir com este toque. */
  opened: boolean;
}

// --- leitura de cada ideia ---------------------------------------------------

/** O tecido inteiro: o trecho repetido ate cobrir `length` fios. */
export function patternSequence(g: PatternGadget, length = g.shown + g.hidden): string[] {
  const out: string[] = [];
  for (let i = 0; i < length; i += 1) out.push(g.unit[i % g.unit.length] ?? '');
  return out;
}

/** Os fios que faltam, na ordem. */
export function patternMissing(g: PatternGadget): string[] {
  return patternSequence(g).slice(g.shown);
}

/** Sinal de cada chave depois do NAO. */
export function circuitSignals(g: CircuitGadget, toggles: readonly boolean[]): boolean[] {
  return g.neg.map((inverted, i) => (inverted ? !toggles[i] : Boolean(toggles[i])));
}

/** Saida de cada porta da cadeia. */
export function circuitOutputs(g: CircuitGadget, toggles: readonly boolean[]): boolean[] {
  const signals = circuitSignals(g, toggles);
  const out: boolean[] = [];
  let carry = Boolean(signals[0]);
  g.gates.forEach((gate, i) => {
    const next = Boolean(signals[i + 1]);
    carry = gate === 'AND' ? carry && next : carry || next;
    out.push(carry);
  });
  return out;
}

export function circuitLights(g: CircuitGadget, toggles: readonly boolean[]): boolean {
  return circuitOutputs(g, toggles).at(-1) ?? false;
}

/** Valor do bit na posicao `i` (da esquerda): com 4 bits, 8 4 2 1. */
export function bitWeight(width: number, i: number): number {
  return 2 ** (width - 1 - i);
}

export function bitsValue(width: number, toggles: readonly boolean[]): number {
  let sum = 0;
  for (let i = 0; i < width; i += 1) if (toggles[i]) sum += bitWeight(width, i);
  return sum;
}

/** Quantas fileiras de maquinas a rede tem. */
export function routeLayers(g: RouteGadget): number {
  return g.links.length + 1;
}

/** Quantas maquinas ha na fileira `layer`. */
export function routeWidth(g: RouteGadget, layer: number): number {
  if (layer === 0) return g.first.length;
  return g.links[layer - 1]?.[0]?.length ?? 0;
}

/** Atraso de um caminho completo (uma maquina por fileira). */
export function routeCost(g: RouteGadget, path: readonly number[]): number {
  if (path.length === 0) return 0;
  let cost = g.first[path[0] ?? 0] ?? 0;
  for (let l = 1; l < path.length; l += 1) {
    cost += g.links[l - 1]?.[path[l - 1] ?? 0]?.[path[l] ?? 0] ?? 0;
  }
  if (path.length === routeLayers(g)) cost += g.last[path[path.length - 1] ?? 0] ?? 0;
  return cost;
}

/** O caminho de menor atraso, por programacao dinamica (fileira por fileira). */
export function bestRoute(g: RouteGadget): number[] {
  const layers = routeLayers(g);
  let best: { cost: number; path: number[] }[] = g.first.map((cost, j) => ({ cost, path: [j] }));
  for (let l = 1; l < layers; l += 1) {
    const width = routeWidth(g, l);
    const next: { cost: number; path: number[] }[] = [];
    for (let j = 0; j < width; j += 1) {
      let cost = Infinity;
      let path: number[] = [];
      for (let i = 0; i < best.length; i += 1) {
        const from = best[i]!;
        const total = from.cost + (g.links[l - 1]?.[i]?.[j] ?? 0);
        if (total < cost) {
          cost = total;
          path = [...from.path, j];
        }
      }
      next.push({ cost, path });
    }
    best = next;
  }
  let answer: number[] = [];
  let answerCost = Infinity;
  for (let i = 0; i < best.length; i += 1) {
    const total = best[i]!.cost + (g.last[i] ?? 0);
    if (total < answerCost) {
      answerCost = total;
      answer = best[i]!.path;
    }
  }
  return answer;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Anda `shift` casas no alfabeto (negativo volta), dando a volta no Z. */
export function shiftLetter(letter: string, shift: number): string {
  const i = ALPHABET.indexOf(letter.toUpperCase());
  if (i < 0) return letter;
  const n = ALPHABET.length;
  return ALPHABET[(((i + shift) % n) + n) % n] ?? letter;
}

/** A palavra como aparece no portao: cada letra `shift` casas a frente. */
export function cipherText(g: CipherGadget): string {
  return [...g.word].map((c) => shiftLetter(c, g.shift)).join('');
}

/** Programa com estas caracteristicas e virus para esta regra? */
export function isVirus(g: ClassifyGadget, attrs: readonly number[]): boolean {
  return attrs[g.attr] === g.value;
}

// --- estado e toques -----------------------------------------------------------

export function initialGadget(g: GadgetData): GadgetState {
  const width = g.kind === 'circuit' ? g.neg.length : g.kind === 'bits' ? g.width : 0;
  return {
    solved: false,
    mistakes: 0,
    perfect: false,
    at: 0,
    toggles: Array.from({ length: width }, () => false),
    path: [],
    lastTest: null,
  };
}

/**
 * Quantas pecas o painel do portao oferece agora. Circuito e Mesa tem uma peca
 * a mais no fim: "Testar" e "Gravar". O Detector nao tem painel: o portao abre
 * quando os virus caem.
 */
export function targetCount(g: GadgetData, s: GadgetState): number {
  switch (g.kind) {
    case 'pattern':
      return g.colors.length;
    case 'circuit':
      return g.neg.length + 1;
    case 'bits':
      return g.width + 1;
    case 'route':
      return routeWidth(g, s.path.length);
    case 'cipher':
      return g.choices[s.at]?.length ?? 0;
    case 'classify':
      return 0;
  }
}

/** Toca a peca `index` do painel. Peca fora da faixa ou portao aberto nao muda nada. */
export function pressTarget(g: GadgetData, s: GadgetState, index: number): PressResult {
  const same: PressResult = { state: s, mistake: false, opened: false };
  if (s.solved || !Number.isInteger(index) || index < 0 || index >= targetCount(g, s)) {
    return same;
  }
  const next: GadgetState = {
    ...s,
    toggles: [...s.toggles],
    path: [...s.path],
    lastTest: s.lastTest ? [...s.lastTest] : null,
  };

  const finish = (opened: boolean, mistake: boolean): PressResult => {
    if (mistake) next.mistakes += 1;
    if (opened) {
      next.solved = true;
      if (g.kind !== 'route') next.perfect = next.mistakes === 0;
    }
    return { state: next, mistake, opened };
  };

  switch (g.kind) {
    case 'pattern': {
      const missing = patternMissing(g);
      if (g.colors[index] !== missing[next.at]) return finish(false, true);
      next.at += 1;
      return finish(next.at >= missing.length, false);
    }
    case 'cipher': {
      if (g.choices[next.at]?.[index] !== g.word[next.at]) return finish(false, true);
      next.at += 1;
      return finish(next.at >= g.word.length, false);
    }
    case 'circuit': {
      if (index < g.neg.length) {
        next.toggles[index] = !next.toggles[index];
        return finish(false, false);
      }
      next.lastTest = circuitOutputs(g, next.toggles).map((on) => (on ? 1 : 0));
      const lit = circuitLights(g, next.toggles);
      return finish(lit, !lit);
    }
    case 'bits': {
      if (index < g.width) {
        next.toggles[index] = !next.toggles[index];
        return finish(false, false);
      }
      const value = bitsValue(g.width, next.toggles);
      next.lastTest = [value];
      return finish(value === g.value, value !== g.value);
    }
    case 'route': {
      next.path.push(index);
      if (next.path.length < routeLayers(g)) return finish(false, false);
      next.perfect = routeCost(g, next.path) === routeCost(g, bestRoute(g));
      return finish(true, false);
    }
    case 'classify':
      return same;
  }
}

/** Os toques que abrem o portao sem erro: o que o robo de referencia faz. */
export function referencePresses(g: GadgetData): number[] {
  switch (g.kind) {
    case 'pattern':
      return patternMissing(g).map((color) => g.colors.indexOf(color));
    case 'cipher':
      return [...g.word].map((letter, i) => g.choices[i]?.indexOf(letter) ?? -1);
    case 'circuit': {
      const n = g.neg.length;
      for (let mask = 0; mask < 2 ** n; mask += 1) {
        const toggles = Array.from({ length: n }, (_, i) => Boolean(mask & (1 << i)));
        if (circuitLights(g, toggles)) {
          return [...toggles.flatMap((on, i) => (on ? [i] : [])), n];
        }
      }
      return [n];
    }
    case 'bits': {
      const presses: number[] = [];
      for (let i = 0; i < g.width; i += 1) {
        if (g.value & bitWeight(g.width, i)) presses.push(i);
      }
      return [...presses, g.width];
    }
    case 'route':
      return bestRoute(g);
    case 'classify':
      return [];
  }
}

/** Confere se o dispositivo tem solucao e se os numeros fecham. Lista vazia = ok. */
export function validateGadget(g: GadgetData): string[] {
  const errors: string[] = [];
  switch (g.kind) {
    case 'pattern':
      if (g.unit.length < 2) errors.push('padrao com trecho curto demais');
      if (g.hidden < 1) errors.push('padrao sem fio faltando');
      for (const color of g.unit) {
        if (!g.colors.includes(color)) errors.push(`padrao usa cor fora do painel: ${color}`);
      }
      break;
    case 'circuit': {
      if (g.gates.length !== g.neg.length - 1)
        errors.push('circuito com portas e chaves que nao fecham');
      const presses = referencePresses(g);
      const toggles = Array.from({ length: g.neg.length }, (_, i) => presses.includes(i));
      if (!circuitLights(g, toggles)) errors.push('circuito sem solucao');
      break;
    }
    case 'bits':
      if (g.value < 0 || g.value >= 2 ** g.width) errors.push('numero nao cabe na mesa');
      break;
    case 'route':
      if (g.first.length === 0 || g.last.length === 0) errors.push('rede vazia');
      break;
    case 'cipher':
      if (g.choices.length !== g.word.length) errors.push('cifra com casas e escolhas diferentes');
      g.choices.forEach((options, i) => {
        if (!options.includes(g.word[i] ?? '')) errors.push(`cifra sem a letra certa na casa ${i}`);
      });
      break;
    case 'classify':
      break;
  }
  return errors;
}
