'use client';

import type {
  ConversationSummary,
  Correction,
  GrammarExercise,
  Level,
  ListeningExercise,
  PlacementQuestion,
  PronunciationFeedback,
  ReadingExercise,
  TeacherTurn,
  VocabularySet,
  WritingFeedback,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Sin conexion. Revisa tu internet e intenta de nuevo.', 0);
  }

  if (!res.ok) {
    let message = 'Algo salio mal. Intenta de nuevo.';
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* respuesta sin json */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export interface TeacherContextPayload {
  name?: string;
  level: Level;
  mode: string;
  topic?: string;
  goals?: string[];
  frequentMistakes?: { original: string; correction: string; topic: string; occurrences: number }[];
  weakTopics?: string[];
  weakWords?: string[];
}

export function chatTurn(
  payload: {
    context: TeacherContextPayload;
    history?: { role: 'teacher' | 'user'; text: string }[];
    userText?: string;
    audio?: { data: string; mimeType: string };
    wantsSpanish?: boolean;
    opening?: boolean;
  },
  signal?: AbortSignal
): Promise<TeacherTurn> {
  return post<TeacherTurn>('/api/chat', payload, signal);
}

export function tts(
  text: string,
  voice: string,
  signal?: AbortSignal
): Promise<{ audio: string; mimeType: string }> {
  return post('/api/tts', { text, voice }, signal);
}

export function liveToken(
  context: TeacherContextPayload,
  voice: string
): Promise<{ token: string; model: string; expiresAt: string; minutes: number }> {
  return post('/api/live-token', { context, voice });
}

export function checkPronunciation(
  target: string,
  audio: { data: string; mimeType: string }
): Promise<PronunciationFeedback> {
  return post('/api/pronunciation', { target, audio });
}

export function checkWriting(payload: {
  text: string;
  level: Level;
  task?: string;
  kind?: 'free' | 'translate' | 'answer';
  source?: string;
}): Promise<WritingFeedback> {
  return post('/api/writing', payload);
}

export function conversationSummary(payload: {
  level: Level;
  durationMin: number;
  spoken: boolean;
  transcript: { role: 'teacher' | 'user'; text: string }[];
  corrections: { original: string; correction: string; topic: string; category: string }[];
}): Promise<ConversationSummary & { levelDelta: number; detectedMistakes: Correction[] }> {
  return post('/api/summary', payload);
}

interface ExercisePayload {
  level: Level;
  topic?: string;
  weakTopics?: string[];
  weakWords?: string[];
  frequentMistakes?: string[];
  minutes?: number;
}

export function getReading(p: ExercisePayload): Promise<ReadingExercise> {
  return post('/api/exercise', { kind: 'reading', ...p });
}

export function getListening(p: ExercisePayload): Promise<ListeningExercise> {
  return post('/api/exercise', { kind: 'listening', ...p });
}

export function getGrammar(p: ExercisePayload): Promise<GrammarExercise> {
  return post('/api/exercise', { kind: 'grammar', ...p });
}

export function getVocabulary(p: ExercisePayload): Promise<VocabularySet> {
  return post('/api/exercise', { kind: 'vocabulary', ...p });
}

export function getLessonPlan(
  p: ExercisePayload
): Promise<{ title: string; goal: string; steps: { kind: string; title: string; instructions: string }[] }> {
  return post('/api/exercise', { kind: 'lesson', ...p });
}

export function getPlacement(level: Level): Promise<{ questions: PlacementQuestion[] }> {
  return post('/api/exercise', { kind: 'placement', level });
}

export function getStatus(): Promise<{ ready: boolean; models: Record<string, string> }> {
  return fetch('/api/status')
    .then((r) => r.json() as Promise<{ ready: boolean; models: Record<string, string> }>)
    .catch(() => ({ ready: false, models: {} }));
}
