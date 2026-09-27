'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Headphones,
  Languages,
  Mic,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Banner, Button, Card, CardHeader, cx, LoadingBlock, PageHeader, ProgressBar } from '@/components/ui';
import * as api from '@/lib/api';
import { topMistakes, weakTopics, weakWords } from '@/lib/analytics';
import { addSession, saveLesson, todayKey, toggleLessonStep, uid, useDB, useHydrated } from '@/lib/store';
import type { DailyLesson, DailyLessonStep } from '@/lib/types';

const STEP_META: Record<
  DailyLessonStep['kind'],
  { icon: React.ComponentType<{ className?: string }>; href: string; cta: string }
> = {
  vocabulary: { icon: Languages, href: '/vocabulary', cta: 'Ir a Vocabulary' },
  grammar: { icon: GraduationCap, href: '/grammar', cta: 'Ir a Grammar' },
  listening: { icon: Headphones, href: '/listening', cta: 'Ir a Listening' },
  speaking: { icon: Mic, href: '/conversation', cta: 'Empezar a hablar' },
  reading: { icon: BookOpen, href: '/reading', cta: 'Ir a Reading' },
  review: { icon: RotateCcw, href: '/mistakes', cta: 'Repasar errores' },
};

export default function LessonPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lesson = db.lessons.find((l) => l.date === todayKey());

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await api.getLessonPlan({
        level: db.profile.level,
        weakTopics: weakTopics(db),
        weakWords: weakWords(db),
        frequentMistakes: topMistakes(db, 6).map(
          (m) => `"${m.original}" -> "${m.correction}" (${m.topic}, ${m.occurrences}x)`
        ),
        minutes: 20,
      });

      const next: DailyLesson = {
        id: uid('les'),
        date: todayKey(),
        title: plan.title,
        goal: plan.goal,
        level: db.profile.level,
        createdAt: Date.now(),
        steps: plan.steps.map((s) => ({
          id: uid('step'),
          kind: (s.kind as DailyLessonStep['kind']) ?? 'review',
          title: s.title,
          instructions: s.instructions,
          done: false,
        })),
      };
      saveLesson(next);
      addSession('lesson', 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la clase.');
    } finally {
      setLoading(false);
    }
  }, [db]);

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const doneCount = lesson?.steps.filter((s) => s.done).length ?? 0;
  const total = lesson?.steps.length ?? 0;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Today's Lesson"
        subtitle="Una clase de unos 20 minutos, armada con lo que peor llevas ahora mismo."
      />

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      {!lesson && !loading ? (
        <Card className="border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent)]/12 to-transparent">
          <CardHeader
            title="Genera tu clase de hoy"
            subtitle={`Nivel ${db.profile.level} · ${db.mistakes.length} errores registrados`}
            icon={<Sparkles className="size-4" />}
          />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <p className="text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
              La IA mira tus errores repetidos, tus temas flojos y tus palabras sin dominar, y arma
              una clase con vocabulario, gramatica, listening, speaking, reading y repaso.
            </p>
            <Button variant="primary" full size="lg" className="mt-4" onClick={generate}>
              Generar clase de hoy
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? <LoadingBlock label="Armando tu clase personalizada..." /> : null}

      {lesson ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={lesson.title}
              subtitle={lesson.goal}
              icon={<Sparkles className="size-4" />}
              action={
                <button onClick={generate} className="tap text-[var(--accent-soft)]" aria-label="Regenerar">
                  <RefreshCw className="size-4" />
                </button>
              }
            />
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
              <div className="mb-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--fg-muted)]">
                  {doneCount} de {total} pasos
                </span>
                <span className="font-semibold tabular-nums">{pct}%</span>
              </div>
              <ProgressBar value={pct} tone={pct === 100 ? 'success' : 'accent'} />
              {pct === 100 ? (
                <p className="mt-3 text-center text-[13.5px] font-medium text-[var(--success)]">
                  Clase completada. Buen trabajo.
                </p>
              ) : null}
            </div>
          </Card>

          <ul className="space-y-2">
            {lesson.steps.map((step, i) => {
              const meta = STEP_META[step.kind] ?? STEP_META.review;
              const Icon = meta.icon;
              return (
                <Card key={step.id} as="li" className={cx('p-4', step.done && 'opacity-65')}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleLessonStep(lesson.id, step.id)}
                      aria-label={step.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                      className={cx(
                        'tap mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
                        step.done
                          ? 'border-[var(--success)] bg-[var(--success)] text-white'
                          : 'border-[var(--border)]'
                      )}
                    >
                      {step.done ? <Check className="size-3.5" /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5 text-[var(--accent-soft)]" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
                          Paso {i + 1} · {step.kind}
                        </span>
                      </div>
                      <p
                        className={cx(
                          'mt-1 text-[15px] font-semibold leading-snug',
                          step.done && 'line-through'
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="selectable mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                        {step.instructions}
                      </p>

                      {!step.done ? (
                        <Link href={meta.href} className="mt-2.5 inline-block">
                          <Button size="sm">
                            {meta.cta}
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
