'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import { Banner, Button, Card, CardHeader, LoadingBlock, PageHeader, ProgressBar } from '@/components/ui';
import * as api from '@/lib/api';
import { estimateLevel, LEVEL_DESCRIPTION } from '@/lib/analytics';
import { addSession, setProfile, useDB, useHydrated } from '@/lib/store';
import type { LevelScores, PlacementQuestion } from '@/lib/types';

type Stage = 'intro' | 'test' | 'result';

export default function OnboardingPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [stage, setStage] = useState<Stage>('intro');
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ level: string; scores: LevelScores } | null>(null);

  const startTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPlacement(db.profile.level);
      if (!data.questions?.length) throw new Error('No se recibieron preguntas.');
      setQuestions(data.questions);
      setAnswers([]);
      setIndex(0);
      setStage('test');
      if (name.trim()) setProfile({ name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el test.');
    } finally {
      setLoading(false);
    }
  }, [db.profile.level, name]);

  const answer = (choice: number) => {
    const next = [...answers, choice];
    setAnswers(next);

    if (next.length < questions.length) {
      setIndex((i) => i + 1);
      return;
    }

    // Nivel a partir del rendimiento por dificultad, no de una sola respuesta.
    const estimate = estimateLevel(
      questions.map((q, i) => ({ level: q.level, correct: next[i] === q.answer }))
    );

    const scores: LevelScores = {
      grammar: 0,
      vocabulary: 0,
      reading: 0,
      writing: 0,
      listening: 0,
      speaking: 0,
    };
    const counts: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      const entry = counts[q.skill] ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (next[i] === q.answer) entry.correct += 1;
      counts[q.skill] = entry;
    });
    for (const key of Object.keys(scores) as (keyof LevelScores)[]) {
      const c = counts[key];
      scores[key] = c ? Math.round((c.correct / c.total) * 100) : 0;
    }

    setProfile({
      level: estimate.level,
      levelScores: scores,
      levelPoints: 0,
      placementDone: true,
      ...(name.trim() ? { name: name.trim() } : {}),
    });
    addSession('lesson', 300);
    setResult({ level: estimate.level, scores });
    setStage('result');
  };

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  /* ------------------------------- intro ------------------------------- */

  if (stage === 'intro') {
    return (
      <div className="animate-fade-in mx-auto max-w-lg">
        <PageHeader
          title="Empecemos por tu nivel"
          subtitle="12 preguntas rapidas para ajustar las conversaciones y los ejercicios a como hablas hoy."
        />

        {error ? (
          <div className="mb-4">
            <Banner tone="danger" onClose={() => setError(null)}>
              {error}
            </Banner>
          </div>
        ) : null}

        <Card className="mb-4">
          <div className="p-5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
                ¿Como te llamas? (opcional)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoCapitalize="words"
                enterKeyHint="done"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
              />
            </label>

            <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
              <li>· Gramatica, vocabulario, reading, writing y listening.</li>
              <li>· Dura unos 5 minutos.</li>
              <li>· Puedes repetirlo cuando quieras desde Ajustes.</li>
            </ul>

            <Button
              variant="primary"
              full
              size="lg"
              className="mt-5"
              loading={loading}
              onClick={startTest}
            >
              Empezar el test
            </Button>
          </div>
        </Card>

        <p className="text-center text-[12.5px] text-[var(--fg-subtle)]">
          ¿Prefieres saltarlo?{' '}
          <Link href="/conversation" className="text-[var(--accent-soft)] underline">
            Ir directo a conversar
          </Link>
        </p>
      </div>
    );
  }

  /* -------------------------------- test -------------------------------- */

  if (stage === 'test') {
    if (loading) return <LoadingBlock label="Preparando tu test..." />;
    const q = questions[index];
    const pct = Math.round((index / questions.length) * 100);

    return (
      <div className="animate-fade-in mx-auto max-w-lg">
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-[12.5px] text-[var(--fg-muted)]">
            <span>
              Pregunta {index + 1} de {questions.length}
            </span>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px]">
              {q.skill}
            </span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <Card className="p-5">
          <p className="selectable text-[17px] font-medium leading-snug">{q.question}</p>

          <div className="mt-5 space-y-2">
            {q.options.map((o, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                className="tap flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-left text-[15px]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[11px] font-semibold text-[var(--fg-subtle)]">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="selectable">{o}</span>
              </button>
            ))}
          </div>
        </Card>

        <p className="mt-4 text-center text-[12px] text-[var(--fg-subtle)]">
          Responde lo que creas. No se penaliza fallar: sirve para medir tu nivel real.
        </p>
      </div>
    );
  }

  /* ------------------------------- resultado ------------------------------- */

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <Card className="border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent)]/14 to-transparent">
        <div className="p-6 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]">
            <GraduationCap className="size-7" />
          </span>
          <p className="mt-4 text-[13px] text-[var(--fg-muted)]">Tu nivel estimado es</p>
          <p className="mt-1 text-[44px] font-semibold leading-none">{result?.level}</p>
          <p className="mx-auto mt-3 max-w-xs text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
            {LEVEL_DESCRIPTION[(result?.level ?? 'A2') as keyof typeof LEVEL_DESCRIPTION]}
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Como te fue por habilidad"
          subtitle="Porcentaje de aciertos reales en el test"
          icon={<Sparkles className="size-4" />}
        />
        <div className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
          {result
            ? (Object.entries(result.scores) as [keyof LevelScores, number][])
                .filter(([, value]) => value > 0)
                .map(([skill, value]) => (
                  <div key={skill}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="capitalize">{skill}</span>
                      <span className="tabular-nums text-[var(--fg-muted)]">{value}%</span>
                    </div>
                    <ProgressBar value={value} tone={value >= 70 ? 'success' : 'warning'} />
                  </div>
                ))
            : null}
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        <Link href="/conversation" className="block">
          <Button variant="primary" full size="lg">
            Tener mi primera conversacion
            <ArrowRight className="size-4" />
          </Button>
        </Link>
        <Link href="/" className="block">
          <Button full>Ir al inicio</Button>
        </Link>
      </div>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-[var(--fg-subtle)]">
        El nivel se ajustara solo segun tu rendimiento acumulado. Una respuesta suelta no lo cambia.
      </p>
    </div>
  );
}
