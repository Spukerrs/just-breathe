export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // ISO string
  wakeTime: string; // ISO string
  durationMinutes: number;
  qualityRating: 1 | 2 | 3 | 4 | 5;
  tags?: string[]; // opcional
  notes?: string; // opcional
}

export interface SleepStats {
  averageHours: number;
  averageQuality: number;
  totalLogsLast7Days: number;
  totalMinutesLast7Days: number;
}

export interface ActiveSleepSession {
  startTime: string; // ISO string
  startDate: string; // YYYY-MM-DD
  targetDurationMinutes?: number; // Para siestas programadas
  sessionType?: 'night' | 'nap';
}

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  logs: SleepLog[];
}

export interface SleepShortcut {
  id: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  type: 'nap' | 'night';
  icon: string;
  badge?: string;
}

export interface SleepSound {
  id: string;
  title: string;
  category: 'nature' | 'white_noise' | 'meditation';
  icon: string;
  durationText: string;
  tag: string;
}

export interface SleepNoiseEvent {
  id: string;
  timeDisplay: string;
  durationMinutes: number;
  dateDisplay: string;
  waveformPattern: number[]; // valores relativos 0.1 a 1.0 para graficar onda
}

export interface SleepAchievement {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  icon: string;
  categoryColor: string;
}

export interface AssistantPreset {
  id: string;
  tag: string;
  prompt: string;
}

export interface LocalChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
