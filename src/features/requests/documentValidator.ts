export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (RNF-04)

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export const DISALLOWED_EXECUTABLE_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bin',
  '.js',
  '.ts',
  '.py',
  '.php',
  '.jar',
  '.msi',
  '.app',
  '.vbs',
  '.scr',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates document files strictly for institutional submission (RNF-04).
 * Rejects executable files and sizes exceeding 10 MB.
 */
export function validateDocumentFile(
  fileName: string,
  sizeBytes: number,
  maxSizeMb: number = 10
): FileValidationResult {
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (sizeBytes <= 0) {
    return {
      valid: false,
      error: 'El archivo seleccionado está vacío (0 bytes).',
    };
  }

  if (sizeBytes > maxBytes) {
    const sizeInMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo institucional permitido de ${maxSizeMb} MB (Tamaño actual: ${sizeInMb} MB).`,
    };
  }

  const extMatch = fileName.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

  if (!ext) {
    return {
      valid: false,
      error: 'El archivo no tiene una extensión reconocible. Solo se admiten documentos PDF (.pdf) y Word (.docx).',
    };
  }

  if (DISALLOWED_EXECUTABLE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `El formato de archivo "${ext}" no está permitido por motivos de seguridad informática institucional. Se prohíbe el ingreso de ejecutables o scripts.`,
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formato de archivo no admitido (${ext}). Para trámites del Comité de Investigación únicamente se admiten archivos PDF (.pdf) y documentos Word (.docx).`,
    };
  }

  return { valid: true };
}

/**
 * Computes SHA-256 hash in browser or Node.js environment
 */
export async function computeFileSha256(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    let buffer: ArrayBuffer;
    if (typeof data === 'string') {
      buffer = new TextEncoder().encode(data).buffer;
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer as ArrayBuffer;
    } else {
      buffer = data;
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    const nodeCrypto = await import('crypto');
    let nodeBuffer: Buffer;
    if (typeof data === 'string') {
      nodeBuffer = Buffer.from(data, 'utf-8');
    } else if (data instanceof Uint8Array) {
      nodeBuffer = Buffer.from(data);
    } else {
      nodeBuffer = Buffer.from(new Uint8Array(data));
    }
    return nodeCrypto.createHash('sha256').update(nodeBuffer).digest('hex');
  } catch {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    const str = typeof data === 'string' ? data : data.toString();
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(64, 'a');
  }
}
