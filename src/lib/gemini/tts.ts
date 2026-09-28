import 'server-only';
import {
  ai,
  isModelUnavailable,
  isQuotaError,
  orderedModels,
  rememberFailure,
  rememberModel,
  rotateKey,
  TTS_MODELS,
} from './client';
/**
 * Convierte texto en la voz del profesor.
 *
 * El texto se envia literal, sin indicaciones de estilo: los modelos TTS
 * actuales tratan el campo como transcripcion exacta y leerian en voz alta
 * cualquier instruccion que se les cuele. El tono sale de la voz elegida.
 *
 * Gemini devuelve WAV o PCM crudo a 24 kHz segun el modelo; si viene crudo se
 * le anade cabecera para que cualquier navegador lo reproduzca sin mas.
 */
export async function speak(
  text: string,
  voice = 'Kore'
): Promise<{ audio: string; mimeType: string }> {
  const chain = orderedModels('tts', TTS_MODELS);
  let lastError: unknown = new Error('No hay modelos TTS configurados.');

  for (const model of chain) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        });

        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        const data = part?.inlineData?.data;
        if (!data) throw new Error('Gemini no devolvio audio.');

        const mime = part?.inlineData?.mimeType ?? 'audio/L16;rate=24000';
        rememberModel('tts', model);
        // Segun el modelo, Gemini devuelve WAV ya formado o PCM crudo.
        // Solo hay que poner cabecera cuando viene crudo.
        const alreadyWav = mime.toLowerCase().includes('wav');
        return {
          audio: alreadyWav ? data : wrapPcmInWav(data, sampleRateFromMime(mime)),
          mimeType: 'audio/wav',
        };
      } catch (err) {
        lastError = err;
        // El TTS gratuito son 15 peticiones al dia: si hay otra clave,
        // vale mucho la pena intentarlo con ella antes de rendirse.
        if (isQuotaError(err) && rotateKey(attempt)) continue;
        if (!isModelUnavailable(err)) throw err;
        rememberFailure(model);
        break;
      }
    }
  }
  throw lastError;
}

function sampleRateFromMime(mime: string): number {
  const m = mime.match(/rate=(\d+)/);
  return m ? Number(m[1]) : 24000;
}

/** Cabecera WAV de 44 bytes sobre el PCM 16 bit mono que entrega Gemini. */
export function wrapPcmInWav(base64Pcm: string, sampleRate: number): string {
  const pcm = Buffer.from(base64Pcm, 'base64');
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString('base64');
}
