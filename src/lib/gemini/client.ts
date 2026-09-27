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
 *
 * Hay dos cadenas de texto a proposito: en una conversacion hablada cada
 * segundo se nota, mientras que generar un texto de lectura puede tardar.
 */

/** Conversacion: prima la latencia. Medido en ~1.5s frente a 8s+ del resto. */
export const CHAT_MODELS: string[] = dedupe([
  process.env.GEMINI_CHAT_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
]);

/** Ejercicios y analisis: prima la calidad, la espera es aceptable. */
export const TEXT_MODELS: string[] = dedupe([
  process.env.GEMINI_TEXT_MODEL,
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
]);

// flash-lite-tts va primero: mide ~3.2s frente a ~4.8s del 2.5, y el
// 3.8-flash-tts agota la cuota del plan gratuito enseguida.
export const TTS_MODELS: string[] = dedupe([
  process.env.GEMINI_TTS_MODEL,
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-2.5-flash-preview-tts',
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

/**
 * Y recordamos cual acaba de fallar. Sin esto, un modelo saturado se
 * reintentaba en cada turno y su 503 se sumaba a la espera del alumno
 * una y otra vez. Cinco minutos bastan para que se recupere.
 */
const COOLDOWN_MS = 5 * 60_000;
const failed = new Map<string, number>();

export function rememberModel(role: string, model: string) {
  working.set(role, model);
  failed.delete(model);
}

export function rememberFailure(model: string) {
  failed.set(model, Date.now());
}

function inCooldown(model: string): boolean {
  const at = failed.get(model);
  if (!at) return false;
  if (Date.now() - at > COOLDOWN_MS) {
    failed.delete(model);
    return false;
  }
  return true;
}

export function orderedModels(role: string, chain: string[]): string[] {
  const good = working.get(role);
  const ordered = good ? [good, ...chain.filter((m) => m !== good)] : chain;
  // Los que acaban de fallar van al final, pero no se descartan: si todos
  // estan en cuarentena hay que intentarlo igualmente.
  const ready = ordered.filter((m) => !inCooldown(m));
  const resting = ordered.filter((m) => inCooldown(m));
  return [...ready, ...resting];
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
    msg.includes('high demand') ||
    // La cuota se agota por modelo, no por proyecto: otro modelo de la
    // cadena suele seguir disponible.
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota')
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
