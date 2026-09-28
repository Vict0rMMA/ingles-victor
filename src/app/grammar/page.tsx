'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Languages, RefreshCw, TriangleAlert } from 'lucide-react';
import { Quiz } from '@/components/practice/Quiz';
import { Banner, Button, Card, CardHeader, Chip, LoadingBlock, PageHeader, ProgressBar } from '@/components/ui';
import * as api from '@/lib/api';
import { getCachedExercise, putCachedExercise } from '@/lib/cache';
import { topMistakes, weakTopics } from '@/lib/analytics';
import { GRAMMAR_TOPICS } from '@/lib/modes';
import { addExerciseResult, addSession, useDB, useHydrated } from '@/lib/store';
import type { GrammarExercise } from '@/lib/types';

export default function GrammarPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [topic, setTopic] = useState('Past Simple');
  const [exercise, setExercise] = useState<GrammarExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spanish, setSpanish] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('topic');
    if (t) setTopic(t);
  }, []);

  const weak = hydrated ? weakTopics(db, 6) : [];

  const generate = useCallback(
    async (chosen?: string, options: { fresh?: boolean } = {}) => {
      const target = chosen ?? topic;
      setTopic(target);
      setError(null);
      setExercise(null);

      // Un tema de gramatica ya generado sirve igual la segunda vez.
      if (!options.fresh) {
        const cached = getCachedExercise<GrammarExercise>('grammar', db.profile.level, target);
        if (cached) {
          setExercise(cached);
          setFromCache(true);
          return;
        }
      }

      setLoading(true);
      setFromCache(false);
      try {
        const data = await api.getGrammar({
          level: db.profile.level,
          topic: target,
          frequentMistakes: topMistakes(db, 5).map((m) => `"${m.original}" -> "${m.correction}"`),
        });
        setExercise(data);
        putCachedExercise('grammar', db.profile.level, target, data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo generar la leccion.');
      } finally {
        setLoading(false);
      }
    },
    [db, topic]
  );

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Grammar"
        subtitle="Explicacion, ejemplos y practica. Los temas que fallas aparecen marcados."
      />

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      {weak.length ? (
        <Card className="mb-4 border-[var(--warning)]/30 bg-[var(--warning)]/8">
          <CardHeader
            title="Tus temas mas flojos"
            subtitle="Salen de tus errores reales, no de una lista generica"
            icon={<TriangleAlert className="size-4" />}
          />
          <div className="flex flex-wrap gap-2 p-4 pt-3 sm:p-5 sm:pt-3">
            {weak.map((t) => (
              <Chip key={t} active={topic === t} onClick={() => void generate(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader title="Temas" icon={<GraduationCap className="size-4" />} />
        <div className="p-4 pt-3 sm:p-5 sm:pt-3">
          <div className="flex flex-wrap gap-2">
            {GRAMMAR_TOPICS.map((t) => {
              const progress = db.grammar.find((g) => g.topic === t);
              return (
                <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>
                  {t}
                  {progress && progress.attempts > 0 ? (
                    <span className="ml-1 text-[10.5px] text-[var(--fg-subtle)]">
                      {Math.round((progress.correct / progress.attempts) * 100)}%
                    </span>
                  ) : null}
                </Chip>
              );
            })}
          </div>
          <Button variant="primary" full size="lg" className="mt-4" onClick={() => void generate()}>
            Practicar {topic}
          </Button>
        </div>
      </Card>

      {loading ? <LoadingBlock label={`Preparando ${topic}...`} /> : null}

      {exercise ? (
        <div className="animate-fade-up space-y-4">
          <Card>
            <CardHeader
              title={exercise.topic}
              subtitle={
                fromCache
                  ? `Nivel ${db.profile.level} · guardado, sin gastar API`
                  : `Nivel ${db.profile.level}`
              }
              icon={<GraduationCap className="size-4" />}
              action={
                <button onClick={() => void generate(undefined, { fresh: true })} className="tap text-[var(--accent-soft)]" title="Generar otra leccion (gasta una peticion)">
                  <RefreshCw className="size-4" />
                </button>
              }
            />
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
              <p className="selectable text-[15px] leading-relaxed">
                {spanish ? exercise.explanationEs : exercise.explanation}
              </p>
              <button
                onClick={() => setSpanish((s) => !s)}
                className="tap mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--fg-muted)]"
              >
                <Languages className="size-3.5" />
                {spanish ? 'Ver en ingles' : 'Ver en espanol'}
              </button>

              <ul className="mt-4 space-y-2">
                {exercise.examples.map((e, i) => (
                  <li
                    key={i}
                    className="selectable rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-3.5 py-2.5 text-[14.5px] leading-snug"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {(() => {
            const progress = db.grammar.find((g) => g.topic === exercise.topic);
            if (!progress || progress.attempts === 0) return null;
            const pct = Math.round((progress.correct / progress.attempts) * 100);
            return (
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="text-[var(--fg-muted)]">Tu acierto en este tema</span>
                  <span className="font-semibold tabular-nums">{pct}%</span>
                </div>
                <ProgressBar value={pct} tone={pct >= 70 ? 'success' : 'warning'} />
                <p className="mt-1.5 text-[11.5px] text-[var(--fg-subtle)]">
                  Sobre {progress.attempts} respuestas reales.
                </p>
              </Card>
            );
          })()}

          <section>
            <h2 className="mb-2 text-[14px] font-semibold">Practica</h2>
            <Quiz
              questions={exercise.questions}
              onRetry={() => void generate(undefined, { fresh: true })}
              onFinish={(correct, total) => {
                addExerciseResult({ kind: 'grammar', topic: exercise.topic, correct, total });
                addSession('grammar', 200);
              }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
