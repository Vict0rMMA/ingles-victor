'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Check, Info, Loader2, X } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ----------------------------- Card ----------------------------- */

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag
      className={cx(
        'rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface)]',
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--accent-soft)]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-[var(--fg)]">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] leading-snug text-[var(--fg-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------------------- Button ---------------------------- */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
  'aria-label'?: string;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent shadow-[0_6px_20px_var(--accent-glow)]',
  secondary:
    'bg-[var(--surface-2)] text-[var(--fg)] border-[var(--border)]',
  ghost: 'bg-transparent text-[var(--fg-muted)] border-transparent',
  danger: 'bg-[var(--danger)]/12 text-[var(--danger)] border-[var(--danger)]/30',
  success: 'bg-[var(--success)]/14 text-[var(--success)] border-[var(--success)]/30',
};

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[14px] rounded-2xl gap-2',
  lg: 'h-13 px-5 text-[15px] rounded-2xl gap-2',
};

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  loading,
  full,
  className,
  type = 'button',
  title,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      aria-label={rest['aria-label']}
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        'tap inline-flex items-center justify-center border font-medium',
        'disabled:pointer-events-none disabled:opacity-45',
        // El hover solo existe donde hay raton de verdad: en tactil se quedaria pegado.
        'hovered:brightness-110',
        SIZES[size],
        VARIANTS[variant],
        full && 'w-full',
        className
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin-slow" /> : null}
      {children}
    </button>
  );
}

/* ----------------------------- Chip ----------------------------- */

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'tap inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium',
        active
          ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]',
        className
      )}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------- Stat ----------------------------- */

export function Stat({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[var(--fg-subtle)]">
        {icon}
        <span className="text-[12px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cx(
          'mt-2 text-[26px] font-semibold leading-none tabular-nums',
          accent ? 'text-[var(--accent-soft)]' : 'text-[var(--fg)]'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-[var(--fg-subtle)]">{hint}</p> : null}
    </Card>
  );
}

/* -------------------------- ProgressBar -------------------------- */

export function ProgressBar({
  value,
  tone = 'accent',
}: {
  value: number | null;
  tone?: 'accent' | 'success' | 'warning';
}) {
  const colors = {
    accent: 'var(--accent)',
    success: 'var(--success)',
    warning: 'var(--warning)',
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      {value === null ? null : (
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: colors[tone] }}
        />
      )}
    </div>
  );
}

/* --------------------------- Segmented --------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'tap flex-1 rounded-xl px-3 py-2 text-[13px] font-medium',
            value === o.value
              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'text-[var(--fg-muted)]'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- Banner ---------------------------- */

export function Banner({
  tone = 'info',
  title,
  children,
  onClose,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  action?: ReactNode;
}) {
  const tones = {
    info: { color: 'var(--info)', Icon: Info },
    warning: { color: 'var(--warning)', Icon: AlertTriangle },
    danger: { color: 'var(--danger)', Icon: AlertTriangle },
    success: { color: 'var(--success)', Icon: Check },
  };
  const { color, Icon } = tones[tone];
  return (
    <div
      className="animate-fade-in flex items-start gap-3 rounded-2xl border p-3.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--fg)]">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-[var(--fg-muted)]">{children}</div>
        {action ? <div className="mt-2.5">{action}</div> : null}
      </div>
      {onClose ? (
        <button onClick={onClose} className="tap -m-1 p-1 text-[var(--fg-subtle)]" aria-label="Cerrar">
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------- EmptyState --------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--fg-subtle)]">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-[var(--fg)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-[var(--fg-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ---------------------------- Skeleton ---------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-xl', className)} />;
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--fg-muted)]">
      <Loader2 className="size-6 animate-spin-slow text-[var(--accent-soft)]" />
      {label ? <p className="text-[13px]">{label}</p> : null}
    </div>
  );
}

/* ------------------------------ Sheet ------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="animate-fade-up relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] sm:max-w-lg sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="tap -m-2 p-2 text-[var(--fg-subtle)]" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-area flex-1 px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--border-soft)] px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------- PageHeader --------------------------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)] sm:text-[14px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
