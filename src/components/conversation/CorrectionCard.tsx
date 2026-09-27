'use client';

import { useState } from 'react';
import { ArrowRight, Languages, Sparkles } from 'lucide-react';
import type { Correction } from '@/lib/types';
import { CATEGORY_LABELS } from '@/lib/analytics';
import { cx } from '../ui';

const SEVERITY: Record<Correction['severity'], { label: string; color: string }> = {
  minor: { label: 'Detalle', color: 'var(--info)' },
  important: { label: 'Importante', color: 'var(--warning)' },
  critical: { label: 'Cambia el significado', color: 'var(--danger)' },
};

export function CorrectionCard({ correction }: { correction: Correction }) {
  const [spanish, setSpanish] = useState(false);
  const sev = SEVERITY[correction.severity] ?? SEVERITY.important;
  // "natural" no es un error: es otra forma de decirlo, y se presenta asi.
  const isAlternative = correction.category === 'natural';

  return (
    <div
      className="animate-fade-up my-2 overflow-hidden rounded-2xl border"
      style={{
        borderColor: `color-mix(in srgb, ${isAlternative ? 'var(--info)' : sev.color} 30%, transparent)`,
        background: `color-mix(in srgb, ${isAlternative ? 'var(--info)' : sev.color} 8%, var(--surface))`,
      }}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="size-3.5" style={{ color: isAlternative ? 'var(--info)' : sev.color }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: isAlternative ? 'var(--info)' : sev.color }}
        >
          {isAlternative ? 'Forma mas natural' : sev.label}
        </span>
        <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] text-[var(--fg-subtle)]">
          {CATEGORY_LABELS[correction.category]} · {correction.topic}
        </span>
      </div>

      <div className="space-y-2.5 px-4 py-3">
        {!isAlternative ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
              Dijiste
            </p>
            <p className="selectable mt-0.5 text-[14px] leading-snug text-[var(--fg-muted)] line-through decoration-[var(--danger)]/60">
              {correction.original}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
            {isAlternative ? 'Suena mas natural' : 'Correcto'}
          </p>
          <p className="selectable mt-0.5 flex items-start gap-1.5 text-[15px] font-medium leading-snug text-[var(--fg)]">
            <ArrowRight className="mt-1 size-3.5 shrink-0 text-[var(--success)]" />
            {correction.natural && isAlternative ? correction.natural : correction.correction}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--fg-subtle)]">
            Por que
          </p>
          <p className="selectable mt-0.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {spanish ? correction.explanationEs : correction.explanation}
          </p>
        </div>

        {correction.natural && !isAlternative ? (
          <p className="selectable text-[12.5px] leading-relaxed text-[var(--info)]">
            Aun mas natural: {correction.natural}
          </p>
        ) : null}

        <button
          onClick={() => setSpanish((s) => !s)}
          className={cx(
            'tap inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium',
            'bg-[var(--surface-2)] text-[var(--fg-muted)]'
          )}
        >
          <Languages className="size-3.5" />
          {spanish ? 'Ver en ingles' : 'Ver en espanol'}
        </button>
      </div>
    </div>
  );
}
