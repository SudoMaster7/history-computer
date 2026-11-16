import type { Difficulty, EraId, Evaluation, Minigame } from '@/core/types';
import { VAULT } from '@/core/constants';
import { createRng, randInt, shuffle } from '@/core/rng';
import { mistakeEfficiency } from '@/core/scoring';
import { byDifficulty, replaySequence } from '../shared/logic';

/**
 * Cofre Criptografico (Era 5, poder Proteger).
 *
 * A senha do cofre esta cifrada do jeito mais antigo que existe: cada letra
 * andou algumas casas para a frente no alfabeto (a cifra de Cesar). A chave diz
 * quantas casas. O jogador desfaz a cifra letra por letra, escolhendo entre
 * tres opcoes. Quem tem a chave le a mensagem; quem nao tem ve letras soltas --
 * e essa e a ideia inteira de criptografia.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/*
 * As senhas possiveis. Sao material do quebra-cabeca, e o `evaluate` precisa
 * delas para conferir a resposta -- por isso moram aqui, e nao em `data/`
 * (D70). So entram palavras que se escrevem sem acento e sem cedilha, para a
 * senha decifrada ser portugues correto.
 */
const WORDS: readonly string[] = [
  'REDE',
  'MURO',
  'SITE',
  'SENHA',
  'COFRE',
  'CHAVE',
  'DADOS',
  'PORTA',
  'NUVEM',
  'CONTA',
  'BANCO',
  'TRAVA',
  'CIFRA',
  'ESCUDO',
  'ALERTA',
  'ACESSO',
  'SEGURO',
  'PERIGO',
  'FILTRO',
];

export interface VaultRound {
  /** A senha como aparece na porta do cofre, cifrada. */
  cipher: string;
  /** A chave: quantas casas cada letra andou para a frente. */
  shift: number;
  /** Para cada letra da senha, as letras oferecidas (uma e a certa). */
  choices: string[][];
  /** A senha decifrada. */
  plain: string;
}

export interface VaultInstance {
  rounds: VaultRound[];
}

/** Por rodada, as letras que o jogador tocou, na ordem (erros inclusive). */
export type VaultSolution = string[][];

/** A letra que fica `by` casas depois de `letter`, dando a volta no alfabeto. */
export function shiftLetter(letter: string, by: number): string {
  const at = ALPHABET.indexOf(letter);
  if (at < 0) return letter;
  const size = ALPHABET.length;
  return ALPHABET[(((at + by) % size) + size) % size] as string;
}

export function encode(plain: string, shift: number): string {
  return [...plain].map((letter) => shiftLetter(letter, shift)).join('');
}

/**
 * As opcoes de uma letra: a certa e as duas confusoes mais comuns -- andar para
 * o lado errado, e errar a conta por uma casa.
 */
function choicesFor(rng: () => number, plain: string, shift: number): string[] {
  const options = [plain];
  const candidates = [
    shiftLetter(plain, shift * 2),
    shiftLetter(plain, 1),
    shiftLetter(plain, -1),
    shiftLetter(plain, 2),
    shiftLetter(plain, -2),
  ];
  for (const letter of candidates) {
    if (options.length >= VAULT.CHOICES) break;
    if (!options.includes(letter)) options.push(letter);
  }
  return shuffle(rng, options);
}

export function generate(seed: string, difficulty: Difficulty): VaultInstance {
  const rng = createRng(`cofre:${seed}:${difficulty}`);
  const total = byDifficulty(VAULT.ROUNDS, difficulty, 2);
  const shiftMin = byDifficulty(VAULT.SHIFT_MIN, difficulty, 1);
  const shiftMax = byDifficulty(VAULT.SHIFT_MAX, difficulty, 1);
  const maxLen = byDifficulty(VAULT.MAX_LEN, difficulty, 5);

  const pool = shuffle(
    rng,
    WORDS.filter((word) => word.length <= maxLen),
  );

  const rounds: VaultRound[] = [];
  for (let index = 0; index < total; index += 1) {
    const plain = pool[index % pool.length] as string;
    const shift = randInt(rng, shiftMin, shiftMax);
    rounds.push({
      plain,
      shift,
      cipher: encode(plain, shift),
      choices: [...plain].map((letter) => choicesFor(rng, letter, shift)),
    });
  }
  return { rounds };
}

export function reference(instance: VaultInstance): VaultSolution {
  return instance.rounds.map((round) => [...round.plain]);
}

/** `ok` exige todas as senhas decifradas; cada letra errada custa eficiencia. */
export function evaluate(instance: VaultInstance, solution: VaultSolution): Evaluation {
  if (!Array.isArray(solution) || solution.length !== instance.rounds.length) {
    return { ok: false, efficiency: 0 };
  }
  let mistakes = 0;
  for (let i = 0; i < instance.rounds.length; i += 1) {
    const picks = solution[i];
    if (!Array.isArray(picks)) return { ok: false, efficiency: 0 };
    const replay = replaySequence([...(instance.rounds[i] as VaultRound).plain], picks);
    if (!replay.done) return { ok: false, efficiency: 0 };
    mistakes += replay.mistakes;
  }
  return { ok: true, efficiency: mistakeEfficiency(mistakes) };
}

export const era: EraId = 'seguranca';

export const vault: Minigame<VaultInstance, VaultSolution> = {
  era,
  generate,
  evaluate,
  reference,
};
