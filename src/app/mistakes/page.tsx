'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, Dumbbell, Trash2, TriangleAlert } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  cx,
  EmptyState,
  PageHeader,
} from '@/components/ui';
import { CATEGORY_LABELS, weakTopics } from '@/lib/analytics';
import { deleteMistake, markMistakeResolved, useDB, useHydrated } from '@/lib/store';
import type { MistakeCategory } from '@/lib/types';

type Filter = 'all' | MistakeCategory | 'resolved';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'grammar', label: 'Gramatica' },
  { value: 'vocabulary', label: 'Vocabulario' },
  { value: 'structure', label: 'Estructura' },
  { value: 'natural', label: 'Naturalidad' },
  { value: 'pronunciation', label: 'Pronunciacion' },
  { value: 'spelling', label: 'Ortografia' },
  { value: 'resolved', label: 'Superados' },
];

export default function MistakesPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const base =
      filter === 'all'
        ? db.mistakes.filter((m) => !m.resolved)
        : filter === 'resolved'
          ? db.mistakes.filter((m) => m.resolved)
          : db.mistakes.filter((m) => m.category === filter && !m.resolved);
    return [...base].sort((a, b) => b.occurrences - a.occurrences || b.lastSeen - a.lastSeen);
  }, [db.mistakes, filter]);

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const weak = weakTopics(db, 5);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Mis errores"
        subtitle="Cada error se guarda con su correccion, su explicacion y cuantas veces lo has repetido."
      />

      {weak.length ? (
        <Card className="mb-4 border-[var(--warning)]/30 bg-[var(--warning)]/8">
          <CardHeader
            title="Areas debiles detectadas"
            subtitle="El sistema las usa para elegir tus ejercicios"
            icon={<TriangleAlert className="size-4" />}
          />
          <div className="flex flex-wrap gap-2 p-4 pt-3 sm:p-5 sm:pt-3">
            {weak.map((t) => (
              <Link key={t} href={`/grammar?topic=${encodeURIComponent(t)}`}>
                <Chip>
                  <Dumbbell className="size-3.5" />
                  Practicar {t}
                </Chip>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" style={{ touchAction: 'pan-x' }}>
        {FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? db.mistakes.filter((m) => !m.resolved).length
              : f.value === 'resolved'
                ? db.mistakes.filter((m) => m.resolved).length
                : db.mistakes.filter((m) => m.category === f.value && !m.resolved).length;
          if (count === 0 && f.value !== 'all') return null;
          return (
            <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              <span className="text-[10.5px] text-[var(--fg-subtle)]">{count}</span>
            </Chip>
          );
        })}
      </div>

      {list.length ? (
        <ul className="space-y-2">
          {list.map((m) => (
            <Card key={m.id} as="li" className={cx('p-4', m.resolved && 'opacity-65')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--fg-subtle)]">
                      {CATEGORY_LABELS[m.category]}
                    </span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--fg-subtle)]">
                      {m.topic}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{
                        color: m.occurrences > 2 ? 'var(--danger)' : 'var(--fg-subtle)',
                        background:
                          m.occurrences > 2
                            ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
                            : 'var(--surface-2)',
                      }}
                    >
                      {m.occurrences}x
                    </span>
                  </div>

                  <p className="selectable mt-2 text-[14px] text-[var(--fg-muted)] line-through decoration-[var(--danger)]/50">
                    {m.original}
                  </p>
                  <p className="selectable mt-0.5 text-[15px] font-medium">{m.correction}</p>
                  <p className="selectable mt-1.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                    {m.explanationEs || m.explanation}
                  </p>
                  <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
                    Ultima vez:{' '}
                    {new Date(m.lastSeen).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · Origen: {sourceLabel(m.source)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-1.5">
                  {!m.resolved ? (
                    <button
                      onClick={() => markMistakeResolved(m.id)}
                      className="tap flex size-8 items-center justify-center rounded-lg border border-[var(--success)]/35 text-[var(--success)]"
                      aria-label="Marcar como superado"
                      title="Ya lo domino"
                    >
                      <Check className="size-4" />
                    </button>
                  ) : null}
                  <button
                    onClick={() => deleteMistake(m.id)}
                    className="tap flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-subtle)]"
                    aria-label="Eliminar error"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<TriangleAlert className="size-6" />}
          title={filter === 'resolved' ? 'Aun no has superado ninguno' : 'Sin errores registrados'}
          description={
            filter === 'resolved'
              ? 'Marca un error como superado cuando lo domines y aparecera aqui.'
              : 'Cuando converses o escribas, los errores importantes se guardaran aqui con su explicacion.'
          }
          action={
            <Link href="/conversation">
              <Button variant="primary">Tener una conversacion</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'conversation':
      return 'conversacion';
    case 'writing':
      return 'writing';
    case 'pronunciation':
      return 'pronunciacion';
    default:
      return 'ejercicio';
  }
}
