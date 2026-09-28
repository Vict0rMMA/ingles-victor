'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Languages, Plus, Send, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import {
  Banner,
  Button,
  Card,
  CardHeader,
  Chip,
  cx,
  EmptyState,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  Segmented,
} from '@/components/ui';
import * as api from '@/lib/api';
import { getCachedExercise, putCachedExercise } from '@/lib/cache';
import { QUOTA_NOTICE, speakText } from '@/lib/speech';
import { playWav, unlockAudio } from '@/lib/audio/player';
import { TOPICS } from '@/lib/modes';
import {
  addSession,
  addWords,
  deleteWord,
  recordCorrections,
  reviewWord,
  useDB,
  useHydrated,
} from '@/lib/store';
import type { VocabularyWord } from '@/lib/types';

type Tab = 'mine' | 'learn' | 'practice';

export default function VocabularyPage() {
  const db = useDB();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>('mine');

  if (!hydrated) return <div className="skeleton h-64 rounded-3xl" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vocabulary"
        subtitle="Tus palabras, con significado, ejemplo y practica de uso real."
      />

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: `Mis palabras (${db.vocabulary.length})` },
            { value: 'learn', label: 'Aprender' },
            { value: 'practice', label: 'Practicar' },
          ]}
        />
      </div>

      {tab === 'mine' ? <MyWords /> : null}
      {tab === 'learn' ? <LearnNew /> : null}
      {tab === 'practice' ? <PracticeWords /> : null}
    </div>
  );
}

/* --------------------------------- Mis palabras --------------------------------- */

function MyWords() {
  const db = useDB();
  const [query, setQuery] = useState('');

  const words = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? db.vocabulary.filter(
          (w) => w.word.toLowerCase().includes(q) || w.meaningEs.toLowerCase().includes(q)
        )
      : db.vocabulary;
    return [...list].sort((a, b) => a.mastery - b.mastery || b.addedAt - a.addedAt);
  }, [db.vocabulary, query]);

  const speak = async (word: string) => {
    try {
      await unlockAudio();
      await speakText(word, db.settings, { force: true });
    } catch {
      /* el fallo de audio no debe romper la lista */
    }
  };

  if (!db.vocabulary.length) {
    return (
      <EmptyState
        icon={<Languages className="size-6" />}
        title="Aun no tienes palabras"
        description="Las palabras se guardan solas cuando conversas o lees, y tambien puedes generar un set nuevo."
      />
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar palabra..."
        autoCapitalize="none"
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
      />

      <ul className="space-y-2">
        {words.map((w) => (
          <Card key={w.id} as="li" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[16px] font-semibold">{w.word}</p>
                  <button
                    onClick={() => void speak(w.word)}
                    className="tap text-[var(--fg-subtle)]"
                    aria-label={`Escuchar ${w.word}`}
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                  {w.ipa ? (
                    <span className="text-[12px] text-[var(--fg-subtle)]">/{w.ipa}/</span>
                  ) : null}
                </div>
                <p className="selectable mt-0.5 text-[13.5px] text-[var(--fg-muted)]">
                  {w.meaningEs}
                </p>
                {w.example ? (
                  <p className="selectable mt-1 text-[12.5px] italic text-[var(--fg-subtle)]">
                    {w.example}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => deleteWord(w.id)}
                className="tap -mr-1 -mt-1 p-1 text-[var(--fg-subtle)]"
                aria-label="Eliminar palabra"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-[var(--fg-subtle)]">
                <span>
                  {w.practiceCount > 0
                    ? `${w.practiceCount} practicas · ${w.mistakes} fallos`
                    : 'Sin practicar todavia'}
                </span>
                <span className="tabular-nums">
                  {w.practiceCount > 0 ? `${w.mastery}%` : '—'}
                </span>
              </div>
              <ProgressBar
                value={w.practiceCount > 0 ? w.mastery : null}
                tone={w.mastery >= 70 ? 'success' : 'warning'}
              />
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- Aprender --------------------------------- */

function LearnNew() {
  const db = useDB();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [set, setSet] = useState<Awaited<ReturnType<typeof api.getVocabulary>> | null>(null);
  const [saved, setSaved] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSet(null);
    setSaved(false);
    try {
      const data = await api.getVocabulary({ level: db.profile.level, topic: topic || undefined });
      setSet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el vocabulario.');
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!set) return;
    addWords(set.words, db.profile.level);
    addSession('vocabulary', 120);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      {error ? (
        <Banner tone="danger" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <Card>
        <CardHeader
          title="Generar un set nuevo"
          subtitle={`8 palabras para nivel ${db.profile.level}`}
          icon={<Sparkles className="size-4" />}
        />
        <div className="p-4 pt-3 sm:p-5 sm:pt-3">
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>
                {t}
              </Chip>
            ))}
          </div>
          <Button variant="primary" full size="lg" className="mt-4" loading={loading} onClick={generate}>
            Generar vocabulario
          </Button>
        </div>
      </Card>

      {loading ? <LoadingBlock label="Eligiendo palabras utiles..." /> : null}

      {set ? (
        <Card className="animate-fade-up">
          <CardHeader
            title={set.topic}
            action={
              <Button size="sm" variant="primary" onClick={save} disabled={saved}>
                <Plus className="size-3.5" />
                {saved ? 'Guardadas' : 'Guardar todas'}
              </Button>
            }
          />
          <ul className="divide-y divide-[var(--border-soft)] px-4 pb-2 sm:px-5">
            {set.words.map((w) => (
              <li key={w.word} className="py-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-[15.5px] font-semibold">{w.word}</p>
                  {w.ipa ? (
                    <span className="text-[12px] text-[var(--fg-subtle)]">/{w.ipa}/</span>
                  ) : null}
                </div>
                <p className="selectable text-[13.5px] text-[var(--fg-muted)]">{w.meaningEs}</p>
                <p className="selectable mt-0.5 text-[12.5px] italic text-[var(--fg-subtle)]">
                  {w.example}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/* --------------------------------- Practicar --------------------------------- */

function PracticeWords() {
  const db = useDB();
  const [mode, setMode] = useState<'quick' | 'sentence'>('quick');

  const pool = useMemo(
    () => [...db.vocabulary].sort((a, b) => a.mastery - b.mastery || a.lastReview - b.lastReview),
    [db.vocabulary]
  );

  if (db.vocabulary.length < 4) {
    return (
      <EmptyState
        icon={<Languages className="size-6" />}
        title="Necesitas al menos 4 palabras"
        description="Genera un set en la pestana Aprender o ten una conversacion: las palabras nuevas se guardan solas."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'quick', label: 'Repaso rapido' },
          { value: 'sentence', label: 'Usar en una frase' },
        ]}
      />
      {mode === 'quick' ? <QuickReview pool={pool} /> : <SentenceReview pool={pool} />}
    </div>
  );
}

/** Repaso local: no gasta API, solo usa las palabras que ya tienes. */
function QuickReview({ pool }: { pool: VocabularyWord[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const word = pool[index % pool.length];

  const options = useMemo(() => {
    const others = pool.filter((w) => w.id !== word.id);
    const distractors = shuffle(others).slice(0, 3);
    return shuffle([word, ...distractors]);
  }, [pool, word]);

  const answer = (choiceId: string) => {
    if (picked) return;
    setPicked(choiceId);
    reviewWord(word.id, choiceId === word.id);
    addSession('vocabulary', 20);
  };

  return (
    <Card className="p-5">
      <p className="text-center text-[11.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
        Que significa
      </p>
      <p className="mt-2 text-center text-[26px] font-semibold">{word.word}</p>

      <div className="mt-5 space-y-2">
        {options.map((o) => {
          const isRight = o.id === word.id;
          const isPicked = picked === o.id;
          return (
            <button
              key={o.id}
              onClick={() => answer(o.id)}
              disabled={Boolean(picked)}
              className={cx(
                'tap flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[14px]',
                !picked && 'border-[var(--border)] bg-[var(--surface-2)]',
                picked && isRight && 'border-[var(--success)]/50 bg-[var(--success)]/12',
                picked && isPicked && !isRight && 'border-[var(--danger)]/50 bg-[var(--danger)]/12',
                picked && !isRight && !isPicked && 'opacity-50'
              )}
            >
              {picked && isRight ? (
                <Check className="size-4 shrink-0 text-[var(--success)]" />
              ) : picked && isPicked ? (
                <X className="size-4 shrink-0 text-[var(--danger)]" />
              ) : (
                <span className="size-4 shrink-0" />
              )}
              <span className="selectable">{o.meaningEs}</span>
            </button>
          );
        })}
      </div>

      {picked ? (
        <div className="animate-fade-in mt-4">
          {word.example ? (
            <p className="selectable mb-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] italic text-[var(--fg-muted)]">
              {word.example}
            </p>
          ) : null}
          <Button
            variant="primary"
            full
            onClick={() => {
              setPicked(null);
              setIndex((i) => i + 1);
            }}
          >
            Siguiente palabra
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

/** Usar la palabra en una frase propia: la IA revisa si esta bien usada. */
function SentenceReview({ pool }: { pool: VocabularyWord[] }) {
  const db = useDB();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string; natural: string } | null>(
    null
  );

  const word = pool[index % pool.length];

  const check = useCallback(async () => {
    const sentence = text.trim();
    if (!sentence) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.checkWriting({
        text: sentence,
        level: db.profile.level,
        task: `Use the word "${word.word}" correctly in one sentence.`,
        kind: 'answer',
      });
      const usesWord = sentence.toLowerCase().includes(word.word.toLowerCase());
      const ok = usesWord && data.corrections.length === 0;

      reviewWord(word.id, ok);
      if (data.corrections.length) recordCorrections(data.corrections, 'exercise');
      addSession('vocabulary', 60);

      setResult({
        ok,
        message: !usesWord
          ? `Tu frase no incluye "${word.word}". Vuelve a intentarlo usando la palabra.`
          : data.corrections.length
            ? data.corrections[0].explanationEs
            : 'Bien usada. La frase es correcta.',
        natural: data.naturalVersion || data.corrected,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revisar la frase.');
    } finally {
      setLoading(false);
    }
  }, [db.profile.level, text, word]);

  return (
    <Card className="p-5">
      {error ? (
        <div className="mb-3">
          <Banner tone="danger" onClose={() => setError(null)}>
            {error}
          </Banner>
        </div>
      ) : null}

      <p className="text-center text-[11.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
        Escribe una frase con
      </p>
      <p className="mt-2 text-center text-[26px] font-semibold">{word.word}</p>
      <p className="mt-1 text-center text-[13px] text-[var(--fg-muted)]">{word.meaningEs}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={`Write a sentence using "${word.word}"...`}
        autoCapitalize="sentences"
        className="mt-4 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[16px] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]"
      />

      <Button
        variant="primary"
        full
        className="mt-3"
        loading={loading}
        disabled={!text.trim()}
        onClick={check}
      >
        <Send className="size-4" />
        Revisar frase
      </Button>

      {result ? (
        <div className="animate-fade-up mt-4">
          <div
            className="rounded-xl border px-3.5 py-3"
            style={{
              borderColor: `color-mix(in srgb, ${result.ok ? 'var(--success)' : 'var(--warning)'} 35%, transparent)`,
              background: `color-mix(in srgb, ${result.ok ? 'var(--success)' : 'var(--warning)'} 10%, transparent)`,
            }}
          >
            <p className="selectable text-[13.5px] leading-relaxed">{result.message}</p>
            {result.natural ? (
              <p className="selectable mt-2 text-[13.5px] font-medium">{result.natural}</p>
            ) : null}
          </div>
          <Button
            full
            className="mt-3"
            onClick={() => {
              setResult(null);
              setText('');
              setIndex((i) => i + 1);
            }}
          >
            Siguiente palabra
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
