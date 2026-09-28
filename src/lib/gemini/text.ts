import 'server-only';
import type { Content, Part } from '@google/genai';
import {
  ai,
  isModelUnavailable,
  isQuotaError,
  orderedModels,
  rememberFailure,
  rememberModel,
  rotateKey,
  TEXT_MODELS,
} from './client';

interface JSONRequest {
  /** Etiqueta del uso, para recordar que modelo funciono. */
  role: string;
  system: string;
  contents: Content[];
  schema: unknown;
  temperature?: number;
  maxOutputTokens?: number;
  /** Cadena de modelos propia. Por defecto, la de calidad. */
  models?: string[];
  /**
   * Cuanto puede "pensar" el modelo antes de responder. En la conversacion
   * hablada se usa MINIMAL: el razonamiento largo no mejora una correccion
   * sencilla y si anade segundos de espera.
   */
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Llama a Gemini pidiendo JSON con esquema fijo y cae a otro modelo
 * si el configurado no esta disponible en la cuenta.
 */
export async function generateJSON<T>(req: JSONRequest): Promise<T> {
  const chain = orderedModels(req.role, req.models ?? TEXT_MODELS);
  let lastError: unknown = new Error('No hay modelos de texto configurados.');

  for (const model of chain) {
    // Cada modelo se intenta con las claves disponibles antes de descartarlo:
    // una cuota agotada es problema de la clave, no del modelo.
    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: req.contents,
          config: {
            systemInstruction: req.system,
            responseMimeType: 'application/json',
            responseSchema: req.schema as never,
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxOutputTokens ?? 4096,
            ...(req.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: req.thinkingLevel as never } }
              : {}),
          },
        });

        // Los modelos actuales gastan tokens de razonamiento dentro del mismo
        // presupuesto, asi que un limite corto corta el JSON por la mitad.
        // Detectarlo aqui evita un error de parseo incomprensible mas abajo.
        const finish = res.candidates?.[0]?.finishReason;
        if (finish === 'MAX_TOKENS') {
          throw new Error('La respuesta de Gemini se corto por longitud. Intenta de nuevo.');
        }

        const text = res.text;
        if (!text) throw new Error('Respuesta vacia de Gemini.');
        rememberModel(req.role, model);
        return parseJSON<T>(text);
      } catch (err) {
        lastError = err;
        if (isQuotaError(err) && rotateKey(attempt)) continue;
        if (!isModelUnavailable(err)) throw err;
        // Saturado o sin acceso: lo dejamos descansar para no pagar su
        // espera otra vez en el siguiente turno.
        rememberFailure(model);
        break;
      }
    }
  }
  throw lastError;
}

function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Algunos modelos envuelven el JSON en markdown pese al responseMimeType.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Gemini devolvio un JSON invalido.');
  }
}

export function userPart(text: string): Part {
  return { text };
}

export function audioPart(base64: string, mimeType: string): Part {
  return { inlineData: { data: base64, mimeType } };
}

export function userContent(parts: Part[]): Content {
  return { role: 'user', parts };
}

export function modelContent(text: string): Content {
  return { role: 'model', parts: [{ text }] };
}
