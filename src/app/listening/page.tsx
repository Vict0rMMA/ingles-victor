'use client';

import { useCallback, useState } from 'react';
import { Eye, EyeOff, Headphones, Play, RefreshCw } from 'lucide-react';
import { Quiz } from '@/components/practice/Quiz';
import { Banner, Button, Card, CardHeader, Chip, LoadingBlock, PageHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { QUOTA_NOTICE, speakText } from '@/lib/speech';
import { weakTopics } from '@/lib/analytics';
import { playWav, replay, unlockAudio } from '@/lib/audio/player';
import { TOPICS } from '@/lib/modes';
import { addExerciseResult, addSession, useDB, useHydrated } from '@/lib/store';
import type { ListeningExercise } from '@/lib/types';

export default function ListeningPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [topic, setTopic] = useState('');
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [played, setPlayed] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExercise(null);
    setPlayed(false);
    setShowScript(false);
    try {
      const data = await api.getListening({
        level: db.profile.level,
        topic: topic || undefined,
        weakTopics: weakTopics(db),
      });
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el audio.');
    } finally {
      setLoading(false);
    }
  }, [db, topic]);

  const play = useCallback(async () => {
    if (!exercise) return;
    setError(null);
    // Si ya se genero el audio, repetirlo no gasta otra llamada a la API.
    if (played) {
      await replay();
      return;
    }
    setAudioLoading(true);
    try {
      await unlockAudio();
      const r = await speakText(exercise.script, db.settings, { force: true });
      if (r.fellBack) setError(QUOTA_NOTICE);
      // La voz del dispositivo no se puede repetir sin volver a sintetizar.
      setPlayed(r.used === 'gemini');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reproducir el audio.');
    } finally {
      setAudioLoading(false);
    }
  }, [db.settings.voice, exercise, played]);

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Listening Practice"
        subtitle="Escucha una conversacion generada a tu nivel y responde sin mirar el texto."
      />

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      {!exercise && !loading ? (
        <Card className="mb-4">
          <CardHeader
            title="Elige un tema"
            subtitle="Opcional: sin tema, la IA elige por ti"
            icon={<Headphones className="size-4" />}
          />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <Button variant="primary" full size="lg" className="mt-4" onClick={generate}>
              Generar audio
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? <LoadingBlock label="Preparando la conversacion..." /> : null}

      {exercise ? (
        <div className="space-y-4">
          <Card className="border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent)]/10 to-transparent">
            <CardHeader
              title={exercise.title}
              subtitle={played ? 'Puedes repetirlo las veces que quieras' : 'Escucha con atencion'}
              icon={<Headphones className="size-4" />}
              action={
                <button onClick={generate} className="tap text-[var(--accent-soft)]">
                  <RefreshCw className="size-4" />
                </button>
              }
            />
            <div className="flex flex-col items-center gap-3 p-6">
              <button
                onClick={play}
                disabled={audioLoading}
                aria-label="Reproducir audio"
                className="tap flex size-20 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_40px_var(--accent-glow)] disabled:opacity-60"
              >
                <Play className="size-8" fill="currentColor" />
              </button>
              <p className="text-[13px] text-[var(--fg-muted)]">
                {audioLoading
                  ? 'Generando la voz...'
                  : played
                    ? 'Tocar para repetir'
                    : 'Tocar para escuchar'}
              </p>
            </div>
          </Card>

          <section>
            <h2 className="mb-2 text-[14px] font-semibold">Preguntas</h2>
            <Quiz
              questions={exercise.questions}
              onRetry={generate}
              onFinish={(correct, total) => {
                addExerciseResult({ kind: 'listening', topic: exercise.title, correct, total });
                addSession('listening', 240);
                setShowScript(true);
              }}
            />
          </section>

          <Card>
            <CardHeader
              title="Transcripcion"
              subtitle="Compruebala despues de responder"
              action={
                <button
                  onClick={() => setShowScript((s) => !s)}
                  className="tap flex items-center gap-1.5 text-[12.5px] text-[var(--accent-soft)]"
                >
                  {showScript ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  {showScript ? 'Ocultar' : 'Mostrar'}
                </button>
              }
            />
            {showScript ? (
              <p className="selectable animate-fade-in whitespace-pre-wrap px-4 pb-4 text-[15px] leading-[1.75] sm:px-5 sm:pb-5">
                {exercise.script}
              </p>
            ) : (
              <p className="px-4 pb-4 text-[13px] text-[var(--fg-subtle)] sm:px-5 sm:pb-5">
                Intenta responder primero sin leerla.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
