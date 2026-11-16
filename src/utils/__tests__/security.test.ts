import {
  generateSecureId,
  sha256,
  sanitizeString,
  sanitizeTags,
  validatePayloadSize,
  computeLogsChecksum,
  verifyBackupIntegrity,
  MAX_BACKUP_SIZE_BYTES,
  MAX_NOTES_LENGTH,
} from '../security';

describe('Módulo de Seguridad - JUST BREATHE', () => {
  describe('generateSecureId', () => {
    it('debe generar un ID que comience con el prefijo especificado', () => {
      const id = generateSecureId('test');
      expect(id.startsWith('test_')).toBe(true);
    });

    it('debe generar IDs únicos en múltiples llamadas consecutivas', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('sha256', () => {
    it('debe calcular el hash SHA-256 estándar de una cadena vacía', () => {
      // Vector de prueba oficial FIPS para cadena vacía
      const hash = sha256('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('debe generar hashes de exactamente 64 caracteres hexadecimales', () => {
      const hash = sha256('Just Breathe Test');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('debe ser determinista ante la misma entrada', () => {
      const str = 'prueba de integridad de descanso';
      expect(sha256(str)).toBe(sha256(str));
    });

    it('debe cambiar drásticamente ante cualquier alteración de 1 carácter (efecto avalancha)', () => {
      const hash1 = sha256('Registro 2026-10-21');
      const hash2 = sha256('Registro 2026-10-22');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeString', () => {
    it('debe eliminar etiquetas HTML y scripts maliciosos (Anti-XSS)', () => {
      const malicious = '<script>alert("hack")</script>Nota importante <b>negrita</b>';
      const clean = sanitizeString(malicious);
      expect(clean).toBe('alert("hack")Nota importante negrita');
      expect(clean.includes('<script>')).toBe(false);
      expect(clean.includes('<b>')).toBe(false);
    });

    it('debe remover caracteres de control invisibles', () => {
      const input = 'Texto\x00con\x08caracteres\x1Focultos';
      const clean = sanitizeString(input);
      expect(clean).toBe('Textoconcaracteresocultos');
    });

    it('debe respetar el límite máximo de longitud', () => {
      const longInput = 'A'.repeat(MAX_NOTES_LENGTH + 200);
      const clean = sanitizeString(longInput, MAX_NOTES_LENGTH);
      expect(clean.length).toBe(MAX_NOTES_LENGTH);
    });

    it('debe manejar entradas que no son cadenas de forma segura', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(12345 as any)).toBe('');
    });
  });

  describe('sanitizeTags', () => {
    it('debe limpiar etiquetas permitiendo solo caracteres válidos en minúsculas', () => {
      const rawTags = ['Cafeína!', 'PANTALLAS<script>', '  Estrés  ', '#Lectura$'];
      const cleaned = sanitizeTags(rawTags);
      expect(cleaned).toContain('cafeína');
      expect(cleaned).toContain('pantallas');
      expect(cleaned).toContain('estrés');
      expect(cleaned).toContain('lectura');
      expect(cleaned.some((t) => t.includes('<'))).toBe(false);
    });

    it('debe eliminar duplicados', () => {
      const rawTags = ['cafeína', 'Cafeína', 'CAFEÍNA'];
      const cleaned = sanitizeTags(rawTags);
      expect(cleaned).toHaveLength(1);
    });

    it('debe limitar la cantidad máxima de etiquetas', () => {
      const manyTags = Array.from({ length: 30 }, (_, i) => `tag${i}`);
      const cleaned = sanitizeTags(manyTags, 5);
      expect(cleaned.length).toBeLessThanOrEqual(5);
    });

    it('debe retornar un array vacío si la entrada no es un array', () => {
      expect(sanitizeTags(null)).toEqual([]);
      expect(sanitizeTags('tag')).toEqual([]);
    });
  });

  describe('validatePayloadSize (Anti-DoS)', () => {
    it('debe aceptar contenidos dentro del límite de tamaño', () => {
      const validContent = JSON.stringify({ logs: [{ id: '1', date: '2026-10-21' }] });
      expect(validatePayloadSize(validContent, MAX_BACKUP_SIZE_BYTES)).toBe(true);
    });

    it('debe rechazar contenidos que excedan el límite de bytes', () => {
      const smallLimit = 50;
      const largeContent = 'X'.repeat(60);
      expect(validatePayloadSize(largeContent, smallLimit)).toBe(false);
    });
  });

  describe('verifyBackupIntegrity (Anti-Tampering)', () => {
    const sampleLogs = [
      {
        id: 'sleep_1',
        date: '2026-10-20',
        bedtime: '2026-10-20T23:00:00.000Z',
        wakeTime: '2026-10-21T07:00:00.000Z',
        durationMinutes: 480,
        qualityRating: 5,
      },
    ];

    it('debe verificar un backup legítimo con checksum correcto', () => {
      const checksum = computeLogsChecksum(sampleLogs);
      const payload = {
        app: 'Just Breathe',
        version: 1,
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        checksum,
        logs: sampleLogs,
      };

      const result = verifyBackupIntegrity(payload);
      expect(result.isValid).toBe(true);
      expect(result.isTampered).toBe(false);
    });

    it('debe detectar alteraciones maliciosas en los datos (Anti-Tampering)', () => {
      const originalChecksum = computeLogsChecksum(sampleLogs);
      // Simular que alguien modificó los datos pero mantuvo el checksum viejo
      const tamperedLogs = [
        {
          ...sampleLogs[0],
          qualityRating: 1, // Modificado
        },
      ];

      const payload = {
        app: 'Just Breathe',
        checksum: originalChecksum,
        logs: tamperedLogs,
      };

      const result = verifyBackupIntegrity(payload);
      expect(result.isValid).toBe(false);
      expect(result.isTampered).toBe(true);
      expect(result.message).toContain('Alerta de Seguridad');
    });

    it('debe rechazar un payload que no sea un objeto o que no tenga logs', () => {
      expect(verifyBackupIntegrity(null).isValid).toBe(false);
      expect(verifyBackupIntegrity({}).isValid).toBe(false);
      expect(verifyBackupIntegrity({ logs: 'no-array' }).isValid).toBe(false);
    });
  });
});
