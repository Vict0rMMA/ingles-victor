'use client';

import { useEffect, useRef } from 'react';
import { GraduationCap, Languages, Repeat2, Volume2 } from 'lucide-react';
import type { ConversationMessage } from '@/lib/types';
import { CorrectionCard } from './CorrectionCard';
import { cx } from '../ui';

interface Props {
  messages: ConversationMessage[];
  /** Texto que se esta transcribiendo en vivo mientras el alumno habla. */
  liveUser?: string;
  /** Texto que el profesor esta diciendo ahora mismo. */
  liveTeacher?: string;
  thinking?: boolean;
  onReplay?: (text: string) => void;
}

export function Transcript({ messages, liveUser, liveTeacher, thinking, onReplay }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, liveUser, liveTeacher, thinking]);

  return (
    <div className="space-y-1 pb-4">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} onReplay={onReplay} />
      ))}

      {liveUser ? (
        <Bubble role="user" pending>
          {liveUser}
        </Bubble>
      ) : null}

      {liveTeacher ? (
        <Bubble role="teacher" pending>
          {liveTeacher}
        </Bubble>
      ) : null}

      {thinking ? (
        <div className="flex items-center gap-2 py-2 pl-1">
          <GraduationCap className="size-4 text-[var(--accent-soft)]" />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-[var(--accent-soft)]"
                style={{
                  animation: 'bar 900ms ease-in-out infinite',
                  animationDelay: `${i * 140}ms`,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}

function MessageRow({
  message,
  onReplay,
}: {
  message: ConversationMessage;
  onReplay?: (text: string) => void;
}) {
  return (
    <div>
      <Bubble role={message.role} onReplay={onReplay ? () => onReplay(message.text) : undefined}>
        {message.text}
      </Bubble>

      {message.spanish ? (
        <div className="my-1.5 flex items-start gap-2 rounded-xl border border-[var(--info)]/25 bg-[var(--info)]/8 px-3.5 py-2.5">
          <Languages className="mt-0.5 size-3.5 shrink-0 text-[var(--info)]" />
          <p className="selectable text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {message.spanish}
          </p>
        </div>
      ) : null}

      {message.corrections?.map((c, i) => (
        <CorrectionCard key={`${message.id}_c${i}`} correction={c} />
      ))}

      {message.repeatRequest ? (
        <div className="my-2 flex items-start gap-2.5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3">
          <Repeat2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-soft)]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-soft)]">
              Repitelo en voz alta
            </p>
            <p className="selectable mt-0.5 text-[15px] font-medium leading-snug text-[var(--fg)]">
              &ldquo;{message.repeatRequest}&rdquo;
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bubble({
  role,
  children,
  pending,
  onReplay,
}: {
  role: 'teacher' | 'user';
  children: React.ReactNode;
  pending?: boolean;
  onReplay?: () => void;
}) {
  const isTeacher = role === 'teacher';
  return (
    <div className={cx('flex w-full py-1', isTeacher ? 'justify-start' : 'justify-end')}>
      <div className={cx('max-w-[86%] sm:max-w-[75%]', isTeacher ? '' : 'flex flex-col items-end')}>
        <p className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
          {isTeacher ? 'Teacher' : 'You'}
        </p>
        <div
          className={cx(
            'animate-fade-up rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
            isTeacher
              ? 'rounded-tl-md bg-[var(--surface)] text-[var(--fg)]'
              : 'rounded-tr-md bg-[var(--accent)] text-[var(--accent-ink)]',
            pending && 'opacity-60'
          )}
        >
          <span className="selectable whitespace-pre-wrap">{children}</span>
          {onReplay ? (
            <button
              onClick={onReplay}
              className="tap ml-2 inline-flex translate-y-0.5 text-[var(--fg-subtle)]"
              aria-label="Escuchar otra vez"
            >
              <Volume2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
