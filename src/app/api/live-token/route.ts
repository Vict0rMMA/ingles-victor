import { aiAlpha, isModelUnavailable, LIVE_MODELS } from '@/lib/gemini/client';
import { buildLiveSystemPrompt, type TeacherContext } from '@/lib/gemini/prompts';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface TokenBody {
  context: TeacherContext;
  voice?: string;
}

/**
 * Entrega un token efimero para que el navegador abra el WebSocket de
 * Gemini Live directamente. La API key real nunca viaja al cliente, y el
 * token caduca en minutos y solo sirve para una sesion.
 *
 * El system prompt y la configuracion quedan fijados aqui: el navegador no
 * puede cambiarlos aunque manipule el codigo.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<TokenBody>(req);
    if (!body.context?.level) throw new BadRequest('Falta el contexto del alumno.');

    const minutes = Number(process.env.LIVE_TOKEN_MINUTES ?? 20);
    const expireTime = new Date(Date.now() + minutes * 60_000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60_000).toISOString();
    const system = buildLiveSystemPrompt(body.context);
    const voice = body.voice || 'Kore';

    let lastError: unknown = new Error('No hay modelos Live configurados.');

    for (const model of LIVE_MODELS) {
      try {
        const token = await aiAlpha().authTokens.create({
          config: {
            uses: 1,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model,
              config: {
                responseModalities: ['AUDIO' as never],
                systemInstruction: system,
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                  languageCode: 'en-US',
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
            },
            lockAdditionalFields: [],
          },
        });

        if (!token.name) throw new Error('El token efimero llego vacio.');

        return ok({
          token: token.name,
          model,
          expiresAt: expireTime,
          minutes,
        });
      } catch (err) {
        lastError = err;
        if (!isModelUnavailable(err)) throw err;
      }
    }
    throw lastError;
  } catch (err) {
    return fail(err);
  }
}
