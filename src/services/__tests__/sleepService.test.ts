import { sleepService, isValidSleepLog } from '../sleepService';
import { SLEEP_STORAGE_KEYS } from '../../constants/sleepConstants';
import { computeLogsChecksum } from '../../utils/security';

// Mock de AsyncStorage en memoria
const memoryStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => memoryStore[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    memoryStore[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete memoryStore[key];
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete memoryStore[k]);
  }),
}));

// Mock de FileSystem y Sharing
let mockWrittenFile: { uri: string; content: string } | null = null;
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///data/cache/',
  documentDirectory: 'file:///data/documents/',
  writeAsStringAsync: jest.fn(async (uri: string, content: string) => {
    mockWrittenFile = { uri, content };
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (mockWrittenFile && mockWrittenFile.uri === uri) {
      return mockWrittenFile.content;
    }
    return '';
  }),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

let mockPickerResult: any = { canceled: true };
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => mockPickerResult),
}));

describe('SleepService - Suite de Pruebas y Seguridad', () => {
  beforeEach(() => {
    Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
    mockWrittenFile = null;
    mockPickerResult = { canceled: true };
    jest.clearAllMocks();
  });

  describe('isValidSleepLog', () => {
    it('debe validar un registro con campos correctos', () => {
      const valid = {
        id: 'sleep_1',
        date: '2026-10-21',
        bedtime: '2026-10-21T23:00:00.000Z',
        wakeTime: '2026-10-22T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 4,
        tags: ['lectura'],
        notes: 'Dormí muy bien',
      };
      expect(isValidSleepLog(valid)).toBe(true);
    });

    it('debe rechazar registros con duración negativa o superior a 24 horas', () => {
      expect(
        isValidSleepLog({
          date: '2026-10-21',
          bedtime: '2026-10-21T23:00:00.000Z',
          wakeTime: '2026-10-22T07:00:00.000Z',
          durationMinutes: -10,
          qualityRating: 4,
        })
      ).toBe(false);

      expect(
        isValidSleepLog({
          date: '2026-10-21',
          bedtime: '2026-10-21T23:00:00.000Z',
          wakeTime: '2026-10-22T07:00:00.000Z',
          durationMinutes: 1500, // > 1440 min (24h)
          qualityRating: 4,
        })
      ).toBe(false);
    });

    it('debe rechazar calidad fuera del rango 1 a 5', () => {
      expect(
        isValidSleepLog({
          date: '2026-10-21',
          bedtime: '2026-10-21T23:00:00.000Z',
          wakeTime: '2026-10-22T07:00:00.000Z',
          durationMinutes: 420,
          qualityRating: 6 as any,
        })
      ).toBe(false);
    });
  });

  describe('saveSleepLog & getSleepLogs', () => {
    it('debe guardar un registro sanitizando tags y notas, y asignando ID seguro', async () => {
      const saved = await sleepService.saveSleepLog({
        date: '2026-10-21',
        bedtime: '2026-10-21T23:00:00.000Z',
        wakeTime: '2026-10-22T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
        tags: ['Cafeína<script>', '  Meditación  '],
        notes: '<p>Noche reparadora</p>',
      });

      expect(saved.id.startsWith('sleep_')).toBe(true);
      expect(saved.notes).toBe('Noche reparadora');
      expect(saved.tags).toContain('cafeína');
      expect(saved.tags).toContain('meditación');

      const logs = await sleepService.getSleepLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe(saved.id);
    });

    it('debe ordenar múltiples registros por fecha y hora más reciente primero', async () => {
      await sleepService.saveSleepLog({
        date: '2026-10-19',
        bedtime: '2026-10-19T23:00:00.000Z',
        wakeTime: '2026-10-20T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 4,
      });

      await sleepService.saveSleepLog({
        date: '2026-10-21',
        bedtime: '2026-10-21T23:30:00.000Z',
        wakeTime: '2026-10-22T07:30:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      const logs = await sleepService.getSleepLogs();
      expect(logs[0].date).toBe('2026-10-21');
      expect(logs[1].date).toBe('2026-10-19');
    });

    it('debe eliminar un registro por su ID', async () => {
      const log1 = await sleepService.saveSleepLog({
        date: '2026-10-20',
        bedtime: '2026-10-20T23:00:00.000Z',
        wakeTime: '2026-10-21T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 4,
      });

      const log2 = await sleepService.saveSleepLog({
        date: '2026-10-21',
        bedtime: '2026-10-21T23:00:00.000Z',
        wakeTime: '2026-10-22T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      await sleepService.deleteSleepLog(log1.id);
      const remaining = await sleepService.getSleepLogs();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(log2.id);
    });
  });

  describe('getSleepStats & getSleepDebt', () => {
    it('debe calcular estadísticas y deuda de sueño correctamente para la semana', async () => {
      const now = new Date();

      // Guardar 3 noches recientes de 6 horas (360 min)
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        await sleepService.saveSleepLog({
          date: d.toISOString().split('T')[0],
          bedtime: new Date(d.getTime() - 6 * 60 * 60 * 1000).toISOString(),
          wakeTime: d.toISOString(),
          durationMinutes: 360, // 6 horas
          qualityRating: 4,
        });
      }

      const stats = await sleepService.getSleepStats();
      expect(stats.totalLogsLast7Days).toBe(3);
      expect(stats.averageHours).toBe(6);
      expect(stats.averageQuality).toBe(4);

      // Con objetivo de 8h/noche, 3 noches de 6h acumulan 6h de déficit
      const debt = await sleepService.getSleepDebt(8);
      expect(debt.dailyAverageHours).toBe(6);
      expect(debt.deficitHours).toBe(6);
      expect(debt.status).toBe('severe_debt');
      expect(debt.statusLabel).toContain('Deuda alta');
    });

    it('debe reflejar estado equilibrado si se cumple el objetivo de horas', async () => {
      const now = new Date();
      // Guardar 2 noches de 8 horas (480 min)
      for (let i = 1; i <= 2; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        await sleepService.saveSleepLog({
          date: d.toISOString().split('T')[0],
          bedtime: new Date(d.getTime() - 8 * 60 * 60 * 1000).toISOString(),
          wakeTime: d.toISOString(),
          durationMinutes: 480,
          qualityRating: 5,
        });
      }

      const debt = await sleepService.getSleepDebt(8);
      expect(debt.status).toBe('balanced');
      expect(debt.deficitHours).toBe(0);
    });
  });

  describe('getChronotypeProfile', () => {
    it('debe identificar cronotipo Alondra si el usuario se acuesta antes de las 23:00', async () => {
      await sleepService.saveSleepLog({
        date: '2026-10-19',
        bedtime: '2026-10-19T21:30:00.000Z',
        wakeTime: '2026-10-20T05:30:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });
      await sleepService.saveSleepLog({
        date: '2026-10-20',
        bedtime: '2026-10-20T21:45:00.000Z',
        wakeTime: '2026-10-21T05:45:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      const profile = await sleepService.getChronotypeProfile();
      expect(profile.chronotype).toBe('lark');
      expect(profile.title).toContain('Alondra');
      expect(profile.circadianConsistencyScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('getLocalAssistantAnswer', () => {
    it('debe responder consultas de deuda de sueño', async () => {
      await sleepService.saveSleepLog({
        date: '2026-10-20',
        bedtime: '2026-10-20T23:00:00.000Z',
        wakeTime: '2026-10-21T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      const answer = await sleepService.getLocalAssistantAnswer('¿Tengo deuda de sueño?');
      expect(answer.sender).toBe('assistant');
      expect(answer.text).toContain('Deuda de Sueño');
    });

    it('debe responder consultas sobre cronotipo', async () => {
      await sleepService.saveSleepLog({
        date: '2026-10-19',
        bedtime: '2026-10-19T22:00:00.000Z',
        wakeTime: '2026-10-20T06:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });
      await sleepService.saveSleepLog({
        date: '2026-10-20',
        bedtime: '2026-10-20T22:00:00.000Z',
        wakeTime: '2026-10-21T06:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      const answer = await sleepService.getLocalAssistantAnswer('¿Cuál es mi cronotipo circadiano?');
      expect(answer.text).toContain('Perfil Circadiano');
    });
  });

  describe('Backup Cifrado e Integridad (Export / Import)', () => {
    it('exportSleepData debe incluir Checksum SHA-256 en el payload', async () => {
      await sleepService.saveSleepLog({
        date: '2026-10-20',
        bedtime: '2026-10-20T23:00:00.000Z',
        wakeTime: '2026-10-21T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      });

      const result = await sleepService.exportSleepData();
      expect(result.success).toBe(true);
      expect(result.checksum).toHaveLength(64);

      expect(mockWrittenFile).not.toBeNull();
      const payload = JSON.parse(mockWrittenFile!.content);
      expect(payload.schemaVersion).toBe(2);
      expect(payload.checksum).toBe(result.checksum);
    });

    it('importSleepData debe rechazar backups con Checksum manipulado (Anti-Tampering)', async () => {
      const legitimateLogs = [
        {
          id: 'sleep_legit',
          date: '2026-10-20',
          bedtime: '2026-10-20T23:00:00.000Z',
          wakeTime: '2026-10-21T07:00:00.000Z',
          durationMinutes: 480,
          qualityRating: 5 as const,
        },
      ];
      const legitimateChecksum = computeLogsChecksum(legitimateLogs);

      // Archivo manipulado (se alteró el qualityRating sin actualizar checksum)
      const tamperedContent = JSON.stringify({
        app: 'Just Breathe',
        schemaVersion: 2,
        checksum: legitimateChecksum,
        logs: [
          {
            ...legitimateLogs[0],
            qualityRating: 1, // Alterado
          },
        ],
      });

      mockPickerResult = {
        canceled: false,
        assets: [{ uri: 'file:///data/cache/tampered_backup.json' }],
      };
      mockWrittenFile = {
        uri: 'file:///data/cache/tampered_backup.json',
        content: tamperedContent,
      };

      await expect(sleepService.importSleepData()).rejects.toThrow(
        /Alerta de Seguridad: El checksum no coincide/
      );
    });

    it('importSleepData debe restaurar exitosamente un backup íntegro', async () => {
      const logsToImport = [
        {
          id: 'sleep_import_1',
          date: '2026-10-18',
          bedtime: '2026-10-18T23:00:00.000Z',
          wakeTime: '2026-10-19T07:00:00.000Z',
          durationMinutes: 480,
          qualityRating: 4 as const,
        },
      ];
      const validChecksum = computeLogsChecksum(logsToImport);
      const validPayload = JSON.stringify({
        app: 'Just Breathe',
        schemaVersion: 2,
        checksum: validChecksum,
        logs: logsToImport,
      });

      mockPickerResult = {
        canceled: false,
        assets: [{ uri: 'file:///data/cache/valid_backup.json' }],
      };
      mockWrittenFile = {
        uri: 'file:///data/cache/valid_backup.json',
        content: validPayload,
      };

      const result = await sleepService.importSleepData();
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);

      const storedLogs = await sleepService.getSleepLogs();
      expect(storedLogs).toHaveLength(1);
      expect(storedLogs[0].id).toBe('sleep_import_1');
    });
  });
});
