/**
 * Entidades del dominio de AI English Coach.
 * Todo lo que la app guarda y consulta pasa por estos tipos.
 */

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export type SkillKey =
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'grammar'
  | 'vocabulary'
  | 'pronunciation';

export const SKILLS: SkillKey[] = [
  'speaking',
  'listening',
  'reading',
  'writing',
  'grammar',
  'vocabulary',
  'pronunciation',
];

export type MistakeCategory =
  | 'grammar'
  | 'vocabulary'
  | 'pronunciation'
  | 'spelling'
  | 'structure'
  | 'natural';

export type Severity = 'minor' | 'important' | 'critical';

export type ConversationMode =
  | 'free'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'interview'
  | 'travel'
  | 'university'
  | 'daily'
  | 'pronunciation';

/** Una correccion concreta detectada por el profesor. */
export interface Correction {
  original: string;
  correction: string;
  explanation: string;
  explanationEs: string;
  category: MistakeCategory;
  topic: string;
  severity: Severity;
  /** Version mas natural, cuando la frase era correcta pero poco idiomatica. */
  natural?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'teacher' | 'user';
  text: string;
  /** Traduccion/explicacion en espanol bajo demanda. */
  spanish?: string;
  ts: number;
  corrections?: Correction[];
  /** true cuando el profesor pide repetir la frase. */
  repeatRequest?: string;
}

export interface ConversationSummary {
  durationMin: number;
  speaking: Rating;
  grammar: Rating;
  vocabulary: Rating;
  pronunciation: Rating | 'not_measured';
  commonMistakes: string[];
  wordsToPractice: string[];
  recommendedLesson: string;
  notes: string;
}

export type Rating = 'good' | 'ok' | 'needs_practice';

export interface Conversation {
  id: string;
  mode: ConversationMode;
  topic?: string;
  level: Level;
  startedAt: number;
  endedAt?: number;
  /** 'live' = Gemini Live (audio bidireccional). 'turn' = grabar y enviar. */
  engine: 'live' | 'turn' | 'text';
  messages: ConversationMessage[];
  summary?: ConversationSummary;
}

export interface Mistake {
  id: string;
  category: MistakeCategory;
  topic: string;
  original: string;
  correction: string;
  explanation: string;
  explanationEs: string;
  severity: Severity;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  /** Se marca cuando el alumno lo usa bien despues de haberlo fallado. */
  resolved: boolean;
  source: 'conversation' | 'writing' | 'exercise' | 'pronunciation';
}

export interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  meaningEs: string;
  example: string;
  ipa?: string;
  difficulty: Level;
  practiceCount: number;
  mistakes: number;
  lastReview: number;
  addedAt: number;
  /** 0-100, calculado con aciertos reales. */
  mastery: number;
}

export interface GrammarTopicProgress {
  topic: string;
  attempts: number;
  correct: number;
  lastPracticed: number;
}

export type ExerciseKind =
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'vocabulary'
  | 'pronunciation';

export interface ExerciseResult {
  id: string;
  kind: ExerciseKind;
  topic: string;
  correct: number;
  total: number;
  ts: number;
}

export interface StudySession {
  id: string;
  kind: ExerciseKind | 'conversation' | 'lesson';
  startedAt: number;
  endedAt: number;
  seconds: number;
}

export interface PronunciationPractice {
  id: string;
  target: string;
  /** Lo que el modelo entendio del audio. */
  heard: string;
  understood: boolean;
  verdict: 'good' | 'close' | 'needs_practice' | 'not_measured';
  focus: string;
  tip: string;
  tipEs: string;
  ts: number;
}

export interface DailyLessonStep {
  id: string;
  kind: 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'review';
  title: string;
  instructions: string;
  done: boolean;
}

export interface DailyLesson {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  goal: string;
  level: Level;
  steps: DailyLessonStep[];
  createdAt: number;
  completedAt?: number;
}

export interface LevelScores {
  grammar: number;
  vocabulary: number;
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
}

export interface Profile {
  name: string;
  level: Level;
  /** Confianza acumulada en el nivel: evita saltar de nivel por una sola respuesta. */
  levelPoints: number;
  levelScores: LevelScores;
  goals: string[];
  placementDone: boolean;
  createdAt: number;
}

export interface Settings {
  voice: string;
  /** Aspecto del profesor en pantalla. */
  avatar: string;
  /** Mostrar la cara animada durante la conversacion. */
  showAvatar: boolean;
  teacherSpeaks: boolean;
  autoSpanish: boolean;
  engine: 'live' | 'turn';
  /** Minutos maximos por sesion de voz, para controlar consumo de API. */
  sessionLimitMin: number;
}

export interface DB {
  version: number;
  profile: Profile;
  settings: Settings;
  conversations: Conversation[];
  mistakes: Mistake[];
  vocabulary: VocabularyWord[];
  grammar: GrammarTopicProgress[];
  exercises: ExerciseResult[];
  sessions: StudySession[];
  pronunciation: PronunciationPractice[];
  lessons: DailyLesson[];
}

/* ---------- Respuestas del profesor (contrato con la API) ---------- */

export interface TeacherTurn {
  /** Lo que el profesor dice, en ingles. */
  reply: string;
  /** Transcripcion de lo que dijo el alumno (vacio si escribio). */
  transcript: string;
  corrections: Correction[];
  /** Frase que el alumno debe repetir, si aplica. */
  repeatRequest?: string;
  /** Explicacion corta en espanol cuando el alumno esta perdido. */
  spanish?: string;
}

export interface PronunciationFeedback {
  heard: string;
  understood: boolean;
  verdict: 'good' | 'close' | 'needs_practice' | 'not_measured';
  focus: string;
  tip: string;
  tipEs: string;
}

export interface WritingFeedback {
  corrected: string;
  corrections: Correction[];
  naturalVersion: string;
  positives: string[];
  scoreNote: string;
}

export interface ReadingExercise {
  title: string;
  text: string;
  questions: { question: string; options: string[]; answer: number; explanation: string }[];
  vocabulary: { word: string; meaningEs: string; example: string }[];
}

export interface ListeningExercise {
  title: string;
  /** Guion que se convierte en audio con TTS. */
  script: string;
  questions: { question: string; options: string[]; answer: number; explanation: string }[];
}

export interface GrammarExercise {
  topic: string;
  explanation: string;
  explanationEs: string;
  examples: string[];
  questions: { question: string; options: string[]; answer: number; explanation: string }[];
}

export interface VocabularySet {
  topic: string;
  words: { word: string; meaning: string; meaningEs: string; example: string; ipa: string }[];
}

export interface PlacementQuestion {
  id: string;
  skill: keyof LevelScores;
  question: string;
  options: string[];
  answer: number;
  level: Level;
}
