'use client';

import { Loader2, Mic, Square, Volume2 } from 'lucide-react';
import { cx } from '../ui';

export type MicState = 'idle' | 'recording' | 'thinking' | 'speaking' | 'listening';

const LABELS: Record<MicState, string> = {
  idle: 'Toca para hablar',
  recording: 'Te escucho... toca para enviar',
  thinking: 'El profesor esta pensando',
  speaking: 'El profesor esta hablando',
  listening: 'Habla cuando quieras',
};

/**
 * Boton de microfono grande, pensado para el pulgar en movil:
 * 96px de diametro real, sin hover pegajoso y con respuesta al tacto.
 */
export function MicButton({
  state,
  level = 0,
  onPress,
  disabled,
}: {
  state: MicState;
  /** Volumen 0-1 para que el anillo reaccione a la voz. */
  level?: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const recording = state === 'recording';
  const busy = state === 'thinking';
  const speaking = state === 'speaking';
  const listening = state === 'listening';

  const Icon = busy ? Loader2 : speaking ? Volume2 : recording ? Square : Mic;

  const color = recording
    ? 'var(--danger)'
    : speaking
      ? 'var(--info)'
      : listening
        ? 'var(--success)'
        : 'var(--accent)';

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative flex items-center justify-center">
        {/* Anillos: uno constante y otro que sigue la voz en tiempo real */}
        {(recording || listening) && (
          <>
            <span
              className="pointer-events-none absolute size-24 rounded-full"
              style={{ background: color, animation: 'pulse-ring 1.8s ease-out infinite', opacity: 0.35 }}
            />
            <span
              className="pointer-events-none absolute rounded-full transition-transform duration-75"
              style={{
                width: 96,
                height: 96,
                background: color,
                opacity: 0.18,
                transform: `scale(${1 + Math.min(level, 1) * 0.6})`,
              }}
            />
          </>
        )}

        <button
          onClick={onPress}
          disabled={disabled || busy}
          aria-label={LABELS[state]}
          className={cx(
            'tap relative flex size-24 items-center justify-center rounded-full text-white',
            'disabled:opacity-60',
            'active:scale-95'
          )}
          style={{
            background: color,
            boxShadow: `0 10px 40px color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        >
          <Icon className={cx('size-9', busy && 'animate-spin-slow')} strokeWidth={2} />
        </button>
      </div>

      <p className="min-h-[18px] text-center text-[13px] font-medium text-[var(--fg-muted)]">
        {LABELS[state]}
      </p>
    </div>
  );
}

/** Barras de volumen para el modo Live, donde no hay boton que pulsar. */
export function VoiceBars({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-8 items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-[var(--accent-soft)]"
          style={{
            height: active ? `${12 + Math.min(level, 1) * 20 * (i % 2 ? 0.7 : 1)}px` : '6px',
            transition: 'height 90ms linear',
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}
