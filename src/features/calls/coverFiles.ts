import { getSupabaseClient } from '../../lib/supabase.ts';
import { createUuid } from '../../lib/uuid.ts';

const formats: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validateCoverFile(file: Pick<File, 'type' | 'size'>): void {
  if (!formats[file.type] || file.size < 1 || file.size > 3 * 1048576) throw new Error('Seleccione una imagen JPG, PNG o WebP de hasta 3 MB.');
}

export async function uploadCallCover(file: File): Promise<string> {
  validateCoverFile(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const signature = file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === 'image/png' ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
    : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!signature) throw new Error('El contenido de la imagen no corresponde al formato seleccionado.');
  const client = getSupabaseClient();
  if (!client) throw new Error('Conecte Supabase para cargar la portada.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Inicie sesión para cargar la portada.');
  const path = `${data.session.user.id}/${createUuid()}.${formats[file.type]}`;
  const result = await client.storage.from('call-covers').upload(path, file, { contentType: file.type, upsert: false });
  if (result.error) throw new Error('No se pudo cargar la portada. Revise la conexión y reintente.');
  return path;
}
