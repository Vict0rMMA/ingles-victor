'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ExternalLink,
  FileText,
  GraduationCap,
  Music,
  Plus,
  Play,
  Volume2,
} from 'lucide-react';
import { Banner, Button, Card, Chip, cx, PageHeader } from '@/components/ui';
import { speakText } from '@/lib/speech';
import { ACCENT_LABEL, lyricsSearch, SONG_LEVELS, SONGS, youtubeSearch, type Song } from '@/lib/songs';
import { addWords, useDB, useHydrated } from '@/lib/store';
import type { Level } from '@/lib/types';

const PACE_COLOR: Record<Song['pace'], string> = {
  lenta: 'var(--success)',
  media: 'var(--warning)',
  rapida: 'var(--danger)',
};

export default function SongsPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [level, setLevel] = useState<Level | 'todas'>('todas');
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  const list = useMemo(() => {
    const filtered = level === 'todas' ? SONGS : SONGS.filter((s) => s.level === level);
    return [...filtered].sort(
      (a, b) => SONG_LEVELS.indexOf(a.level) - SONG_LEVELS.indexOf(b.level)
    );
  }, [level]);

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  const saveWords = (song: Song) => {
    addWords(
      song.vocabulary.map((v) => ({
        word: v.word,
        meaning: '',
        meaningEs: v.meaningEs,
        example: `De la cancion "${song.title}" de ${song.artist}.`,
      })),
      song.level
    );
    setSaved((s) => [...s, song.id]);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Canciones"
        subtitle="Aprende ingles con canciones famosas. Esta seccion no gasta nada de API."
      />

      <div className="mb-4">
        <Banner tone="info" title="Como sacarle partido">
          Escucha la cancion una vez sin leer nada. Luego abre la letra y escuchala otra vez
          siguiendola. Al final, guarda el vocabulario y practica la gramatica que trabaja.
        </Banner>
      </div>

      {/* Filtro por nivel */}
      <div
        className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4"
        style={{ touchAction: 'pan-x' }}
      >
        <Chip active={level === 'todas'} onClick={() => setLevel('todas')}>
          Todas ({SONGS.length})
        </Chip>
        {SONG_LEVELS.map((l) => {
          const count = SONGS.filter((s) => s.level === l).length;
          if (!count) return null;
          return (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l} ({count})
              {db.profile.level === l ? ' · tu nivel' : ''}
            </Chip>
          );
        })}
      </div>

      <ul className="space-y-2">
        {list.map((song) => {
          const expanded = open === song.id;
          return (
            <Card key={song.id} as="li" className="overflow-hidden">
              <button
                onClick={() => setOpen(expanded ? null : song.id)}
                className="tap flex w-full items-start gap-3 p-4 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--accent-soft)]">
                  <Music className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-semibold leading-tight">
                    {song.title}
                  </p>
                  <p className="truncate text-[13px] text-[var(--fg-muted)]">
                    {song.artist} · {song.year}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--accent-soft)]">
                      {song.level}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                      style={{
                        color: PACE_COLOR[song.pace],
                        background: `color-mix(in srgb, ${PACE_COLOR[song.pace]} 14%, transparent)`,
                      }}
                    >
                      {song.pace}
                    </span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] text-[var(--fg-subtle)]">
                      {song.accent}
                    </span>
                    <span className="truncate rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] text-[var(--fg-subtle)]">
                      {song.grammar}
                    </span>
                  </div>
                </div>
              </button>

              {expanded ? (
                <div className="animate-fade-in space-y-4 border-t border-[var(--border-soft)] px-4 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                      De que trata
                    </p>
                    <p className="selectable mt-1 text-[13.5px] leading-relaxed">{song.theme}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                      Por que sirve para aprender
                    </p>
                    <p className="selectable mt-1 text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
                      {song.why}
                    </p>
                    <p className="mt-1.5 text-[12px] text-[var(--fg-subtle)]">
                      Acento de {ACCENT_LABEL[song.accent]}.
                    </p>
                  </div>

                  {/* Vocabulario */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-subtle)]">
                        Palabras clave
                      </p>
                      <Button
                        size="sm"
                        onClick={() => saveWords(song)}
                        disabled={saved.includes(song.id)}
                      >
                        <Plus className="size-3.5" />
                        {saved.includes(song.id) ? 'Guardadas' : 'Guardar'}
                      </Button>
                    </div>
                    <ul className="space-y-1.5">
                      {song.vocabulary.map((v) => (
                        <li
                          key={v.word}
                          className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2"
                        >
                          <button
                            onClick={() => void speakText(v.word, db.settings, { force: true })}
                            className="tap text-[var(--fg-subtle)]"
                            aria-label={`Escuchar ${v.word}`}
                          >
                            <Volume2 className="size-3.5" />
                          </button>
                          <span className="text-[14px] font-medium">{v.word}</span>
                          <span className="ml-auto truncate text-right text-[12.5px] text-[var(--fg-muted)]">
                            {v.meaningEs}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Acciones */}
                  <div className="grid grid-cols-2 gap-2">
                    <a href={youtubeSearch(song)} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" full>
                        <Play className="size-4" />
                        Escuchar
                      </Button>
                    </a>
                    <a href={lyricsSearch(song)} target="_blank" rel="noopener noreferrer">
                      <Button full>
                        <FileText className="size-4" />
                        Ver letra
                        <ExternalLink className="size-3" />
                      </Button>
                    </a>
                    <Link href={`/grammar?topic=${encodeURIComponent(song.grammar)}`}>
                      <Button full>
                        <GraduationCap className="size-4" />
                        Practicar
                      </Button>
                    </Link>
                    <Link
                      href={`/conversation?topic=${encodeURIComponent(
                        `the song ${song.title} by ${song.artist}`
                      )}`}
                    >
                      <Button full>
                        <Music className="size-4" />
                        Hablar de ella
                      </Button>
                    </Link>
                  </div>

                  <p className="text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                    La letra no se guarda en la app porque tiene derechos de autor: los botones
                    llevan al video y a la letra original.
                  </p>
                </div>
              ) : null}
            </Card>
          );
        })}
      </ul>

      <p
        className={cx(
          'mt-5 text-center text-[12px] leading-relaxed text-[var(--fg-subtle)]'
        )}
      >
        Truco: canta encima de la cancion aunque te salga mal. Es la forma mas rapida de soltar la
        pronunciacion y no cuesta ni una peticion de API.
      </p>
    </div>
  );
}
