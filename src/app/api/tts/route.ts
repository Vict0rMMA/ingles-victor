import { speak } from '@/lib/gemini/tts';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TtsBody {
  text: string;
  voice?: string;
}

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<TtsBody>(req);
    const text = body.text?.trim();
    if (!text) throw new BadRequest('No hay texto que leer.');
    // Cortamos textos enormes: la voz del profesor son frases, no ensayos.
    const safe = text.length > 1200 ? `${text.slice(0, 1200)}...` : text;

    const audio = await speak(safe, body.voice || 'Kore');
    return ok(audio);
  } catch (err) {
    return fail(err);
  }
}
