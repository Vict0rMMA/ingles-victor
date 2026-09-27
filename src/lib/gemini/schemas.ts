import { Type } from '@google/genai';

/**
 * Esquemas de salida estructurada. Obligan a Gemini a devolver JSON estable,
 * que es lo que permite guardar errores y progreso de forma fiable.
 */

const correctionSchema = {
  type: Type.OBJECT,
  properties: {
    original: { type: Type.STRING, description: 'Exactly what the student said or wrote' },
    correction: { type: Type.STRING, description: 'The corrected English sentence' },
    explanation: { type: Type.STRING, description: 'Short explanation in simple English' },
    explanationEs: { type: Type.STRING, description: 'Same explanation in Spanish, one sentence' },
    category: {
      type: Type.STRING,
      enum: ['grammar', 'vocabulary', 'pronunciation', 'spelling', 'structure', 'natural'],
    },
    topic: { type: Type.STRING, description: 'Grammar/vocabulary topic, e.g. "Past Simple"' },
    severity: { type: Type.STRING, enum: ['minor', 'important', 'critical'] },
    natural: { type: Type.STRING, description: 'A more natural phrasing, or empty string' },
  },
  required: [
    'original',
    'correction',
    'explanation',
    'explanationEs',
    'category',
    'topic',
    'severity',
  ],
};

export const teacherTurnSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description:
        'Exact transcription of the student audio. Empty string if the student typed instead of speaking. Never invent words.',
    },
    reply: { type: Type.STRING, description: 'What the teacher says next, in English' },
    corrections: { type: Type.ARRAY, items: correctionSchema },
    repeatRequest: {
      type: Type.STRING,
      description: 'Sentence the student should repeat out loud, or empty string',
    },
    spanish: {
      type: Type.STRING,
      description: 'Short Spanish explanation only when requested or clearly needed, else empty',
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Two short example answers the student could give',
    },
    newWords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaningEs: { type: Type.STRING },
        },
        required: ['word', 'meaningEs'],
      },
    },
  },
  required: ['transcript', 'reply', 'corrections', 'suggestions', 'newWords'],
};

export const summarySchema = {
  type: Type.OBJECT,
  properties: {
    speaking: { type: Type.STRING, enum: ['good', 'ok', 'needs_practice'] },
    grammar: { type: Type.STRING, enum: ['good', 'ok', 'needs_practice'] },
    vocabulary: { type: Type.STRING, enum: ['good', 'ok', 'needs_practice'] },
    pronunciation: { type: Type.STRING, enum: ['good', 'ok', 'needs_practice', 'not_measured'] },
    commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
    wordsToPractice: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedLesson: { type: Type.STRING },
    notes: { type: Type.STRING, description: 'Two encouraging sentences in Spanish' },
    levelDelta: {
      type: Type.NUMBER,
      description: '1 if clearly above level, -1 if clearly struggling, 0 otherwise',
    },
    detectedMistakes: {
      type: Type.ARRAY,
      items: correctionSchema,
      description:
        'Mistakes visible in the student lines of the transcript that were NOT already in the corrections list. Empty array if none.',
    },
  },
  required: [
    'speaking',
    'grammar',
    'vocabulary',
    'pronunciation',
    'commonMistakes',
    'wordsToPractice',
    'recommendedLesson',
    'notes',
    'levelDelta',
    'detectedMistakes',
  ],
};

export const pronunciationSchema = {
  type: Type.OBJECT,
  properties: {
    heard: {
      type: Type.STRING,
      description: 'Exactly what you heard in the audio. Never guess the target word.',
    },
    understood: { type: Type.BOOLEAN },
    verdict: {
      type: Type.STRING,
      enum: ['good', 'close', 'needs_practice', 'not_measured'],
      description: 'Use not_measured when the audio is unusable',
    },
    focus: { type: Type.STRING, description: 'Which sound or syllable to work on' },
    tip: { type: Type.STRING, description: 'One concrete tip in English' },
    tipEs: { type: Type.STRING, description: 'The same tip in Spanish' },
  },
  required: ['heard', 'understood', 'verdict', 'focus', 'tip', 'tipEs'],
};

export const writingSchema = {
  type: Type.OBJECT,
  properties: {
    corrected: { type: Type.STRING },
    corrections: { type: Type.ARRAY, items: correctionSchema },
    naturalVersion: { type: Type.STRING },
    positives: { type: Type.ARRAY, items: { type: Type.STRING } },
    scoreNote: { type: Type.STRING, description: 'One sentence in Spanish about the overall text' },
  },
  required: ['corrected', 'corrections', 'naturalVersion', 'positives', 'scoreNote'],
};

const questionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.NUMBER, description: 'Index of the correct option, 0 based' },
      explanation: { type: Type.STRING, description: 'Why it is correct, in Spanish' },
    },
    required: ['question', 'options', 'answer', 'explanation'],
  },
};

export const readingSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    text: { type: Type.STRING },
    questions: questionsSchema,
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaningEs: { type: Type.STRING },
          example: { type: Type.STRING },
        },
        required: ['word', 'meaningEs', 'example'],
      },
    },
  },
  required: ['title', 'text', 'questions', 'vocabulary'],
};

export const listeningSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    script: {
      type: Type.STRING,
      description: 'Dialogue or monologue to be read aloud. Use "Speaker: text" lines.',
    },
    questions: questionsSchema,
  },
  required: ['title', 'script', 'questions'],
};

export const grammarSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    explanation: { type: Type.STRING },
    explanationEs: { type: Type.STRING },
    examples: { type: Type.ARRAY, items: { type: Type.STRING } },
    questions: questionsSchema,
  },
  required: ['topic', 'explanation', 'explanationEs', 'examples', 'questions'],
};

export const vocabularySchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING },
          meaningEs: { type: Type.STRING },
          example: { type: Type.STRING },
          ipa: { type: Type.STRING },
        },
        required: ['word', 'meaning', 'meaningEs', 'example', 'ipa'],
      },
    },
  },
  required: ['topic', 'words'],
};

export const placementSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          skill: {
            type: Type.STRING,
            enum: ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking'],
          },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answer: { type: Type.NUMBER },
          level: { type: Type.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
        },
        required: ['id', 'skill', 'question', 'options', 'answer', 'level'],
      },
    },
  },
  required: ['questions'],
};

export const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    goal: { type: Type.STRING, description: 'One sentence in Spanish' },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kind: {
            type: Type.STRING,
            enum: ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'review'],
          },
          title: { type: Type.STRING },
          instructions: { type: Type.STRING, description: 'What to do, in Spanish, 1-2 sentences' },
        },
        required: ['kind', 'title', 'instructions'],
      },
    },
  },
  required: ['title', 'goal', 'steps'],
};
