'use client';

import Link from 'next/link';
import { Clock, Flame, GraduationCap, MessageSquare, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  Stat,
} from '@/components/ui';
import {
  conversationCount,
  formatDuration,
  LEVEL_DESCRIPTION,
  SKILL_LABELS,
  skillMetric,
  streak,
  totalStudySeconds,
} from '@/lib/analytics';
import { modeLabel } from '@/lib/modes';
import { deleteConversation, useDB, useHydrated } from '@/lib/store';
import { LEVELS, SKILLS } from '@/lib/types';

export default function ProgressPage() {
  const db = useDB();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const levelIndex = LEVELS.indexOf(db.profile.level);
  const conversations = db.conversations.filter((c) => c.messages.length > 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Progreso"
        subtitle="Solo numeros calculados con lo que de verdad has practicado. Sin datos, no hay porcentaje."
      />

      {/* Nivel */}
      <Card className="mb-4 border-[var(--accent)]/25 bg-gradient-to-br from-[var(--accent)]/12 to-transparent">
        <div className="p-5">
          <div className="flex items-center gap-2 text-[var(--accent-soft)]">
            <GraduationCap className="size-4" />
            <span className="text-[11.5px] font-semibold uppercase tracking-wider">Nivel actual</span>
          </div>
          <p className="mt-2 text-[36px] font-semibold leading-none">{db.profile.level}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {LEVEL_DESCRIPTION[db.profile.level]}
          </p>

          <div className="mt-4 flex gap-1.5">
            {LEVELS.map((l, i) => (
              <div key={l} className="flex-1">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    background: i <= levelIndex ? 'var(--accent)' : 'var(--surface-2)',
                  }}
                />
                <p
                  className="mt-1 text-center text-[10.5px]"
                  style={{ color: i <= levelIndex ? 'var(--accent-soft)' : 'var(--fg-subtle)' }}
                >
                  {l}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[12px] text-[var(--fg-subtle)]">
            El nivel cambia por rendimiento acumulado en varias sesiones, nunca por una sola
            respuesta.
            {db.profile.levelPoints !== 0
              ? ` Llevas ${db.profile.levelPoints > 0 ? '+' : ''}${db.profile.levelPoints} de 5 puntos hacia el siguiente cambio.`
              : ''}
          </p>
        </div>
      </Card>

      {/* Resumen */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Racha" value={`${streak(db)}d`} icon={<Flame className="size-3.5" />} />
        <Stat
          label="Tiempo"
          value={formatDuration(totalStudySeconds(db))}
          icon={<Clock className="size-3.5" />}
        />
        <Stat
          label="Charlas"
          value={String(conversationCount(db))}
          icon={<MessageSquare className="size-3.5" />}
        />
      </div>

      {/* Habilidades */}
      <Card className="mb-4">
        <CardHeader
          title="Progreso por habilidad"
          subtitle="Cada barra sale de respuestas reales tuyas"
        />
        <div className="space-y-4 p-4 pt-3 sm:p-5 sm:pt-3">
          {SKILLS.map((skill) => {
            const metric = skillMetric(db, skill);
            return (
              <div key={skill}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13.5px] font-medium">{SKILL_LABELS[skill]}</span>
                  <span className="text-[12.5px] tabular-nums text-[var(--fg-muted)]">
                    {metric.value === null ? (
                      <span className="text-[var(--fg-subtle)]">Aun sin datos</span>
                    ) : (
                      `${metric.value}%`
                    )}
                  </span>
                </div>
                <ProgressBar
                  value={metric.value}
                  tone={
                    metric.value === null
                      ? 'accent'
                      : metric.value >= 70
                        ? 'success'
                        : 'warning'
                  }
                />
                <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
                  {metric.samples > 0
                    ? `Sobre ${metric.samples} ${sampleLabel(skill)}`
                    : 'Practica esta habilidad para empezar a medirla'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader
          title="Tus conversaciones"
          subtitle={`${conversations.length} guardadas en este dispositivo`}
        />
        {conversations.length ? (
          <ul className="divide-y divide-[var(--border-soft)] px-4 pb-2 sm:px-5">
            {conversations.slice(0, 15).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {modeLabel(c.mode)}
                    {c.topic ? ` · ${c.topic}` : ''}
                  </p>
                  <p className="text-[12px] text-[var(--fg-subtle)]">
                    {new Date(c.startedAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {c.messages.filter((m) => m.role === 'user').length} intervenciones ·{' '}
                    {c.engine === 'live' ? 'en vivo' : 'por turnos'}
                  </p>
                </div>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="tap p-1 text-[var(--fg-subtle)]"
                  aria-label="Borrar conversacion"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Todavia no hay conversaciones"
            description="Cuando hables con el profesor, cada sesion quedara aqui con su resumen."
            action={
              <Link href="/conversation">
                <Button variant="primary">Empezar ahora</Button>
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}

function sampleLabel(skill: string): string {
  switch (skill) {
    case 'vocabulary':
      return 'palabras practicadas';
    case 'speaking':
      return 'intervenciones habladas';
    case 'pronunciation':
      return 'intentos evaluables';
    case 'writing':
      return 'frases escritas';
    default:
      return 'preguntas respondidas';
  }
}
