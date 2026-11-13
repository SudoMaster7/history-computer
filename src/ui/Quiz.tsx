import { useEffect, useState } from 'react';
import type { QuizResult } from '@/core/quiz';
import { isCorrect } from '@/core/quiz';
import { itemOfEra } from '@/core/items';
import { POWER_OF_ERA } from '@/core/powers';
import { Burst, play } from '@/fx';
import { useGameStore } from '@/store';
import type { EraId } from '@/core/types';
import { itemText } from './itemText';
import { IconBag, IconPower } from './icons';
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

  // O veredito tem som proprio; o aviso de nivel, se houver, vem do HUD.
  useEffect(() => {
    if (result) play(result.passed ? 'win' : 'fail');
  }, [result]);

  if (!quiz) return <p className="pad">{ui.app.renderFail}</p>;

  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;

  /** Acerto ou erro de cada pergunta ja respondida, na ordem. */
  const marks = answers.map((answer, i) => {
    const asked = quiz.questions[i];
    return asked ? isCorrect(asked, answer) : false;
  });
  /** Acertos seguidos ate a ultima resposta. E so placar de tela: nao muda a nota. */
  let streak = 0;
  for (let i = marks.length - 1; i >= 0 && marks[i]; i -= 1) streak += 1;

  function choose(option: number): void {
    if (chosen !== null || !question) return;
    setChosen(option);
    setAnswers((current) => [...current, option]);
    // A nota sobe a cada acerto seguido.
    if (isCorrect(question, option)) play('ok', 1 + Math.min(streak, 4) * 0.08);
    else play('fail');
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
      <section className="quiz quiz--result game-surface" aria-label={ui.quiz.resultTitle}>
        <h2>{ui.quiz.resultTitle}</h2>

        <div className={result.passed ? 'quiz__seal quiz__seal--ok' : 'quiz__seal'}>
          <strong className="quiz__sealScore" aria-hidden="true">
            {result.correct}/{result.total}
          </strong>
          {result.passed ? <Burst count={24} spread={120} /> : null}
        </div>

        <p className={result.passed ? 'quiz__verdict quiz__verdict--ok' : 'quiz__verdict'}>
          {result.passed ? ui.quiz.passed : ui.quiz.failed}
        </p>
        <p className="quiz__score">
          {ui.quiz.score}: {result.correct}/{result.total} ({ui.quiz.needed} {quiz.toPass})
        </p>

        {result.passed ? (
          <ul className="quiz__rewards" aria-label={ui.quiz.rewards}>
            <li>
              <span className="quiz__rewardIcon" aria-hidden="true">
                <IconPower size={20} />
              </span>
              <span>
                <strong>{ui.quiz.gotPower}:</strong> {ui.powers[POWER_OF_ERA[era]]}
              </span>
            </li>
            {item ? (
              <li>
                <span className="quiz__rewardIcon" aria-hidden="true">
                  <IconBag size={20} />
                </span>
                <span>
                  <strong>{ui.quiz.gotItem}:</strong> {itemText(item.id).name} —{' '}
                  {itemText(item.id).text}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="controls quiz__actions">
          {result.passed ? (
            <button type="button" className="quiz__primary" onClick={() => onFinish(true)}>
              {ui.quiz.continue}
            </button>
          ) : (
            <button type="button" className="quiz__primary" onClick={retry}>
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
    <section className={`quiz quiz--${era} game-surface`} aria-label={ui.quiz.title}>
      <div className="quiz__top">
        <p className="quiz__progress">
          {ui.quiz.question} {index + 1} {ui.quiz.of} {quiz.questions.length}
        </p>
        {/* Uma bolinha por pergunta: verde no acerto, vermelha no erro. */}
        <ol className="quiz__dots" aria-hidden="true">
          {quiz.questions.map((item, i) => (
            <li
              key={item.id}
              className="quiz__dot"
              data-state={
                i < marks.length ? (marks[i] ? 'right' : 'wrong') : i === index ? 'now' : 'next'
              }
            />
          ))}
        </ol>
      </div>

      <h2 key={question.id} className="quiz__prompt">
        {question.prompt}
      </h2>

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
                data-sfx="none"
                onClick={() => choose(i)}
              >
                {option.text}
              </button>
            </li>
          );
        })}
      </ul>

      {chosen !== null ? (
        <div
          className={
            isCorrect(question, chosen)
              ? 'quiz__feedback quiz__feedback--right'
              : 'quiz__feedback quiz__feedback--wrong'
          }
          role="status"
        >
          <strong>
            {isCorrect(question, chosen) ? ui.quiz.correct : ui.quiz.wrong}
            {streak >= 2 ? (
              <span className="quiz__streak">
                {ui.quiz.streak}: {streak}
              </span>
            ) : null}
          </strong>
          <p>{question.explain}</p>
          <button type="button" onClick={advance}>
            {last ? ui.quiz.seeResult : ui.quiz.next}
          </button>
        </div>
      ) : null}
    </section>
  );
}
