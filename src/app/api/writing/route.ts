import { writingSchema } from '@/lib/gemini/schemas';
import { generateJSON, userContent } from '@/lib/gemini/text';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';
import type { Level, WritingFeedback } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface WritingBody {
  text: string;
  level: Level;
  /** Consigna del ejercicio, si la habia. */
  task?: string;
  /** 'translate' cuando el alumno escribio a partir de una idea en espanol. */
  kind?: 'free' | 'translate' | 'answer';
  source?: string;
}

const SYSTEM = `You are an English writing teacher for a Spanish-speaking student.
You correct their writing honestly and usefully.

Rules:
- Return the fully corrected version of their text, keeping their voice and ideas.
- List each real mistake separately with a simple explanation in English and in Spanish.
- Separate real errors from "understandable but unnatural" English: unnatural phrasing goes in the "natural" field with category "natural", not as a grammar error.
- Do not invent mistakes. If a sentence is correct, do not change it just to change it.
- Always mention at least one thing the student did well.
- "scoreNote" is one honest sentence in Spanish about the text overall. Never give a numeric score.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<WritingBody>(req);
    const text = body.text?.trim();
    if (!text) throw new BadRequest('Escribe algo primero.');
    if (text.length > 4000) throw new BadRequest('El texto es demasiado largo.');

    const prompt = [
      `Student CEFR level: ${body.level}.`,
      body.task ? `Task given to the student: "${body.task}"` : '',
      body.kind === 'translate' && body.source
        ? `The student was asked to express this Spanish idea in English: "${body.source}"`
        : '',
      `\nStudent text:\n"""\n${text}\n"""`,
    ]
      .filter(Boolean)
      .join('\n');

    const data = await generateJSON<WritingFeedback>({
      role: 'writing',
      system: SYSTEM,
      contents: [userContent([{ text: prompt }])],
      schema: writingSchema,
      temperature: 0.4,
      maxOutputTokens: 5000,
    });

    data.corrections = (data.corrections ?? []).filter(
      (c) => c?.original && c?.correction && c.original.trim() !== c.correction.trim()
    );
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}
