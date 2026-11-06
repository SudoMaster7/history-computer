import { describe, expect, it } from 'vitest';
import { buildQuiz, gradeQuiz, isCorrect } from './quiz';
import type { QuizQuestion } from './quiz';
import { QUIZ } from './constants';
import { ERAS } from './powers';
import { QUIZ_BANK } from '@/data/quizzes';

const bank: QuizQuestion[] = [
  { id: 'a', era: 'mecanica', prompt: 'p1', options: ['certa', 'x', 'y', 'z'], explain: 'e1' },
  { id: 'b', era: 'mecanica', prompt: 'p2', options: ['certa', 'x', 'y', 'z'], explain: 'e2' },
  { id: 'c', era: 'mecanica', prompt: 'p3', options: ['certa', 'x', 'y', 'z'], explain: 'e3' },
  { id: 'd', era: 'mecanica', prompt: 'p4', options: ['certa', 'x', 'y', 'z'], explain: 'e4' },
  { id: 'e', era: 'mecanica', prompt: 'p5', options: ['certa', 'x', 'y', 'z'], explain: 'e5' },
  { id: 'f', era: 'logica', prompt: 'p6', options: ['certa', 'x', 'y', 'z'], explain: 'e6' },
];

/** Indice da alternativa correta em cada pergunta da prova. */
function rightAnswers(quiz: NonNullable<ReturnType<typeof buildQuiz>>): number[] {
  return quiz.questions.map((q) => q.options.findIndex((o) => o.correct));
}

describe('buildQuiz', () => {
  it('sorteia perguntas so da era pedida', () => {
    const quiz = buildQuiz('logica', 's', bank);
    expect(quiz?.questions).toHaveLength(1);
    expect(quiz?.questions[0]?.prompt).toBe('p6');
  });

  it('monta a quantidade configurada de perguntas', () => {
    const quiz = buildQuiz('mecanica', 's', bank);
    expect(quiz?.questions).toHaveLength(QUIZ.QUESTIONS);
  });

  it('nao repete pergunta na mesma prova', () => {
    const quiz = buildQuiz('mecanica', 's', bank);
    const ids = quiz?.questions.map((q) => q.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada pergunta tem exatamente uma alternativa correta', () => {
    const quiz = buildQuiz('mecanica', 's', bank);
    for (const question of quiz?.questions ?? []) {
      expect(question.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });

  it('embaralha as alternativas: a correta nao fica sempre na primeira posicao', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const quiz = buildQuiz('mecanica', `seed-${i}`, bank);
      for (const index of rightAnswers(quiz!)) positions.add(index);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('e deterministico: a mesma seed monta a mesma prova', () => {
    expect(buildQuiz('mecanica', 'igual', bank)).toEqual(buildQuiz('mecanica', 'igual', bank));
  });

  it('seeds diferentes mudam a prova', () => {
    const a = buildQuiz('mecanica', 'um', bank);
    const b = buildQuiz('mecanica', 'dois', bank);
    expect(a).not.toEqual(b);
  });

  it('devolve null quando a era nao tem pergunta no banco', () => {
    expect(buildQuiz('ia', 's', bank)).toBeNull();
  });

  it('com banco menor que o pedido, usa o que existe', () => {
    const quiz = buildQuiz('logica', 's', bank);
    expect(quiz?.toPass).toBe(1);
  });
});

describe('gradeQuiz', () => {
  const quiz = buildQuiz('mecanica', 's', bank)!;

  it('acertar tudo passa', () => {
    const result = gradeQuiz(quiz, rightAnswers(quiz));
    expect(result).toEqual({ correct: 4, total: 4, passed: true });
  });

  it('errar tudo reprova', () => {
    const wrong = rightAnswers(quiz).map((i) => (i + 1) % 4);
    expect(gradeQuiz(quiz, wrong)).toEqual({ correct: 0, total: 4, passed: false });
  });

  it('o limite de aprovacao e 3 de 4', () => {
    expect(quiz.toPass).toBe(3);
    const answers = rightAnswers(quiz);
    const three = [...answers];
    three[3] = (answers[3]! + 1) % 4;
    expect(gradeQuiz(quiz, three).passed).toBe(true);

    const two = [...three];
    two[2] = (answers[2]! + 1) % 4;
    expect(gradeQuiz(quiz, two).passed).toBe(false);
  });

  it('pergunta sem resposta conta como erro', () => {
    expect(gradeQuiz(quiz, []).correct).toBe(0);
    expect(gradeQuiz(quiz, [-1, -1, -1, -1]).correct).toBe(0);
  });

  it('indice fora da faixa nao quebra nem pontua', () => {
    expect(gradeQuiz(quiz, [99, 99, 99, 99]).correct).toBe(0);
  });
});

describe('isCorrect', () => {
  const quiz = buildQuiz('mecanica', 's', bank)!;

  it('diz se a alternativa escolhida esta certa', () => {
    const question = quiz.questions[0]!;
    const right = question.options.findIndex((o) => o.correct);
    expect(isCorrect(question, right)).toBe(true);
    expect(isCorrect(question, (right + 1) % 4)).toBe(false);
    expect(isCorrect(question, 99)).toBe(false);
  });
});

describe('banco de perguntas do jogo', () => {
  it('toda era tem prova montavel, com alternativa certa e explicacao', () => {
    for (const era of ERAS) {
      const quiz = buildQuiz(era, `quiz-${era}-v1`, QUIZ_BANK);
      expect({ era, built: quiz !== null }).toEqual({ era, built: true });
      expect(quiz?.questions).toHaveLength(QUIZ.QUESTIONS);
      for (const question of quiz?.questions ?? []) {
        expect(question.options).toHaveLength(4);
        expect(question.options.filter((o) => o.correct)).toHaveLength(1);
        expect(question.explain.length).toBeGreaterThan(20);
      }
    }
  });

  it('nao ha id de pergunta repetido no banco', () => {
    const ids = QUIZ_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda pergunta pertence a uma era do jogo', () => {
    for (const question of QUIZ_BANK) expect(ERAS).toContain(question.era);
  });

  it('nenhuma alternativa se repete dentro da mesma pergunta', () => {
    for (const question of QUIZ_BANK) {
      expect(new Set(question.options).size).toBe(question.options.length);
    }
  });
});
