import { hasKey, LIVE_MODELS, TEXT_MODELS, TTS_MODELS } from '@/lib/gemini/client';
import { ok } from '@/lib/server/http';

export const runtime = 'nodejs';

/** La UI pregunta esto al arrancar para avisar si falta configurar la API key. */
export async function GET() {
  return ok({
    ready: hasKey(),
    models: {
      text: TEXT_MODELS[0],
      tts: TTS_MODELS[0],
      live: LIVE_MODELS[0],
    },
  });
}
