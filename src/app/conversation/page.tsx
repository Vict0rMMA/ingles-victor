'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Keyboard,
  Languages,
  Radio,
  Send,
  SquarePause,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { MicButton, VoiceBars, type MicState } from '@/components/conversation/MicButton';
import { SummarySheet } from '@/components/conversation/SummarySheet';
import { getAvatar, TeacherAvatar } from '@/components/conversation/TeacherAvatar';
import { Transcript } from '@/components/conversation/Transcript';
import { Banner, Button, Card, Chip, cx, Segmented } from '@/components/ui';
import * as api from '@/lib/api';
import {
  frequentMistakePayload,
  weakTopics,
  weakWords,
} from '@/lib/analytics';
import { Mic as MicRecorder, MicError, requestMicPermission } from '@/lib/audio/mic';
import {
  PcmStream,
  playWav,
  replay as replayAudio,
  stopPlayback,
  unlockAudio,
} from '@/lib/audio/player';
import { LiveSession } from '@/lib/live/session';
import { MODES, TOPICS, modeLabel } from '@/lib/modes';
import {
  addSession,
  appendMessage,
  endConversation,
  nudgeLevel,
  recordCorrections,
  startConversation,
  uid,
  useDB,
  useHydrated,
} from '@/lib/store';
import type {
  ConversationMessage,
  ConversationMode,
  ConversationSummary,
  Correction,
} from '@/lib/types';

type Phase = 'setup' | 'active';
type Engine = 'turn' | 'live';

// Silencio que cierra la grabacion. 1.1s es el punto donde deja de sentirse
// una espera sin cortar a quien piensa a mitad de frase.
const SILENCE_MS = 1100;
const MAX_RECORD_MS = 60_000;
const SPEECH_LEVEL = 0.07;

export default function ConversationPage() {
  const db = useDB();
  const hydrated = useHydrated();

  const [phase, setPhase] = useState<Phase>('setup');
  const [engine, setEngine] = useState<Engine>('turn');
  const [mode, setMode] = useState<ConversationMode>('free');
  const [topic, setTopic] = useState<string>('');

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [micState, setMicState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveUser, setLiveUser] = useState('');
  const [liveTeacher, setLiveTeacher] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const micRef = useRef<MicRecorder | null>(null);
  const liveRef = useRef<LiveSession | null>(null);
  const streamRef = useRef<PcmStream | null>(null);
  const convIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ConversationMessage[]>([]);
  const startedAtRef = useRef(0);
  const speechRef = useRef({ spoke: false, lastLoud: 0 });
  const stoppingRef = useRef(false);
  const mutedRef = useRef(false);

  messagesRef.current = messages;
  mutedRef.current = muted;

  const settings = db.settings;
  const profile = db.profile;

  /* ---------------- contexto del alumno para el profesor ---------------- */

  const buildContext = useCallback(
    () => ({
      name: profile.name || undefined,
      level: profile.level,
      mode,
      topic: topic || undefined,
      goals: profile.goals,
      frequentMistakes: frequentMistakePayload(db),
      weakTopics: weakTopics(db),
      weakWords: weakWords(db),
    }),
    [db, mode, profile, topic]
  );

  /* -------------------------- preseleccion por URL -------------------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode') as ConversationMode | null;
    if (m && MODES.some((x) => x.id === m)) setMode(m);
    const t = params.get('topic');
    if (t) setTopic(t);
    setEngine(settings.engine);
    // Solo al montar: despues manda lo que elija el usuario en pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ cronometro ------------------------------ */

  useEffect(() => {
    if (phase !== 'active') return;
    const id = window.setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
      setSeconds(elapsed);
      // Control de consumo: la sesion se cierra sola al llegar al limite.
      if (elapsed >= settings.sessionLimitMin * 60) {
        setNotice('Se alcanzo el limite de tiempo de la sesion.');
        void finish();
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, settings.sessionLimitMin]);

  /* ------------------------- limpieza al desmontar ------------------------- */

  useEffect(() => {
    return () => {
      micRef.current?.stop();
      liveRef.current?.close();
      streamRef.current?.interrupt();
      stopPlayback();
    };
  }, []);

  /* ------------------------------ utilidades ------------------------------ */

  const pushMessage = useCallback((msg: ConversationMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (convIdRef.current) appendMessage(convIdRef.current, msg);
  }, []);

  const speakTeacher = useCallback(
    async (text: string) => {
      if (!settings.teacherSpeaks || mutedRef.current || !text) return;
      try {
        setMicState('speaking');
        const { audio } = await api.tts(text, settings.voice);
        await playWav(audio);
      } catch {
        // Si el TTS falla la conversacion sigue: el texto ya esta en pantalla.
        setNotice('No se pudo reproducir la voz, pero puedes leer la respuesta.');
      } finally {
        setMicState((s) => (s === 'speaking' ? 'idle' : s));
      }
    },
    [settings.teacherSpeaks, settings.voice]
  );

  const historyPayload = useCallback(
    () =>
      messagesRef.current
        .slice(-14)
        .map((m) => ({ role: m.role, text: m.text })),
    []
  );

  const applyTurn = useCallback(
    (turn: Awaited<ReturnType<typeof api.chatTurn>>, spokenText: string) => {
      const corrections: Correction[] = turn.corrections ?? [];

      if (spokenText) {
        pushMessage({
          id: uid('msg'),
          role: 'user',
          text: spokenText,
          ts: Date.now(),
          corrections,
        });
      }

      pushMessage({
        id: uid('msg'),
        role: 'teacher',
        text: turn.reply,
        ts: Date.now(),
        spanish: turn.spanish,
        repeatRequest: turn.repeatRequest,
      });

      if (corrections.length) recordCorrections(corrections, 'conversation');
    },
    [pushMessage]
  );

  /* ------------------------------ modo turnos ------------------------------ */

  const sendTurn = useCallback(
    async (payload: { audio?: { data: string; mimeType: string }; text?: string; spanish?: boolean }) => {
      setMicState('thinking');
      setError(null);
      try {
        const turn = await api.chatTurn({
          context: buildContext(),
          history: historyPayload(),
          audio: payload.audio,
          userText: payload.text,
          wantsSpanish: payload.spanish,
        });

        const said = payload.text ?? turn.transcript;
        if (payload.audio && !turn.transcript) {
          // Honestidad: si no se entendio nada, no inventamos lo que dijo.
          setNotice('No se escucho nada claro. Acercate al microfono e intentalo otra vez.');
        }
        applyTurn(turn, said);
        // La voz se genera aparte y no bloquea: el texto ya esta en pantalla
        // y el alumno puede responder sin esperar a que termine el audio.
        void speakTeacher(turn.reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado.');
        setMicState('idle');
      }
    },
    [applyTurn, buildContext, historyPayload, speakTeacher]
  );

  const stopRecording = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    const mic = micRef.current;
    micRef.current = null;
    setLevel(0);
    if (!mic) {
      stoppingRef.current = false;
      return;
    }
    const result = mic.stop();
    stoppingRef.current = false;

    if (!result.base64 || result.durationMs < 400) {
      setMicState('idle');
      setNotice('La grabacion fue demasiado corta.');
      return;
    }
    await sendTurn({ audio: { data: result.base64, mimeType: 'audio/wav' } });
  }, [sendTurn]);

  const startRecording = useCallback(async () => {
    setError(null);
    setNotice(null);
    stopPlayback();
    const mic = new MicRecorder();
    speechRef.current = { spoke: false, lastLoud: Date.now() };

    try {
      await mic.start({
        collect: true,
        onLevel: (l) => {
          setLevel(l);
          const now = Date.now();
          if (l > SPEECH_LEVEL) {
            speechRef.current.spoke = true;
            speechRef.current.lastLoud = now;
          }
          const tooLong = mic.durationMs > MAX_RECORD_MS;
          const silent =
            speechRef.current.spoke && now - speechRef.current.lastLoud > SILENCE_MS;
          // Se envia solo al detectar silencio: asi la conversacion fluye.
          if (tooLong || silent) void stopRecording();
        },
      });
      micRef.current = mic;
      setMicState('recording');
    } catch (err) {
      setMicState('idle');
      setError(err instanceof MicError ? err.message : 'No se pudo abrir el microfono.');
      setTyping(true);
    }
  }, [stopRecording]);

  /* -------------------------------- modo live -------------------------------- */

  const startLive = useCallback(async () => {
    setMicState('thinking');
    try {
      const { token, model } = await api.liveToken(buildContext(), settings.voice);

      const stream = new PcmStream(24000, (speaking) => {
        setMicState(speaking ? 'speaking' : 'listening');
      });
      streamRef.current = stream;

      const session = new LiveSession({
        onAudio: (b64) => {
          if (!mutedRef.current) stream.push(b64);
        },
        onUserText: setLiveUser,
        onTeacherText: setLiveTeacher,
        onInterrupted: () => stream.interrupt(),
        onTurnComplete: ({ teacher, user }) => {
          setLiveUser('');
          setLiveTeacher('');
          if (user) {
            pushMessage({ id: uid('msg'), role: 'user', text: user, ts: Date.now() });
          }
          if (teacher) {
            pushMessage({ id: uid('msg'), role: 'teacher', text: teacher, ts: Date.now() });
          }
        },
        onError: (message) => setError(message),
        onClose: (reason) => {
          if (reason) setNotice(`La conexion de voz se cerro: ${reason}`);
        },
      });

      await session.connect(token, model, settings.voice);
      liveRef.current = session;

      const mic = new MicRecorder();
      await mic.start({
        collect: false,
        onLevel: setLevel,
        onChunk: (pcm) => session.sendAudio(pcm),
      });
      micRef.current = mic;
      setMicState('listening');
    } catch (err) {
      // Si Live no esta disponible, el modo por turnos cubre lo mismo.
      setError(
        `${err instanceof Error ? err.message : 'No se pudo abrir la conversacion en vivo.'} Cambiamos al modo por turnos.`
      );
      setEngine('turn');
      setMicState('idle');
      liveRef.current?.close();
      liveRef.current = null;
    }
  }, [buildContext, pushMessage, settings.voice]);

  /* -------------------------------- arranque -------------------------------- */

  const start = useCallback(
    async (selected: Engine) => {
      setError(null);
      setNotice(null);
      setMessages([]);
      setSummary(null);
      // Desbloquear el audio dentro del gesto del usuario: iOS lo exige.
      await unlockAudio();

      try {
        await requestMicPermission();
      } catch (err) {
        setError(err instanceof MicError ? err.message : 'El microfono no esta disponible.');
        setTyping(true);
      }

      startedAtRef.current = Date.now();
      setSeconds(0);
      convIdRef.current = startConversation({
        mode,
        topic: topic || undefined,
        level: profile.level,
        engine: selected,
      });
      setPhase('active');

      if (selected === 'live') {
        await startLive();
        return;
      }

      // Modo turnos: el profesor abre la conversacion.
      setMicState('thinking');
      try {
        const turn = await api.chatTurn({ context: buildContext(), opening: true });
        pushMessage({
          id: uid('msg'),
          role: 'teacher',
          text: turn.reply,
          ts: Date.now(),
        });
        await speakTeacher(turn.reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar la conversacion.');
      } finally {
        setMicState((s) => (s === 'thinking' || s === 'speaking' ? 'idle' : s));
      }
    },
    [buildContext, mode, profile.level, pushMessage, speakTeacher, startLive, topic]
  );

  /* --------------------------------- cierre --------------------------------- */

  const finish = useCallback(async () => {
    micRef.current?.stop();
    micRef.current = null;
    liveRef.current?.close();
    liveRef.current = null;
    streamRef.current?.interrupt();
    stopPlayback();
    setMicState('idle');
    setLevel(0);

    const convId = convIdRef.current;
    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const list = messagesRef.current;
    setPhase('setup');

    if (!list.some((m) => m.role === 'user')) {
      // Sin participacion del alumno no hay nada honesto que resumir.
      if (convId) endConversation(convId);
      addSession('conversation', elapsed);
      setNotice('Sesion cerrada. No hubo respuestas tuyas que analizar.');
      return;
    }

    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const result = await api.conversationSummary({
        level: profile.level,
        durationMin: Math.max(1, Math.round(elapsed / 60)),
        spoken: engine === 'live' || list.some((m) => m.role === 'user'),
        transcript: list.map((m) => ({ role: m.role, text: m.text })),
        corrections: list
          .flatMap((m) => m.corrections ?? [])
          .map((c) => ({
            original: c.original,
            correction: c.correction,
            topic: c.topic,
            category: c.category,
          })),
      });

      setSummary(result);
      if (convId) endConversation(convId, result);
      if (result.detectedMistakes?.length) {
        recordCorrections(result.detectedMistakes, 'conversation');
      }
      if (result.levelDelta) nudgeLevel(result.levelDelta);
    } catch {
      if (convId) endConversation(convId);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
      convIdRef.current = null;
    }
  }, [engine, profile.level]);

  /* --------------------------------- acciones --------------------------------- */

  const onMicPress = useCallback(() => {
    if (engine === 'live') return;
    if (micState === 'recording') {
      void stopRecording();
    } else if (micState === 'speaking') {
      // Un solo toque para cortar al profesor y empezar a hablar: pedir dos
      // era justo lo que hacia sentir lenta la conversacion.
      stopPlayback();
      void startRecording();
    } else if (micState === 'idle') {
      void startRecording();
    }
  }, [engine, micState, startRecording, stopRecording]);

  const askSpanish = useCallback(() => {
    if (engine === 'live') {
      liveRef.current?.sendText(
        'Please explain your last point briefly in Spanish, then continue in English.'
      );
      return;
    }
    void sendTurn({ text: 'Can you explain that in Spanish, please?', spanish: true });
  }, [engine, sendTurn]);

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (engine === 'live') {
      pushMessage({ id: uid('msg'), role: 'user', text, ts: Date.now() });
      liveRef.current?.sendText(text);
      return;
    }
    void sendTurn({ text });
  }, [draft, engine, pushMessage, sendTurn]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        stopPlayback();
        streamRef.current?.interrupt();
      }
      return next;
    });
  }, []);

  /* ---------------------------------- vistas ---------------------------------- */

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="skeleton h-64 rounded-3xl" />
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <>
        <SetupScreen
          mode={mode}
          setMode={setMode}
          topic={topic}
          setTopic={setTopic}
          engine={engine}
          setEngine={setEngine}
          onStart={start}
          error={error}
          notice={notice}
          clearError={() => setError(null)}
          clearNotice={() => setNotice(null)}
          sessionLimit={settings.sessionLimitMin}
        />
        <SummarySheet
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          summary={summary}
          loading={summaryLoading}
        />
      </>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--bg)]">
      {/* Cabecera */}
      <header
        className="flex shrink-0 items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={() => void finish()}
          className="tap -ml-2 flex size-9 items-center justify-center rounded-xl text-[var(--fg-muted)]"
          aria-label="Terminar conversacion"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{modeLabel(mode)}</p>
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--fg-subtle)]">
            <span className="flex items-center gap-1">
              <Timer className="size-3" />
              {mm}:{ss}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              {engine === 'live' ? (
                <>
                  <Radio className="size-3 text-[var(--success)]" /> En vivo
                </>
              ) : (
                'Por turnos'
              )}
            </span>
            <span>·</span>
            <span>{profile.level}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="tap flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]"
          aria-label={muted ? 'Activar voz del profesor' : 'Silenciar profesor'}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>

        <Button size="sm" variant="danger" onClick={() => void finish()}>
          <X className="size-3.5" />
          Terminar
        </Button>
      </header>

      {/* Cara del profesor. En pantallas bajas se encoge para no comerse
          la transcripcion, que es lo que el alumno necesita leer. */}
      {settings.showAvatar ? (
        <div className="flex shrink-0 flex-col items-center gap-1.5 pb-1 pt-4 [@media(max-height:700px)]:pt-2">
          <div className="origin-top [@media(max-height:700px)]:scale-75">
            <TeacherAvatar
              state={micState}
              look={getAvatar(settings.avatar)}
              micLevel={level}
              size={116}
            />
          </div>
          <p className="text-[13px] font-semibold [@media(max-height:640px)]:hidden">
            {getAvatar(settings.avatar).name}
          </p>
          <p className="text-[11.5px] text-[var(--fg-subtle)] [@media(max-height:640px)]:hidden">
            {micState === 'speaking'
              ? 'Hablando...'
              : micState === 'thinking'
                ? 'Pensando...'
                : micState === 'recording' || micState === 'listening'
                  ? 'Te escucha'
                  : 'Tu profesor de ingles'}
          </p>
        </div>
      ) : null}

      {/* Transcripcion */}
      <div className="scroll-area mx-auto w-full max-w-3xl flex-1 px-4 pt-4">
        {error ? (
          <div className="mb-3">
            <Banner tone="danger" onClose={() => setError(null)}>
              {error}
            </Banner>
          </div>
        ) : null}
        {notice ? (
          <div className="mb-3">
            <Banner tone="warning" onClose={() => setNotice(null)}>
              {notice}
            </Banner>
          </div>
        ) : null}

        <Transcript
          messages={messages}
          liveUser={liveUser}
          liveTeacher={liveTeacher}
          thinking={micState === 'thinking'}
          onReplay={() => void replayAudio()}
        />
      </div>

      {/* Controles */}
      <div
        className="shrink-0 border-t border-[var(--border-soft)] bg-[var(--bg-soft)] px-4 pt-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {typing ? (
            <div className="mb-3 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendDraft();
                  }
                }}
                rows={1}
                placeholder="Escribe tu respuesta en ingles..."
                enterKeyHint="send"
                autoCapitalize="sentences"
                className="max-h-28 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[16px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
              />
              <Button variant="primary" onClick={sendDraft} disabled={!draft.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          ) : null}

          {engine === 'live' ? (
            <div className="flex flex-col items-center gap-2 pb-2">
              <VoiceBars level={level} active={micState === 'listening' || micState === 'speaking'} />
              <p className="text-[13px] font-medium text-[var(--fg-muted)]">
                {micState === 'speaking'
                  ? 'El profesor esta hablando'
                  : micState === 'thinking'
                    ? 'Conectando...'
                    : 'Habla cuando quieras, te escucho'}
              </p>
            </div>
          ) : (
            <MicButton state={micState} level={level} onPress={onMicPress} />
          )}

          <div className="mt-3 flex items-center justify-center gap-2">
            <Chip onClick={askSpanish}>
              <Languages className="size-3.5" />
              Explicar en espanol
            </Chip>
            <Chip onClick={() => setTyping((t) => !t)}>
              <Keyboard className="size-3.5" />
              {typing ? 'Ocultar teclado' : 'Escribir'}
            </Chip>
            {micState === 'speaking' ? (
              <Chip
                onClick={() => {
                  stopPlayback();
                  streamRef.current?.interrupt();
                  setMicState(engine === 'live' ? 'listening' : 'idle');
                }}
              >
                <SquarePause className="size-3.5" />
                Parar voz
              </Chip>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pantalla de inicio de conversacion                                  */
/* ------------------------------------------------------------------ */

function SetupScreen({
  mode,
  setMode,
  topic,
  setTopic,
  engine,
  setEngine,
  onStart,
  error,
  notice,
  clearError,
  clearNotice,
  sessionLimit,
}: {
  mode: ConversationMode;
  setMode: (m: ConversationMode) => void;
  topic: string;
  setTopic: (t: string) => void;
  engine: Engine;
  setEngine: (e: Engine) => void;
  onStart: (e: Engine) => void | Promise<void>;
  error: string | null;
  notice: string | null;
  clearError: () => void;
  clearNotice: () => void;
  sessionLimit: number;
}) {
  const db = useDB();
  const avatar = getAvatar(db.settings.avatar);
  const showAvatar = db.settings.showAvatar;
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStart(engine);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
      <div className="mb-6 text-center">
        <h1 className="text-[26px] font-semibold tracking-tight sm:text-[32px]">
          AI Conversation
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--fg-muted)]">
          Habla en ingles con tu profesor. Te escucha, te responde con voz y te corrige cuando de
          verdad hace falta.
        </p>
      </div>

      {error ? (
        <div className="mb-4">
          <Banner tone="danger" onClose={clearError}>
            {error}
          </Banner>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4">
          <Banner tone="info" onClose={clearNotice}>
            {notice}
          </Banner>
        </div>
      ) : null}

      {/* Boton protagonista */}
      <Card className="mb-5 flex flex-col items-center gap-4 border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent)]/12 to-transparent px-5 py-7">
        {showAvatar ? (
          <div className="flex flex-col items-center gap-1">
            <TeacherAvatar state={starting ? 'thinking' : 'idle'} look={avatar} size={124} />
            <p className="text-[15px] font-semibold">{avatar.name}</p>
            <p className="text-[12px] text-[var(--fg-subtle)]">Tu profesor de ingles</p>
          </div>
        ) : null}
        <MicButton state="idle" onPress={handleStart} disabled={starting} />
        <Button variant="primary" size="lg" full loading={starting} onClick={handleStart}>
          Start Conversation
        </Button>
        <p className="text-center text-[12px] text-[var(--fg-subtle)]">
          La sesion se cierra sola a los {sessionLimit} minutos para controlar el consumo de API.
        </p>
      </Card>

      {/* Motor de voz */}
      <section className="mb-5">
        <h2 className="mb-2 text-[13px] font-semibold text-[var(--fg-muted)]">Tipo de conversacion</h2>
        <Segmented
          value={engine}
          onChange={(v) => setEngine(v)}
          options={[
            { value: 'turn', label: 'Por turnos' },
            { value: 'live', label: 'En vivo' },
          ]}
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fg-subtle)]">
          {engine === 'turn'
            ? 'Hablas, el profesor te escucha y responde. Incluye correcciones escritas en pantalla y funciona en cualquier telefono.'
            : 'Audio continuo con Gemini Live: interrumpes y te interrumpe como en una charla real. Necesita buena conexion.'}
        </p>
      </section>

      {/* Modos */}
      <section className="mb-5">
        <h2 className="mb-2 text-[13px] font-semibold text-[var(--fg-muted)]">Modo</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cx(
                'tap rounded-2xl border p-3 text-left',
                mode === m.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/12'
                  : 'border-[var(--border-soft)] bg-[var(--surface)]'
              )}
            >
              <span className="text-[18px]">{m.emoji}</span>
              <p className="mt-1 text-[13.5px] font-semibold leading-tight">{m.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--fg-subtle)]">
                {m.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Temas */}
      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-[var(--fg-muted)]">
          Tema (opcional)
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" style={{ touchAction: 'pan-x' }}>
          {TOPICS.map((t) => (
            <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>
              {t}
            </Chip>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center text-[12px] text-[var(--fg-subtle)]">
        ¿Prefieres practicar otra cosa?{' '}
        <Link href="/practice" className="text-[var(--accent-soft)] underline">
          Ver todos los modos de practica
        </Link>
      </p>
    </div>
  );
}
