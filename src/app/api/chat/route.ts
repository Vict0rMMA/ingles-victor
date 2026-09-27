import type { Content, Part } from '@google/genai';
import { buildTeacherSystemPrompt, turnInstruction, type TeacherContext } from '@/lib/gemini/prompts';
import { teacherTurnSchema } from '@/lib/gemini/schemas';
import { generateJSON, modelContent, userContent } from '@/lib/gemini/text';
import { BadRequest, fail, ok, rateLimit, readBody } from '@/lib/server/http';
import type { TeacherTurn } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatBody {
  context: TeacherContext;
  history?: { role: 'teacher' | 'user'; text: string }[];
  userText?: string;
  audio?: { data: string; mimeType: string };
  wantsSpanish?: boolean;
  opening?: boolean;
}

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await readBody<ChatBody>(req);
    if (!body.context?.level) throw new BadRequest('Falta el contexto del alumno.');
    if (!body.opening && !body.userText && !body.audio) {
      throw new BadRequest('No se recibio ni voz ni texto.');
    }

    const ctx: TeacherContext = { ...body.context, wantsSpanish: body.wantsSpanish };
    const system = buildTeacherSystemPrompt(ctx);

    // Solo los ultimos turnos viajan: menos tokens, misma continuidad.
    const history = (body.history ?? []).slice(-14);
    const contents: Content[] = history.map((m) =>
      m.role === 'teacher' ? modelContent(m.text) : userContent([{ text: m.text }])
    );

    if (body.opening) {
      contents.push(
        userContent([
          {
            text: `${turnInstruction(false)}\n\nThis is the very first turn. Greet the student briefly and ask one opening question that fits the mode. Leave "corrections" empty.`,
          },
        ])
      );
    } else {
      const parts: Part[] = [{ text: turnInstruction(Boolean(body.audio)) }];
      if (body.audio?.data) {
        parts.push({
          inlineData: { data: body.audio.data, mimeType: body.audio.mimeType || 'audio/wav' },
        });
      }
      if (body.userText) {
        parts.push({ text: `The student wrote: "${body.userText}"` });
      }
      contents.push(userContent(parts));
    }

    const turn = await generateJSON<TeacherTurn>({
      role: 'chat',
      system,
      contents,
      schema: teacherTurnSchema,
      temperature: 0.85,
      maxOutputTokens: 4000,
    });

    return ok(sanitize(turn));
  } catch (err) {
    return fail(err);
  }
}

/** Nos aseguramos de no guardar campos a medias si el modelo se salta algo. */
function sanitize(turn: TeacherTurn): TeacherTurn {
  return {
    reply: (turn.reply ?? '').trim(),
    transcript: (turn.transcript ?? '').trim(),
    corrections: (turn.corrections ?? [])
      .filter((c) => c?.original && c?.correction && c.original.trim() !== c.correction.trim())
      .slice(0, 3),
    repeatRequest: turn.repeatRequest?.trim() || undefined,
    spanish: turn.spanish?.trim() || undefined,
    suggestions: (turn.suggestions ?? []).filter(Boolean).slice(0, 3),
    newWords: (turn.newWords ?? []).filter((w) => w?.word).slice(0, 4),
  };
}
