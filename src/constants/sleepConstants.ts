import {
  SleepShortcut,
  SleepSound,
  SleepNoiseEvent,
  SleepAchievement,
  AssistantPreset,
} from '../types/sleep';

export const SLEEP_STORAGE_KEYS = {
  LOGS: '@just_breathe_sleep_logs',
  ACTIVE_SESSION: '@just_breathe_active_sleep_session',
  SHORTCUTS: '@just_breathe_sleep_shortcuts',
  ACHIEVEMENTS: '@just_breathe_sleep_achievements',
} as const;

export const DEFAULT_SLEEP_TAGS: string[] = [
  'cafeína',
  'pantallas',
  'ejercicio',
  'estrés',
  'lectura',
  'meditación',
  'ruido',
  'cena pesada',
];

export const SLEEP_THEME = {
  colors: {
    background: '#090D16',
    surface: '#121824',
    surfaceElevated: '#1A2336',
    surfaceHighlight: '#222F48',
    border: '#1E293B',
    borderSubtle: '#162032',
    primary: '#818CF8', // Moonlight Indigo
    primaryLight: '#A5B4FC',
    primaryDark: '#4F46E5',
    accent: '#38BDF8', // Cyan celeste brillante
    accentMuted: 'rgba(56, 189, 248, 0.15)',
    star: '#FBBF24', // Ámbar cálido
    starInactive: '#2E3B52',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    success: '#34D399',
    danger: '#FB7185',
    waveform: '#38BDF8',
    waveformInactive: '#1E293B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

// Atajos Rápidos (Inspirados en Screenshot 2)
export const DEFAULT_SHORTCUTS: SleepShortcut[] = [
  {
    id: 'sc_nap_120',
    title: 'Siesta 2 horas',
    subtitle: 'Siesta reparadora profunda',
    durationMinutes: 120,
    type: 'nap',
    icon: 'time-outline',
    badge: '2h',
  },
  {
    id: 'sc_nap_60',
    title: 'Siesta 1 hora',
    subtitle: 'Reinicio de energía medio',
    durationMinutes: 60,
    type: 'nap',
    icon: 'time-outline',
    badge: '1h',
  },
  {
    id: 'sc_nap_10',
    title: '10 minutos',
    subtitle: 'Power nap express',
    durationMinutes: 10,
    type: 'nap',
    icon: 'flash-outline',
    badge: '10m',
  },
  {
    id: 'sc_night_7h',
    title: 'Sueño 7 horas',
    subtitle: 'Descanso nocturno estándar',
    durationMinutes: 420,
    type: 'night',
    icon: 'moon',
    badge: '7h',
  },
  {
    id: 'sc_nap_90',
    title: 'Siesta 90 min',
    subtitle: '1 ciclo REM completo',
    durationMinutes: 90,
    type: 'nap',
    icon: 'timer-outline',
    badge: '1h 30m',
  },
  {
    id: 'sc_nap_30',
    title: 'Siesta 30 min',
    subtitle: 'Recarga sin somnolencia',
    durationMinutes: 30,
    type: 'nap',
    icon: 'battery-charging-outline',
    badge: '30m',
  },
];

// Canciones de cuna y Paisajes Sonoros (Inspirados en Screenshot 5)
export const DEFAULT_SOUNDS: SleepSound[] = [
  {
    id: 'snd_whale',
    title: 'Buceo con ballenas',
    category: 'nature',
    icon: 'water-outline',
    durationText: 'Continuo',
    tag: 'Océano',
  },
  {
    id: 'snd_rain',
    title: 'Tormenta nocturna',
    category: 'nature',
    icon: 'thunderstorm-outline',
    durationText: 'Continuo',
    tag: 'Lluvia',
  },
  {
    id: 'snd_stream',
    title: 'Arroyo de montaña',
    category: 'nature',
    icon: 'leaf-outline',
    durationText: 'Continuo',
    tag: 'Río',
  },
  {
    id: 'snd_white_noise',
    title: 'Ruido blanco estático',
    category: 'white_noise',
    icon: 'radio-outline',
    durationText: 'Continuo',
    tag: 'Frecuencia',
  },
  {
    id: 'snd_asmr',
    title: 'ASMR burbujas suaves',
    category: 'meditation',
    icon: 'sparkles-outline',
    durationText: '30 min',
    tag: 'Relajación',
  },
  {
    id: 'snd_forest',
    title: 'Bosque nocturno zen',
    category: 'nature',
    icon: 'earth-outline',
    durationText: 'Continuo',
    tag: 'Naturaleza',
  },
  {
    id: 'snd_space',
    title: 'Sonido de Saturno NASA',
    category: 'meditation',
    icon: 'planet-outline',
    durationText: '45 min',
    tag: 'Cósmico',
  },
  {
    id: 'snd_campfire',
    title: 'Hoguera acogedora',
    category: 'nature',
    icon: 'flame-outline',
    durationText: 'Continuo',
    tag: 'Fuego',
  },
];

// Eventos de ruido / Detecciones nocturnas (Inspirados en Screenshot 3)
export const DEFAULT_NOISE_EVENTS: SleepNoiseEvent[] = [
  {
    id: 'noise_1',
    timeDisplay: '7:31 a. m.',
    durationMinutes: 8,
    dateDisplay: 'Hoy',
    waveformPattern: [0.2, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4, 0.6, 0.2, 0.5, 0.8, 0.3, 0.6],
  },
  {
    id: 'noise_2',
    timeDisplay: '7:11 a. m.',
    durationMinutes: 10,
    dateDisplay: 'Hoy',
    waveformPattern: [0.1, 0.3, 0.5, 0.9, 0.4, 0.6, 0.2, 0.8, 0.7, 0.3, 0.4, 0.5, 0.2, 0.1],
  },
  {
    id: 'noise_3',
    timeDisplay: '6:51 a. m.',
    durationMinutes: 10,
    dateDisplay: 'Hoy',
    waveformPattern: [0.3, 0.5, 0.7, 0.6, 0.8, 0.9, 0.4, 0.3, 0.7, 0.5, 0.6, 0.4, 0.2, 0.1],
  },
  {
    id: 'noise_4',
    timeDisplay: '6:31 a. m.',
    durationMinutes: 10,
    dateDisplay: 'Hoy',
    waveformPattern: [0.2, 0.2, 0.6, 0.4, 0.7, 0.5, 0.8, 0.3, 0.5, 0.6, 0.2, 0.4, 0.3, 0.1],
  },
];

// Logros y Gamificación de Hábitos (Inspirados en Screenshot 4)
export const DEFAULT_ACHIEVEMENTS: SleepAchievement[] = [
  {
    id: 'ach_tracking',
    title: 'Seguimiento de sueño',
    description: 'Monitorea tu descanso y levántate en tu fase de sueño óptima',
    current: 771,
    target: 1000,
    icon: 'moon',
    categoryColor: '#38BDF8',
  },
  {
    id: 'ach_score',
    title: 'Puntuación de sueño',
    description: 'Mantén una calidad promedio por encima de 4 estrellas',
    current: 97,
    target: 98,
    icon: 'trophy',
    categoryColor: '#FBBF24',
  },
  {
    id: 'ach_sonar',
    title: 'Consistencia de descanso',
    description: 'Registra tus descansos durante 7 días seguidos',
    current: 5,
    target: 7,
    icon: 'pulse',
    categoryColor: '#818CF8',
  },
  {
    id: 'ach_lullaby',
    title: 'Canciones de cuna',
    description: 'Usa paisajes sonoros para conciliar el sueño más rápido',
    current: 2,
    target: 10,
    icon: 'musical-notes',
    categoryColor: '#34D399',
  },
  {
    id: 'ach_bear',
    title: 'Oso durmiente',
    description: 'Alcanza más de 8 horas de sueño en una noche',
    current: 3,
    target: 5,
    icon: 'paw',
    categoryColor: '#FB7185',
  },
  {
    id: 'ach_clock',
    title: 'Regular como un reloj',
    description: 'Acuéstate a la misma hora durante al menos 5 noches',
    current: 4,
    target: 5,
    icon: 'alarm',
    categoryColor: '#A78BFA',
  },
  {
    id: 'ach_trunk',
    title: 'Duerme como un tronco',
    description: 'Noche completa sin interrupciones ni desvelos',
    current: 1,
    target: 3,
    icon: 'shield-checkmark',
    categoryColor: '#38BDF8',
  },
];

// Sugerencias rápidas para el Asistente Local (Inspiradas en Screenshot 1)
export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: 'preset_brief',
    tag: 'Brevemente',
    prompt: 'Resumir la calidad de mi sueño brevemente',
  },
  {
    id: 'preset_today',
    tag: 'Hoy',
    prompt: '¿Cómo he dormido hoy según mis registros?',
  },
  {
    id: 'preset_score',
    tag: 'Puntuación',
    prompt: '¿Cuál es mi puntuación de sueño esta semana?',
  },
  {
    id: 'preset_advice',
    tag: 'Consejo',
    prompt: 'Dame una recomendación para descansar mejor esta noche',
  },
];
