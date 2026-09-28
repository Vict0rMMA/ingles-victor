import type { Level } from './types';

/**
 * Canciones famosas para aprender ingles.
 *
 * Aqui NO se guardan letras: la letra de una cancion tiene derechos de autor
 * y no puede vivir en el repositorio. Lo que si se guarda es informacion
 * sobre la cancion (artista, ano, acento, que se aprende con ella) y las
 * palabras sueltas que conviene conocer antes de escucharla. Para la letra
 * y el audio, cada cancion enlaza a YouTube.
 *
 * Ventaja practica: esta seccion no gasta nada de cuota de API.
 */

export type Accent = 'US' | 'UK' | 'AU' | 'IE' | 'CA';

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  level: Level;
  accent: Accent;
  /** Tema gramatical que la cancion practica de forma natural. */
  grammar: string;
  /** De que trata, en espanol. */
  theme: string;
  /** Por que es buena para aprender, en espanol. */
  why: string;
  /** Velocidad al cantar: cuanto mas lenta, mas facil de seguir. */
  pace: 'lenta' | 'media' | 'rapida';
  /** Palabras utiles que aparecen en la cancion. */
  vocabulary: { word: string; meaningEs: string }[];
}

export const SONGS: Song[] = [
  /* ------------------------------- A1 / A2 ------------------------------- */
  {
    id: 'let-it-be',
    title: 'Let It Be',
    artist: 'The Beatles',
    year: 1970,
    level: 'A1',
    accent: 'UK',
    grammar: 'Imperatives',
    theme: 'Aceptar las cosas y no pelear contra lo que no puedes cambiar.',
    why: 'Muy lenta, se repite mucho y se pronuncia clarisimo. Es la primera cancion que recomiendan casi todos los profesores.',
    pace: 'lenta',
    vocabulary: [
      { word: 'trouble', meaningEs: 'problema, dificultad' },
      { word: 'wisdom', meaningEs: 'sabiduria' },
      { word: 'answer', meaningEs: 'respuesta' },
      { word: 'broken-hearted', meaningEs: 'con el corazon roto' },
      { word: 'agree', meaningEs: 'estar de acuerdo' },
      { word: 'shine', meaningEs: 'brillar' },
    ],
  },
  {
    id: 'what-a-wonderful-world',
    title: 'What a Wonderful World',
    artist: 'Louis Armstrong',
    year: 1967,
    level: 'A1',
    accent: 'US',
    grammar: 'Present Simple',
    theme: 'Mirar el mundo y darse cuenta de lo bonito que es.',
    why: 'Lentisima y llena de colores, arboles y cielos: vocabulario basico que se te queda sin esfuerzo.',
    pace: 'lenta',
    vocabulary: [
      { word: 'bloom', meaningEs: 'florecer' },
      { word: 'sky', meaningEs: 'cielo' },
      { word: 'rainbow', meaningEs: 'arcoiris' },
      { word: 'bless', meaningEs: 'bendecir' },
      { word: 'grow', meaningEs: 'crecer' },
      { word: 'wonderful', meaningEs: 'maravilloso' },
    ],
  },
  {
    id: 'stand-by-me',
    title: 'Stand By Me',
    artist: 'Ben E. King',
    year: 1961,
    level: 'A2',
    accent: 'US',
    grammar: 'Future with will',
    theme: 'Pedirle a alguien que se quede a tu lado pase lo que pase.',
    why: 'Frases cortas con "I won\'t" y "as long as". Perfecta para oir la diferencia entre will y won\'t.',
    pace: 'lenta',
    vocabulary: [
      { word: 'darling', meaningEs: 'cariño' },
      { word: 'afraid', meaningEs: 'asustado' },
      { word: 'crumble', meaningEs: 'desmoronarse' },
      { word: 'mountain', meaningEs: 'montaña' },
      { word: 'sea', meaningEs: 'mar' },
      { word: 'stand', meaningEs: 'estar de pie, permanecer' },
    ],
  },
  {
    id: 'yesterday',
    title: 'Yesterday',
    artist: 'The Beatles',
    year: 1965,
    level: 'A2',
    accent: 'UK',
    grammar: 'Past Simple',
    theme: 'Echar de menos como eran las cosas antes.',
    why: 'La cancion perfecta para meterte el pasado simple en la cabeza. Compara "yesterday" con el presente en cada frase.',
    pace: 'lenta',
    vocabulary: [
      { word: 'yesterday', meaningEs: 'ayer' },
      { word: 'far away', meaningEs: 'lejos' },
      { word: 'suddenly', meaningEs: 'de repente' },
      { word: 'shadow', meaningEs: 'sombra' },
      { word: 'believe', meaningEs: 'creer' },
      { word: 'hide', meaningEs: 'esconderse' },
    ],
  },
  {
    id: 'count-on-me',
    title: 'Count on Me',
    artist: 'Bruno Mars',
    year: 2010,
    level: 'A2',
    accent: 'US',
    grammar: 'Future with will',
    theme: 'Prometerle a un amigo que siempre vas a estar ahi.',
    why: 'Vocabulario de amistad y muchisimo "I\'ll be there". Ingles moderno y facil de cantar.',
    pace: 'media',
    vocabulary: [
      { word: 'count on', meaningEs: 'contar con (alguien)' },
      { word: 'sail', meaningEs: 'navegar' },
      { word: 'lost', meaningEs: 'perdido' },
      { word: 'remind', meaningEs: 'recordar (a alguien)' },
      { word: 'friend', meaningEs: 'amigo' },
      { word: 'whatever', meaningEs: 'lo que sea' },
    ],
  },
  {
    id: 'imagine',
    title: 'Imagine',
    artist: 'John Lennon',
    year: 1971,
    level: 'A2',
    accent: 'UK',
    grammar: 'Imperatives and there is / there are',
    theme: 'Imaginar un mundo sin fronteras ni guerras.',
    why: 'Repite "Imagine there\'s no..." una y otra vez: se te queda la estructura sin estudiarla.',
    pace: 'lenta',
    vocabulary: [
      { word: 'heaven', meaningEs: 'cielo, paraiso' },
      { word: 'peace', meaningEs: 'paz' },
      { word: 'greed', meaningEs: 'codicia' },
      { word: 'hunger', meaningEs: 'hambre' },
      { word: 'dreamer', meaningEs: 'soñador' },
      { word: 'join', meaningEs: 'unirse' },
    ],
  },
  {
    id: 'perfect',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    year: 2017,
    level: 'A2',
    accent: 'UK',
    grammar: 'Past Simple',
    theme: 'Contar como conociste a la persona que quieres.',
    why: 'Cuenta una historia en pasado con frases cortas. Ed Sheeran vocaliza muy bien.',
    pace: 'lenta',
    vocabulary: [
      { word: 'darling', meaningEs: 'cariño' },
      { word: 'deserve', meaningEs: 'merecer' },
      { word: 'whisper', meaningEs: 'susurrar' },
      { word: 'barefoot', meaningEs: 'descalzo' },
      { word: 'grass', meaningEs: 'hierba, cesped' },
      { word: 'carry', meaningEs: 'llevar en brazos' },
    ],
  },
  {
    id: 'hey-jude',
    title: 'Hey Jude',
    artist: 'The Beatles',
    year: 1968,
    level: 'A2',
    accent: 'UK',
    grammar: 'Imperatives and comparatives',
    theme: 'Animar a alguien que lo esta pasando mal.',
    why: 'Llena de consejos en imperativo ("take", "remember", "let"). El final repetido es ideal para cantar en voz alta.',
    pace: 'media',
    vocabulary: [
      { word: 'sad', meaningEs: 'triste' },
      { word: 'better', meaningEs: 'mejor' },
      { word: 'afraid', meaningEs: 'asustado' },
      { word: 'shoulder', meaningEs: 'hombro' },
      { word: 'pain', meaningEs: 'dolor' },
      { word: 'begin', meaningEs: 'empezar' },
    ],
  },

  /* --------------------------------- B1 --------------------------------- */
  {
    id: 'someone-like-you',
    title: 'Someone Like You',
    artist: 'Adele',
    year: 2011,
    level: 'B1',
    accent: 'UK',
    grammar: 'Past Simple and Present Perfect',
    theme: 'Reencontrarse con un ex y desearle lo mejor aunque duela.',
    why: 'Mezcla pasado simple y presente perfecto en la misma frase. Ideal para notar la diferencia entre "I heard" y "I\'ve heard".',
    pace: 'media',
    vocabulary: [
      { word: 'settle down', meaningEs: 'sentar cabeza' },
      { word: 'regret', meaningEs: 'arrepentirse' },
      { word: 'bittersweet', meaningEs: 'agridulce' },
      { word: 'memory', meaningEs: 'recuerdo' },
      { word: 'avoid', meaningEs: 'evitar' },
      { word: 'ache', meaningEs: 'doler' },
    ],
  },
  {
    id: 'fix-you',
    title: 'Fix You',
    artist: 'Coldplay',
    year: 2005,
    level: 'B1',
    accent: 'UK',
    grammar: 'When clauses',
    theme: 'Acompañar a alguien roto hasta que vuelva a estar bien.',
    why: 'Todo el principio son frases "When you... but you...". Muy buena para practicar oraciones con "when".',
    pace: 'lenta',
    vocabulary: [
      { word: 'fix', meaningEs: 'arreglar' },
      { word: 'waste', meaningEs: 'desperdiciar' },
      { word: 'tears', meaningEs: 'lagrimas' },
      { word: 'guide', meaningEs: 'guiar' },
      { word: 'bone', meaningEs: 'hueso' },
      { word: 'replace', meaningEs: 'reemplazar' },
    ],
  },
  {
    id: 'viva-la-vida',
    title: 'Viva La Vida',
    artist: 'Coldplay',
    year: 2008,
    level: 'B1',
    accent: 'UK',
    grammar: 'Past Simple and used to',
    theme: 'Un rey que lo perdio todo recuerda cuando mandaba.',
    why: 'Repite "I used to rule the world": la mejor forma de aprender "used to" para hablar del pasado.',
    pace: 'media',
    vocabulary: [
      { word: 'rule', meaningEs: 'gobernar' },
      { word: 'sweep', meaningEs: 'barrer' },
      { word: 'crowd', meaningEs: 'multitud' },
      { word: 'castle', meaningEs: 'castillo' },
      { word: 'pillar', meaningEs: 'pilar, columna' },
      { word: 'mirror', meaningEs: 'espejo' },
    ],
  },
  {
    id: 'wonderwall',
    title: 'Wonderwall',
    artist: 'Oasis',
    year: 1995,
    level: 'B1',
    accent: 'UK',
    grammar: 'Going to and conditionals',
    theme: 'Decirle a alguien que quizas sea la persona que te salve.',
    why: 'Acento britanico marcado de Manchester. Buen entrenamiento de oido si solo escuchas acento americano.',
    pace: 'media',
    vocabulary: [
      { word: 'maybe', meaningEs: 'quizas' },
      { word: 'save', meaningEs: 'salvar' },
      { word: 'backbeat', meaningEs: 'ritmo de fondo' },
      { word: 'doubt', meaningEs: 'duda' },
      { word: 'blinding', meaningEs: 'cegador' },
      { word: 'winding', meaningEs: 'sinuoso, con curvas' },
    ],
  },
  {
    id: 'im-yours',
    title: "I'm Yours",
    artist: 'Jason Mraz',
    year: 2008,
    level: 'B1',
    accent: 'US',
    grammar: 'Present Continuous',
    theme: 'Rendirse al amor sin complicarse la vida.',
    why: 'Ingles hablado muy relajado, con contracciones de verdad ("I\'m", "gonna"). Justo lo que oiras en la calle.',
    pace: 'media',
    vocabulary: [
      { word: 'scoot', meaningEs: 'moverse, correrse' },
      { word: 'melt', meaningEs: 'derretirse' },
      { word: 'attempt', meaningEs: 'intento' },
      { word: 'breathe', meaningEs: 'respirar' },
      { word: 'free', meaningEs: 'libre' },
      { word: 'wait', meaningEs: 'esperar' },
    ],
  },
  {
    id: 'riptide',
    title: 'Riptide',
    artist: 'Vance Joy',
    year: 2013,
    level: 'B1',
    accent: 'AU',
    grammar: 'Present Continuous',
    theme: 'Los miedos y los nervios de alguien que se lanza a algo nuevo.',
    why: 'Acento australiano, que casi nadie practica. Cuenta escenas con "I was scared of...".',
    pace: 'rapida',
    vocabulary: [
      { word: 'riptide', meaningEs: 'corriente de resaca' },
      { word: 'scared', meaningEs: 'asustado' },
      { word: 'dentist', meaningEs: 'dentista' },
      { word: 'dark', meaningEs: 'oscuro' },
      { word: 'left hand', meaningEs: 'mano izquierda' },
      { word: 'closer', meaningEs: 'mas cerca' },
    ],
  },
  {
    id: 'say-you-wont-let-go',
    title: "Say You Won't Let Go",
    artist: 'James Arthur',
    year: 2016,
    level: 'B1',
    accent: 'UK',
    grammar: 'Past Simple narrative',
    theme: 'Toda una relacion contada desde la noche en que se conocieron.',
    why: 'Es una historia entera en pasado, de principio a fin. Perfecta para ver como se encadenan los hechos.',
    pace: 'media',
    vocabulary: [
      { word: 'let go', meaningEs: 'soltar, dejar ir' },
      { word: 'drunk', meaningEs: 'borracho' },
      { word: 'hold', meaningEs: 'sostener, abrazar' },
      { word: 'wrinkle', meaningEs: 'arruga' },
      { word: 'aisle', meaningEs: 'pasillo (de la iglesia)' },
      { word: 'grow old', meaningEs: 'envejecer' },
    ],
  },
  {
    id: 'thinking-out-loud',
    title: 'Thinking Out Loud',
    artist: 'Ed Sheeran',
    year: 2014,
    level: 'B1',
    accent: 'UK',
    grammar: 'First Conditional',
    theme: 'Prometer que el amor seguira cuando los dos sean viejos.',
    why: 'Llena de "when I\'m seventy..." y "will you still...". Excelente para el condicional y el futuro.',
    pace: 'lenta',
    vocabulary: [
      { word: 'out loud', meaningEs: 'en voz alta' },
      { word: 'crowd', meaningEs: 'multitud' },
      { word: 'fade', meaningEs: 'desvanecerse' },
      { word: 'soul', meaningEs: 'alma' },
      { word: 'kiss', meaningEs: 'beso, besar' },
      { word: 'evergreen', meaningEs: 'perenne, que no cambia' },
    ],
  },
  {
    id: 'shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    year: 2017,
    level: 'B1',
    accent: 'UK',
    grammar: 'Present Simple',
    theme: 'Conocer a alguien en un bar y acabar enamorandose.',
    why: 'Vocabulario de salir, bares y citas. Ritmo rapido pero con palabras sencillas.',
    pace: 'rapida',
    vocabulary: [
      { word: 'crowded', meaningEs: 'abarrotado' },
      { word: 'bet', meaningEs: 'apostar' },
      { word: 'discover', meaningEs: 'descubrir' },
      { word: 'shape', meaningEs: 'forma, silueta' },
      { word: 'push and pull', meaningEs: 'tira y afloja' },
      { word: 'cab', meaningEs: 'taxi' },
    ],
  },

  /* ------------------------------- B2 / C1 ------------------------------- */
  {
    id: 'hotel-california',
    title: 'Hotel California',
    artist: 'Eagles',
    year: 1976,
    level: 'B2',
    accent: 'US',
    grammar: 'Past Simple narrative',
    theme: 'Un viajero entra en un hotel del que no puede salir.',
    why: 'Es un relato completo en pasado, con descripciones muy visuales. Ideal para ampliar vocabulario narrativo.',
    pace: 'media',
    vocabulary: [
      { word: 'desert', meaningEs: 'desierto' },
      { word: 'corridor', meaningEs: 'pasillo' },
      { word: 'shimmering', meaningEs: 'reluciente' },
      { word: 'prisoner', meaningEs: 'prisionero' },
      { word: 'device', meaningEs: 'artilugio, recurso' },
      { word: 'beast', meaningEs: 'bestia' },
    ],
  },
  {
    id: 'creep',
    title: 'Creep',
    artist: 'Radiohead',
    year: 1992,
    level: 'B2',
    accent: 'UK',
    grammar: 'Wish and conditionals',
    theme: 'Sentirse fuera de lugar al lado de alguien a quien admiras.',
    why: 'Repite "I wish I was special": la mejor forma de entender "wish" para hablar de lo que no es real.',
    pace: 'lenta',
    vocabulary: [
      { word: 'creep', meaningEs: 'bicho raro' },
      { word: 'weirdo', meaningEs: 'rarito' },
      { word: 'feather', meaningEs: 'pluma' },
      { word: 'notice', meaningEs: 'darse cuenta' },
      { word: 'belong', meaningEs: 'pertenecer' },
      { word: 'control', meaningEs: 'control' },
    ],
  },
  {
    id: 'losing-my-religion',
    title: 'Losing My Religion',
    artist: 'R.E.M.',
    year: 1991,
    level: 'B2',
    accent: 'US',
    grammar: 'Idioms',
    theme: 'Perder la paciencia y dudar de uno mismo.',
    why: 'El titulo es una expresion del sur de EE. UU. que no significa lo que parece. Muy buena para entender que los idioms no se traducen literal.',
    pace: 'media',
    vocabulary: [
      { word: 'spotlight', meaningEs: 'foco de atencion' },
      { word: 'corner', meaningEs: 'esquina, rincon' },
      { word: 'whisper', meaningEs: 'susurro' },
      { word: 'distance', meaningEs: 'distancia' },
      { word: 'choose', meaningEs: 'elegir' },
      { word: 'hurt', meaningEs: 'doler, herir' },
    ],
  },
  {
    id: 'shallow',
    title: 'Shallow',
    artist: 'Lady Gaga & Bradley Cooper',
    year: 2018,
    level: 'B2',
    accent: 'US',
    grammar: 'Questions',
    theme: 'Dos personas se preguntan si estan conformes con su vida.',
    why: 'Todo el principio son preguntas: "Are you happy...?", "Is there something...?". Perfecta para practicar como se forman.',
    pace: 'media',
    vocabulary: [
      { word: 'shallow', meaningEs: 'superficial, poco profundo' },
      { word: 'dive', meaningEs: 'zambullirse' },
      { word: 'crash', meaningEs: 'estrellarse' },
      { word: 'ground', meaningEs: 'suelo' },
      { word: 'ache', meaningEs: 'dolor sordo' },
      { word: 'far from', meaningEs: 'lejos de' },
    ],
  },
  {
    id: 'bohemian-rhapsody',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    year: 1975,
    level: 'C1',
    accent: 'UK',
    grammar: 'Mixed tenses',
    theme: 'Un joven confiesa algo terrible y se enfrenta a las consecuencias.',
    why: 'Cambia de tiempo verbal y de registro constantemente. Un reto de verdad: si la sigues entera, vas muy bien.',
    pace: 'rapida',
    vocabulary: [
      { word: 'landslide', meaningEs: 'deslizamiento de tierra' },
      { word: 'reality', meaningEs: 'realidad' },
      { word: 'trigger', meaningEs: 'gatillo' },
      { word: 'shiver', meaningEs: 'escalofrio' },
      { word: 'spare', meaningEs: 'perdonar la vida' },
      { word: 'matter', meaningEs: 'importar' },
    ],
  },
  {
    id: 'hallelujah',
    title: 'Hallelujah',
    artist: 'Jeff Buckley',
    year: 1994,
    level: 'C1',
    accent: 'US',
    grammar: 'Past Simple and literary language',
    theme: 'El amor y la fe contados con imagenes de la Biblia.',
    why: 'Lenguaje poetico y culto. Buena para acostumbrarse a un ingles mas literario del que se oye a diario.',
    pace: 'lenta',
    vocabulary: [
      { word: 'chord', meaningEs: 'acorde' },
      { word: 'faith', meaningEs: 'fe' },
      { word: 'overthrew', meaningEs: 'derroco' },
      { word: 'marble', meaningEs: 'marmol' },
      { word: 'blaze', meaningEs: 'resplandor' },
      { word: 'draw', meaningEs: 'dibujar, atraer' },
    ],
  },
];

export const SONG_LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const ACCENT_LABEL: Record<Accent, string> = {
  US: 'Estados Unidos',
  UK: 'Reino Unido',
  AU: 'Australia',
  IE: 'Irlanda',
  CA: 'Canada',
};

/** Enlace de busqueda: no incrustamos el video ni alojamos la letra. */
export function youtubeSearch(song: Song): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${song.artist} ${song.title}`
  )}`;
}

export function lyricsSearch(song: Song): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${song.artist} ${song.title} lyrics`
  )}`;
}

export function songsForLevel(level: Level): Song[] {
  const order = SONG_LEVELS.indexOf(level);
  // Tu nivel y el de abajo: las que puedes disfrutar sin frustrarte.
  return SONGS.filter((s) => {
    const i = SONG_LEVELS.indexOf(s.level);
    return i <= order + 1 && i >= order - 1;
  });
}
