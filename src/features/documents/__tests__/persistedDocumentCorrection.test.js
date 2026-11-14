import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'document-correction-public-test-key';
const { useRequestStore } = await import('../../requests/requestStore.ts');

test('correction changes local state only after the RPC commits; retries do not duplicate audit', async () => {
  const originalFetch = globalThis.fetch;
  const state = useRequestStore.getState();
  const app = { id: 'app', applicant_id: 'owner', current_status: 'PENDIENTE_DOCUMENTOS' };
  const previous = { id: 'doc', application_id: 'app', requirement_id: 'req', file_hash_sha256: 'old', file_name: 'old.pdf', validation_status: 'RECHAZADO' };
  const file = { requirement_id: 'req', file_path: 'owner/random/new.pdf', file_name: 'new.pdf', file_size_bytes: 100, file_hash_sha256: 'new', mime_type: 'application/pdf' };
  const saved = { ...previous, ...file, validation_status: 'PENDIENTE' };
  const audit = { id: 'audit', application_id: 'app', action: 'SUBSANACION_DOCUMENTO' };
  let fail = true;
  globalThis.fetch = async (input, options) => {
    assert.ok(String(input).endsWith('/rpc/cure_application_document'));
    const payload = JSON.parse(options.body);
    assert.equal(payload.p_application_id, 'app');
    assert.equal(payload.p_requirement_id, 'req');
    assert.ok(!('actor_id' in payload));
    if (fail) {
      assert.equal(payload.p_expected_hash, 'old');
      return Response.json({ message: 'No se pudo guardar', code: '40001' }, { status: 409 });
    }
    return Response.json({ document: saved, audit });
  };
  try {
    useRequestStore.setState({ requests: [app], documents: [previous], auditHistory: [] });
    assert.equal((await state.cureDocument('app', 'req', file, 'untrusted', 'Untrusted')).success, false);
    assert.deepEqual(useRequestStore.getState().documents, [previous]);
    assert.deepEqual(useRequestStore.getState().auditHistory, []);
    fail = false;
    assert.equal((await state.cureDocument('app', 'req', file, 'untrusted', 'Untrusted')).success, true);
    assert.equal(useRequestStore.getState().documents[0].file_name, 'new.pdf');
    await state.cureDocument('app', 'req', file, 'untrusted', 'Untrusted');
    assert.equal(useRequestStore.getState().auditHistory.length, 1);
    assert.equal(useRequestStore.getState().documents.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    useRequestStore.setState(state);
  }
});
