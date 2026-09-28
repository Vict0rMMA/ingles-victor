'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, Shield, Sliders, Smile, Trash2, User, Volume2 } from 'lucide-react';
import { AVATARS, TeacherAvatar } from '@/components/conversation/TeacherAvatar';
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Chip,
  cx,
  PageHeader,
  Segmented,
} from '@/components/ui';
import * as api from '@/lib/api';
import { QUOTA_NOTICE, speakText } from '@/lib/speech';
import { VOICES } from '@/lib/gemini/prompts';
import { playWav, unlockAudio } from '@/lib/audio/player';
import {
  clearConversations,
  exportDB,
  resetAll,
  setProfile,
  setSettings,
  useDB,
  useHydrated,
} from '@/lib/store';
import { LEVELS, type Level } from '@/lib/types';

const GOALS = [
  'Viajar',
  'Trabajo',
  'Universidad',
  'Entrevistas',
  'Examenes',
  'Peliculas y series',
  'Hablar con fluidez',
  'Mejorar pronunciacion',
];

export default function SettingsPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const testVoice = async (voice: string) => {
    setTesting(true);
    setMessage(null);
    try {
      await unlockAudio();
      await speakText('Hi! I am your English teacher. Ready to practice?', {
        voice,
        voiceMode: db.settings.voiceMode === 'off' ? 'system' : db.settings.voiceMode,
      }, { force: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo reproducir la voz.');
    } finally {
      setTesting(false);
    }
  };

  const download = () => {
    const blob = new Blob([exportDB()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-english-coach-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGoal = (goal: string) => {
    const goals = db.profile.goals.includes(goal)
      ? db.profile.goals.filter((g) => g !== goal)
      : [...db.profile.goals, goal];
    setProfile({ goals });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ajustes" subtitle="Tu perfil, la voz del profesor y el control de consumo." />

      {message ? (
        <div className="mb-4">
          <Banner tone="info" onClose={() => setMessage(null)}>
            {message}
          </Banner>
        </div>
      ) : null}

      {/* Perfil */}
      <Card className="mb-4">
        <CardHeader title="Tu perfil" icon={<User className="size-4" />} />
        <div className="space-y-4 p-4 pt-3 sm:p-5 sm:pt-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
              Como te llamas
            </span>
            <input
              value={db.profile.name}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder="Tu nombre"
              autoCapitalize="words"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
              Nivel
            </span>
            <div className="flex gap-1.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setProfile({ level: l as Level, levelPoints: 0 })}
                  className={cx(
                    'tap flex-1 rounded-xl border py-2.5 text-[14px] font-semibold',
                    db.profile.level === l
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[var(--fg-subtle)]">
              ¿Prefieres medirlo?{' '}
              <Link href="/onboarding" className="text-[var(--accent-soft)] underline">
                Haz el test de nivel
              </Link>
              .
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
              Para que quieres el ingles
            </span>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g} active={db.profile.goals.includes(g)} onClick={() => toggleGoal(g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Aspecto del profesor */}
      <Card className="mb-4">
        <CardHeader
          title="Tu profesor"
          subtitle="Quien te acompana en las conversaciones"
          icon={<Smile className="size-4" />}
        />
        <div className="space-y-4 p-4 pt-3 sm:p-5 sm:pt-3">
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                onClick={() => setSettings({ avatar: a.id })}
                className={cx(
                  'tap flex flex-col items-center gap-1.5 rounded-2xl border p-2.5',
                  db.settings.avatar === a.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/12'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                )}
              >
                <TeacherAvatar state="idle" look={a} size={56} />
                <span className="text-[12px] font-medium">{a.name}</span>
              </button>
            ))}
          </div>

          <Toggle
            label="Mostrar la cara del profesor"
            description="La boca se mueve con su voz real. Apagalo si prefieres solo el texto."
            checked={db.settings.showAvatar}
            onChange={(v) => setSettings({ showAvatar: v })}
          />
        </div>
      </Card>

      {/* Voz */}
      <Card className="mb-4">
        <CardHeader
          title="Voz del profesor"
          subtitle="Toca una voz para escucharla"
          icon={<Volume2 className="size-4" />}
        />
        <div className="space-y-4 p-4 pt-3 sm:p-5 sm:pt-3">
          <div>
            <Segmented
              value={db.settings.voiceMode}
              onChange={(v) => setSettings({ voiceMode: v, teacherSpeaks: v !== 'off' })}
              options={[
                { value: 'gemini', label: 'Gemini' },
                { value: 'system', label: 'Dispositivo' },
                { value: 'off', label: 'Sin voz' },
              ]}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-subtle)]">
              {db.settings.voiceMode === 'gemini'
                ? 'La voz mas natural, pero el plan gratuito de Gemini permite 15 al dia. Al agotarse, la app pasa sola a la voz del dispositivo.'
                : db.settings.voiceMode === 'system'
                  ? 'Voz del propio telefono o navegador: gratis, ilimitada e instantanea. Suena menos natural.'
                  : 'El profesor no hablara. Solo veras el texto y no se gastara nada de cuota.'}
            </p>
          </div>

          <div
            className={cx(
              'grid grid-cols-2 gap-2 sm:grid-cols-4',
              db.settings.voiceMode !== 'gemini' && 'pointer-events-none opacity-40'
            )}
          >
            {VOICES.map((v) => (
              <button
                key={v.id}
                disabled={testing}
                onClick={() => {
                  setSettings({ voice: v.id });
                  void testVoice(v.id);
                }}
                className={cx(
                  'tap rounded-xl border p-3 text-left disabled:opacity-60',
                  db.settings.voice === v.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/12'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                )}
              >
                <p className="text-[13.5px] font-semibold">{v.label}</p>
                <p className="text-[11.5px] text-[var(--fg-subtle)]">{v.note}</p>
              </button>
            ))}
          </div>

        </div>
      </Card>

      {/* Conversacion y consumo */}
      <Card className="mb-4">
        <CardHeader
          title="Conversacion y consumo"
          subtitle="Controla cuanta API se gasta en cada sesion"
          icon={<Sliders className="size-4" />}
        />
        <div className="space-y-4 p-4 pt-3 sm:p-5 sm:pt-3">
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
              Modo por defecto
            </span>
            <Segmented
              value={db.settings.engine}
              onChange={(v) => setSettings({ engine: v })}
              options={[
                { value: 'turn', label: 'Por turnos' },
                { value: 'live', label: 'En vivo' },
              ]}
            />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-subtle)]">
              Por turnos gasta menos y funciona en cualquier telefono. En vivo usa Gemini Live con
              audio continuo y consume mas.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--fg-muted)]">
                Limite por sesion
              </span>
              <span className="text-[13px] font-semibold tabular-nums">
                {db.settings.sessionLimitMin} min
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={45}
              step={5}
              value={db.settings.sessionLimitMin}
              onChange={(e) => setSettings({ sessionLimitMin: Number(e.target.value) })}
              className="w-full accent-[var(--accent)]"
              style={{ touchAction: 'none' }}
            />
            <p className="mt-1 text-[12px] text-[var(--fg-subtle)]">
              La conversacion se cierra sola al llegar a este tiempo.
            </p>
          </div>
        </div>
      </Card>

      {/* Privacidad */}
      <Card>
        <CardHeader
          title="Privacidad y datos"
          subtitle="Todo se guarda solo en este dispositivo"
          icon={<Shield className="size-4" />}
        />
        <div className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
          <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
            El audio nunca se guarda: se envia a Gemini para entenderlo y se descarta. En este
            navegador solo quedan tus transcripciones, errores, vocabulario y progreso.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={download}>
              <Download className="size-4" />
              Exportar mis datos
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                clearConversations();
                setMessage('Historial de conversaciones borrado.');
              }}
            >
              <Trash2 className="size-4" />
              Borrar conversaciones
            </Button>
          </div>

          {!confirmReset ? (
            <Button variant="danger" full onClick={() => setConfirmReset(true)}>
              Borrar todo y empezar de cero
            </Button>
          ) : (
            <div className="rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/8 p-3.5">
              <p className="text-[13px] leading-relaxed">
                Se borrara tu progreso, errores, vocabulario y conversaciones. No se puede deshacer.
              </p>
              <div className="mt-3 flex gap-2">
                <Button full variant="secondary" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </Button>
                <Button
                  full
                  variant="danger"
                  onClick={() => {
                    resetAll();
                    setConfirmReset(false);
                    setMessage('Todo borrado. Empiezas de cero.');
                  }}
                >
                  Si, borrar todo
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="tap flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--fg-subtle)]">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
        )}
      >
        <span
          className="absolute top-1 size-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
        />
      </span>
    </button>
  );
}
