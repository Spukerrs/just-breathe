import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  SleepLog,
  SleepStats,
  ActiveSleepSession,
  BackupPayload,
  SleepShortcut,
  SleepAchievement,
  SleepNoiseEvent,
  LocalChatMessage,
} from '../types/sleep';
import {
  SLEEP_STORAGE_KEYS,
  DEFAULT_SHORTCUTS,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_NOISE_EVENTS,
} from '../constants/sleepConstants';

const generateUniqueId = (): string => {
  return `sleep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

const isValidSleepLog = (item: unknown): item is SleepLog => {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<SleepLog>;

  const hasValidDate = typeof candidate.date === 'string' && candidate.date.length >= 10;
  const hasValidBedtime = typeof candidate.bedtime === 'string' && !isNaN(Date.parse(candidate.bedtime));
  const hasValidWakeTime = typeof candidate.wakeTime === 'string' && !isNaN(Date.parse(candidate.wakeTime));
  const hasValidDuration = typeof candidate.durationMinutes === 'number' && candidate.durationMinutes >= 0;
  const hasValidQuality =
    typeof candidate.qualityRating === 'number' &&
    [1, 2, 3, 4, 5].includes(candidate.qualityRating);
  const hasValidTags = candidate.tags === undefined || Array.isArray(candidate.tags);
  const hasValidNotes = candidate.notes === undefined || typeof candidate.notes === 'string';

  return (
    hasValidDate &&
    hasValidBedtime &&
    hasValidWakeTime &&
    hasValidDuration &&
    hasValidQuality &&
    hasValidTags &&
    hasValidNotes
  );
};

export const sleepService = {
  /**
   * Obtiene todos los registros ordenados por fecha y hora más reciente.
   */
  async getSleepLogs(): Promise<SleepLog[]> {
    try {
      const rawData = await AsyncStorage.getItem(SLEEP_STORAGE_KEYS.LOGS);
      if (!rawData) return [];

      const parsed: unknown = JSON.parse(rawData);
      if (!Array.isArray(parsed)) return [];

      const logs: SleepLog[] = parsed.filter(isValidSleepLog);
      return logs.sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime());
    } catch (error) {
      console.error('[SleepService] Error al obtener registros:', error);
      throw new Error('No se pudieron recuperar los registros de sueño.');
    }
  },

  /**
   * Guarda un nuevo registro con ID autogenerado.
   */
  async saveSleepLog(logData: Omit<SleepLog, 'id'>): Promise<SleepLog> {
    try {
      const currentLogs = await this.getSleepLogs();
      const newLog: SleepLog = {
        ...logData,
        id: generateUniqueId(),
      };

      const updatedLogs = [newLog, ...currentLogs];
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
      return newLog;
    } catch (error) {
      console.error('[SleepService] Error al guardar registro:', error);
      throw new Error('No se pudo guardar la sesión de sueño.');
    }
  },

  /**
   * Elimina un registro por su ID.
   */
  async deleteSleepLog(id: string): Promise<void> {
    try {
      const currentLogs = await this.getSleepLogs();
      const filtered = currentLogs.filter((log) => log.id !== id);
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(filtered));
    } catch (error) {
      console.error('[SleepService] Error al eliminar registro:', error);
      throw new Error('No se pudo eliminar el registro.');
    }
  },

  /**
   * Calcula estadísticas de los últimos 7 días: promedio de horas y calidad media.
   */
  async getSleepStats(): Promise<SleepStats> {
    try {
      const logs = await this.getSleepLogs();
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      const recentLogs = logs.filter((log) => {
        const timestamp = new Date(log.wakeTime || log.bedtime).getTime();
        return timestamp >= sevenDaysAgo;
      });

      if (recentLogs.length === 0) {
        return { averageHours: 0, averageQuality: 0, totalLogsLast7Days: 0, totalMinutesLast7Days: 0 };
      }

      const totalMinutes = recentLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
      const totalQuality = recentLogs.reduce((acc, log) => acc + log.qualityRating, 0);

      return {
        averageHours: Number(((totalMinutes / recentLogs.length) / 60).toFixed(1)),
        averageQuality: Number((totalQuality / recentLogs.length).toFixed(1)),
        totalLogsLast7Days: recentLogs.length,
        totalMinutesLast7Days: totalMinutes,
      };
    } catch (error) {
      console.error('[SleepService] Error al calcular estadísticas:', error);
      return { averageHours: 0, averageQuality: 0, totalLogsLast7Days: 0, totalMinutesLast7Days: 0 };
    }
  },

  // ------------------------------------------
  // TRACKER EN VIVO Y ATAJOS DE SIESTA
  // ------------------------------------------
  async startSleepSession(sessionType: 'night' | 'nap' = 'night', targetMinutes?: number): Promise<ActiveSleepSession> {
    const now = new Date();
    const session: ActiveSleepSession = {
      startTime: now.toISOString(),
      startDate: now.toISOString().split('T')[0],
      sessionType,
      targetDurationMinutes: targetMinutes,
    };
    await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    return session;
  },

  async getActiveSleepSession(): Promise<ActiveSleepSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION);
      return raw ? (JSON.parse(raw) as ActiveSleepSession) : null;
    } catch {
      return null;
    }
  },

  async clearActiveSleepSession(): Promise<void> {
    await AsyncStorage.removeItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION);
  },

  // ------------------------------------------
  // ATAJOS, LOGROS Y RUIDOS LOCALES
  // ------------------------------------------
  async getShortcuts(): Promise<SleepShortcut[]> {
    return DEFAULT_SHORTCUTS;
  },

  async getNoiseEvents(): Promise<SleepNoiseEvent[]> {
    return DEFAULT_NOISE_EVENTS;
  },

  async getAchievements(): Promise<SleepAchievement[]> {
    const logs = await this.getSleepLogs();
    const totalLogs = logs.length;
    const stats = await this.getSleepStats();

    // Adaptar dinámicamente según la actividad real del usuario en el dispositivo
    return DEFAULT_ACHIEVEMENTS.map((ach) => {
      if (ach.id === 'ach_sonar') {
        return { ...ach, current: Math.min(ach.target, stats.totalLogsLast7Days) };
      }
      if (ach.id === 'ach_tracking') {
        return { ...ach, current: Math.min(ach.target, Math.max(10, totalLogs * 35)) };
      }
      if (ach.id === 'ach_score') {
        return {
          ...ach,
          current: stats.averageQuality > 0 ? Math.round(stats.averageQuality * 19.5) : 0,
        };
      }
      return ach;
    });
  },

  // ------------------------------------------
  // ASISTENTE DE SUEÑO LOCAL Y PRIVADO (OFFLINE)
  // ------------------------------------------
  /**
   * Responde consultas analizando únicamente los registros almacenados en el dispositivo.
   * Cero datos enviados a servidores externos.
   */
  async getLocalAssistantAnswer(promptText: string): Promise<LocalChatMessage> {
    const logs = await this.getSleepLogs();
    const stats = await this.getSleepStats();
    const query = promptText.toLowerCase();

    let response = '';

    if (query.includes('hoy') || query.includes('anoche') || query.includes('dormido')) {
      if (logs.length === 0) {
        response =
          'Aún no tienes registros de descanso guardados. ¡Usa el botón "Ir a dormir" o "Cargar Noche" para empezar hoy!';
      } else {
        const lastLog = logs[0];
        const h = Math.floor(lastLog.durationMinutes / 60);
        const m = lastLog.durationMinutes % 60;
        const qualityWord =
          lastLog.qualityRating >= 4 ? 'reparador y óptimo' : lastLog.qualityRating === 3 ? 'aceptable' : 'ligero';

        response = `En tu última noche registrada (${lastLog.date}) dormiste ${h}h ${m}m con una calidad de ${lastLog.qualityRating}/5 estrellas (${qualityWord}). Te acostaste a las ${new Date(
          lastLog.bedtime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} y despertaste a las ${new Date(
          lastLog.wakeTime
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      }
    } else if (query.includes('breve') || query.includes('resum')) {
      if (logs.length === 0) {
        response = 'Sin historial aún. Tus métricas aparecerán aquí tras tu primera noche registrada.';
      } else {
        response = `Resumen: Promedio de ${stats.averageHours} horas por noche en los últimos 7 días con calidad media de ${stats.averageQuality}/5 (${stats.totalLogsLast7Days} noches contabilizadas).`;
      }
    } else if (query.includes('puntuaci') || query.includes('score') || query.includes('calidad')) {
      const score = Math.min(100, Math.round((stats.averageQuality / 5) * 60 + (Math.min(stats.averageHours, 8) / 8) * 40));
      response = `Tu puntuación estimada de descanso es de ${score > 0 ? score : '--'}/100 basada en tu regularidad semanal y calidad promedio (${stats.averageQuality}/5).`;
    } else if (query.includes('consejo') || query.includes('recomend') || query.includes('mejor')) {
      const lastTags = logs[0]?.tags || [];
      if (lastTags.includes('pantallas')) {
        response =
          '💡 Consejo: Registraste uso de pantallas antes de dormir. Intenta activar el filtro de luz azul 45 minutos antes de acostarte para estimular la producción natural de melatonina.';
      } else if (lastTags.includes('cafeína')) {
        response =
          '☕ Consejo: La cafeína tiene una vida media de hasta 6 horas en el cuerpo. Procura evitar café o té estimulante después de las 17:00.';
      } else {
        response =
          '🌙 Consejo: Mantener un horario regular para levantarte (incluso los fines de semana) es el factor #1 para sincronizar tu ritmo circadiano.';
      }
    } else {
      response = `He analizado tus datos locales. Tienes ${logs.length} noches registradas. ¿Te gustaría saber cómo dormiste anoche o ver el promedio semanal?`;
    }

    return {
      id: generateUniqueId(),
      sender: 'assistant',
      text: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  },

  // ------------------------------------------
  // BACKUP LOCAL (EXPORT / IMPORT)
  // ------------------------------------------
  async exportSleepData(): Promise<{ success: boolean; filePath?: string }> {
    try {
      const logs = await this.getSleepLogs();
      if (logs.length === 0) {
        throw new Error('No hay registros de descanso para exportar.');
      }

      const payload: BackupPayload = {
        app: 'Just Breathe',
        version: 1,
        exportedAt: new Date().toISOString(),
        logs,
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error('Sistema de archivos no disponible.');

      const fileUri = `${baseDir}just_breathe_backup_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) throw new Error('Compartir no está disponible en este dispositivo.');

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Backup de Sueño - Just Breathe',
        UTI: 'public.json',
      });

      return { success: true, filePath: fileUri };
    } catch (error) {
      console.error('[SleepService] Error exportSleepData:', error);
      throw error;
    }
  },

  async importSleepData(): Promise<{ success: boolean; importedCount: number; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, importedCount: 0, message: 'Operación cancelada.' };
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let candidate: unknown;
      try {
        const parsed = JSON.parse(fileContent);
        candidate = Array.isArray(parsed) ? parsed : (parsed as BackupPayload)?.logs;
      } catch {
        throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
      }

      if (!Array.isArray(candidate)) {
        throw new Error('Estructura de respaldo no reconocida.');
      }

      const validNewLogs: SleepLog[] = [];
      for (const item of candidate) {
        if (isValidSleepLog(item)) {
          validNewLogs.push({ ...item, id: item.id || generateUniqueId() });
        }
      }

      if (validNewLogs.length === 0) {
        throw new Error('No se encontraron registros de sueño válidos en el archivo.');
      }

      const currentLogs = await this.getSleepLogs();
      const existingIds = new Set(currentLogs.map((l) => l.id));
      const existingBedtimes = new Set(currentLogs.map((l) => l.bedtime));

      let importedCount = 0;
      const merged = [...currentLogs];

      for (const log of validNewLogs) {
        if (!existingIds.has(log.id) && !existingBedtimes.has(log.bedtime)) {
          merged.push(log);
          existingIds.add(log.id);
          existingBedtimes.add(log.bedtime);
          importedCount++;
        }
      }

      merged.sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime());
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(merged));

      return {
        success: true,
        importedCount,
        message: `Se importaron ${importedCount} registros nuevos con éxito.`,
      };
    } catch (error) {
      console.error('[SleepService] Error importSleepData:', error);
      throw error;
    }
  },
};
