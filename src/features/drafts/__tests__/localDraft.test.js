import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { createLocalDraft } from '../localDraft.ts';
import { requestDraftSchema } from '../draftSchemas.ts';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const options = (storage, overrides = {}) => ({
  ownerId: 'user-a', scope: 'review:app-a:assignment-a', context: 'documents-v1', storage,
  schema: z.object({ text: z.string() }), createInitial: () => ({ text: '' }), hasContent: (value) => Boolean(value.text), ...overrides,
});

test('saves and restores unsent text, isolated by user, request and assignment', () => {
  const storage = memoryStorage();
  const draft = createLocalDraft(options(storage));
  assert.equal(storage.values.size, 0);
  draft.update(() => ({ text: 'Evaluación pendiente de envío' }));
  assert.equal(draft.getSnapshot().status, 'pending');
  assert.equal(draft.flush(), true);
  const restored = createLocalDraft(options(storage));
  assert.equal(restored.getSnapshot().status, 'restored');
  assert.equal(restored.getSnapshot().value.text, 'Evaluación pendiente de envío');
  for (const overrides of [{ ownerId: 'user-b' }, { scope: 'review:app-b:assignment-a' }, { scope: 'review:app-a:assignment-b' }]) {
    assert.equal(createLocalDraft(options(storage, overrides)).getSnapshot().value.text, '');
  }
});

test('document changes require explicit recovery and retain a review warning after reload', () => {
  const storage = memoryStorage();
  const previous = createLocalDraft(options(storage));
  previous.update(() => ({ text: 'Concepto sobre versión anterior' })); previous.flush();
  const next = createLocalDraft(options(storage, { context: 'documents-v2' }));
  assert.equal(next.getSnapshot().status, 'outdated');
  assert.equal(next.getSnapshot().value.text, '');
  next.recover();
  assert.equal(next.getSnapshot().value.text, 'Concepto sobre versión anterior');
  assert.equal(next.getSnapshot().needsReview, true);
  assert.equal(createLocalDraft(options(storage, { context: 'documents-v2' })).getSnapshot().needsReview, true);
});

test('two tabs do not silently overwrite one another; explicit replacement preserves the chosen text', () => {
  const storage = memoryStorage();
  const a = createLocalDraft(options(storage));
  const b = createLocalDraft(options(storage));
  a.update(() => ({ text: 'Texto de A' })); a.flush();
  b.update(() => ({ text: 'Texto de B' }));
  assert.equal(b.flush(), false);
  assert.equal(b.getSnapshot().status, 'conflict');
  assert.equal(b.getSnapshot().value.text, 'Texto de B');
  assert.equal(createLocalDraft(options(storage)).getSnapshot().value.text, 'Texto de A');
  b.replace();
  assert.equal(createLocalDraft(options(storage)).getSnapshot().value.text, 'Texto de B');
  a.externalChange();
  assert.equal(a.getSnapshot().status, 'conflict');
  assert.equal(a.getSnapshot().value.text, 'Texto de A');
  a.recover();
  assert.equal(a.getSnapshot().value.text, 'Texto de B');
});

test('storage failures retain the form, report unsaved work and support a later retry', () => {
  const storage = memoryStorage();
  let blocked = true;
  const guarded = { ...storage, setItem(key, value) { if (blocked) throw new Error('quota'); storage.setItem(key, value); } };
  const draft = createLocalDraft(options(guarded));
  draft.update(() => ({ text: 'Texto importante' }));
  assert.equal(draft.flush(), false);
  assert.equal(draft.getSnapshot().status, 'unavailable');
  assert.equal(draft.getSnapshot().value.text, 'Texto importante');
  assert.equal(draft.hasUnsavedChanges(), true);
  blocked = false;
  assert.equal(draft.flush(), true);
  assert.equal(draft.hasUnsavedChanges(), false);
});

test('failed recovery never empties current unsaved text', () => {
  const storage = memoryStorage();
  let blocked = false;
  const draft = createLocalDraft(options({ ...storage, getItem(key) { if (blocked) throw new Error('denied'); return storage.getItem(key); } }));
  draft.update(() => ({ text: 'Mi trabajo pendiente' }));
  blocked = true;
  draft.recover();
  assert.equal(draft.getSnapshot().value.text, 'Mi trabajo pendiente');
  assert.equal(draft.hasUnsavedChanges(), true);
});

test('malformed and incompatible drafts are not applied or overwritten implicitly', () => {
  const storage = memoryStorage();
  const initial = createLocalDraft(options(storage));
  storage.setItem(initial.key, '{broken');
  const draft = createLocalDraft(options(storage));
  assert.equal(draft.getSnapshot().status, 'invalid');
  draft.update(() => ({ text: 'Nuevo texto' }));
  assert.equal(draft.flush(), false);
  assert.equal(storage.getItem(initial.key), '{broken');
  draft.discard();
  assert.equal(draft.getSnapshot().value.text, '');
  assert.equal(storage.getItem(initial.key), null);
});

test('completed submissions remove only their own saved version and cannot recreate it on unmount', () => {
  const storage = memoryStorage();
  const draft = createLocalDraft(options(storage));
  draft.update(() => ({ text: 'Para enviar' })); draft.flush();
  draft.complete();
  draft.update(() => ({ text: 'Late update' })); draft.flush();
  assert.equal(storage.getItem(draft.key), null);
  const a = createLocalDraft(options(storage));
  const b = createLocalDraft(options(storage));
  a.update(() => ({ text: 'A' })); a.flush();
  b.update(() => ({ text: 'B' })); b.replace();
  a.complete();
  assert.equal(createLocalDraft(options(storage)).getSnapshot().value.text, 'B');
});

test('request drafts preserve idempotency and uploaded references but strip file contents', () => {
  const storage = memoryStorage();
  const payload = {
    currentStep: 4, selectedTypeId: 'type', submissionId: 'c7cafef7-6a59-4e4c-8159-c85e8435e471',
    formData: { title: 'Proyecto', related_project: '', abstract: 'Resumen', research_group_id: '', budget_requested: 0, is_tutor_endorsed: false },
    uploadedFiles: { req: { requirement_id: 'req', file_name: 'Propuesta.pdf', file_path: 'user-a/uuid/Propuesta.pdf',
      file_size_bytes: 100, file_hash_sha256: 'hash', mime_type: 'application/pdf', file_base64: 'secret-file-bytes' } },
  };
  const opt = options(storage, { schema: requestDraftSchema, createInitial: () => payload, hasContent: () => true });
  const draft = createLocalDraft(opt);
  draft.update((current) => ({ ...current })); draft.flush();
  assert.ok(!storage.getItem(draft.key).includes('secret-file-bytes'));
  const restored = createLocalDraft(opt).getSnapshot().value;
  assert.equal(restored.submissionId, payload.submissionId);
  assert.equal(restored.uploadedFiles.req.file_path, payload.uploadedFiles.req.file_path);
});
