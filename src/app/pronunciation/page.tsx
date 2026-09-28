'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Info, Play, RefreshCw, Volume2 } from 'lucide-react';
import { MicButton, type MicState } from '@/components/conversation/MicButton';
import { Banner, Button, Card, CardHeader, Chip, PageHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { QUOTA_NOTICE, speakText } from '@/lib/speech';
import { Mic as MicRecorder, MicError } from '@/lib/audio/mic';
import { playWav, stopPlayback, unlockAudio } from '@/lib/audio/player';
import { addPronunciation, addSession, useDB, useHydrated } from '@/lib/store';
import type { PronunciationFeedback } from '@/lib/types';

/** Sonidos que mas cuestan a un hispanohablante. Sirven de punto de partida. */
const STARTERS = [
  'comfortable',
  'thirty-three',
  'vegetable',
  'schedule',
  'I would like a glass of water',
  'she sells sea shells',
  'this is the third thing',
  'very best',
  'school',
  'beach',
  'clothes',
  'Wednesday',
];

const VERDICTS: Record<
  PronunciationFeedback['verdict'],
  { label: string; color: string; note: string }
> = {
  good: { label: 'Bien', color: 'var(--success)', note: 'Lo dijiste claro.' },
  close: { label: 'Casi', color: 'var(--warning)', note: 'Se entiende, pero hay un sonido que pulir.' },
  needs_practice: {
    label: 'A practicar',
    color: 'var(--danger)',
    note: 'Costaria entenderte. Vuelve a intentarlo.',
  },
  not_measured: {
    label: 'No evaluable',
    color: 'var(--fg-subtle)',
    note: 'El audio no permite juzgar la pronunciacion con honestidad.',
  },
};

export default function PronunciationPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [target, setTarget] = useState('comfortable');
  const [custom, setCustom] = useState('');
  const [micState, setMicState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [micRef, setMicRef] = useState<MicRecorder | null>(null);

  // Las palabras que fallas se practican antes que las de ejemplo.
  const suggestions = useMemo(() => {
    const fromMistakes = db.mistakes
      .filter((m) => m.category === 'pronunciation')
      .slice(0, 4)
      .map((m) => m.correction);
    const fromVocab = db.vocabulary
      .filter((w) => w.mastery < 70 && w.practiceCount > 0)
      .slice(0, 4)
      .map((w) => w.word);
    return [...new Set([...fromMistakes, ...fromVocab, ...STARTERS])].slice(0, 12);
  }, [db.mistakes, db.vocabulary]);

  const listen = useCallback(async () => {
    setError(null);
    try {
      await unlockAudio();
      const r = await speakText(target, db.settings, { force: true });
      if (r.fellBack) setError(QUOTA_NOTICE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reproducir el audio.');
    }
  }, [db.settings.voice, target]);

  const finishRecording = useCallback(
    async (mic: MicRecorder) => {
      setMicRef(null);
      setLevel(0);
      const result = mic.stop();
      if (!result.base64 || result.durationMs < 300) {
        setMicState('idle');
        setError('La grabacion fue muy corta. Manten el boton hasta terminar la palabra.');
        return;
      }

      setMicState('thinking');
      try {
        const data = await api.checkPronunciation(target, {
          data: result.base64,
          mimeType: 'audio/wav',
        });
        setFeedback(data);
        setAttempts((a) => a + 1);
        addPronunciation({
          target,
          heard: data.heard,
          understood: data.understood,
          verdict: data.verdict,
          focus: data.focus,
          tip: data.tip,
          tipEs: data.tipEs,
        });
        addSession('pronunciation', Math.round(result.durationMs / 1000) + 5);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo analizar el audio.');
      } finally {
        setMicState('idle');
      }
    },
    [target]
  );

  const toggleRecord = useCallback(async () => {
    if (micState === 'recording' && micRef) {
      await finishRecording(micRef);
      return;
    }
    if (micState !== 'idle') return;

    setError(null);
    setFeedback(null);
    stopPlayback();
    const mic = new MicRecorder();
    try {
      await mic.start({
        collect: true,
        onLevel: (l) => {
          setLevel(l);
          if (mic.durationMs > 12_000) void finishRecording(mic);
        },
      });
      setMicRef(mic);
      setMicState('recording');
    } catch (err) {
      setError(err instanceof MicError ? err.message : 'No se pudo abrir el microfono.');
    }
  }, [finishRecording, micRef, micState]);

  const pick = (word: string) => {
    setTarget(word);
    setFeedback(null);
    setAttempts(0);
    setError(null);
  };

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const verdict = feedback ? VERDICTS[feedback.verdict] : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pronunciation Practice"
        subtitle="Escucha la palabra, repitela y recibe una valoracion honesta de lo que se entendio."
      />

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      {/* Objetivo */}
      <Card className="mb-4 p-5 text-center">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
          Target
        </p>
        <p className="selectable mt-2 text-[26px] font-semibold leading-tight sm:text-[32px]">
          {target}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={listen} variant="secondary">
            <Volume2 className="size-4" />
            Escuchar
          </Button>
          <Button onClick={listen} variant="ghost" aria-label="Repetir audio">
            <Play className="size-4" />
          </Button>
        </div>
      </Card>

      {/* Grabacion */}
      <Card className="mb-4 flex flex-col items-center gap-3 p-6">
        <MicButton state={micState} level={level} onPress={toggleRecord} />
        {attempts > 0 ? (
          <p className="text-[12px] text-[var(--fg-subtle)]">
            Intento {attempts} con esta palabra
          </p>
        ) : null}
      </Card>

      {/* Resultado */}
      {feedback && verdict ? (
        <Card className="animate-fade-up mb-4">
          <CardHeader
            title="Feedback"
            subtitle={verdict.note}
            icon={<Check className="size-4" style={{ color: verdict.color }} />}
          />
          <div className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
            <Row label="Se entendio la palabra">
              <span style={{ color: feedback.understood ? 'var(--success)' : 'var(--danger)' }}>
                {feedback.understood ? 'Si' : 'No'}
              </span>
            </Row>
            <Row label="Pronunciacion">
              <span style={{ color: verdict.color }}>{verdict.label}</span>
            </Row>
            <Row label="Lo que se escucho">
              <span className="selectable italic">&ldquo;{feedback.heard}&rdquo;</span>
            </Row>
            <Row label="A trabajar">
              <span className="selectable">{feedback.focus}</span>
            </Row>

            <div className="rounded-xl bg-[var(--surface-2)] p-3.5">
              <p className="selectable text-[13.5px] leading-relaxed">{feedback.tip}</p>
              <p className="selectable mt-1.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                {feedback.tipEs}
              </p>
            </div>

            {feedback.verdict === 'not_measured' ? (
              <Banner tone="info">
                No se inventa una puntuacion cuando el audio no da para medirla. Graba en un sitio
                mas silencioso y vuelve a intentarlo.
              </Banner>
            ) : null}

            <div className="flex gap-2">
              <Button full onClick={() => void toggleRecord()}>
                <RefreshCw className="size-4" />
                Intentar otra vez
              </Button>
              <Button full variant="secondary" onClick={listen}>
                <Volume2 className="size-4" />
                Volver a escuchar
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Elegir palabra */}
      <Card className="mb-4">
        <CardHeader
          title="Que quieres practicar"
          subtitle="Tus palabras falladas aparecen primero"
          icon={<Info className="size-4" />}
        />
        <div className="p-4 pt-3 sm:p-5 sm:pt-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((w) => (
              <Chip key={w} active={target === w} onClick={() => pick(w)}>
                {w}
              </Chip>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && custom.trim()) {
                  pick(custom.trim());
                  setCustom('');
                }
              }}
              placeholder="Escribe otra palabra o frase"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
            />
            <Button
              variant="primary"
              disabled={!custom.trim()}
              onClick={() => {
                pick(custom.trim());
                setCustom('');
              }}
            >
              Usar
            </Button>
          </div>
        </div>
      </Card>

      {/* Historial */}
      {db.pronunciation.length ? (
        <Card>
          <CardHeader title="Intentos recientes" subtitle="Solo se guarda el texto, nunca el audio" />
          <ul className="divide-y divide-[var(--border-soft)] px-4 pb-2 sm:px-5">
            {db.pronunciation.slice(0, 6).map((p) => {
              const v = VERDICTS[p.verdict];
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{p.target}</p>
                    <p className="truncate text-[12px] text-[var(--fg-subtle)]">
                      Se escucho: {p.heard || '(nada claro)'}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                    style={{
                      color: v.color,
                      background: `color-mix(in srgb, ${v.color} 14%, transparent)`,
                    }}
                  >
                    {v.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13.5px]">
      <span className="text-[var(--fg-muted)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
