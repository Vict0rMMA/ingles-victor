import { summarySchema } from '@/lib/gemini/schemas';
import { generateJSON, userContent } from '@/lib/gemini/text';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';
import type { ConversationSummary, Correction, Level } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface SummaryBody {
  level: Level;
  durationMin: number;
  /** true si la sesion fue por voz: solo entonces se puede hablar de pronunciacion. */
  spoken: boolean;
  transcript: { role: 'teacher' | 'user'; text: string }[];
  corrections: { original: string; correction: string; topic: string; category: string }[];
}

const SYSTEM = `You evaluate an English practice conversation and write an honest summary for the student.

Rules:
- Base every judgement only on the transcript and corrections you are given.
- Ratings are "good", "ok" or "needs_practice". Never invent numbers or percentages.
- Set pronunciation to "not_measured" when the session was typed instead of spoken, or when there is no evidence about pronunciation in the corrections.
- "commonMistakes" lists the grammar or vocabulary topics that actually appeared, most important first, maximum 4.
- "wordsToPractice" lists real words from the conversation the student should review, maximum 6.
- "recommendedLesson" is one concrete next lesson, for example "Past Simple Conversation".
- "notes" is two encouraging sentences in Spanish.
- "levelDelta" is 1 only if the student clearly performed above their level, -1 only if they clearly struggled with the basics, otherwise 0.
- "detectedMistakes" captures real mistakes you can see in the student's own lines that are not already in the corrections list. This matters for live voice sessions, where corrections were spoken but never written down. Quote the student exactly in "original". If there are none, return an empty array. Never invent a mistake to fill the list.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<SummaryBody>(req);
    if (!body.transcript?.length) throw new BadRequest('No hay conversacion que resumir.');

    const lines = body.transcript
      .slice(-40)
      .map((m) => `${m.role === 'teacher' ? 'Teacher' : 'Student'}: ${m.text}`)
      .join('\n');

    const corrections = body.corrections.length
      ? body.corrections
          .map((c) => `- [${c.category}/${c.topic}] "${c.original}" -> "${c.correction}"`)
          .join('\n')
      : 'No corrections were made.';

    const prompt = `Student level: ${body.level}
Session type: ${body.spoken ? 'spoken (voice)' : 'typed (text only)'}
Duration: ${body.durationMin} minutes

Transcript:
${lines}

Corrections made during the session:
${corrections}`;

    const data = await generateJSON<
      ConversationSummary & { levelDelta: number; detectedMistakes: Correction[] }
    >({
      role: 'summary',
      system: SYSTEM,
      contents: [userContent([{ text: prompt }])],
      schema: summarySchema,
      temperature: 0.4,
      maxOutputTokens: 5000,
    });

    if (!body.spoken) data.pronunciation = 'not_measured';
    data.detectedMistakes = (data.detectedMistakes ?? []).filter(
      (c) => c?.original && c?.correction && c.original.trim() !== c.correction.trim()
    );
    return ok({ ...data, durationMin: body.durationMin });
  } catch (err) {
    return fail(err);
  }
}
