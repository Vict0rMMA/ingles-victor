'use client';

import { useCallback, useState } from 'react';
import { BookOpen, Headphones, Mic, Plus, RefreshCw } from 'lucide-react';
import { Quiz } from '@/components/practice/Quiz';
import { Banner, Button, Card, CardHeader, Chip, LoadingBlock, PageHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { QUOTA_NOTICE, speakText } from '@/lib/speech';
import { weakTopics } from '@/lib/analytics';
import { Mic as MicRecorder, MicError } from '@/lib/audio/mic';
import { playWav, stopPlayback, unlockAudio } from '@/lib/audio/player';
import { TOPICS } from '@/lib/modes';
import { addExerciseResult, addSession, addWords, addPronunciation, useDB, useHydrated } from '@/lib/store';
import type { PronunciationFeedback, ReadingExercise } from '@/lib/types';

export default function ReadingPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [topic, setTopic] = useState('');
  const [exercise, setExercise] = useState<ReadingExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micRef, setMicRef] = useState<MicRecorder | null>(null);
  const [readFeedback, setReadFeedback] = useState<PronunciationFeedback | null>(null);
  const [savedWords, setSavedWords] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExercise(null);
    setReadFeedback(null);
    setSavedWords(false);
    try {
      const data = await api.getReading({
        level: db.profile.level,
        topic: topic || undefined,
        weakTopics: weakTopics(db),
      });
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el texto.');
    } finally {
      setLoading(false);
    }
  }, [db, topic]);

  const listen = useCallback(async () => {
    if (!exercise) return;
    setSpeaking(true);
    try {
      await unlockAudio();
      const r = await speakText(exercise.text, db.settings, { force: true });
      if (r.fellBack) setError(QUOTA_NOTICE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el audio.');
    } finally {
      setSpeaking(false);
    }
  }, [db.settings.voice, exercise]);

  /** Lectura en voz alta: se evalua solo la primera frase, que es lo medible. */
  const firstSentence = exercise?.text.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';

  const toggleReadAloud = useCallback(async () => {
    if (recording && micRef) {
      setRecording(false);
      setMicRef(null);
      const result = micRef.stop();
      if (!result.base64 || result.durationMs < 500) {
        setError('La grabacion fue muy corta.');
        return;
      }
      try {
        const data = await api.checkPronunciation(firstSentence, {
          data: result.base64,
          mimeType: 'audio/wav',
        });
        setReadFeedback(data);
        addPronunciation({
          target: firstSentence,
          heard: data.heard,
          understood: data.understood,
          verdict: data.verdict,
          focus: data.focus,
          tip: data.tip,
          tipEs: data.tipEs,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo analizar la lectura.');
      }
      return;
    }

    stopPlayback();
    const mic = new MicRecorder();
    try {
      await mic.start({
        collect: true,
        onLevel: () => {
          if (mic.durationMs > 25_000) void toggleReadAloud();
        },
      });
      setMicRef(mic);
      setRecording(true);
      setReadFeedback(null);
    } catch (err) {
      setError(err instanceof MicError ? err.message : 'No se pudo abrir el microfono.');
    }
  }, [firstSentence, micRef, recording]);

  const saveVocabulary = () => {
    if (!exercise) return;
    addWords(
      exercise.vocabulary.map((v) => ({
        word: v.word,
        meaning: '',
        meaningEs: v.meaningEs,
        example: v.example,
      })),
      db.profile.level
    );
    setSavedWords(true);
  };

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reading Practice"
        subtitle={`Textos generados para tu nivel ${db.profile.level}, con preguntas, vocabulario y lectura en voz alta.`}
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
          <CardHeader title="Elige un tema" subtitle="Opcional: sin tema, la IA elige por ti" icon={<BookOpen className="size-4" />} />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>
                  {t}
                </Chip>
              ))}
            </div>
            <Button variant="primary" full size="lg" className="mt-4" onClick={generate}>
              Generar texto
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? <LoadingBlock label="Escribiendo un texto a tu medida..." /> : null}

      {exercise ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={exercise.title}
              subtitle={`Nivel ${db.profile.level}`}
              icon={<BookOpen className="size-4" />}
              action={
                <button onClick={generate} className="tap text-[12.5px] text-[var(--accent-soft)]">
                  <RefreshCw className="size-4" />
                </button>
              }
            />
            <div className="p-4 pt-3 sm:p-5 sm:pt-3">
              <p className="selectable whitespace-pre-wrap text-[16px] leading-[1.75]">
                {exercise.text}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={listen} loading={speaking} variant="secondary">
                  <Headphones className="size-4" />
                  Escuchar el texto
                </Button>
                <Button
                  onClick={toggleReadAloud}
                  variant={recording ? 'danger' : 'secondary'}
                >
                  <Mic className="size-4" />
                  {recording ? 'Parar y evaluar' : 'Leer en voz alta'}
                </Button>
              </div>

              {recording ? (
                <p className="mt-2 text-[12.5px] text-[var(--fg-muted)]">
                  Lee esta frase: &ldquo;{firstSentence}&rdquo;
                </p>
              ) : null}

              {readFeedback ? (
                <div className="animate-fade-up mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                    Lectura en voz alta
                  </p>
                  <p className="selectable mt-1 text-[13.5px] leading-relaxed">
                    Se escucho: <em>&ldquo;{readFeedback.heard}&rdquo;</em>
                  </p>
                  <p className="selectable mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                    {readFeedback.tipEs}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          {exercise.vocabulary?.length ? (
            <Card>
              <CardHeader
                title="Vocabulario del texto"
                action={
                  <Button size="sm" onClick={saveVocabulary} disabled={savedWords}>
                    <Plus className="size-3.5" />
                    {savedWords ? 'Guardado' : 'Guardar'}
                  </Button>
                }
              />
              <ul className="divide-y divide-[var(--border-soft)] px-4 pb-2 sm:px-5">
                {exercise.vocabulary.map((v) => (
                  <li key={v.word} className="py-3">
                    <p className="text-[14.5px] font-semibold">{v.word}</p>
                    <p className="selectable text-[13px] text-[var(--fg-muted)]">{v.meaningEs}</p>
                    <p className="selectable mt-0.5 text-[12.5px] italic text-[var(--fg-subtle)]">
                      {v.example}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <section>
            <h2 className="mb-2 text-[14px] font-semibold">Comprension</h2>
            <Quiz
              questions={exercise.questions}
              onRetry={generate}
              onFinish={(correct, total) => {
                addExerciseResult({ kind: 'reading', topic: exercise.title, correct, total });
                addSession('reading', 240);
              }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
