import 'server-only';
import { GoogleGenAI } from '@google/genai';

/**
 * Punto unico de acceso a Gemini desde el servidor.
 * La API key jamas sale de aqui: el navegador solo habla con nuestras rutas.
 */

export class MissingKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY no esta configurada en el servidor.');
    this.name = 'MissingKeyError';
  }
}

export function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new MissingKeyError();
  return key;
}

export function hasKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

let client: GoogleGenAI | null = null;

export function ai(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

/** Los tokens efimeros solo existen en v1alpha, asi que van con su propio cliente. */
let alphaClient: GoogleGenAI | null = null;

export function aiAlpha(): GoogleGenAI {
  if (!alphaClient) {
    alphaClient = new GoogleGenAI({
      apiKey: apiKey(),
      httpOptions: { apiVersion: 'v1alpha' },
    });
  }
  return alphaClient;
}

/**
 * Cadenas de modelos. Se intenta el primero y, si la cuenta no tiene acceso,
 * se cae al siguiente. Asi la app no se rompe si un modelo cambia de nombre.
 */
// gemini-3.5-flash va primero por estabilidad: 3.8-flash devuelve 503 con
// frecuencia por saturacion, y en una conversacion hablada la latencia manda.
export const TEXT_MODELS: string[] = dedupe([
  process.env.GEMINI_TEXT_MODEL,
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
]);

export const TTS_MODELS: string[] = dedupe([
  process.env.GEMINI_TTS_MODEL,
  'gemini-3.8-flash-tts',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
]);

export const LIVE_MODELS: string[] = dedupe([
  process.env.GEMINI_LIVE_MODEL,
  'gemini-3.8-live',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-live-001',
]);

function dedupe(list: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const item of list) {
    const v = item?.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Recordamos que modelo funciono para no repetir intentos fallidos. */
const working = new Map<string, string>();

export function rememberModel(role: string, model: string) {
  working.set(role, model);
}

export function orderedModels(role: string, chain: string[]): string[] {
  const good = working.get(role);
  if (!good) return chain;
  return [good, ...chain.filter((m) => m !== good)];
}

/**
 * Un modelo que no existe, no esta habilitado o esta saturado merece que
 * se reintente con el siguiente de la cadena. El 503 por alta demanda es
 * habitual en los modelos mas nuevos y no debe romper la conversacion.
 */
export function isModelUnavailable(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return (
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('404') ||
    msg.includes('is not supported') ||
    msg.includes('unsupported') ||
    msg.includes('permission_denied') ||
    msg.includes('403') ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand')
  );
}

export function friendlyError(err: unknown): { message: string; status: number } {
  if (err instanceof MissingKeyError) {
    return {
      message:
        'Falta configurar GEMINI_API_KEY. Anadela en las variables de entorno del proyecto.',
      status: 503,
    };
  }
  const raw = String((err as Error)?.message ?? err);
  const low = raw.toLowerCase();
  if (low.includes('429') || low.includes('resource_exhausted') || low.includes('quota')) {
    return {
      message: 'Se alcanzo el limite de la API de Gemini. Espera un momento e intenta de nuevo.',
      status: 429,
    };
  }
  if (low.includes('401') || low.includes('unauthenticated') || low.includes('api key')) {
    return { message: 'La API key de Gemini no es valida.', status: 401 };
  }
  if (low.includes('safety') || low.includes('blocked')) {
    return { message: 'Gemini bloqueo esa respuesta. Prueba a reformular.', status: 400 };
  }
  return { message: 'Gemini no respondio correctamente. Intenta de nuevo.', status: 502 };
}
