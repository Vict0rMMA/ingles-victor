import 'server-only';
import { NextResponse } from 'next/server';
import { friendlyError } from '@/lib/gemini/client';

/**
 * Utilidades compartidas por las rutas de API: limite de peticiones,
 * tamano maximo de cuerpo y errores en un formato unico.
 */

const WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX = Number(process.env.RATE_LIMIT_MAX ?? 60);

const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

/** Cortafuegos simple contra llamadas repetidas: protege la cuota de Gemini. */
export function rateLimit(req: Request): NextResponse | null {
  const ip = clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.reset) {
    buckets.set(ip, { count: 1, reset: now + WINDOW });
  } else {
    bucket.count += 1;
    if (bucket.count > MAX) {
      const retry = Math.ceil((bucket.reset - now) / 1000);
      return NextResponse.json(
        { error: `Demasiadas peticiones seguidas. Espera ${retry}s.` },
        { status: 429, headers: { 'Retry-After': String(retry) } }
      );
    }
  }

  // Limpieza perezosa para que el mapa no crezca sin control.
  if (buckets.size > 500) {
    for (const [key, value] of buckets) if (now > value.reset) buckets.delete(key);
  }
  return null;
}

const MAX_BODY = 8 * 1024 * 1024; // 8 MB: suficiente para ~2 min de audio WAV 16 kHz

export async function readBody<T>(req: Request): Promise<T> {
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BODY) throw new BadRequest('El audio es demasiado largo. Graba menos tiempo.');
  const body = (await req.json()) as T;
  if (!body || typeof body !== 'object') throw new BadRequest('Cuerpo de la peticion invalido.');
  return body;
}

export class BadRequest extends Error {
  status = 400;
}

export function fail(err: unknown): NextResponse {
  if (err instanceof BadRequest) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  const { message, status } = friendlyError(err);
  // El detalle tecnico se queda en los logs del servidor, no viaja al navegador.
  console.error('[api]', err);
  return NextResponse.json({ error: message }, { status });
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}
