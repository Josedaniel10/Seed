import { getSupabaseClient } from '../../lib/supabase.ts';
import { createUuid } from '../../lib/uuid.ts';
import { saveDocumentBlob } from '../documents/documentFiles.ts';

const mimeTypes: Record<string, string> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export async function uploadTemplate(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!mimeTypes[extension] || file.size === 0 || file.size > 10 * 1048576) throw new Error('Adjunte un PDF, DOCX o XLSX de hasta 10 MB, con contenido.');
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const validSignature = extension === 'pdf' ? new TextDecoder().decode(bytes) === '%PDF-' : bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!validSignature) throw new Error('El contenido del archivo no corresponde al formato seleccionado.');
  const client = getSupabaseClient();
  if (!client) throw new Error('Conecte Supabase para cargar plantillas.');
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error('Inicie sesión para cargar la plantilla.');
  const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  const path = `${data.session.user.id}/${createUuid()}/${name}`;
  const result = await client.storage.from('catalog-templates').upload(path, file, { contentType: mimeTypes[extension], upsert: false });
  if (result.error) throw new Error(result.error.message);
  return path;
}

export async function downloadTemplate(path: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Conecte Supabase para descargar la plantilla.');
  if (!path || path.startsWith('/') || path.includes('..') || path.includes('://')) throw new Error('Esta plantilla debe actualizarse desde el catálogo institucional.');
  const result = await client.storage.from('catalog-templates').download(path);
  if (result.error || !result.data) throw new Error('No se pudo descargar la plantilla. Reintente o consulte al administrador.');
  saveDocumentBlob(result.data, path.split('/').pop() ?? 'plantilla');
}
