'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Languages,
  Mic,
  MessageSquare,
  Sparkles,
  Target,
  TriangleAlert,
  Clock,
} from 'lucide-react';
import { Banner, Button, Card, CardHeader, Skeleton, Stat } from '@/components/ui';
import {
  conversationCount,
  formatDuration,
  LEVEL_DESCRIPTION,
  mistakesCorrected,
  recommendation,
  streak,
  topMistakes,
  totalStudySeconds,
  wordsLearned,
} from '@/lib/analytics';
import { getStatus } from '@/lib/api';
import { todayKey, useDB, useHydrated } from '@/lib/store';

export default function DashboardPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [apiReady, setApiReady] = useState<boolean | null>(null);

  useEffect(() => {
    // Avisamos pronto si falta la API key, en vez de fallar al primer toque.
    void getStatus().then((s) => setApiReady(s.ready));
  }, []);

  if (!hydrated) return <DashboardSkeleton />;

  const rec = recommendation(db);
  const mistakes = topMistakes(db, 3);
  const todayLesson = db.lessons.find((l) => l.date === todayKey());
  const name = db.profile.name;

  return (
    <div className="animate-fade-in">
      <header className="mb-5">
        <p className="text-[13px] text-[var(--fg-muted)]">
          {greeting()}
          {name ? `, ${name}` : ''}
        </p>
        <h1 className="mt-0.5 text-[24px] font-semibold tracking-tight sm:text-[28px]">
          Listo para practicar ingles
        </h1>
      </header>

      {apiReady === false ? (
        <div className="mb-4">
          <Banner tone="warning" title="Falta configurar la API key">
            Anade <code className="rounded bg-[var(--surface-2)] px-1">GEMINI_API_KEY</code> en las
            variables de entorno del proyecto para que el profesor pueda responder.
          </Banner>
        </div>
      ) : null}

      {!db.profile.placementDone ? (
        <div className="mb-4">
          <Banner
            tone="info"
            title="Empieza por tu nivel"
            action={
              <Link href="/onboarding">
                <Button size="sm" variant="primary">
                  Hacer el test <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            }
          >
            Un test corto de 12 preguntas ajusta las conversaciones y los ejercicios a tu nivel
            real.
          </Banner>
        </div>
      ) : null}

      {/* Accion principal */}
      <Card className="mb-5 overflow-hidden border-[var(--accent)]/25 bg-gradient-to-br from-[var(--accent)]/16 via-[var(--accent)]/6 to-transparent">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--accent-soft)]">
              <Mic className="size-4" />
              <span className="text-[11.5px] font-semibold uppercase tracking-wider">
                Lo mas importante
              </span>
            </div>
            <h2 className="mt-1.5 text-[19px] font-semibold leading-tight">
              Habla con tu profesor de IA
            </h2>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--fg-muted)]">
              Conversacion por voz con correcciones al momento. Te escucha, te responde hablando y
              te hace repetir cuando hace falta.
            </p>
          </div>
          <Link href="/conversation" className="shrink-0">
            <Button variant="primary" size="lg" full>
              Start Conversation
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Metricas */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Nivel actual"
          value={db.profile.level}
          hint={LEVEL_DESCRIPTION[db.profile.level]}
          icon={<GraduationCap className="size-3.5" />}
          accent
        />
        <Stat
          label="Racha"
          value={`${streak(db)} dias`}
          hint={streak(db) > 0 ? 'Sigue asi' : 'Practica hoy para empezarla'}
          icon={<Flame className="size-3.5" />}
        />
        <Stat
          label="Tiempo"
          value={formatDuration(totalStudySeconds(db))}
          hint="Total practicado"
          icon={<Clock className="size-3.5" />}
        />
        <Stat
          label="Palabras"
          value={String(wordsLearned(db))}
          hint="Dominadas al 70% o mas"
          icon={<Languages className="size-3.5" />}
        />
        <Stat
          label="Conversaciones"
          value={String(conversationCount(db))}
          icon={<MessageSquare className="size-3.5" />}
        />
        <Stat
          label="Errores corregidos"
          value={String(mistakesCorrected(db))}
          hint={`${db.mistakes.length} registrados`}
          icon={<TriangleAlert className="size-3.5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recomendacion */}
        <Card>
          <CardHeader
            title="Recomendado para ti"
            subtitle="Calculado con tus errores reales"
            icon={<Target className="size-4" />}
          />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            <p className="text-[16px] font-semibold">{rec.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">{rec.reason}</p>
            <Link href={rec.href} className="mt-3 block">
              <Button variant="secondary" full>
                Empezar <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Clase de hoy */}
        <Card>
          <CardHeader
            title="Clase de hoy"
            subtitle={todayLesson ? todayLesson.title : 'Aun no la has generado'}
            icon={<Sparkles className="size-4" />}
          />
          <div className="p-4 pt-3 sm:p-5 sm:pt-3">
            {todayLesson ? (
              <>
                <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  {todayLesson.goal}
                </p>
                <p className="mt-2 text-[12px] text-[var(--fg-subtle)]">
                  {todayLesson.steps.filter((s) => s.done).length} de {todayLesson.steps.length}{' '}
                  pasos completados
                </p>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
                Una clase personalizada de 15 a 30 minutos que la IA arma con lo que peor llevas.
              </p>
            )}
            <Link href="/lesson" className="mt-3 block">
              <Button variant="secondary" full>
                {todayLesson ? 'Continuar clase' : 'Generar clase de hoy'}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Errores recientes */}
      {mistakes.length ? (
        <Card className="mt-4">
          <CardHeader
            title="Tus errores mas repetidos"
            subtitle="El sistema los usa para elegir que practicas"
            icon={<TriangleAlert className="size-4" />}
            action={
              <Link href="/mistakes" className="text-[12.5px] text-[var(--accent-soft)]">
                Ver todos
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--border-soft)] px-4 pb-2 sm:px-5">
            {mistakes.map((m) => (
              <li key={m.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="selectable truncate text-[13.5px] text-[var(--fg-muted)] line-through">
                      {m.original}
                    </p>
                    <p className="selectable mt-0.5 truncate text-[14px] font-medium">
                      {m.correction}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--fg-subtle)]">
                    {m.occurrences}x · {m.topic}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Accesos rapidos */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '/pronunciation', label: 'Pronunciation', icon: Mic },
          { href: '/writing', label: 'Writing', icon: BookOpen },
          { href: '/grammar', label: 'Grammar', icon: GraduationCap },
          { href: '/vocabulary', label: 'Vocabulary', icon: Languages },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="tap flex items-center gap-2.5 p-3.5">
              <Icon className="size-4 text-[var(--accent-soft)]" />
              <span className="text-[13.5px] font-medium">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
