import { useState } from 'react';
import type { QuizResult } from '@/core/quiz';
import { isCorrect } from '@/core/quiz';
import { itemOfEra } from '@/core/items';
import { POWER_OF_ERA } from '@/core/powers';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import { itemText } from './itemText';
import ui from '@/data/ui.pt-BR.json';

interface Props {
  era: EraId;
  onFinish(passed: boolean): void;
  onExit(): void;
}

/**
 * Prova da era: substitui o portao da Linha do Tempo. Uma pergunta por vez,
 * com explicacao logo depois da resposta -- errar tambem ensina. Passar rende
 * o poder da era e o item dela.
 */
export default function Quiz({ era, onFinish, onExit }: Props) {
  const quiz = useGameStore((s) => s.quiz);
  const finishQuiz = useGameStore((s) => s.finishQuiz);
  const openQuiz = useGameStore((s) => s.openQuiz);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  if (!quiz) return <p className="pad">{ui.app.renderFail}</p>;

  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;

  function choose(option: number): void {
    if (chosen !== null) return;
    setChosen(option);
    setAnswers((current) => [...current, option]);
  }

  function advance(): void {
    if (!quiz) return;
    if (last) {
      setResult(finishQuiz(answers));
      return;
    }
    setChosen(null);
    setIndex((i) => i + 1);
  }

  function retry(): void {
    openQuiz(era);
    setIndex(0);
    setAnswers([]);
    setChosen(null);
    setResult(null);
  }

  if (result) {
    const item = itemOfEra(era);
    return (
      <section className="quiz game-surface" aria-label={ui.quiz.resultTitle}>
        <h2>{ui.quiz.resultTitle}</h2>
        <p className={result.passed ? 'quiz__verdict quiz__verdict--ok' : 'quiz__verdict'}>
          {result.passed ? ui.quiz.passed : ui.quiz.failed}
        </p>
        <p className="quiz__score">
          {ui.quiz.score}: {result.correct}/{result.total} ({ui.quiz.needed} {quiz.toPass})
        </p>

        {result.passed ? (
          <ul className="quiz__rewards">
            <li>
              <strong>{ui.quiz.gotPower}:</strong> {ui.powers[POWER_OF_ERA[era]]}
            </li>
            {item ? (
              <li>
                <strong>{ui.quiz.gotItem}:</strong> {itemText(item.id).name} —{' '}
                {itemText(item.id).text}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="controls">
          {result.passed ? (
            <button type="button" onClick={() => onFinish(true)}>
              {ui.quiz.continue}
            </button>
          ) : (
            <button type="button" onClick={retry}>
              {ui.quiz.retry}
            </button>
          )}
          <button type="button" onClick={onExit}>
            {ui.quiz.backToWorld}
          </button>
        </div>
      </section>
    );
  }

  if (!question) return <p className="pad">{ui.app.renderFail}</p>;

  return (
    <section className="quiz game-surface" aria-label={ui.quiz.title}>
      <p className="quiz__progress">
        {ui.quiz.question} {index + 1} {ui.quiz.of} {quiz.questions.length}
      </p>
      <h2 className="quiz__prompt">{question.prompt}</h2>

      <ul className="quiz__options">
        {question.options.map((option, i) => {
          const picked = chosen === i;
          const reveal = chosen !== null;
          const right = option.correct;
          const className = !reveal
            ? 'quiz__option'
            : right
              ? 'quiz__option quiz__option--right'
              : picked
                ? 'quiz__option quiz__option--wrong'
                : 'quiz__option';
          return (
            <li key={option.text}>
              <button
                type="button"
                className={className}
                disabled={reveal}
                onClick={() => choose(i)}
              >
                {option.text}
              </button>
            </li>
          );
        })}
      </ul>

      {chosen !== null ? (
        <div className="quiz__feedback" role="status">
          <strong>{isCorrect(question, chosen) ? ui.quiz.correct : ui.quiz.wrong}</strong>
          <p>{question.explain}</p>
          <button type="button" onClick={advance}>
            {last ? ui.quiz.seeResult : ui.quiz.next}
          </button>
        </div>
      ) : null}
    </section>
  );
}
