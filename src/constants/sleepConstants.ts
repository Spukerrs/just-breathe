export const SLEEP_STORAGE_KEYS = {
  LOGS: '@just_breathe_sleep_logs',
  ACTIVE_SESSION: '@just_breathe_active_sleep_session',
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
    surface: '#121A2B',
    surfaceElevated: '#1B263B',
    surfaceHighlight: '#24344F',
    border: '#23324D',
    borderSubtle: '#1C283E',
    primary: '#818CF8', // Indigo / Moonlight
    primaryLight: '#A5B4FC',
    primaryDark: '#4F46E5',
    accent: '#38BDF8', // Cyan celeste
    accentMuted: 'rgba(56, 189, 248, 0.15)',
    star: '#FBBF24', // Amber
    starInactive: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    success: '#34D399',
    danger: '#FB7185',
    dangerMuted: 'rgba(251, 113, 133, 0.15)',
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
