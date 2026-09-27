'use client';

import { GoogleGenAI, type LiveServerMessage, type Session } from '@google/genai';
import { arrayBufferToBase64 } from '@/lib/audio/wav';

/**
 * Conversacion de voz en tiempo real con Gemini Live.
 *
 * El navegador abre el WebSocket directamente contra Gemini usando un token
 * efimero que emite nuestro servidor, asi que la API key real nunca sale de
 * Vercel y la latencia no pasa por un intermediario.
 */

export interface LiveEvents {
  onOpen?: () => void;
  onAudio?: (base64Pcm24k: string) => void;
  /** Transcripcion parcial de lo que dice el alumno. */
  onUserText?: (text: string) => void;
  /** Transcripcion parcial de lo que dice el profesor. */
  onTeacherText?: (text: string) => void;
  /** Fin del turno del profesor, con el texto completo acumulado. */
  onTurnComplete?: (payload: { teacher: string; user: string }) => void;
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

export class LiveSession {
  private session: Session | null = null;
  private events: LiveEvents;
  private teacherBuffer = '';
  private userBuffer = '';
  private closed = false;

  constructor(events: LiveEvents) {
    this.events = events;
  }

  get active(): boolean {
    return Boolean(this.session) && !this.closed;
  }

  async connect(token: string, model: string, voice: string, systemFallback?: string): Promise<void> {
    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    this.session = await ai.live.connect({
      model,
      callbacks: {
        onopen: () => this.events.onOpen?.(),
        onmessage: (message: LiveServerMessage) => this.handle(message),
        onerror: (e: ErrorEvent) => {
          this.events.onError?.(e.message || 'Se perdio la conexion con el profesor.');
        },
        onclose: (e: CloseEvent) => {
          this.closed = true;
          this.events.onClose?.(e.reason || '');
        },
      },
      config: {
        // El token ya trae fijada la configuracion; esto es solo el espejo local
        // para cuando la cuenta permita configurar desde el cliente.
        responseModalities: ['AUDIO' as never],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          languageCode: 'en-US',
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        ...(systemFallback ? { systemInstruction: systemFallback } : {}),
      },
    });
  }

  private handle(message: LiveServerMessage) {
    const content = message.serverContent;

    const audio = message.data;
    if (audio) this.events.onAudio?.(audio);

    if (content?.inputTranscription?.text) {
      this.userBuffer += content.inputTranscription.text;
      this.events.onUserText?.(this.userBuffer);
    }

    if (content?.outputTranscription?.text) {
      this.teacherBuffer += content.outputTranscription.text;
      this.events.onTeacherText?.(this.teacherBuffer);
    }

    if (content?.interrupted) {
      this.events.onInterrupted?.();
    }

    if (content?.turnComplete) {
      this.events.onTurnComplete?.({
        teacher: this.teacherBuffer.trim(),
        user: this.userBuffer.trim(),
      });
      this.teacherBuffer = '';
      this.userBuffer = '';
    }
  }

  /** Envia un trozo de microfono ya convertido a PCM 16 bits / 16 kHz. */
  sendAudio(pcm: Int16Array): void {
    if (!this.session || this.closed) return;
    try {
      this.session.sendRealtimeInput({
        audio: {
          data: arrayBufferToBase64(pcm.buffer as ArrayBuffer),
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch {
      // Un envio fallido no debe tumbar la sesion: el siguiente trozo lo intenta otra vez.
    }
  }

  sendText(text: string): void {
    if (!this.session || this.closed) return;
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }

  close(): void {
    this.closed = true;
    try {
      this.session?.close();
    } catch {
      /* ya estaba cerrada */
    }
    this.session = null;
  }
}
