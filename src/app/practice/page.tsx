'use client';

import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  Headphones,
  Languages,
  LineChart,
  Mic,
  PenLine,
  Sparkles,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';

const ITEMS = [
  {
    href: '/conversation',
    label: 'AI Conversation',
    description: 'Habla por voz con tu profesor y recibe correcciones.',
    icon: Mic,
    highlight: true,
  },
  {
    href: '/pronunciation',
    label: 'Pronunciation',
    description: 'Escucha, repite y recibe feedback honesto de tus sonidos.',
    icon: Volume2,
  },
  {
    href: '/listening',
    label: 'Listening',
    description: 'Audios generados a tu nivel con preguntas de comprension.',
    icon: Headphones,
  },
  {
    href: '/reading',
    label: 'Reading',
    description: 'Textos, vocabulario y lectura en voz alta.',
    icon: BookOpen,
  },
  {
    href: '/writing',
    label: 'Writing',
    description: 'Escribe y recibe la version corregida y la natural.',
    icon: PenLine,
  },
  {
    href: '/grammar',
    label: 'Grammar',
    description: 'Explicacion, ejemplos y ejercicios por tema.',
    icon: GraduationCap,
  },
  {
    href: '/vocabulary',
    label: 'Vocabulary',
    description: 'Tus palabras, con ejemplos y practica de uso real.',
    icon: Languages,
  },
  {
    href: '/lesson',
    label: 'Clase de hoy',
    description: 'Una clase completa armada segun tus puntos flojos.',
    icon: Sparkles,
  },
  {
    href: '/mistakes',
    label: 'Mis errores',
    description: 'Todo lo que has fallado, agrupado y con su explicacion.',
    icon: TriangleAlert,
  },
  {
    href: '/progress',
    label: 'Progreso',
    description: 'Tus metricas reales por habilidad.',
    icon: LineChart,
  },
];

export default function PracticePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Practicar"
        subtitle="Elige en que quieres trabajar hoy. Todo se adapta a tu nivel y a tus errores."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ href, label, description, icon: Icon, highlight }) => (
          <Link key={href} href={href}>
            <Card
              className={`tap flex h-full items-start gap-3.5 p-4 ${
                highlight ? 'border-[var(--accent)]/30 bg-[var(--accent)]/8' : ''
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  highlight
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'bg-[var(--surface-2)] text-[var(--accent-soft)]'
                }`}
              >
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight">{label}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                  {description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
