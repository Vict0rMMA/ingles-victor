'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type {
  Conversation,
  ConversationMessage,
  Correction,
  DailyLesson,
  DB,
  ExerciseResult,
  GrammarTopicProgress,
  Level,
  Mistake,
  Profile,
  PronunciationPractice,
  Settings,
  StudySession,
  VocabularyWord,
} from './types';

const KEY = 'aec_db_v1';
const VERSION = 1;

export const DEFAULT_PROFILE: Profile = {
  name: '',
  level: 'A2',
  levelPoints: 0,
  levelScores: {
    grammar: 0,
    vocabulary: 0,
    reading: 0,
    writing: 0,
    listening: 0,
    speaking: 0,
  },
  goals: [],
  placementDone: false,
  createdAt: 0,
};

export const DEFAULT_SETTINGS: Settings = {
  voice: 'Kore',
  avatar: 'emma',
  showAvatar: true,
  teacherSpeaks: true,
  autoSpanish: false,
  engine: 'turn',
  sessionLimitMin: 15,
};

export const EMPTY_DB: DB = {
  version: VERSION,
  profile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  conversations: [],
  mistakes: [],
  vocabulary: [],
  grammar: [],
  exercises: [],
  sessions: [],
  pronunciation: [],
  lessons: [],
};

let cache: DB = EMPTY_DB;
let loaded = false;
const listeners = new Set<() => void>();

function read(): DB {
  if (typeof window === 'undefined') return EMPTY_DB;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_DB, profile: { ...DEFAULT_PROFILE, createdAt: Date.now() } };
    const parsed = JSON.parse(raw) as Partial<DB>;
    // Merge defensivo: si anado entidades nuevas, las versiones viejas no se rompen.
    return {
      ...EMPTY_DB,
      ...parsed,
      version: VERSION,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      conversations: parsed.conversations ?? [],
      mistakes: parsed.mistakes ?? [],
      vocabulary: parsed.vocabulary ?? [],
      grammar: parsed.grammar ?? [],
      exercises: parsed.exercises ?? [],
      sessions: parsed.sessions ?? [],
      pronunciation: parsed.pronunciation ?? [],
      lessons: parsed.lessons ?? [],
    };
  } catch {
    return EMPTY_DB;
  }
}

function ensure(): DB {
  if (!loaded && typeof window !== 'undefined') {
    cache = read();
    loaded = true;
  }
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function persist(next: DB) {
  cache = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Cuota llena: recortamos el historial mas pesado y reintentamos una vez.
      const trimmed: DB = { ...next, conversations: next.conversations.slice(0, 20) };
      cache = trimmed;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(trimmed));
      } catch {
        /* se queda solo en memoria */
      }
    }
  }
  emit();
}

export function getDB(): DB {
  return ensure();
}

export function update(mutator: (db: DB) => DB): DB {
  const next = mutator(structuredCloneSafe(ensure()));
  persist(next);
  return next;
}

function structuredCloneSafe(db: DB): DB {
  return JSON.parse(JSON.stringify(db)) as DB;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Hook principal: devuelve la base completa y se re-renderiza en cada cambio. */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, ensure, () => EMPTY_DB);
}

export function useUpdate() {
  return useCallback((mutator: (db: DB) => DB) => update(mutator), []);
}

/** true cuando ya estamos en el cliente con los datos reales cargados. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Operaciones de dominio                                              */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
}

/** Registra correcciones agrupando repeticiones del mismo error. */
export function recordCorrections(
  corrections: Correction[],
  source: Mistake['source']
): void {
  if (!corrections.length) return;
  update((db) => {
    const now = Date.now();
    for (const c of corrections) {
      if (!c.original || !c.correction) continue;
      const key = normalize(c.original);
      const existing = db.mistakes.find(
        (m) => normalize(m.original) === key && m.category === c.category
      );
      if (existing) {
        existing.occurrences += 1;
        existing.lastSeen = now;
        existing.resolved = false;
        existing.correction = c.correction;
        existing.explanation = c.explanation || existing.explanation;
        existing.explanationEs = c.explanationEs || existing.explanationEs;
        existing.topic = c.topic || existing.topic;
      } else {
        db.mistakes.unshift({
          id: uid('mis'),
          category: c.category,
          topic: c.topic || 'General',
          original: c.original,
          correction: c.correction,
          explanation: c.explanation,
          explanationEs: c.explanationEs,
          severity: c.severity,
          occurrences: 1,
          firstSeen: now,
          lastSeen: now,
          resolved: false,
          source,
        });
      }

      // El tema gramatical acumula intentos: asi se detectan areas debiles reales.
      if (c.category === 'grammar' || c.category === 'structure') {
        const topic = c.topic || 'General';
        const g = db.grammar.find((t) => t.topic === topic);
        if (g) {
          g.attempts += 1;
          g.lastPracticed = now;
        } else {
          db.grammar.push({ topic, attempts: 1, correct: 0, lastPracticed: now });
        }
      }
    }
    db.mistakes = db.mistakes.slice(0, 500);
    return db;
  });
}

export function markMistakeResolved(id: string): void {
  update((db) => {
    const m = db.mistakes.find((x) => x.id === id);
    if (m) m.resolved = true;
    return db;
  });
}

export function deleteMistake(id: string): void {
  update((db) => {
    db.mistakes = db.mistakes.filter((m) => m.id !== id);
    return db;
  });
}

export function startConversation(
  conv: Omit<Conversation, 'id' | 'messages' | 'startedAt'>
): string {
  const id = uid('conv');
  update((db) => {
    db.conversations.unshift({ ...conv, id, messages: [], startedAt: Date.now() });
    db.conversations = db.conversations.slice(0, 60);
    return db;
  });
  return id;
}

export function appendMessage(convId: string, msg: ConversationMessage): void {
  update((db) => {
    const c = db.conversations.find((x) => x.id === convId);
    if (c) c.messages.push(msg);
    return db;
  });
}

export function patchMessage(
  convId: string,
  msgId: string,
  patch: Partial<ConversationMessage>
): void {
  update((db) => {
    const c = db.conversations.find((x) => x.id === convId);
    const m = c?.messages.find((x) => x.id === msgId);
    if (m) Object.assign(m, patch);
    return db;
  });
}

export function endConversation(convId: string, summary?: Conversation['summary']): void {
  update((db) => {
    const c = db.conversations.find((x) => x.id === convId);
    if (!c) return db;
    c.endedAt = Date.now();
    if (summary) c.summary = summary;
    const seconds = Math.round((c.endedAt - c.startedAt) / 1000);
    if (seconds > 5) {
      db.sessions.unshift({
        id: uid('ses'),
        kind: 'conversation',
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        seconds,
      });
      db.sessions = db.sessions.slice(0, 500);
    }
    return db;
  });
}

export function deleteConversation(id: string): void {
  update((db) => {
    db.conversations = db.conversations.filter((c) => c.id !== id);
    return db;
  });
}

export function clearConversations(): void {
  update((db) => {
    db.conversations = [];
    return db;
  });
}

export function addSession(kind: StudySession['kind'], seconds: number): void {
  if (seconds < 5) return;
  update((db) => {
    const end = Date.now();
    db.sessions.unshift({
      id: uid('ses'),
      kind,
      startedAt: end - seconds * 1000,
      endedAt: end,
      seconds,
    });
    db.sessions = db.sessions.slice(0, 500);
    return db;
  });
}

export function addExerciseResult(r: Omit<ExerciseResult, 'id' | 'ts'>): void {
  update((db) => {
    db.exercises.unshift({ ...r, id: uid('ex'), ts: Date.now() });
    db.exercises = db.exercises.slice(0, 400);

    if (r.kind === 'grammar') {
      const g: GrammarTopicProgress | undefined = db.grammar.find((t) => t.topic === r.topic);
      if (g) {
        g.attempts += r.total;
        g.correct += r.correct;
        g.lastPracticed = Date.now();
      } else {
        db.grammar.push({
          topic: r.topic,
          attempts: r.total,
          correct: r.correct,
          lastPracticed: Date.now(),
        });
      }
    }
    return db;
  });
}

export function addWords(
  words: { word: string; meaning: string; meaningEs: string; example: string; ipa?: string }[],
  difficulty: Level
): void {
  if (!words.length) return;
  update((db) => {
    for (const w of words) {
      if (!w.word) continue;
      const key = w.word.trim().toLowerCase();
      if (db.vocabulary.some((v) => v.word.trim().toLowerCase() === key)) continue;
      db.vocabulary.unshift({
        id: uid('voc'),
        word: w.word.trim(),
        meaning: w.meaning,
        meaningEs: w.meaningEs,
        example: w.example,
        ipa: w.ipa,
        difficulty,
        practiceCount: 0,
        mistakes: 0,
        lastReview: 0,
        addedAt: Date.now(),
        mastery: 0,
      });
    }
    db.vocabulary = db.vocabulary.slice(0, 1000);
    return db;
  });
}

export function reviewWord(id: string, correct: boolean): void {
  update((db) => {
    const w: VocabularyWord | undefined = db.vocabulary.find((v) => v.id === id);
    if (!w) return db;
    w.practiceCount += 1;
    if (!correct) w.mistakes += 1;
    w.lastReview = Date.now();
    // Maestria = aciertos reales sobre intentos reales. Sin numeros inventados.
    const hits = w.practiceCount - w.mistakes;
    w.mastery = Math.round((hits / w.practiceCount) * 100);
    return db;
  });
}

export function deleteWord(id: string): void {
  update((db) => {
    db.vocabulary = db.vocabulary.filter((v) => v.id !== id);
    return db;
  });
}

export function addPronunciation(p: Omit<PronunciationPractice, 'id' | 'ts'>): void {
  update((db) => {
    db.pronunciation.unshift({ ...p, id: uid('pro'), ts: Date.now() });
    db.pronunciation = db.pronunciation.slice(0, 300);
    return db;
  });
}

export function saveLesson(lesson: DailyLesson): void {
  update((db) => {
    db.lessons = db.lessons.filter((l) => l.date !== lesson.date);
    db.lessons.unshift(lesson);
    db.lessons = db.lessons.slice(0, 40);
    return db;
  });
}

export function toggleLessonStep(lessonId: string, stepId: string): void {
  update((db) => {
    const l = db.lessons.find((x) => x.id === lessonId);
    const s = l?.steps.find((x) => x.id === stepId);
    if (s) s.done = !s.done;
    if (l && l.steps.every((x) => x.done)) l.completedAt = Date.now();
    return db;
  });
}

export function setProfile(patch: Partial<Profile>): void {
  update((db) => {
    db.profile = { ...db.profile, ...patch };
    return db;
  });
}

export function setSettings(patch: Partial<Settings>): void {
  update((db) => {
    db.settings = { ...db.settings, ...patch };
    return db;
  });
}

/**
 * El nivel sube o baja por rendimiento acumulado, nunca por una sola respuesta.
 * +1 punto por sesion buena, -1 por sesion floja. A los +5 sube, a los -5 baja.
 */
export function nudgeLevel(delta: number): void {
  update((db) => {
    const order: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
    let points = db.profile.levelPoints + delta;
    let idx = order.indexOf(db.profile.level);
    if (points >= 5 && idx < order.length - 1) {
      idx += 1;
      points = 0;
    } else if (points <= -5 && idx > 0) {
      idx -= 1;
      points = 0;
    }
    db.profile.levelPoints = Math.max(-5, Math.min(5, points));
    db.profile.level = order[idx];
    return db;
  });
}

export function resetAll(): void {
  persist({ ...EMPTY_DB, profile: { ...DEFAULT_PROFILE, createdAt: Date.now() } });
}

export function exportDB(): string {
  return JSON.stringify(ensure(), null, 2);
}
