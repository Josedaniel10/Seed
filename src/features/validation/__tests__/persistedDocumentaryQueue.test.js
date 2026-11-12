import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'documentary-queue-public-test-key';
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { getDocumentaryQueue, getDocumentVersions } = await import('../documentaryQueue.ts');
const app = {
  id: 'b0fbc100-0000-4000-8000-000000000001', filing_number: 'FIFO-001',
  application_type_id: 'b0fbc100-0000-4000-8000-000000000010', applicant_id: 'b0fbc100-0000-4000-8000-000000000020',
  title: 'Proyecto de prueba', abstract: 'Resumen', research_group_id: null, budget_requested: 0,
  current_status: 'RADICADA', is_tutor_endorsed: false, requires_committee: true,
  created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z',
};
const doc = {
  id: 'b0fbc100-0000-4000-8000-000000000030', application_id: app.id,
  requirement_id: 'b0fbc100-0000-4000-8000-000000000040', file_hash_sha256: 'hash',
  uploaded_at: '2026-01-01T12:00:00Z', validation_status: 'RECHAZADO',
};

test('only confirmed Supabase completion advances the queue and saved closures survive reload', async () => {
  const originalFetch = globalThis.fetch;
  const initial = useRequestStore.getState();
  const previous = { requests: initial.requests, documents: initial.documents, auditHistory: initial.auditHistory };
  let fail = true;
  let invalidResponse = false;
  const completedApp = { ...app, current_status: 'PENDIENTE_DOCUMENTOS' };
  const closure = {
    id: 'b0fbc100-0000-4000-8000-000000000050', application_id: app.id, actor_id: app.applicant_id,
    action: 'VALIDACION_DOCUMENTAL_FINALIZADA', previous_status: 'PENDIENTE_DOCUMENTOS', new_status: 'PENDIENTE_DOCUMENTOS',
    details: { document_versions: getDocumentVersions([doc]) }, created_at: '2026-01-02T12:00:00Z',
  };
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/rpc/finalize_documentary_validation')) {
      assert.deepEqual(JSON.parse(options.body), { p_application_id: app.id });
      if (fail) return Response.json({ message: 'No se pudo guardar', code: '40001' }, { status: 409 });
      if (invalidResponse) return Response.json({ application: { ...completedApp, current_status: 'INVALID' }, audits: [] });
      return Response.json({ application: completedApp, audits: [closure] });
    }
    if (url.pathname.endsWith('/applications')) return Response.json([completedApp]);
    if (url.pathname.endsWith('/application_documents')) return Response.json([doc]);
    if (url.pathname.endsWith('/audit_history')) return Response.json([closure]);
    return Response.json([]);
  };
  try {
    useRequestStore.setState({ requests: [{ ...app, request_type_id: app.application_type_id }], documents: [doc], auditHistory: [] });
    assert.equal((await initial.finalizeAdministrativeValidation(app.id, 'untrusted-id', 'Name')).success, false);
    assert.equal(getDocumentaryQueue(useRequestStore.getState().requests, [doc], []).length, 1);
    assert.deepEqual(useRequestStore.getState().auditHistory, []);
    fail = false;
    invalidResponse = true;
    assert.equal((await initial.finalizeAdministrativeValidation(app.id, 'untrusted-id', 'Name')).success, false);
    assert.equal(useRequestStore.getState().requests[0].current_status, 'RADICADA');
    invalidResponse = false;
    assert.equal((await initial.finalizeAdministrativeValidation(app.id, 'untrusted-id', 'Name')).success, true);
    let state = useRequestStore.getState();
    assert.deepEqual(getDocumentaryQueue(state.requests, state.documents, state.auditHistory), []);
    await initial.finalizeAdministrativeValidation(app.id, 'untrusted-id', 'Name');
    assert.equal(useRequestStore.getState().auditHistory.length, 1);
    // Clear client data, then load the saved request, documents and closure from Supabase.
    useRequestStore.setState({ requests: [], documents: [], auditHistory: [] });
    assert.equal((await initial.loadFromSupabase()).success, true);
    state = useRequestStore.getState();
    assert.deepEqual(getDocumentaryQueue(state.requests, state.documents, state.auditHistory), []);
  } finally {
    globalThis.fetch = originalFetch;
    useRequestStore.setState(previous);
  }
});
