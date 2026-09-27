import type { ConversationMode } from './types';

export interface ModeDef {
  id: ConversationMode;
  label: string;
  description: string;
  emoji: string;
}

export const MODES: ModeDef[] = [
  {
    id: 'free',
    label: 'Free Conversation',
    description: 'Charla libre sobre lo que quieras.',
    emoji: '💬',
  },
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Ingles sencillo, frases cortas.',
    emoji: '🌱',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Mas vocabulario y estructuras.',
    emoji: '📈',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Conversacion natural y con matices.',
    emoji: '🎯',
  },
  {
    id: 'interview',
    label: 'Job Interview',
    description: 'Simulacion de entrevista de trabajo.',
    emoji: '💼',
  },
  {
    id: 'travel',
    label: 'Travel',
    description: 'Aeropuerto, hotel, restaurante, taxi.',
    emoji: '✈️',
  },
  {
    id: 'university',
    label: 'University',
    description: 'Clases, profesores, trabajos en grupo.',
    emoji: '🎓',
  },
  {
    id: 'daily',
    label: 'Daily Life',
    description: 'Situaciones del dia a dia.',
    emoji: '🏠',
  },
  {
    id: 'pronunciation',
    label: 'Pronunciation',
    description: 'Practica centrada en como suenas.',
    emoji: '🗣️',
  },
];

export const TOPICS: string[] = [
  'My day',
  'University',
  'Family',
  'Friends',
  'Hobbies',
  'Movies',
  'Games',
  'Music',
  'Travel',
  'Food',
  'Work',
  'Technology',
];

export function modeLabel(id: ConversationMode): string {
  return MODES.find((m) => m.id === id)?.label ?? id;
}

export const GRAMMAR_TOPICS: string[] = [
  'Verb to be',
  'Present Simple',
  'Present Continuous',
  'Past Simple',
  'Past Continuous',
  'Present Perfect',
  'Future',
  'Modal verbs',
  'Questions',
  'Articles',
  'Prepositions',
  'Pronouns',
  'Adjectives',
  'Adverbs',
  'Comparatives',
  'Conditionals',
];
