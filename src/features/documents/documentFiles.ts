import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestDocument } from '../../types/database.ts';
import { getSupabaseClient, getSupabaseCredentials } from '../../lib/supabase.ts';
import { createUuid } from '../../lib/uuid.ts';
import { validateDocumentFile } from '../requests/documentValidator.ts';

export interface UploadedDocumentFile {
  requirement_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  mime_type: string;
}

function requireClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new Error('Conecte Supabase para cargar y consultar documentos reales.');
  return client;
}

async function fileHash(file: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Abra Seed mediante HTTPS para verificar la integridad de los documentos.');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Accept only object keys or historical URLs from this project's documents bucket. */
export function documentStoragePath(filePath: string, supabaseUrl: string): string {
  let path = filePath;
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    const prefix = '/storage/v1/object/public/documents/';
    if (url.origin !== new URL(supabaseUrl).origin || !url.pathname.startsWith(prefix)) {
      throw new Error('La ubicación del documento no pertenece al almacenamiento institucional.');
    }
    path = decodeURIComponent(url.pathname.slice(prefix.length));
  }
  if (!path || path.startsWith('/') || path.startsWith('file-service/') || /[\\?#\x00-\x1f]/.test(path)
    || path.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('El archivo original no está disponible en el almacenamiento. Solicite que se adjunte nuevamente.');
  }
  return path;
}

export function documentMimeType(fileName: string): string {
  if (/\.pdf$/i.test(fileName)) return 'application/pdf';
  if (/\.docx$/i.test(fileName)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (/\.doc$/i.test(fileName)) return 'application/msword';
  throw new Error('Solo se admiten documentos PDF y Word (.pdf, .docx y .doc).');
}

export async function uploadDocumentFile({ file, requirementId, userId, maxSizeMb = 10, allowedFormats }: {
  file: File; requirementId: string; userId: string; maxSizeMb?: number; allowedFormats?: string[];
}, client = requireClient()): Promise<UploadedDocumentFile> {
  const validation = validateDocumentFile(file.name, file.size, Math.min(10, maxSizeMb));
  if (!validation.valid) throw new Error(validation.error);
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = documentMimeType(file.name);
  if (allowedFormats?.length && !allowedFormats.some((format) => format.toLowerCase() === mimeType
    || format.replace(/^\./, '').toLowerCase() === extension)) {
    throw new Error('El formato del archivo no está permitido para este requisito.');
  }
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Inicie sesión para adjuntar documentos.');
  if (data.session.user.id !== userId) throw new Error('Su sesión ha cambiado. Ingrese nuevamente.');
  const hash = await fileHash(file);
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-160);
  const path = `${userId}/${createUuid()}/${cleanName}`;
  const result = await client.storage.from('documents').upload(path, file, {
    contentType: mimeType, cacheControl: '0', upsert: false,
  });
  if (result.error || !result.data?.path) throw new Error('No se pudo cargar el archivo original. Intente nuevamente.');
  return {
    requirement_id: requirementId, file_name: file.name, file_path: result.data.path,
    file_size_bytes: file.size, file_hash_sha256: hash, mime_type: mimeType,
  };
}

/** Every read goes through authenticated Storage RLS; never fetch a persisted URL directly. */
export async function downloadDocumentFile(document: Pick<RequestDocument, 'file_path' | 'file_name' | 'file_hash_sha256' | 'file_size_bytes'>,
  client = requireClient(), supabaseUrl = getSupabaseCredentials().url): Promise<Blob> {
  const path = documentStoragePath(document.file_path, supabaseUrl);
  const { data, error } = await client.storage.from('documents').download(path);
  if (error || !data) throw new Error('No se pudo obtener el archivo original. Verifique su acceso o solicite que se adjunte nuevamente.');
  const hash = await fileHash(data);
  if (data.size !== document.file_size_bytes || hash !== document.file_hash_sha256.toLowerCase()) {
    throw new Error('El archivo no coincide con la versión registrada. Recargue el expediente o contacte a Secretaría.');
  }
  return new Blob([data], { type: documentMimeType(document.file_name) });
}

export function saveDocumentBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Give the browser time to begin reading the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
