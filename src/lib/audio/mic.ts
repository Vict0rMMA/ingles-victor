'use client';

import {
  arrayBufferToBase64,
  downsample,
  encodeWav,
  floatToPcm16,
  mergeInt16,
  rms,
} from './wav';

export const TARGET_RATE = 16000;

export type MicErrorKind =
  | 'denied'
  | 'unavailable'
  | 'insecure'
  | 'unsupported'
  | 'unknown';

export class MicError extends Error {
  kind: MicErrorKind;
  constructor(kind: MicErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'MicError';
  }
}

export const MIC_MESSAGES: Record<MicErrorKind, string> = {
  denied:
    'No diste permiso al microfono. Abre los ajustes del navegador para este sitio y permite el microfono.',
  unavailable:
    'No se encontro ningun microfono disponible. Revisa que otra app no lo este usando.',
  insecure:
    'El microfono necesita una conexion segura (https). Abre la app con https o en localhost.',
  unsupported: 'Este navegador no permite grabar audio. Prueba con Chrome o Safari actualizados.',
  unknown: 'No se pudo activar el microfono. Intenta de nuevo.',
};

function classify(err: unknown): MicError {
  const name = (err as DOMException)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new MicError('denied', MIC_MESSAGES.denied);
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new MicError('unavailable', MIC_MESSAGES.unavailable);
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return new MicError('unavailable', MIC_MESSAGES.unavailable);
  }
  return new MicError('unknown', MIC_MESSAGES.unknown);
}

type AudioContextCtor = typeof AudioContext;

export function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export interface MicOptions {
  /** Se llama con cada trozo de PCM 16 kHz mientras se graba (modo Live). */
  onChunk?: (pcm: Int16Array) => void;
  /** Nivel de voz 0-1 para la animacion del boton. */
  onLevel?: (level: number) => void;
  /** Guardar todo para producir un WAV al parar (modo por turnos). */
  collect?: boolean;
}

/**
 * Captura del microfono en PCM 16 kHz mono.
 * Se usa igual para el modo por turnos (WAV al final) y para Gemini Live
 * (trozos en streaming), asi que solo hay una implementacion que mantener.
 */
export class Mic {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Int16Array[] = [];
  private opts: MicOptions = {};
  private startedAt = 0;
  private muted = false;

  get recording(): boolean {
    return Boolean(this.processor);
  }

  async start(opts: MicOptions = {}): Promise<void> {
    this.opts = opts;
    this.chunks = [];
    this.muted = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // En navegadores sin https, mediaDevices ni siquiera existe.
      const insecure =
        typeof window !== 'undefined' &&
        window.location.protocol !== 'https:' &&
        !['localhost', '127.0.0.1'].includes(window.location.hostname);
      throw new MicError(
        insecure ? 'insecure' : 'unsupported',
        insecure ? MIC_MESSAGES.insecure : MIC_MESSAGES.unsupported
      );
    }

    const Ctor = getAudioContextCtor();
    if (!Ctor) throw new MicError('unsupported', MIC_MESSAGES.unsupported);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      throw classify(err);
    }

    this.ctx = new Ctor();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.source = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor esta marcado como obsoleto pero es el unico camino
    // soportado por todos los navegadores moviles hoy, incluido Safari iOS.
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    const inputRate = this.ctx.sampleRate;

    this.processor.onaudioprocess = (event) => {
      if (this.muted) return;
      const input = event.inputBuffer.getChannelData(0);
      if (this.opts.onLevel) this.opts.onLevel(Math.min(1, rms(input) * 4));
      const resampled = downsample(input, inputRate, TARGET_RATE);
      const pcm = floatToPcm16(resampled);
      if (this.opts.collect !== false) this.chunks.push(pcm);
      this.opts.onChunk?.(pcm);
    };

    this.source.connect(this.processor);
    // Silenciamos la salida: sin destino, Safari no ejecuta el procesador.
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.processor.connect(sink);
    sink.connect(this.ctx.destination);

    this.startedAt = Date.now();
  }

  /** Corta el envio de audio sin soltar el microfono (el profesor esta hablando). */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  get durationMs(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  /** Cierra todo y devuelve lo grabado como WAV listo para enviar a Gemini. */
  stop(): { base64: string; durationMs: number; samples: number } {
    const durationMs = this.durationMs;
    const pcm = mergeInt16(this.chunks);

    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close();
    this.ctx = null;
    this.chunks = [];
    this.startedAt = 0;

    return {
      base64: pcm.length ? arrayBufferToBase64(encodeWav(pcm, TARGET_RATE)) : '',
      durationMs,
      samples: pcm.length,
    };
  }
}

/** Pregunta el permiso sin empezar a grabar, para pedirlo en el momento correcto. */
export async function requestMicPermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported', MIC_MESSAGES.unsupported);
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch (err) {
    throw classify(err);
  }
}
