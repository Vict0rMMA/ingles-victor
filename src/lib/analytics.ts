import type { DB, Level, Mistake, SkillKey } from './types';
import { todayKey } from './store';

/**
 * Todas las metricas que muestra la app salen de aqui.
 * Regla: si no hay datos reales, se devuelve null y la UI dice "sin datos".
 * Nunca se inventa un porcentaje.
 */

export interface Metric {
  value: number | null;
  /** Cuantos datos reales sostienen el numero. */
  samples: number;
}

export function totalStudySeconds(db: DB): number {
  return db.sessions.reduce((n, s) => n + s.seconds, 0);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Dias seguidos estudiando, contando hasta hoy o ayer. */
export function streak(db: DB): number {
  const days = new Set<string>();
  for (const s of db.sessions) days.add(todayKey(new Date(s.startedAt)));
  if (!days.size) return 0;

  const cursor = new Date();
  if (!days.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(todayKey(cursor))) return 0;
  }

  let count = 0;
  while (days.has(todayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function wordsLearned(db: DB): number {
  return db.vocabulary.filter((w) => w.practiceCount > 0 && w.mastery >= 70).length;
}

export function mistakesCorrected(db: DB): number {
  return db.mistakes.filter((m) => m.resolved).length;
}

export function conversationCount(db: DB): number {
  return db.conversations.filter((c) => c.messages.length > 1).length;
}

/** Errores mas repetidos, los que de verdad conviene atacar. */
export function topMistakes(db: DB, limit = 5): Mistake[] {
  return [...db.mistakes]
    .filter((m) => !m.resolved)
    .sort((a, b) => b.occurrences - a.occurrences || b.lastSeen - a.lastSeen)
    .slice(0, limit);
}

export function weakTopics(db: DB, limit = 4): string[] {
  const counts = new Map<string, number>();
  for (const m of db.mistakes) {
    if (m.resolved) continue;
    counts.set(m.topic, (counts.get(m.topic) ?? 0) + m.occurrences);
  }
  for (const g of db.grammar) {
    if (g.attempts >= 3) {
      const ratio = g.correct / g.attempts;
      if (ratio < 0.7) counts.set(g.topic, (counts.get(g.topic) ?? 0) + Math.round((1 - ratio) * 5));
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
}

export function weakWords(db: DB, limit = 6): string[] {
  return [...db.vocabulary]
    .filter((w) => w.practiceCount > 0 && w.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit)
    .map((w) => w.word);
}

export function frequentMistakePayload(db: DB, limit = 6) {
  return topMistakes(db, limit).map((m) => ({
    original: m.original,
    correction: m.correction,
    topic: m.topic,
    occurrences: m.occurrences,
  }));
}

/**
 * Progreso por habilidad calculado solo con lo que realmente se ha practicado.
 * Sin practica -> null, y la UI lo muestra como "aun sin datos".
 */
export function skillMetric(db: DB, skill: SkillKey): Metric {
  switch (skill) {
    case 'grammar': {
      const ex = db.exercises.filter((e) => e.kind === 'grammar');
      const total = ex.reduce((n, e) => n + e.total, 0);
      const correct = ex.reduce((n, e) => n + e.correct, 0);
      return total ? { value: Math.round((correct / total) * 100), samples: total } : empty();
    }
    case 'reading': {
      const ex = db.exercises.filter((e) => e.kind === 'reading');
      const total = ex.reduce((n, e) => n + e.total, 0);
      const correct = ex.reduce((n, e) => n + e.correct, 0);
      return total ? { value: Math.round((correct / total) * 100), samples: total } : empty();
    }
    case 'listening': {
      const ex = db.exercises.filter((e) => e.kind === 'listening');
      const total = ex.reduce((n, e) => n + e.total, 0);
      const correct = ex.reduce((n, e) => n + e.correct, 0);
      return total ? { value: Math.round((correct / total) * 100), samples: total } : empty();
    }
    case 'vocabulary': {
      const practiced = db.vocabulary.filter((w) => w.practiceCount > 0);
      if (!practiced.length) return empty();
      const avg = practiced.reduce((n, w) => n + w.mastery, 0) / practiced.length;
      return { value: Math.round(avg), samples: practiced.length };
    }
    case 'writing': {
      const ex = db.exercises.filter((e) => e.kind === 'writing');
      if (!ex.length) return empty();
      // total = frases enviadas, correct = frases sin errores.
      const total = ex.reduce((n, e) => n + e.total, 0);
      const clean = ex.reduce((n, e) => n + e.correct, 0);
      return total ? { value: Math.round((clean / total) * 100), samples: total } : empty();
    }
    case 'speaking': {
      const convs = db.conversations.filter((c) => c.messages.some((m) => m.role === 'user'));
      if (!convs.length) return empty();
      const userTurns = convs.reduce(
        (n, c) => n + c.messages.filter((m) => m.role === 'user').length,
        0
      );
      const corrected = convs.reduce(
        (n, c) => n + c.messages.reduce((k, m) => k + (m.corrections?.length ?? 0), 0),
        0
      );
      if (!userTurns) return empty();
      // Turnos hablados sin correccion sobre turnos totales: metrica real, no inventada.
      const clean = Math.max(0, userTurns - corrected);
      return { value: Math.round((clean / userTurns) * 100), samples: userTurns };
    }
    case 'pronunciation': {
      const attempts = db.pronunciation.filter((p) => p.verdict !== 'not_measured');
      if (!attempts.length) return empty();
      const good = attempts.filter((p) => p.verdict === 'good').length;
      const close = attempts.filter((p) => p.verdict === 'close').length;
      return {
        value: Math.round(((good + close * 0.5) / attempts.length) * 100),
        samples: attempts.length,
      };
    }
  }
}

function empty(): Metric {
  return { value: null, samples: 0 };
}

export const SKILL_LABELS: Record<SkillKey, string> = {
  speaking: 'Speaking',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  pronunciation: 'Pronunciation',
};

export const CATEGORY_LABELS: Record<Mistake['category'], string> = {
  grammar: 'Gramatica',
  vocabulary: 'Vocabulario',
  pronunciation: 'Pronunciacion',
  spelling: 'Ortografia',
  structure: 'Estructura',
  natural: 'Naturalidad',
};

/** Que recomendar a continuacion, siempre a partir de datos reales. */
export function recommendation(db: DB): { title: string; reason: string; href: string } {
  const top = topMistakes(db, 1)[0];
  if (top && top.occurrences >= 2) {
    return {
      title: `Practica ${top.topic}`,
      reason: `Has repetido este error ${top.occurrences} veces.`,
      href: `/grammar?topic=${encodeURIComponent(top.topic)}`,
    };
  }

  const weak = weakWords(db, 1)[0];
  if (weak) {
    return {
      title: 'Repasa tu vocabulario',
      reason: `Palabras como "${weak}" aun no estan dominadas.`,
      href: '/vocabulary',
    };
  }

  if (!db.conversations.length) {
    return {
      title: 'Ten tu primera conversacion',
      reason: 'Hablar es la forma mas rapida de avanzar.',
      href: '/conversation',
    };
  }

  if (!db.pronunciation.length) {
    return {
      title: 'Prueba Pronunciation',
      reason: 'Aun no has practicado pronunciacion.',
      href: '/pronunciation',
    };
  }

  return {
    title: 'Conversacion libre',
    reason: 'Manten la racha con 10 minutos de practica hablada.',
    href: '/conversation',
  };
}

export const LEVEL_DESCRIPTION: Record<Level, string> = {
  A1: 'Principiante: frases basicas y presente simple.',
  A2: 'Basico: situaciones cotidianas y pasado simple.',
  B1: 'Intermedio: conversacion fluida sobre temas conocidos.',
  B2: 'Intermedio alto: opiniones, matices y tiempos compuestos.',
  C1: 'Avanzado: ingles natural y preciso en cualquier contexto.',
};

/** Estima el nivel a partir del test inicial, con el peso de cada acierto. */
export function estimateLevel(
  answers: { level: Level; correct: boolean }[]
): { level: Level; scores: Record<string, number> } {
  const order: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const perLevel = new Map<Level, { correct: number; total: number }>();

  for (const a of answers) {
    const entry = perLevel.get(a.level) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    perLevel.set(a.level, entry);
  }

  // El nivel es el mas alto en el que se acierta al menos el 60%.
  let level: Level = 'A1';
  for (const l of order) {
    const entry = perLevel.get(l);
    if (entry && entry.total > 0 && entry.correct / entry.total >= 0.6) level = l;
  }

  const scores: Record<string, number> = {};
  for (const [l, entry] of perLevel) {
    scores[l] = Math.round((entry.correct / entry.total) * 100);
  }
  return { level, scores };
}
