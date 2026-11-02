import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FileMetadata {
  id: string;
  originalName: string;
  savedName: string;
  filePath: string;
  fileSizeBytes: number;
  hashSha256: string;
  mimeType: string;
  uploadedAt: string;
}

export const STORAGE_DIR = path.resolve('file-service/storage');
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (RNF-04)

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

// Asegurar existencia de la carpeta de almacenamiento
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Valida tipo y tamaño de archivo (RNF-04)
 */
export function validateFile(fileName: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido de 10 MB (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimeType) || mimeType === 'application/octet-stream';

  if (!isExtAllowed && !isMimeAllowed) {
    return {
      valid: false,
      error: `Formato de archivo no permitido (.${ext}). Solo se admiten documentos PDF y DOCX.`,
    };
  }

  return { valid: true };
}

/**
 * Calcula el hash SHA-256 de un buffer
 */
export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Guarda un archivo físicamente en la carpeta local de la institución
 */
export function saveFileLocally(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): { success: boolean; metadata?: FileMetadata; error?: string } {
  const validation = validateFile(fileName, mimeType, buffer.length);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const hashSha256 = computeSha256(buffer);
  const fileId = crypto.randomUUID();
  const ext = path.extname(fileName).toLowerCase();
  const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const savedName = `${hashSha256.substring(0, 12)}_${sanitizedBase}${ext}`;
  const filePath = path.join(STORAGE_DIR, savedName);

  fs.writeFileSync(filePath, buffer);

  const metadata: FileMetadata = {
    id: fileId,
    originalName: fileName,
    savedName,
    filePath,
    fileSizeBytes: buffer.length,
    hashSha256,
    mimeType: mimeType || 'application/pdf',
    uploadedAt: new Date().toISOString(),
  };

  return { success: true, metadata };
}

/**
 * Lee un archivo físicamente y recalcula su hash para verificar integridad
 */
export function readFileLocally(filePathOrName: string): {
  success: boolean;
  buffer?: Buffer;
  hashSha256?: string;
  error?: string;
} {
  let resolvedPath = filePathOrName;
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.join(STORAGE_DIR, filePathOrName);
  }

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, error: 'El archivo solicitado no existe en el almacenamiento local.' };
  }

  const buffer = fs.readFileSync(resolvedPath);
  const hashSha256 = computeSha256(buffer);

  return { success: true, buffer, hashSha256 };
}
