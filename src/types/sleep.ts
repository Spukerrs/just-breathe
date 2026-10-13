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
}

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  logs: SleepLog[];
}
