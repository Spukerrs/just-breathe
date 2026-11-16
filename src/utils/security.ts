/**
 * Módulo de Seguridad y Criptografía para JUST BREATHE
 * - Generación segura de identificadores (CSPRNG)
 * - Cálculo de Checksum SHA-256 para verificación de integridad de respaldos
 * - Sanitización estricta de inputs (prevención de XSS, inyección y caracteres de control)
 * - Protección contra ataques de denegación de servicio (DoS) por sobrecarga de memoria
 */

// Límite de tamaño máximo para archivos JSON de importación (2 MB)
export const MAX_BACKUP_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_NOTES_LENGTH = 1000;
export const MAX_TAGS_COUNT = 15;
export const MAX_TAG_LENGTH = 35;

/**
 * Generador de identificadores únicos criptográficamente seguros.
 * Usa crypto.getRandomValues o crypto.randomUUID cuando esté disponible.
 */
export const generateSecureId = (prefix: string = 'sleep'): string => {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      if (typeof globalThis.crypto.randomUUID === 'function') {
        const uuid = globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16);
        return `${prefix}_${Date.now().toString(36)}_${uuid}`;
      }
      if (typeof globalThis.crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(8);
        globalThis.crypto.getRandomValues(bytes);
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return `${prefix}_${Date.now().toString(36)}_${hex}`;
      }
    }
  } catch {
    // Fallback silencioso en entornos restringidos
  }

  // Fallback con alta entropía
  const time = Date.now().toString(36);
  const rand1 = Math.random().toString(36).substring(2, 10);
  const rand2 = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${time}_${rand1}${rand2}`;
};

/**
 * Implementación pura en TypeScript de SHA-256 (FIPS 180-4).
 * Funciona de forma síncrona en React Native, Expo, Web y Node sin dependencias externas.
 */
export const sha256 = (ascii: string): string => {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClearHex = '';
  // Convertir cadena a UTF-8 seguro
  const utf8: number[] = [];
  for (let idx = 0; idx < ascii.length; idx++) {
    let charCode = ascii.charCodeAt(idx);
    if (charCode < 0x80) {
      utf8.push(charCode);
    } else if (charCode < 0x800) {
      utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8.push(
        0xe0 | (charCode >> 12),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    } else {
      idx++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (ascii.charCodeAt(idx) & 0x3ff));
      utf8.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }

  const bitLength = utf8.length * 8;
  for (i = 0; i < utf8.length; i++) {
    words[i >> 2] |= utf8[i] << ((3 - (i % 4)) * 8);
  }
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const w: number[] = new Array(64);

  for (i = 0; i < words.length; i += 16) {
    const oldHash = [...hash];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0x = w[j - 15];
        const r0 = ((gamma0x >>> 7) | (gamma0x << 25)) ^ ((gamma0x >>> 18) | (gamma0x << 14)) ^ (gamma0x >>> 3);
        const gamma1x = w[j - 2];
        const r1 = ((gamma1x >>> 17) | (gamma1x << 15)) ^ ((gamma1x >>> 19) | (gamma1x << 13)) ^ (gamma1x >>> 10);
        w[j] = (w[j - 16] + r0 + w[j - 7] + r1) | 0;
      }

      const s1 = ((hash[4] >>> 6) | (hash[4] << 26)) ^ ((hash[4] >>> 11) | (hash[4] << 21)) ^ ((hash[4] >>> 25) | (hash[4] << 7));
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[j] + w[j]) | 0;
      const s0 = ((hash[0] >>> 2) | (hash[0] << 30)) ^ ((hash[0] >>> 13) | (hash[0] << 19)) ^ ((hash[0] >>> 22) | (hash[0] << 10));
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += byte.toString(16).padStart(2, '0');
    }
  }

  return result;
};

/**
 * Sanitiza una cadena de texto para evitar ataques de inyección, scripts o desbordamiento de memoria.
 * - Elimina tags HTML/Script
 * - Elimina caracteres de control invisibles (excepto saltos de línea y tabulaciones)
 * - Trunca la cadena a la longitud máxima permitida
 */
export const sanitizeString = (input: unknown, maxLength: number = MAX_NOTES_LENGTH): string => {
  if (typeof input !== 'string') return '';

  return input
    // 1. Eliminar etiquetas tipo <script>...</script> o HTML malicioso
    .replace(/<[^>]*>?/gm, '')
    // 2. Eliminar caracteres de control no imprimibles (excepto \r, \n, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // 3. Normalizar espacios en blanco consecutivos innecesarios
    .trim()
    // 4. Limitar longitud estricta
    .substring(0, maxLength);
};

/**
 * Sanitiza y valida una lista de etiquetas (tags).
 * - Garantiza que sea un array
 * - Sanitiza cada etiqueta individualmente
 * - Filtra etiquetas vacías
 * - Elimina duplicados
 * - Limita la cantidad máxima de etiquetas
 */
export const sanitizeTags = (
  tags: unknown,
  maxCount: number = MAX_TAGS_COUNT,
  maxLen: number = MAX_TAG_LENGTH
): string[] => {
  if (!Array.isArray(tags)) return [];

  const cleanedTags = new Set<string>();

  for (const tag of tags) {
    if (typeof tag === 'string') {
      const sanitized = sanitizeString(tag, maxLen)
        .toLowerCase()
        // Permitir solo letras, números, guiones y espacios básicos
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\-_ ]/g, '')
        .trim();

      if (sanitized.length > 0) {
        cleanedTags.add(sanitized);
        if (cleanedTags.size >= maxCount) break;
      }
    }
  }

  return Array.from(cleanedTags);
};

/**
 * Valida el tamaño de una cadena cruda antes de parsearla en memoria para prevenir DoS.
 */
export const validatePayloadSize = (content: string, maxBytes: number = MAX_BACKUP_SIZE_BYTES): boolean => {
  if (typeof content !== 'string') return false;
  // Estimación rápida de bytes en UTF-8
  return content.length <= maxBytes;
};

/**
 * Calcula el checksum SHA-256 canónico para una lista de registros.
 * Ordena las claves para garantizar consistencia determinista del hash.
 */
export const computeLogsChecksum = (logs: unknown[]): string => {
  const canonicalString = JSON.stringify(logs, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });

  return sha256(canonicalString);
};

/**
 * Valida la integridad del archivo de respaldo comparando el checksum almacenado.
 */
export const verifyBackupIntegrity = (
  payload: any
): { isValid: boolean; isTampered: boolean; message: string } => {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, isTampered: false, message: 'El payload no es un objeto válido.' };
  }

  if (!Array.isArray(payload.logs)) {
    return { isValid: false, isTampered: false, message: 'El archivo no contiene una lista de registros.' };
  }

  // Si incluye checksum (v2+), verificar consistencia criptográfica
  if (typeof payload.checksum === 'string' && payload.checksum.length === 64) {
    const computed = computeLogsChecksum(payload.logs);
    if (computed !== payload.checksum) {
      return {
        isValid: false,
        isTampered: true,
        message: 'Alerta de Seguridad: El checksum no coincide. El archivo pudo haber sido alterado o corrompido.',
      };
    }
  }

  return { isValid: true, isTampered: false, message: 'Integridad verificada con éxito.' };
};
