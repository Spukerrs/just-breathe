import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { SleepLog, SleepStats, ActiveSleepSession, BackupPayload } from '../types/sleep';
import { SLEEP_STORAGE_KEYS } from '../constants/sleepConstants';

/**
 * Genera un identificador único para los registros de sueño sin dependencias externas.
 */
const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `sleep_${timestamp}_${randomSuffix}`;
};

/**
 * Valida si un objeto coincide con la estructura requerida de SleepLog.
 */
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

  return hasValidDate && hasValidBedtime && hasValidWakeTime && hasValidDuration && hasValidQuality && hasValidTags && hasValidNotes;
};

/**
 * Servicio modular de persistencia y análisis para el módulo de sueño "Just Breathe".
 */
export const sleepService = {
  /**
   * Obtiene todos los registros de sueño ordenados por fecha descendente.
   */
  async getSleepLogs(): Promise<SleepLog[]> {
    try {
      const rawData = await AsyncStorage.getItem(SLEEP_STORAGE_KEYS.LOGS);
      if (!rawData) return [];

      const parsed: unknown = JSON.parse(rawData);
      if (!Array.isArray(parsed)) return [];

      const logs: SleepLog[] = parsed.filter(isValidSleepLog);

      // Ordenar por fecha y hora de dormir descendente (más reciente primero)
      return logs.sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime());
    } catch (error) {
      console.error('[SleepService] Error al obtener registros:', error);
      throw new Error('No se pudieron cargar los registros de sueño.');
    }
  },

  /**
   * Guarda un nuevo registro asignando un ID único.
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
   * Elimina un registro de sueño según su identificador.
   */
  async deleteSleepLog(id: string): Promise<void> {
    try {
      const currentLogs = await this.getSleepLogs();
      const filteredLogs = currentLogs.filter((log) => log.id !== id);
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('[SleepService] Error al eliminar registro:', error);
      throw new Error('No se pudo eliminar el registro de sueño.');
    }
  },

  /**
   * Calcula el promedio de horas dormidas y la calidad media de los últimos 7 días.
   */
  async getSleepStats(): Promise<SleepStats> {
    try {
      const logs = await this.getSleepLogs();
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Filtrar registros cuya fecha de despertar sea de los últimos 7 días
      const recentLogs = logs.filter((log) => {
        const logTime = new Date(log.wakeTime || log.bedtime).getTime();
        return logTime >= sevenDaysAgo;
      });

      if (recentLogs.length === 0) {
        return {
          averageHours: 0,
          averageQuality: 0,
          totalLogsLast7Days: 0,
          totalMinutesLast7Days: 0,
        };
      }

      const totalMinutes = recentLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
      const totalQuality = recentLogs.reduce((acc, log) => acc + log.qualityRating, 0);

      const averageMinutes = totalMinutes / recentLogs.length;
      const averageHours = Number((averageMinutes / 60).toFixed(1));
      const averageQuality = Number((totalQuality / recentLogs.length).toFixed(1));

      return {
        averageHours,
        averageQuality,
        totalLogsLast7Days: recentLogs.length,
        totalMinutesLast7Days: totalMinutes,
      };
    } catch (error) {
      console.error('[SleepService] Error al calcular estadísticas:', error);
      return {
        averageHours: 0,
        averageQuality: 0,
        totalLogsLast7Days: 0,
        totalMinutesLast7Days: 0,
      };
    }
  },

  // ==========================================
  // GESTIÓN DE SESIÓN EN VIVO ("Live Tracker")
  // ==========================================

  /**
   * Guarda el timestamp de inicio cuando el usuario presiona "Ir a dormir".
   */
  async startSleepSession(): Promise<ActiveSleepSession> {
    try {
      const now = new Date();
      const session: ActiveSleepSession = {
        startTime: now.toISOString(),
        startDate: now.toISOString().split('T')[0],
      };
      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      return session;
    } catch (error) {
      console.error('[SleepService] Error al iniciar sesión en vivo:', error);
      throw new Error('No se pudo registrar el inicio del descanso.');
    }
  },

  /**
   * Obtiene la sesión en vivo actual si existe.
   */
  async getActiveSleepSession(): Promise<ActiveSleepSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION);
      if (!raw) return null;
      return JSON.parse(raw) as ActiveSleepSession;
    } catch (error) {
      console.error('[SleepService] Error al obtener sesión en vivo:', error);
      return null;
    }
  },

  /**
   * Limpia la sesión en vivo una vez que el usuario despierta y guarda o cancela.
   */
  async clearActiveSleepSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SLEEP_STORAGE_KEYS.ACTIVE_SESSION);
    } catch (error) {
      console.error('[SleepService] Error al limpiar sesión en vivo:', error);
    }
  },

  // ==========================================
  // BACKUP / EXPORTACIÓN & IMPORTACIÓN LOCAL
  // ==========================================

  /**
   * Genera un archivo JSON con todos los registros y lo comparte mediante expo-sharing.
   */
  async exportSleepData(): Promise<{ success: boolean; filePath?: string }> {
    try {
      const logs = await this.getSleepLogs();
      if (logs.length === 0) {
        throw new Error('No hay registros de sueño para exportar.');
      }

      const backupPayload: BackupPayload = {
        app: 'Just Breathe',
        version: 1,
        exportedAt: new Date().toISOString(),
        logs,
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const fileName = `just_breathe_sleep_backup_${Date.now()}.json`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      
      if (!baseDir) {
        throw new Error('No se pudo acceder al directorio del sistema de archivos.');
      }

      const fileUri = `${baseDir}${fileName}`;

      // Escribir archivo temporal
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('La función de compartir no está disponible en este dispositivo.');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar copia de seguridad - Just Breathe',
        UTI: 'public.json',
      });

      return { success: true, filePath: fileUri };
    } catch (error) {
      console.error('[SleepService] Error en exportSleepData:', error);
      throw error;
    }
  },

  /**
   * Permite seleccionar un archivo JSON, valida su estructura y combina los registros sin duplicados.
   */
  async importSleepData(): Promise<{ success: boolean; importedCount: number; message: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, importedCount: 0, message: 'Operación cancelada por el usuario.' };
      }

      const selectedAsset = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let candidateLogs: unknown;
      try {
        const parsed = JSON.parse(fileContent);
        // Soporta formato directo [ ...logs ] o encapsulado { logs: [ ... ] }
        if (Array.isArray(parsed)) {
          candidateLogs = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as BackupPayload).logs)) {
          candidateLogs = (parsed as BackupPayload).logs;
        } else {
          throw new Error('Estructura inválida.');
        }
      } catch {
        throw new Error('El archivo seleccionado no contiene un formato JSON válido.');
      }

      if (!Array.isArray(candidateLogs)) {
        throw new Error('No se encontró una lista de registros en el archivo importado.');
      }

      const validNewLogs: SleepLog[] = [];
      for (const item of candidateLogs) {
        if (isValidSleepLog(item)) {
          validNewLogs.push({
            ...item,
            id: item.id || generateUniqueId(),
          });
        }
      }

      if (validNewLogs.length === 0) {
        throw new Error('No se encontraron registros de sueño válidos en el archivo.');
      }

      // Fusionar con los registros existentes evitando duplicados (mismo ID o mismo bedtime exacto)
      const currentLogs = await this.getSleepLogs();
      const existingIds = new Set(currentLogs.map((l) => l.id));
      const existingBedtimes = new Set(currentLogs.map((l) => l.bedtime));

      let newCount = 0;
      const mergedList = [...currentLogs];

      for (const log of validNewLogs) {
        if (!existingIds.has(log.id) && !existingBedtimes.has(log.bedtime)) {
          mergedList.push(log);
          existingIds.add(log.id);
          existingBedtimes.add(log.bedtime);
          newCount++;
        }
      }

      // Reordenar por fecha descendente
      mergedList.sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime());

      await AsyncStorage.setItem(SLEEP_STORAGE_KEYS.LOGS, JSON.stringify(mergedList));

      return {
        success: true,
        importedCount: newCount,
        message: `Se importaron ${newCount} nuevos registros correctamente (${validNewLogs.length - newCount} ya existían).`,
      };
    } catch (error) {
      console.error('[SleepService] Error en importSleepData:', error);
      throw error;
    }
  },
};
