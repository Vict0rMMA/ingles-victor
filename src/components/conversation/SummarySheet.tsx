'use client';

import Link from 'next/link';
import { Clock, Target } from 'lucide-react';
import type { ConversationSummary, Rating } from '@/lib/types';
import { Button, Card, Sheet } from '../ui';

const RATING: Record<Rating | 'not_measured', { label: string; color: string }> = {
  good: { label: 'Bien', color: 'var(--success)' },
  ok: { label: 'Aceptable', color: 'var(--warning)' },
  needs_practice: { label: 'A practicar', color: 'var(--danger)' },
  not_measured: { label: 'Sin datos', color: 'var(--fg-subtle)' },
};

export function SummarySheet({
  open,
  onClose,
  summary,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  summary: ConversationSummary | null;
  loading: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Conversacion terminada"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={onClose}>
            Cerrar
          </Button>
          <Link href="/" className="flex-1">
            <Button variant="primary" full>
              Ir al inicio
            </Button>
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3 py-4">
          <p className="text-center text-[13px] text-[var(--fg-muted)]">
            Analizando tu conversacion...
          </p>
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      ) : !summary ? (
        <p className="py-6 text-center text-[13px] text-[var(--fg-muted)]">
          No se pudo generar el resumen, pero tu conversacion y tus errores quedaron guardados.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--fg-muted)]">
            <Clock className="size-4" />
            <span className="text-[13px]">
              Duracion: <strong className="text-[var(--fg)]">{summary.durationMin} min</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['Speaking', summary.speaking],
                ['Grammar', summary.grammar],
                ['Vocabulary', summary.vocabulary],
                ['Pronunciation', summary.pronunciation],
              ] as const
            ).map(([label, value]) => {
              const r = RATING[value] ?? RATING.not_measured;
              return (
                <Card key={label} className="p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
                    {label}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold" style={{ color: r.color }}>
                    {r.label}
                  </p>
                </Card>
              );
            })}
          </div>

          {summary.pronunciation === 'not_measured' ? (
            <p className="text-[12px] leading-relaxed text-[var(--fg-subtle)]">
              La pronunciacion no se evaluo en esta sesion porque no habia suficiente audio para
              juzgarla con honestidad.
            </p>
          ) : null}

          {summary.commonMistakes?.length ? (
            <section>
              <h3 className="mb-2 text-[13px] font-semibold">Tus errores frecuentes</h3>
              <ol className="space-y-1.5">
                {summary.commonMistakes.map((m, i) => (
                  <li key={m} className="flex gap-2 text-[13px] text-[var(--fg-muted)]">
                    <span className="text-[var(--accent-soft)]">{i + 1}.</span>
                    {m}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {summary.wordsToPractice?.length ? (
            <section>
              <h3 className="mb-2 text-[13px] font-semibold">Palabras para practicar</h3>
              <div className="flex flex-wrap gap-1.5">
                {summary.wordsToPractice.map((w) => (
                  <span
                    key={w}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[12.5px] text-[var(--fg-muted)]"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {summary.recommendedLesson ? (
            <Card className="flex items-start gap-3 border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3.5">
              <Target className="mt-0.5 size-4 shrink-0 text-[var(--accent-soft)]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-soft)]">
                  Siguiente leccion recomendada
                </p>
                <p className="mt-0.5 text-[14px] font-medium">{summary.recommendedLesson}</p>
              </div>
            </Card>
          ) : null}

          {summary.notes ? (
            <p className="selectable text-[13px] leading-relaxed text-[var(--fg-muted)]">
              {summary.notes}
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
