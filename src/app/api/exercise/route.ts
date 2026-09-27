import {
  grammarSchema,
  lessonSchema,
  listeningSchema,
  placementSchema,
  readingSchema,
  vocabularySchema,
} from '@/lib/gemini/schemas';
import { generateJSON, userContent } from '@/lib/gemini/text';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';
import type { Level } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Kind = 'reading' | 'listening' | 'grammar' | 'vocabulary' | 'lesson' | 'placement';

interface ExerciseBody {
  kind: Kind;
  level: Level;
  topic?: string;
  /** Errores frecuentes y temas flojos: el contenido se genera a la medida. */
  weakTopics?: string[];
  weakWords?: string[];
  frequentMistakes?: string[];
  minutes?: number;
}

const SCHEMAS: Record<Kind, unknown> = {
  reading: readingSchema,
  listening: listeningSchema,
  grammar: grammarSchema,
  vocabulary: vocabularySchema,
  lesson: lessonSchema,
  placement: placementSchema,
};

/**
 * Presupuesto de tokens por tipo. Incluye margen para el razonamiento interno
 * del modelo: si se queda corto, el JSON llega truncado.
 */
const TOKEN_BUDGET: Record<Kind, number> = {
  reading: 8000,
  listening: 6000,
  grammar: 6000,
  vocabulary: 5000,
  lesson: 5000,
  placement: 10000,
};

const SYSTEM = `You are an expert English teacher and materials writer for Spanish-speaking students.
You create exercises that are correct, useful and exactly at the requested CEFR level.
All explanations written for the student are in Spanish; the English content itself stays in English.
Every multiple choice question has exactly one correct option and the "answer" index must point to it.
Never invent scores or statistics.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<ExerciseBody>(req);
    if (!body.kind || !SCHEMAS[body.kind]) throw new BadRequest('Tipo de ejercicio no valido.');
    if (!body.level) throw new BadRequest('Falta el nivel del alumno.');

    const data = await generateJSON<unknown>({
      role: `exercise:${body.kind}`,
      system: SYSTEM,
      contents: [userContent([{ text: buildPrompt(body) }])],
      schema: SCHEMAS[body.kind],
      temperature: 0.8,
      maxOutputTokens: TOKEN_BUDGET[body.kind],
    });

    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

function buildPrompt(b: ExerciseBody): string {
  const weak = context(b);

  switch (b.kind) {
    case 'reading':
      return `Write a reading practice for CEFR level ${b.level}${
        b.topic ? ` about "${b.topic}"` : ''
      }.
The text must be 120-200 words, interesting and natural. Then write 4 multiple choice comprehension questions (4 options each) and 5 useful vocabulary items from the text.${weak}`;

    case 'listening':
      return `Write a listening practice for CEFR level ${b.level}${
        b.topic ? ` about "${b.topic}"` : ''
      }.
The script must be a natural dialogue of 6-10 short lines using "Name: line" format, or a short monologue. It will be read aloud by a text to speech voice, so use only plain sentences, no stage directions. Then write 4 multiple choice questions (4 options each).${weak}`;

    case 'grammar':
      return `Create a grammar lesson for CEFR level ${b.level} about "${
        b.topic || 'Past Simple'
      }".
Give a short explanation in English, the same explanation in Spanish, 4 example sentences, and 6 multiple choice practice questions (4 options each) that get slightly harder.${weak}`;

    case 'vocabulary':
      return `Create a vocabulary set of 8 words for CEFR level ${b.level}${
        b.topic ? ` about "${b.topic}"` : ''
      }.
For each word give: the word, a short English meaning, the Spanish meaning, a natural example sentence, and the IPA transcription.${weak}`;

    case 'lesson':
      return `Design today's personalised English lesson for a CEFR ${b.level} student. It should take about ${
        b.minutes ?? 20
      } minutes.
Create 5 or 6 steps mixing vocabulary, grammar, listening, speaking, reading and review. Each step has a clear title in English and instructions in Spanish explaining exactly what to do in this app.
Base the lesson on the student's real weak points listed below, not on generic content.${weak}`;

    case 'placement':
      return `Create a short placement test of 12 multiple choice questions to estimate the CEFR level of a Spanish-speaking student.
Cover these skills: grammar (4), vocabulary (3), reading (2), writing (2), listening (1 - written as a question about a short quoted sentence, since there is no audio).
Order the questions from A1 to C1 difficulty, and mark each question with the level it tests. Every question has 4 options.`;
  }
}

function context(b: ExerciseBody): string {
  const bits: string[] = [];
  if (b.weakTopics?.length) bits.push(`Weak grammar topics: ${b.weakTopics.join(', ')}.`);
  if (b.frequentMistakes?.length)
    bits.push(`Mistakes the student repeats: ${b.frequentMistakes.slice(0, 8).join(' | ')}.`);
  if (b.weakWords?.length) bits.push(`Words still not mastered: ${b.weakWords.join(', ')}.`);
  return bits.length ? `\n\nStudent context - use it:\n${bits.join('\n')}` : '';
}
