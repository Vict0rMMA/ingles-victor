'use client';

import { useEffect, useRef, useState } from 'react';
import { outputLevel } from '@/lib/audio/player';
import type { MicState } from './MicButton';

/** Aspectos disponibles del profesor. Solo son datos: pelo, piel y color. */
export interface AvatarLook {
  id: string;
  name: string;
  skin: string;
  hair: string;
  shirt: string;
  /** 'short' | 'long' | 'bun' | 'curly' */
  style: 'short' | 'long' | 'bun' | 'curly';
}

export const AVATARS: AvatarLook[] = [
  { id: 'emma', name: 'Emma', skin: '#f0c9a6', hair: '#6b4423', shirt: '#6c5ce7', style: 'long' },
  { id: 'james', name: 'James', skin: '#8d5524', hair: '#1c1a19', shirt: '#2f9e73', style: 'short' },
  { id: 'sofia', name: 'Sofia', skin: '#e0a479', hair: '#2b1d16', shirt: '#e0566c', style: 'bun' },
  { id: 'liam', name: 'Liam', skin: '#f5d9bd', hair: '#c8873f', shirt: '#3a86c8', style: 'curly' },
];

export function getAvatar(id: string): AvatarLook {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/**
 * Cara del profesor.
 *
 * La boca no se anima al azar: lee el volumen real del audio que esta
 * sonando, asi que abre y cierra con la voz. Cuando el alumno habla, mira
 * hacia el y asiente. Mientras piensa, levanta la vista.
 */
export function TeacherAvatar({
  state,
  look,
  micLevel = 0,
  size = 132,
}: {
  state: MicState;
  look: AvatarLook;
  /** Volumen del microfono del alumno, para que el profesor reaccione. */
  micLevel?: number;
  size?: number;
}) {
  const [mouth, setMouth] = useState(0);
  const [blink, setBlink] = useState(false);
  const raf = useRef<number | undefined>(undefined);

  const speaking = state === 'speaking';
  const thinking = state === 'thinking';
  const listening = state === 'listening' || state === 'recording';

  // Boca sincronizada con la voz real del profesor.
  useEffect(() => {
    if (!speaking) {
      setMouth(0);
      return;
    }
    const tick = () => {
      setMouth(outputLevel());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [speaking]);

  // Parpadeo a intervalos irregulares: uno regular parece un robot.
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlink(true);
          window.setTimeout(() => setBlink(false), 130);
          schedule();
        },
        2200 + Math.random() * 3200
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  // Apertura de la boca en pixeles, con un minimo para que no desaparezca.
  const open = speaking ? 2 + mouth * 13 : 0;
  const width = speaking ? 17 + mouth * 5 : 18;

  // Mirada: al alumno cuando habla, arriba cuando piensa.
  const eyeX = thinking ? -1.6 : listening ? 0.8 : 0;
  const eyeY = thinking ? -2.2 : 0;

  const lidClosed = blink ? 1 : 0;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Aura que late mientras escucha al alumno */}
      {listening ? (
        <span
          className="pointer-events-none absolute rounded-full transition-transform duration-100"
          style={{
            width: size * 0.92,
            height: size * 0.92,
            background: 'var(--success)',
            opacity: 0.16,
            transform: `scale(${1 + Math.min(micLevel, 1) * 0.28})`,
          }}
        />
      ) : null}
      {speaking ? (
        <span
          className="pointer-events-none absolute rounded-full"
          style={{
            width: size * 0.92,
            height: size * 0.92,
            background: 'var(--accent)',
            opacity: 0.1 + mouth * 0.16,
            transform: `scale(${1 + mouth * 0.14})`,
          }}
        />
      ) : null}

      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label="Profesor de ingles"
        className="relative"
        style={{
          // Respiracion sutil: el conjunto nunca se queda del todo quieto.
          animation: 'avatar-breathe 4s ease-in-out infinite',
        }}
      >
        <defs>
          <clipPath id="face-clip">
            <circle cx="60" cy="58" r="34" />
          </clipPath>
        </defs>

        {/* Fondo */}
        <circle cx="60" cy="60" r="58" fill="var(--surface-2)" />
        <circle cx="60" cy="60" r="58" fill="none" stroke="var(--border)" strokeWidth="1.5" />

        {/* Hombros */}
        <path d="M22 118 Q22 94 60 94 Q98 94 98 118 Z" fill={look.shirt} />
        <path d="M52 94 Q60 104 68 94 L68 90 L52 90 Z" fill={look.skin} />

        {/* Pelo de atras */}
        {look.style === 'long' ? (
          <path d="M24 60 Q24 20 60 20 Q96 20 96 60 L96 92 Q88 80 88 60 L32 60 Q32 80 24 92 Z" fill={look.hair} />
        ) : null}
        {look.style === 'bun' ? <circle cx="60" cy="19" r="11" fill={look.hair} /> : null}

        {/* Cara */}
        <ellipse cx="60" cy="58" rx="34" ry="36" fill={look.skin} />

        {/* Orejas */}
        <ellipse cx="25" cy="60" rx="5" ry="7" fill={look.skin} />
        <ellipse cx="95" cy="60" rx="5" ry="7" fill={look.skin} />

        {/* Pelo de delante */}
        <g clipPath="url(#face-clip)">
          {look.style === 'short' ? (
            <path d="M24 56 Q26 22 60 22 Q94 22 96 56 Q86 40 60 40 Q34 40 24 56 Z" fill={look.hair} />
          ) : look.style === 'curly' ? (
            <>
              <path d="M24 54 Q26 20 60 20 Q94 20 96 54 Q88 36 60 36 Q32 36 24 54 Z" fill={look.hair} />
              <circle cx="34" cy="34" r="9" fill={look.hair} />
              <circle cx="50" cy="26" r="10" fill={look.hair} />
              <circle cx="70" cy="26" r="10" fill={look.hair} />
              <circle cx="86" cy="34" r="9" fill={look.hair} />
            </>
          ) : (
            <path d="M24 56 Q24 20 60 20 Q96 20 96 56 Q92 38 60 38 Q28 38 24 56 Z" fill={look.hair} />
          )}
        </g>

        {/* Cejas: suben al pensar */}
        <g
          style={{
            transform: `translateY(${thinking ? -2.5 : 0}px)`,
            transition: 'transform 260ms var(--ease-out)',
          }}
        >
          <path
            d="M40 49 Q47 45 54 48"
            stroke={look.hair}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M66 48 Q73 45 80 49"
            stroke={look.hair}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Ojos */}
        <g style={{ transform: `translate(${eyeX}px, ${eyeY}px)`, transition: 'transform 320ms var(--ease-out)' }}>
          <ellipse cx="47" cy="58" rx="5.2" ry={5.2 * (1 - lidClosed * 0.92)} fill="#ffffff" />
          <ellipse cx="73" cy="58" rx="5.2" ry={5.2 * (1 - lidClosed * 0.92)} fill="#ffffff" />
          {!blink ? (
            <>
              <circle cx={47 + eyeX * 0.6} cy={58 + eyeY * 0.4} r="2.6" fill="#2a2320" />
              <circle cx={73 + eyeX * 0.6} cy={58 + eyeY * 0.4} r="2.6" fill="#2a2320" />
              <circle cx={48 + eyeX * 0.6} cy={57 + eyeY * 0.4} r="0.9" fill="#ffffff" />
              <circle cx={74 + eyeX * 0.6} cy={57 + eyeY * 0.4} r="0.9" fill="#ffffff" />
            </>
          ) : (
            <>
              <path d="M42 58 Q47 60 52 58" stroke="#2a2320" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M68 58 Q73 60 78 58" stroke="#2a2320" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* Nariz */}
        <path
          d="M60 62 Q57.5 69 60 71"
          stroke="color-mix(in srgb, #8a5a3b 55%, transparent)"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Boca */}
        {speaking ? (
          <ellipse
            cx="60"
            cy={80 + open * 0.18}
            rx={width / 2}
            ry={Math.max(1.6, open / 2)}
            fill="#7d3b43"
          />
        ) : thinking ? (
          <path d="M53 80 Q60 78 67 80" stroke="#8a4a52" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        ) : (
          // En reposo y escuchando, una sonrisa amable.
          <path
            d="M50 78 Q60 87 70 78"
            stroke="#8a4a52"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Mejillas */}
        <ellipse cx="38" cy="70" rx="5" ry="3.2" fill="#e08a8a" opacity="0.28" />
        <ellipse cx="82" cy="70" rx="5" ry="3.2" fill="#e08a8a" opacity="0.28" />
      </svg>

      {/* Puntos de "pensando" */}
      {thinking ? (
        <div className="absolute -right-1 top-2 flex gap-1 rounded-full bg-[var(--surface)] px-2 py-1.5 shadow-[var(--shadow-sm)]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-[var(--accent-soft)]"
              style={{ animation: 'bar 900ms ease-in-out infinite', animationDelay: `${i * 140}ms` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
