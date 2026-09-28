'use client';

import { getAudioContextCtor } from './mic';
import { base64ToArrayBuffer, pcm16ToFloat32 } from './wav';

/**
 * Salida de audio del profesor.
 *
 * Los moviles (sobre todo iOS) solo dejan sonar audio despues de un gesto del
 * usuario, por eso hay un unico AudioContext compartido que se desbloquea con
 * el primer toque y se reutiliza durante toda la sesion.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Llamar dentro del handler de un toque real del usuario. */
export async function unlockAudio(): Promise<void> {
  const c = audioContext();
  if (!c) return;
  if (c.state === 'suspended') await c.resume();
  if (!unlocked) {
    // Un buffer mudo de una muestra basta para que iOS considere el contexto activo.
    const buffer = c.createBuffer(1, 1, 22050);
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start(0);
    unlocked = true;
  }
}

export function isUnlocked(): boolean {
  return unlocked;
}

/* ------------------------------------------------------------------ */
/* Medidor de la voz del profesor                                      */
/* ------------------------------------------------------------------ */

/**
 * Todo el audio de salida pasa por un analizador. Con eso el avatar puede
 * mover la boca siguiendo la voz de verdad, en lugar de fingir una
 * animacion que no cuadra con lo que se oye.
 */
let analyser: AnalyserNode | null = null;
let meterData: Uint8Array<ArrayBuffer> | null = null;

function outputNode(): AudioNode | null {
  const c = audioContext();
  if (!c) return null;
  if (!analyser) {
    analyser = c.createAnalyser();
    analyser.fftSize = 256;
    // Sin suavizado la boca tiembla; demasiado y va por detras de la voz.
    analyser.smoothingTimeConstant = 0.55;
    analyser.connect(c.destination);
    meterData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }
  return analyser;
}

/** Volumen actual de la voz del profesor, de 0 a 1. */
export function outputLevel(): number {
  if (!analyser || !meterData) return 0;
  analyser.getByteTimeDomainData(meterData);
  let peak = 0;
  for (let i = 0; i < meterData.length; i += 1) {
    const v = Math.abs(meterData[i] - 128) / 128;
    if (v > peak) peak = v;
  }
  // La voz rara vez pasa de 0.5 de pico: escalamos para usar todo el rango.
  return Math.min(1, peak * 2.2);
}

type Listener = (playing: boolean) => void;
const listeners = new Set<Listener>();

export function onPlaybackChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(playing: boolean) {
  listeners.forEach((l) => l(playing));
}

let current: AudioBufferSourceNode | null = null;
let currentBuffer: AudioBuffer | null = null;
let startedAt = 0;
let pausedAt = 0;

/** Reproduce un WAV en base64 (la voz que devuelve el TTS de Gemini). */
export async function playWav(base64: string): Promise<void> {
  const c = audioContext();
  if (!c || !base64) return;
  await unlockAudio();
  stopPlayback();

  const buffer = await c.decodeAudioData(base64ToArrayBuffer(base64));
  currentBuffer = buffer;
  pausedAt = 0;
  await playFrom(0);
}

function playFrom(offset: number): Promise<void> {
  const c = audioContext();
  if (!c || !currentBuffer) return Promise.resolve();

  return new Promise((resolve) => {
    const source = c.createBufferSource();
    source.buffer = currentBuffer;
    source.connect(outputNode() ?? c.destination);
    source.onended = () => {
      if (current === source) {
        current = null;
        emit(false);
      }
      resolve();
    };
    current = source;
    startedAt = c.currentTime - offset;
    source.start(0, offset);
    emit(true);
  });
}

export function stopPlayback(): void {
  if (current) {
    try {
      current.onended = null;
      current.stop();
    } catch {
      /* ya habia terminado */
    }
    current = null;
    emit(false);
  }
  pausedAt = 0;
}

export function pausePlayback(): void {
  const c = audioContext();
  if (!c || !current) return;
  pausedAt = c.currentTime - startedAt;
  try {
    current.onended = null;
    current.stop();
  } catch {
    /* ignorado */
  }
  current = null;
  emit(false);
}

export async function resumePlayback(): Promise<void> {
  if (!currentBuffer || current) return;
  await playFrom(Math.min(pausedAt, currentBuffer.duration - 0.01));
}

export function replay(): Promise<void> {
  stopPlayback();
  return playFrom(0);
}

export function hasAudioLoaded(): boolean {
  return Boolean(currentBuffer);
}

/* ------------------------------------------------------------------ */
/* Reproduccion en streaming para Gemini Live                          */
/* ------------------------------------------------------------------ */

/**
 * Gemini Live manda trozos de PCM 24 kHz segun genera la voz.
 * Se encolan uno detras de otro en la linea de tiempo del AudioContext
 * para que suenen sin cortes, y se pueden descartar de golpe cuando el
 * alumno interrumpe al profesor.
 */
export class PcmStream {
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private rate: number;
  private onStateChange?: (speaking: boolean) => void;

  constructor(rate = 24000, onStateChange?: (speaking: boolean) => void) {
    this.rate = rate;
    this.onStateChange = onStateChange;
  }

  push(base64: string): void {
    const c = audioContext();
    if (!c || !base64) return;

    const floats = pcm16ToFloat32(base64ToArrayBuffer(base64));
    if (!floats.length) return;

    const buffer = c.createBuffer(1, floats.length, this.rate);
    buffer.copyToChannel(floats, 0);

    const source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(outputNode() ?? c.destination);

    // Un pequeno colchon evita cortes cuando la red entrega los trozos a tirones.
    const now = c.currentTime;
    if (this.nextTime < now) this.nextTime = now + 0.08;

    source.start(this.nextTime);
    this.nextTime += buffer.duration;

    this.sources.add(source);
    if (this.sources.size === 1) this.onStateChange?.(true);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) this.onStateChange?.(false);
    };
  }

  /** El alumno hablo encima: descartamos lo que quedaba por sonar. */
  interrupt(): void {
    for (const source of this.sources) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* ignorado */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.onStateChange?.(false);
  }

  get speaking(): boolean {
    return this.sources.size > 0;
  }
}

/* ------------------------------------------------------------------ */
/* Voz del sistema: gratis e ilimitada                                  */
/* ------------------------------------------------------------------ */

/**
 * El TTS de Gemini suena mucho mejor, pero el plan gratuito da 15 usos al
 * dia. La voz del navegador no consume nada de API y responde al instante,
 * asi que sirve tanto de modo elegido como de red de seguridad cuando la
 * cuota se agota a mitad de una conversacion.
 */
export function browserVoiceAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Elegimos la mejor voz inglesa disponible en el dispositivo. */
function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  if (!english.length) return null;
  // Las voces "natural"/"neural" de Windows y las locales de iOS y Android
  // suenan bastante mejor que la predeterminada.
  const preferred = english.find((v) => /natural|neural|enhanced|premium/i.test(v.name));
  const us = english.find((v) => v.lang?.toLowerCase() === 'en-us');
  return preferred ?? us ?? english[0];
}

let browserSpeaking = false;

/** true mientras habla la voz del sistema (no pasa por el AudioContext). */
export function isBrowserSpeaking(): boolean {
  return browserSpeaking;
}

export function stopBrowserSpeech(): void {
  if (!browserVoiceAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignorado */
  }
  browserSpeaking = false;
  emit(false);
}

export function browserSpeak(text: string): Promise<void> {
  if (!browserVoiceAvailable() || !text) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voice = pickEnglishVoice();
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang ?? 'en-US';
      // Un poco mas lento de lo normal: el alumno esta aprendiendo.
      utter.rate = 0.94;
      utter.pitch = 1;

      const done = () => {
        browserSpeaking = false;
        emit(false);
        resolve();
      };
      utter.onend = done;
      utter.onerror = done;

      browserSpeaking = true;
      emit(true);
      window.speechSynthesis.speak(utter);

      // Chrome deja de hablar si la pestana pierde foco un rato; este
      // seguro evita que la promesa se quede colgada para siempre.
      const guard = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          window.clearInterval(guard);
          done();
        }
      }, 500);
    } catch {
      browserSpeaking = false;
      resolve();
    }
  });
}

/** Callar al profesor, venga su voz de Gemini o del propio dispositivo. */
export function stopAllSpeech(): void {
  stopPlayback();
  stopBrowserSpeech();
}

/** Las voces llegan de forma asincrona en Chrome; conviene pedirlas pronto. */
export function warmUpVoices(): void {
  if (!browserVoiceAvailable()) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* ignorado */
  }
}
