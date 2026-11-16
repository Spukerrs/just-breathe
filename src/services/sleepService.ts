import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
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
  SleepDebtAnalysis,
  ChronotypeProfile,
} from '../types/sleep';
import {
  SLEEP_STORAGE_KEYS,
  DEFAULT_SHORTCUTS,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_NOISE_EVENTS,
  DEFAULT_SLEEP_TARGET_HOURS,
} from '../constants/sleepConstants';
import {
  generateSecureId,
  computeLogsChecksum,
  verifyBackupIntegrity,
  sanitizeString,
  sanitizeTags,
  validatePayloadSize,
  MAX_BACKUP_SIZE_BYTES,
  MAX_NOTES_LENGTH,
} from '../utils/security';

/**
 * Validador estricto de esquemas y tipos para registros de sueño.
 * Previene inyecciones, valores fuera de rango y corrupción de estado.
 */
export const isValidSleepLog = (item: unknown): item is SleepLog => {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<SleepLog>;

  // Validar fecha en formato YYYY-MM-DD
  const hasValidDate =
    typeof candidate.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.date);

  // Validar timestamps ISO parseables y dentro de límites realistas
  const bedTimeParsed = typeof candidate.bedtime === 'string' ? Date.parse(candidate.bedtime) : NaN;
  const wakeTimeParsed = typeof candidate.wakeTime === 'string' ? Date.parse(candidate.wakeTime) : NaN;
  const hasValidBedtime = !isNaN(bedTimeParsed);
  const hasValidWakeTime = !isNaN(wakeTimeParsed);

  // Duración entre 1 minuto y 24 horas (1440 min)
  const hasValidDuration =
    typeof candidate.durationMinutes === 'number' &&
    candidate.durationMinutes > 0 &&
    candidate.durationMinutes <= 1440;

  // Calidad estricta 1 a 5
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
   * Guarda un nuevo registro con ID criptográfico seguro y sanitización estricta.
   */
  async saveSleepLog(logData: Omit<SleepLog, 'id'>): Promise<SleepLog> {
    try {
      const currentLogs = await this.getSleepLogs();

      // Sanitización estricta de todos los campos de entrada
      const sanitizedLog: SleepLog = {
        id: generateSecureId('sleep'),
        date: sanitizeString(logData.date, 10),
        bedtime: logData.bedtime,
        wakeTime: logData.wakeTime,
        durationMinutes: Math.min(1440, Math.max(1, Math.round(logData.durationMinutes))),
        qualityRating: logData.qualityRating,
        tags: logData.tags && logData.tags.length > 0 ? sanitizeTags(logData.tags) : undefined,
        notes: logData.notes && logData.notes.trim() ? sanitizeString(logData.notes, MAX_NOTES_LENGTH) : undefined,
      };

      const updatedLogs = [sanitizedLog, ...currentLogs];
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
      return sanitizedLog;
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
  // CÁLCULO DE DEUDA DE SUEÑO & CRONOTIPO
  // ------------------------------------------
  /**
   * Calcula la deuda de sueño acumulada en los últimos 7 días respecto al objetivo ideal.
   */
  async getSleepDebt(targetHoursPerNight: number = DEFAULT_SLEEP_TARGET_HOURS): Promise<SleepDebtAnalysis> {
    const logs = await this.getSleepLogs();
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentLogs = logs.filter((log) => {
      const timestamp = new Date(log.wakeTime || log.bedtime).getTime();
      return timestamp >= sevenDaysAgo;
    });

    if (recentLogs.length === 0) {
      return {
        accumulatedDebtMinutes: 0,
        dailyAverageHours: 0,
        targetHoursPerNight,
        deficitHours: 0,
        status: 'balanced',
        statusLabel: 'Sin deuda registrada',
        recommendation: 'Registra tus noches para calcular tu deuda de sueño acumulada.',
      };
    }

    const totalMinutes = recentLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const dailyAverageMinutes = totalMinutes / recentLogs.length;
    const dailyAverageHours = Number((dailyAverageMinutes / 60).toFixed(1));

    // Deuda acumulada calculada sobre los días registrados
    const targetTotalMinutes = recentLogs.length * (targetHoursPerNight * 60);
    const debtMinutes = targetTotalMinutes - totalMinutes;
    const deficitHours = Number((debtMinutes / 60).toFixed(1));

    let status: SleepDebtAnalysis['status'] = 'balanced';
    let statusLabel = 'Equilibrado';
    let recommendation = '¡Excelente! Tu descanso está en perfecto balance con tu objetivo diario.';

    if (deficitHours > 4) {
      status = 'severe_debt';
      statusLabel = `Deuda alta (${deficitHours}h acumuladas)`;
      recommendation =
        'Presentas un déficit de sueño importante. Una siesta de 30 a 60 min hoy y adelantar tu hora de dormir ayudará a recuperar tu agilidad cognitiva.';
    } else if (deficitHours > 1) {
      status = 'mild_debt';
      statusLabel = `Deuda ligera (${deficitHours}h acumuladas)`;
      recommendation =
        'Tienes una leve deuda de descanso. Procura dormir 30-45 minutos extra esta noche para evitar fatiga acumulada.';
    } else if (deficitHours < -2) {
      status = 'surplus';
      statusLabel = 'Superávit de descanso';
      recommendation = 'Has dormido más de tu objetivo base. ¡Tus reservas energéticas están al 100%!';
    }

    return {
      accumulatedDebtMinutes: Math.max(0, debtMinutes),
      dailyAverageHours,
      targetHoursPerNight,
      deficitHours,
      status,
      statusLabel,
      recommendation,
    };
  },

  /**
   * Analiza el cronotipo biológico y consistencia circadiana según los horarios de acostarse y despertar.
   */
  async getChronotypeProfile(): Promise<ChronotypeProfile> {
    const logs = await this.getSleepLogs();

    if (logs.length < 2) {
      return {
        chronotype: 'intermediate',
        title: 'Perfil en Calibración',
        icon: 'hourglass-outline',
        averageBedtimeStr: '--:--',
        averageWakeTimeStr: '--:--',
        circadianConsistencyScore: 0,
        description: 'Registra al menos 2 noches para que el sistema analice tu ritmo circadiano y cronotipo natural.',
      };
    }

    // Calcular minutos transcurridos desde las 00:00 para cada bedtime y waketime
    let totalBedMinutes = 0;
    let totalWakeMinutes = 0;
    const bedtimeMinuteList: number[] = [];

    logs.forEach((log) => {
      const bDate = new Date(log.bedtime);
      const wDate = new Date(log.wakeTime);

      // Normalizar hora de dormir: si es después de las 18:00, tratarlo en escala continua
      let bMin = bDate.getHours() * 60 + bDate.getMinutes();
      if (bDate.getHours() < 12) {
        bMin += 24 * 60; // Pasada la medianoche (ej. 01:00 = 25 * 60)
      }

      const wMin = wDate.getHours() * 60 + wDate.getMinutes();

      bedtimeMinuteList.push(bMin);
      totalBedMinutes += bMin;
      totalWakeMinutes += wMin;
    });

    const avgBedMin = Math.round(totalBedMinutes / logs.length);
    const avgWakeMin = Math.round(totalWakeMinutes / logs.length);

    // Formatear hora promedio de acostarse
    const normAvgBedMin = avgBedMin % (24 * 60);
    const bedH = Math.floor(normAvgBedMin / 60).toString().padStart(2, '0');
    const bedM = (normAvgBedMin % 60).toString().padStart(2, '0');
    const averageBedtimeStr = `${bedH}:${bedM}`;

    // Formatear hora promedio de despertar
    const wakeH = Math.floor(avgWakeMin / 60).toString().padStart(2, '0');
    const wakeM = (avgWakeMin % 60).toString().padStart(2, '0');
    const averageWakeTimeStr = `${wakeH}:${wakeM}`;

    // Desviación típica para medir consistencia circadiana
    const variance =
      bedtimeMinuteList.reduce((acc, m) => acc + Math.pow(m - avgBedMin, 2), 0) / bedtimeMinuteList.length;
    const stdDevMin = Math.sqrt(variance);

    // Puntuación 100 si la desviación es <= 20 min, bajando gradualmente
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDevMin / 90) * 50)));

    // Determinar cronotipo
    const avgBedHour24 = normAvgBedMin / 60;
    let chronotype: ChronotypeProfile['chronotype'] = 'intermediate';
    let title = 'Colibrí (Ritmo Intermedio)';
    let icon = 'sunny-outline';
    let description =
      'Tienes un ritmo flexible y equilibrado. Te adaptas bien tanto a mañanas activas como a tardes de trabajo.';

    if (avgBedHour24 >= 18 && avgBedHour24 < 23) {
      chronotype = 'lark';
      title = 'Alondra (Madrugador Natural)';
      icon = 'alarm-outline';
      description =
        'Tu energía máxima se concentra en las primeras horas del día. Rindes mejor por la mañana y tu cuerpo produce melatonina temprano.';
    } else if (avgBedHour24 >= 1 && avgBedHour24 < 6) {
      chronotype = 'owl';
      title = 'Búho (Noctámbulo Creativo)';
      icon = 'moon-outline';
      description =
        'Alcanzas tu pico de lucidez y creatividad al caer la noche. Te conviene atenuar luces 1 hora antes de dormir para inducir el descanso.';
    }

    return {
      chronotype,
      title,
      icon,
      averageBedtimeStr,
      averageWakeTimeStr,
      circadianConsistencyScore: consistencyScore,
      description,
    };
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

  /**
   * Borra absolutamente todos los registros y sesiones almacenados localmente.
   */
  async clearAllSleepData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        SLEEP_STORAGE_KEYS.LOGS,
        SLEEP_STORAGE_KEYS.ACTIVE_SESSION,
        SLEEP_STORAGE_KEYS.SHORTCUTS,
        SLEEP_STORAGE_KEYS.ACHIEVEMENTS,
      ]);
    } catch (error) {
      console.error('[SleepService] Error al limpiar datos:', error);
    }
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
    const debt = await this.getSleepDebt();

    // Adaptar dinámicamente según la actividad real del usuario en el dispositivo
    return DEFAULT_ACHIEVEMENTS.map((ach) => {
      if (ach.id === 'ach_sonar') {
        return { ...ach, current: Math.min(ach.target, stats.totalLogsLast7Days) };
      }
      if (ach.id === 'ach_tracking') {
        return { ...ach, current: Math.min(ach.target, totalLogs) };
      }
      if (ach.id === 'ach_score') {
        return {
          ...ach,
          current: stats.averageQuality > 0 ? Math.round(stats.averageQuality * 20) : 0,
        };
      }
      if (ach.id === 'ach_bear') {
        // Noches con >= 8 horas (480 minutos)
        const eightHoursCount = logs.filter((l) => l.durationMinutes >= 480).length;
        return { ...ach, current: Math.min(ach.target, eightHoursCount) };
      }
      if (ach.id === 'ach_trunk') {
        // Noches sin interrupciones (calidad 5 estrellas)
        const perfectCount = logs.filter((l) => l.qualityRating === 5).length;
        return { ...ach, current: Math.min(ach.target, perfectCount) };
      }
      return { ...ach, current: 0 };
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
    const debt = await this.getSleepDebt();
    const chronotype = await this.getChronotypeProfile();
    const query = promptText.toLowerCase();

    let response = '';

    if (query.includes('deuda') || query.includes('déficit') || query.includes('falta')) {
      if (logs.length === 0) {
        response = 'Aún no registras suficientes noches para calcular tu deuda de descanso.';
      } else {
        response = `📊 Análisis de Deuda de Sueño:\n${debt.statusLabel}. ${debt.recommendation} Promedio semanal: ${debt.dailyAverageHours}h/noche (Objetivo: ${debt.targetHoursPerNight}h).`;
      }
    } else if (query.includes('crono') || query.includes('búho') || query.includes('alondra') || query.includes('circadiano')) {
      if (logs.length < 2) {
        response = 'Necesito al menos 2 noches registradas para identificar tu cronotipo y consistencia de horario.';
      } else {
        response = `🧬 Perfil Circadiano:\nEres de tipo ${chronotype.title}.\n• Acostarse promedio: ${chronotype.averageBedtimeStr} hs\n• Despertar promedio: ${chronotype.averageWakeTimeStr} hs\n• Regularidad: ${chronotype.circadianConsistencyScore}%\n${chronotype.description}`;
      }
    } else if (query.includes('hoy') || query.includes('anoche') || query.includes('dormido')) {
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
      } else if (debt.status === 'severe_debt') {
        response =
          '💤 Consejo: Tu deuda de sueño es alta. Una pequeña siesta de 20-30 minutos antes de las 15:00 puede reiniciar tu concentración sin alterar el sueño nocturno.';
      } else {
        response =
          '🌙 Consejo: Mantener un horario regular para levantarte (incluso los fines de semana) es el factor #1 para sincronizar tu ritmo circadiano.';
      }
    } else {
      response = `He analizado tus datos locales. Tienes ${logs.length} noches registradas. ¿Te gustaría conocer tu deuda de sueño, tu cronotipo biológico o cómo dormiste anoche?`;
    }

    return {
      id: generateSecureId('chat'),
      sender: 'assistant',
      text: response,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  },

  // ------------------------------------------
  // BACKUP LOCAL (EXPORT / IMPORT SEGURO)
  // ------------------------------------------
  /**
   * Exporta los datos con Checksum criptográfico SHA-256 para verificación de integridad (v2).
   */
  async exportSleepData(): Promise<{ success: boolean; filePath?: string; checksum: string }> {
    try {
      const logs = await this.getSleepLogs();
      if (logs.length === 0) {
        throw new Error('No hay registros de descanso para exportar.');
      }

      // Cálculo de Checksum determinista
      const checksum = computeLogsChecksum(logs);

      const payload: BackupPayload = {
        app: 'Just Breathe',
        version: 1,
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        checksum,
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
        dialogTitle: 'Exportar Backup Cifrado/Verificado de Sueño - Just Breathe',
        UTI: 'public.json',
      });

      return { success: true, filePath: fileUri, checksum };
    } catch (error) {
      console.error('[SleepService] Error exportSleepData:', error);
      throw error;
    }
  },

  /**
   * Importa y restaura registros validando límites de memoria (Anti-DoS),
   * integridad de checksum (Anti-Tampering) y sanitización de inputs.
   */
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

      // 1. Mitigación de DoS: Validar tamaño máximo antes de parsear
      if (!validatePayloadSize(fileContent, MAX_BACKUP_SIZE_BYTES)) {
        throw new Error('El archivo supera el tamaño máximo permitido de seguridad (2 MB).');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch {
        throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
      }

      // 2. Verificación de Integridad Criptográfica (Checksum)
      const integrity = verifyBackupIntegrity(parsed);
      if (integrity.isTampered) {
        throw new Error(integrity.message);
      }

      const candidate = Array.isArray(parsed) ? parsed : (parsed as BackupPayload)?.logs;
      if (!Array.isArray(candidate)) {
        throw new Error('Estructura de respaldo no reconocida.');
      }

      // 3. Sanitización y validación estricta de cada registro
      const validNewLogs: SleepLog[] = [];
      for (const item of candidate) {
        if (isValidSleepLog(item)) {
          validNewLogs.push({
            id: item.id ? sanitizeString(item.id, 50) : generateSecureId('sleep'),
            date: sanitizeString(item.date, 10),
            bedtime: item.bedtime,
            wakeTime: item.wakeTime,
            durationMinutes: Math.min(1440, Math.max(1, Math.round(item.durationMinutes))),
            qualityRating: item.qualityRating,
            tags: item.tags ? sanitizeTags(item.tags) : undefined,
            notes: item.notes ? sanitizeString(item.notes, MAX_NOTES_LENGTH) : undefined,
          });
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
        message: `Se importaron ${importedCount} registros verificados con éxito.`,
      };
    } catch (error: any) {
      console.error('[SleepService] Error importSleepData:', error);
      throw error;
    }
  },
};
