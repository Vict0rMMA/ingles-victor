import { pronunciationSchema } from '@/lib/gemini/schemas';
import { generateJSON, userContent } from '@/lib/gemini/text';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';
import type { PronunciationFeedback } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PronBody {
  target: string;
  audio: { data: string; mimeType: string };
}

/**
 * Honestidad ante todo: el modelo escucha el audio y dice que entendio.
 * No se inventan porcentajes de precision porque no hay forma real de medirlos.
 */
const SYSTEM = `You are a pronunciation coach for a Spanish-speaking student learning English.

You receive a target word or phrase and an audio recording of the student trying to say it.

Rules you must never break:
- Write in "heard" EXACTLY what you hear, word for word. If you hear something different from the target, write what you actually heard.
- Never assume the student said the target correctly just because that was the target.
- NEVER produce a numeric pronunciation score or percentage. There is no reliable way to compute one here.
- Use verdict "not_measured" when the recording is silent, too noisy, or too short to judge.
- Use "good" only when what you heard clearly matches the target.
- Use "close" when it is understandable but a sound is off, and "needs_practice" when it would be hard to understand.
- In "focus" name the concrete sound or syllable to work on, for example "the 'th' at the start" or "the middle syllable 'for'". If you cannot identify a specific sound reliably, say "No puedo identificar un sonido concreto con este audio".
- "tip" is one practical instruction in English about how to move the mouth or tongue. "tipEs" is the same tip in Spanish.
- Spanish speakers commonly struggle with: /th/, /v/ vs /b/, initial /s/ clusters (school, Spain), /I/ vs /iː/ (ship vs sheep), final consonants, and word stress. Use this knowledge only to explain what you actually heard.`;

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<PronBody>(req);
    const target = body.target?.trim();
    if (!target) throw new BadRequest('Falta la palabra objetivo.');
    if (!body.audio?.data) throw new BadRequest('No llego el audio.');

    const data = await generateJSON<PronunciationFeedback>({
      role: 'pronunciation',
      system: SYSTEM,
      contents: [
        userContent([
          { text: `Target the student was asked to say: "${target}"\n\nHere is their recording:` },
          {
            inlineData: { data: body.audio.data, mimeType: body.audio.mimeType || 'audio/wav' },
          },
        ]),
      ],
      schema: pronunciationSchema,
      temperature: 0.2,
      maxOutputTokens: 3000,
    });

    return ok(data);
  } catch (err) {
    return fail(err);
  }
}
