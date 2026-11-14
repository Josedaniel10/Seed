import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { documentStoragePath, documentMimeType, uploadDocumentFile, downloadDocumentFile } from '../documentFiles.ts';
import { computeFileSha256 } from '../../requests/documentValidator.ts';

const origin = 'https://seed-documents.example';
const userId = '70d36cd3-f967-45da-9f8b-4a4941fb1d58';
const pdf = new File(['%PDF-1.4\noriginal'], 'Propuesta.pdf', { type: 'application/pdf' });
function storageClient(handler) {
  return createClient(origin, 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: handler },
    accessToken: async () => 'test-token',
  });
}

test('historical public URLs resolve inside the configured bucket; foreign URLs and local placeholders are refused', () => {
  assert.equal(documentStoragePath(`${origin}/storage/v1/object/public/documents/old.pdf`, origin), 'old.pdf');
  assert.equal(documentStoragePath(`${userId}/id/Propuesta.pdf`, origin), `${userId}/id/Propuesta.pdf`);
  for (const path of ['https://other.example/file.pdf', 'file-service/storage/fake.pdf', '../file.pdf', 'user/../file.pdf', '/file.pdf', 'file.pdf?token=123']) {
    assert.throws(() => documentStoragePath(path, origin));
  }
  assert.equal(documentMimeType('Documento.DOC'), 'application/msword');
});

test('downloads original bytes through authenticated Storage and refuses stale or corrupted versions', async () => {
  let calls = 0;
  const client = storageClient(async (input, options) => {
    calls++;
    assert.equal(new URL(String(input)).pathname, '/storage/v1/object/documents/old.pdf');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-token');
    return new Response(pdf, { headers: { 'content-type': 'application/pdf' } });
  });
  const doc = {
    file_path: `${origin}/storage/v1/object/public/documents/old.pdf`, file_name: pdf.name,
    file_hash_sha256: await computeFileSha256(await pdf.arrayBuffer()), file_size_bytes: pdf.size,
  };
  assert.deepEqual(new Uint8Array(await (await downloadDocumentFile(doc, client, origin)).arrayBuffer()), new Uint8Array(await pdf.arrayBuffer()));
  await assert.rejects(downloadDocumentFile({ ...doc, file_hash_sha256: 'a'.repeat(64) }, client, origin), /no coincide/);
  await assert.rejects(downloadDocumentFile({ ...doc, file_size_bytes: 1 }, client, origin), /no coincide/);
  await assert.rejects(downloadDocumentFile({ ...doc, file_path: 'https://attacker.example/file.pdf' }, client, origin));
  assert.equal(calls, 3);
});

test('missing files or denied access never produce a simulated document', async () => {
  const client = storageClient(async () => Response.json({ message: 'Object not found', statusCode: '404', error: 'not_found' }, { status: 404 }));
  await assert.rejects(downloadDocumentFile({ file_path: 'old.pdf', file_name: 'old.pdf', file_hash_sha256: 'a'.repeat(64), file_size_bytes: 12 }, client, origin), /archivo original/);
});

test('uploads original file to an immutable user-scoped path; accepts catalogue MIME formats', async () => {
  // Auth is an explicit boundary: the current user must match the upload owner.
  const calls = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: userId } } }, error: null }) },
    storage: { from: (bucket) => ({ upload: async (path, body, options) => {
      calls.push({ bucket, path, body, options });
      return { data: { path }, error: null };
    } }) },
  };
  const payload = await uploadDocumentFile({ file: pdf, requirementId: 'req', userId, allowedFormats: ['application/pdf'] }, client);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bucket, 'documents');
  assert.match(payload.file_path, new RegExp(`^${userId}/[a-f0-9-]{36}/Propuesta.pdf$`));
  assert.equal(calls[0].body, pdf);
  assert.equal(calls[0].options.upsert, false);
  assert.equal(payload.file_hash_sha256, await computeFileSha256(await pdf.arrayBuffer()));
  assert.equal(payload.file_size_bytes, pdf.size);
  assert.ok(!('file_base64' in payload));
  await assert.rejects(uploadDocumentFile({ file: pdf, requirementId: 'req', userId: 'another-user' }, client), /sesión ha cambiado/);
  await assert.rejects(uploadDocumentFile({ file: pdf, requirementId: 'req', userId, allowedFormats: ['docx'] }, client), /formato/);
  await assert.rejects(uploadDocumentFile({ file: pdf, requirementId: 'req', userId, maxSizeMb: 0.000001 }, client), /tamaño/);
  assert.equal(calls.length, 1);
});
