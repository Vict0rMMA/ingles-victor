'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Dumbbell,
  GraduationCap,
  Headphones,
  Home,
  Languages,
  LineChart,
  Mic,
  Moon,
  Music,
  PenLine,
  Settings,
  Sparkles,
  Sun,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import { cx } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/conversation', label: 'Conversar', icon: Mic },
  { href: '/lesson', label: 'Clase de hoy', icon: Sparkles },
];

const PRACTICE: NavItem[] = [
  { href: '/songs', label: 'Canciones', icon: Music },
  { href: '/pronunciation', label: 'Pronunciation', icon: Volume2 },
  { href: '/listening', label: 'Listening', icon: Headphones },
  { href: '/reading', label: 'Reading', icon: BookOpen },
  { href: '/writing', label: 'Writing', icon: PenLine },
  { href: '/grammar', label: 'Grammar', icon: GraduationCap },
  { href: '/vocabulary', label: 'Vocabulary', icon: Languages },
];

const TRACK: NavItem[] = [
  { href: '/progress', label: 'Progreso', icon: LineChart },
  { href: '/mistakes', label: 'Mis errores', icon: TriangleAlert },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

/** En movil solo caben cinco destinos; el resto vive en el hub de practica. */
const BOTTOM: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/conversation', label: 'Hablar', icon: Mic },
  { href: '/lesson', label: 'Clase', icon: Sparkles },
  { href: '/practice', label: 'Practicar', icon: Dumbbell },
  { href: '/progress', label: 'Progreso', icon: LineChart },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light') setTheme('light');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('aec_theme', next);
    } catch {
      /* modo privado */
    }
  };

  return (
    <button
      onClick={toggle}
      className="tap flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg-muted)]"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function SidebarGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cx(
                  'tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium',
                  active
                    ? 'bg-[var(--accent)]/14 text-[var(--accent-soft)]'
                    : 'text-[var(--fg-muted)] hovered:bg-[var(--surface-2)] hovered:text-[var(--fg)]'
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // La conversacion se lleva toda la pantalla en movil: es la protagonista.
  const immersive = pathname === '/conversation';

  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg)]">
      {/* Sidebar solo en escritorio */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-[var(--border-soft)] bg-[var(--bg-soft)] px-3 py-5 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
            <Mic className="size-[18px]" />
          </span>
          <span className="text-[15px] font-semibold leading-tight">
            AI English
            <br />
            <span className="text-[var(--fg-muted)]">Coach</span>
          </span>
        </Link>

        <nav className="scroll-area flex-1">
          <SidebarGroup title="Aprender" items={MAIN} pathname={pathname} />
          <SidebarGroup title="Practicar" items={PRACTICE} pathname={pathname} />
          <SidebarGroup title="Seguimiento" items={TRACK} pathname={pathname} />
        </nav>

        <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-3 pt-4">
          <span className="text-[11px] text-[var(--fg-subtle)]">Gemini</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior solo en movil y tablet */}
        {!immersive ? (
          <header
            className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg)]/85 px-4 py-3 backdrop-blur-xl lg:hidden"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
          >
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)]">
                <Mic className="size-4" />
              </span>
              <span className="text-[15px] font-semibold">AI English Coach</span>
            </Link>
            <ThemeToggle />
          </header>
        ) : null}

        <main
          className={cx(
            'min-w-0 flex-1',
            immersive ? '' : 'mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10'
          )}
        >
          {children}
        </main>
      </div>

      {/* Navegacion inferior en movil */}
      {!immersive ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-[var(--bg)]/92 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <ul className="flex">
            {BOTTOM.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cx(
                      'tap flex flex-col items-center gap-1 py-2.5',
                      active ? 'text-[var(--accent-soft)]' : 'text-[var(--fg-subtle)]'
                    )}
                  >
                    <Icon className="size-[21px]" />
                    <span className="text-[10.5px] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
