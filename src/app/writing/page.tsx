'use client';

import { useMemo, useState } from 'react';
import { Check, PenLine, Send, Sparkles } from 'lucide-react';
import { CorrectionCard } from '@/components/conversation/CorrectionCard';
import { Banner, Button, Card, CardHeader, PageHeader, Segmented } from '@/components/ui';
import * as api from '@/lib/api';
import { addExerciseResult, addSession, recordCorrections, useDB, useHydrated } from '@/lib/store';
import type { WritingFeedback } from '@/lib/types';

type Kind = 'free' | 'translate' | 'answer';

const TASKS: Record<Kind, string[]> = {
  free: [
    'Describe tu dia de hoy en cinco frases.',
    'Escribe sobre tu pelicula favorita y por que te gusta.',
    'Cuenta que hiciste el fin de semana pasado.',
    'Describe tu ciudad a alguien que nunca ha estado alli.',
  ],
  translate: [
    'Tengo 21 anos y estudio ingenieria de sistemas.',
    'Ayer fui a la universidad y tuve clase de ingles.',
    'Me gustaria trabajar en una empresa de tecnologia.',
    'Hace dos anos que no viajo a otro pais.',
  ],
  answer: [
    'What do you usually do on weekends?',
    'Why are you learning English?',
    'Describe a problem you solved recently.',
    'What are your plans for next year?',
  ],
};

const KIND_HINT: Record<Kind, string> = {
  free: 'Escribe libremente en ingles sobre la consigna.',
  translate: 'Expresa esta idea en ingles. No traduzcas palabra por palabra.',
  answer: 'Responde la pregunta en ingles con al menos tres frases.',
};

export default function WritingPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [kind, setKind] = useState<Kind>('free');
  const [taskIndex, setTaskIndex] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const task = TASKS[kind][taskIndex % TASKS[kind].length];
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const data = await api.checkWriting({
        text: text.trim(),
        level: db.profile.level,
        task: kind === 'translate' ? undefined : task,
        kind,
        source: kind === 'translate' ? task : undefined,
      });
      setFeedback(data);
      if (data.corrections.length) recordCorrections(data.corrections, 'writing');

      // Metrica real: frases enviadas frente a frases sin errores.
      const sentences = Math.max(1, text.trim().split(/[.!?]+/).filter((s) => s.trim()).length);
      const withErrors = new Set(data.corrections.map((c) => c.original.trim())).size;
      addExerciseResult({
        kind: 'writing',
        topic: kind === 'translate' ? 'Traduccion' : 'Escritura libre',
        correct: Math.max(0, sentences - withErrors),
        total: sentences,
      });
      addSession('writing', 120);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revisar el texto.');
    } finally {
      setLoading(false);
    }
  };

  const nextTask = () => {
    setTaskIndex((i) => i + 1);
    setText('');
    setFeedback(null);
  };

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Writing"
        subtitle="Escribe en ingles y recibe la correccion, el porque y la version mas natural."
      />

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      <div className="mb-4">
        <Segmented
          value={kind}
          onChange={(v) => {
            setKind(v);
            setTaskIndex(0);
            setText('');
            setFeedback(null);
          }}
          options={[
            { value: 'free', label: 'Libre' },
            { value: 'translate', label: 'Del espanol' },
            { value: 'answer', label: 'Responder' },
          ]}
        />
      </div>

      <Card className="mb-4">
        <CardHeader
          title={kind === 'translate' ? 'Expresa esta idea en ingles' : 'Consigna'}
          subtitle={KIND_HINT[kind]}
          icon={<PenLine className="size-4" />}
          action={
            <button
              onClick={nextTask}
              className="tap text-[12.5px] text-[var(--accent-soft)]"
            >
              Otra
            </button>
          }
        />
        <div className="p-4 pt-3 sm:p-5 sm:pt-3">
          <p className="selectable rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[15px] leading-relaxed">
            {task}
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Write in English..."
            autoCapitalize="sentences"
            className="mt-3 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] leading-relaxed outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12px] text-[var(--fg-subtle)]">{words} palabras</span>
            <Button variant="primary" loading={loading} disabled={!text.trim()} onClick={submit}>
              <Send className="size-4" />
              Revisar
            </Button>
          </div>
        </div>
      </Card>

      {feedback ? (
        <div className="animate-fade-up space-y-4">
          <Card>
            <CardHeader
              title="Tu texto corregido"
              subtitle={feedback.scoreNote}
              icon={<Check className="size-4" />}
            />
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
              <p className="selectable whitespace-pre-wrap rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/8 px-4 py-3 text-[15px] leading-relaxed">
                {feedback.corrected}
              </p>

              {feedback.naturalVersion && feedback.naturalVersion !== feedback.corrected ? (
                <div className="mt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--info)]">
                    <Sparkles className="size-3.5" />
                    Como lo diria un nativo
                  </p>
                  <p className="selectable whitespace-pre-wrap rounded-xl border border-[var(--info)]/25 bg-[var(--info)]/8 px-4 py-3 text-[15px] leading-relaxed">
                    {feedback.naturalVersion}
                  </p>
                </div>
              ) : null}

              {feedback.positives?.length ? (
                <ul className="mt-3 space-y-1.5">
                  {feedback.positives.map((p, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-[var(--fg-muted)]">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />
                      <span className="selectable">{p}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>

          {feedback.corrections.length ? (
            <section>
              <h2 className="mb-2 text-[14px] font-semibold">
                {feedback.corrections.length} correccion
                {feedback.corrections.length > 1 ? 'es' : ''}
              </h2>
              {feedback.corrections.map((c, i) => (
                <CorrectionCard key={i} correction={c} />
              ))}
              <p className="mt-2 text-[12px] text-[var(--fg-subtle)]">
                Estos errores quedaron guardados en tu historial para las proximas practicas.
              </p>
            </section>
          ) : (
            <Banner tone="success" title="Sin errores">
              No se encontro ningun error real en tu texto. Sube la dificultad con una consigna mas
              larga.
            </Banner>
          )}

          <Button full onClick={nextTask}>
            Siguiente consigna
          </Button>
        </div>
      ) : null}
    </div>
  );
}
