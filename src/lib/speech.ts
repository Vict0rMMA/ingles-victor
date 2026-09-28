'use client';

import * as api from './api';
import { ApiError } from './api';
import { browserSpeak, browserVoiceAvailable, playWav, stopAllSpeech } from './audio/player';
import type { Settings } from './types';

/**
 * Punto unico para que hable el profesor, en cualquier pantalla.
 *
 * El TTS de Gemini suena mucho mejor, pero el plan gratuito da 15 usos al
 * dia. Centralizarlo aqui permite respetar el modo elegido y caer a la voz
 * del dispositivo en cuanto se agota, en vez de que cada pantalla gaste
 * cuota por su cuenta y se quede muda al fallar.
 */

/** Una vez agotada la cuota, no volvemos a intentarlo hasta recargar. */
let quotaExhausted = false;

export function voiceQuotaExhausted(): boolean {
  return quotaExhausted;
}

export interface SpeakResult {
  /** Que voz sono al final. */
  used: 'gemini' | 'system' | 'none';
  /** true si se cambio de voz por falta de cuota. */
  fellBack: boolean;
}

export async function speakText(
  text: string,
  settings: Pick<Settings, 'voice' | 'voiceMode'>,
  options: { force?: boolean } = {}
): Promise<SpeakResult> {
  const clean = text?.trim();
  if (!clean) return { used: 'none', fellBack: false };

  // Con la voz apagada solo suena si el alumno lo pidio explicitamente
  // (por ejemplo el boton "Escuchar"), y entonces con la voz gratuita.
  if (settings.voiceMode === 'off' && !options.force) {
    return { used: 'none', fellBack: false };
  }

  const wantsGemini = settings.voiceMode === 'gemini' && !quotaExhausted;

  if (!wantsGemini) {
    stopAllSpeech();
    await browserSpeak(clean);
    return { used: 'system', fellBack: false };
  }

  try {
    const { audio } = await api.tts(clean, settings.voice);
    await playWav(audio);
    return { used: 'gemini', fellBack: false };
  } catch (err) {
    const quota =
      err instanceof ApiError && (err.status === 429 || /limite|cuota/i.test(err.message));
    if (quota) quotaExhausted = true;

    if (browserVoiceAvailable()) {
      await browserSpeak(clean);
      return { used: 'system', fellBack: true };
    }
    throw err;
  }
}

export const QUOTA_NOTICE =
  'Se agoto la cuota diaria de la voz de Gemini (15 al dia en el plan gratuito). Seguimos con la voz del dispositivo, que es gratis e ilimitada.';
