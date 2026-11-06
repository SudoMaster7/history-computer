import type { EraId } from './types';
import { QUIZ } from './constants';
import { createRng, shuffle } from './rng';

/**
 * Quiz da era: a prova que o personagem da porta aplica antes de liberar o
 * poder. Acertar rende o poder da era e o item dela.
 *
 * Puro e deterministico: sem React, DOM, relogio nem Math.random. A ordem das
 * alternativas vem de `createRng(seed)`, entao a mesma seed da sempre a mesma
 * prova.
 */

/** Pergunta como fica no JSON: a alternativa certa e sempre a primeira. */
export interface QuizQuestion {
  id: string;
  era: EraId;
  prompt: string;
  /** A primeira e a correta; `buildQuiz` embaralha antes de mostrar. */
  options: readonly string[];
  /** Por que a resposta certa e certa. Aparece depois de responder. */
  explain: string;
}

export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface QuizItem {
  id: string;
  prompt: string;
  options: readonly QuizOption[];
  explain: string;
}

export interface QuizInstance {
  era: EraId;
  questions: readonly QuizItem[];
  /** Acertos necessarios para passar. */
  toPass: number;
}

export interface QuizResult {
  correct: number;
  total: number;
  passed: boolean;
}

/**
 * Monta a prova de uma era: sorteia as perguntas do banco e embaralha as
 * alternativas de cada uma.
 */
export function buildQuiz(
  era: EraId,
  seed: string,
  bank: readonly QuizQuestion[],
): QuizInstance | null {
  const pool = bank.filter((q) => q.era === era);
  if (pool.length === 0) return null;

  const rng = createRng(`quiz:${era}:${seed}`);
  const picked = shuffle(rng, pool).slice(0, Math.min(QUIZ.QUESTIONS, pool.length));

  const questions: QuizItem[] = picked.map((question) => {
    const [answer, ...rest] = question.options;
    const options: QuizOption[] = [
      { text: answer ?? '', correct: true },
      ...rest.map((text) => ({ text, correct: false })),
    ];
    return {
      id: question.id,
      prompt: question.prompt,
      options: shuffle(rng, options),
      explain: question.explain,
    };
  });

  const toPass = Math.ceil(questions.length * QUIZ.PASS_RATIO);
  return { era, questions, toPass };
}

/**
 * Corrige a prova. `answers[i]` e o indice escolhido na pergunta `i`; -1 (ou
 * ausente) conta como nao respondida.
 */
export function gradeQuiz(quiz: QuizInstance, answers: readonly number[]): QuizResult {
  let correct = 0;
  quiz.questions.forEach((question, index) => {
    const chosen = answers[index];
    if (chosen === undefined || chosen < 0) return;
    if (question.options[chosen]?.correct) correct += 1;
  });
  return { correct, total: quiz.questions.length, passed: correct >= quiz.toPass };
}

/** Se a alternativa escolhida numa pergunta esta certa. */
export function isCorrect(question: QuizItem, chosen: number): boolean {
  return question.options[chosen]?.correct === true;
}
