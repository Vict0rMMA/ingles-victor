'use client';

import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button, Card, cx } from '../ui';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

/**
 * Cuestionario de opcion multiple reutilizado por Reading, Listening y Grammar.
 * Corrige al instante, explica el porque y devuelve aciertos reales al terminar.
 */
export function Quiz({
  questions,
  onFinish,
  onRetry,
}: {
  questions: QuizQuestion[];
  onFinish: (correct: number, total: number) => void;
  onRetry?: () => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [done, setDone] = useState(false);

  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === questions[i].answer).length;

  const choose = (qi: number, oi: number) => {
    if (answers[qi] !== null || done) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  };

  const finish = () => {
    setDone(true);
    onFinish(correct, questions.length);
  };

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => {
        const picked = answers[qi];
        return (
          <Card key={qi} className="p-4">
            <p className="selectable text-[14.5px] font-medium leading-snug">
              <span className="mr-1.5 text-[var(--fg-subtle)]">{qi + 1}.</span>
              {q.question}
            </p>

            <div className="mt-3 space-y-2">
              {q.options.map((o, oi) => {
                const isPicked = picked === oi;
                const isRight = oi === q.answer;
                const reveal = picked !== null;
                return (
                  <button
                    key={oi}
                    onClick={() => choose(qi, oi)}
                    disabled={reveal}
                    className={cx(
                      'tap flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[14px]',
                      !reveal && 'border-[var(--border)] bg-[var(--surface-2)]',
                      reveal && isRight && 'border-[var(--success)]/50 bg-[var(--success)]/12',
                      reveal &&
                        isPicked &&
                        !isRight &&
                        'border-[var(--danger)]/50 bg-[var(--danger)]/12',
                      reveal && !isRight && !isPicked && 'border-[var(--border-soft)] opacity-55'
                    )}
                  >
                    <span
                      className={cx(
                        'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                        reveal && isRight
                          ? 'border-[var(--success)] text-[var(--success)]'
                          : reveal && isPicked
                            ? 'border-[var(--danger)] text-[var(--danger)]'
                            : 'border-[var(--border)] text-[var(--fg-subtle)]'
                      )}
                    >
                      {reveal && isRight ? (
                        <Check className="size-3" />
                      ) : reveal && isPicked ? (
                        <X className="size-3" />
                      ) : (
                        String.fromCharCode(65 + oi)
                      )}
                    </span>
                    <span className="selectable">{o}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null ? (
              <p className="animate-fade-in selectable mt-2.5 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                {q.explanation}
              </p>
            ) : null}
          </Card>
        );
      })}

      {!done ? (
        <Button
          variant="primary"
          full
          size="lg"
          disabled={answered < questions.length}
          onClick={finish}
        >
          {answered < questions.length
            ? `Responde las ${questions.length - answered} que faltan`
            : 'Terminar y guardar'}
        </Button>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-[13px] text-[var(--fg-muted)]">Resultado</p>
          <p className="mt-1 text-[28px] font-semibold tabular-nums">
            {correct}
            <span className="text-[var(--fg-subtle)]">/{questions.length}</span>
          </p>
          <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
            {correct === questions.length
              ? 'Perfecto. Todo correcto.'
              : correct >= questions.length * 0.6
                ? 'Bien. Revisa las explicaciones de los fallos.'
                : 'Repasa la explicacion y vuelve a intentarlo.'}
          </p>
          {onRetry ? (
            <Button className="mt-3" full onClick={onRetry}>
              <RotateCcw className="size-4" />
              Generar otro ejercicio
            </Button>
          ) : null}
        </Card>
      )}
    </div>
  );
}
