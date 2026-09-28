'use client';

/**
 * Cache local para no gastar cuota dos veces en lo mismo.
 *
 * - El audio del TTS va a IndexedDB: es lo mas caro (15 usos al dia en el
 *   plan gratuito) y lo que mas se repite, porque una palabra de vocabulario
 *   o de pronunciacion se escucha muchas veces.
 * - Los ejercicios generados van a localStorage: al volver a una seccion se
 *   recupera el ultimo en lugar de generar otro.
 */

/* ------------------------------------------------------------------ */
/* Audio (IndexedDB)                                                   */
/* ------------------------------------------------------------------ */

const DB_NAME = 'aec_audio';
const STORE = 'tts';
const MAX_ENTRIES = 120;

interface AudioEntry {
  key: string;
  audio: string;
  usedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function audioKey(text: string, voice: string): string {
  // El texto completo como clave: son frases cortas y evita colisiones.
  return `${voice}::${text.trim().toLowerCase()}`;
}

export async function getCachedAudio(text: string, voice: string): Promise<string | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(audioKey(text, voice));
      req.onsuccess = () => {
        const entry = req.result as AudioEntry | undefined;
        if (!entry) return resolve(null);
        // Marcamos el uso para que el recorte por antiguedad sea justo.
        entry.usedAt = Date.now();
        store.put(entry);
        resolve(entry.audio);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putCachedAudio(text: string, voice: string, audio: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({ key: audioKey(text, voice), audio, usedAt: Date.now() } satisfies AudioEntry);

    // Recorte: si hay demasiadas entradas, fuera las menos usadas.
    const all = store.getAll();
    all.onsuccess = () => {
      const entries = (all.result ?? []) as AudioEntry[];
      if (entries.length <= MAX_ENTRIES) return;
      entries
        .sort((a, b) => a.usedAt - b.usedAt)
        .slice(0, entries.length - MAX_ENTRIES)
        .forEach((e) => store.delete(e.key));
    };
  } catch {
    /* sin cache no pasa nada, solo se gasta mas cuota */
  }
}

export async function clearAudioCache(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
  } catch {
    /* ignorado */
  }
}

export async function audioCacheSize(): Promise<number> {
  const db = await openDB();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Ejercicios generados (localStorage)                                 */
/* ------------------------------------------------------------------ */

const EX_KEY = 'aec_exercises_v1';
const MAX_EXERCISES = 12;

interface ExerciseEntry<T = unknown> {
  key: string;
  data: T;
  savedAt: number;
}

function loadExercises(): ExerciseEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(EX_KEY) ?? '[]') as ExerciseEntry[];
  } catch {
    return [];
  }
}

function saveExercises(list: ExerciseEntry[]) {
  try {
    window.localStorage.setItem(EX_KEY, JSON.stringify(list.slice(0, MAX_EXERCISES)));
  } catch {
    /* cuota llena: se pierde la cache, no los datos del alumno */
  }
}

function exerciseKey(kind: string, level: string, topic?: string): string {
  return `${kind}::${level}::${(topic ?? '').toLowerCase()}`;
}

export function getCachedExercise<T>(kind: string, level: string, topic?: string): T | null {
  const entry = loadExercises().find((e) => e.key === exerciseKey(kind, level, topic));
  return entry ? (entry.data as T) : null;
}

export function putCachedExercise<T>(
  kind: string,
  level: string,
  topic: string | undefined,
  data: T
): void {
  const key = exerciseKey(kind, level, topic);
  const list = loadExercises().filter((e) => e.key !== key);
  list.unshift({ key, data, savedAt: Date.now() });
  saveExercises(list);
}

export function clearExerciseCache(): void {
  try {
    window.localStorage.removeItem(EX_KEY);
  } catch {
    /* ignorado */
  }
}

export function exerciseCacheSize(): number {
  return loadExercises().length;
}
