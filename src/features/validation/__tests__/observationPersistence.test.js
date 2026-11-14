import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'observation-sync-test-key';
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { refreshObservationState } = await import('../observationSync.ts');
const originalFetch = globalThis.fetch;
const initial = useRequestStore.getState();
const session = useSessionStore.getState();
const observation = { id: 'obs', application_id: 'app', assignment_id: 'assignment', author_id: 'reviewer', category: 'AJUSTE_OBLIGATORIO',
  content: 'Corregir método', is_resolved: false, applicant_response: null, verification_notes: null, verified_at: null, verified_by: null, created_at: '2026-11-14' };
const audit = { id: 'audit', application_id: 'app', actor_id: 'reviewer', action: 'AJUSTE_ADD', details: {}, created_at: '2026-11-14' };
afterEach(() => {
  globalThis.fetch = originalFetch;
  useRequestStore.setState(initial);
  useSessionStore.setState(session);
});

test('registering an observation requires confirmed remote storage and survives a fresh load', async () => {
  let saved = false;
  let fail = true;
  globalThis.fetch = async (input, options) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/rpc/act_on_observation')) {
      assert.equal(JSON.parse(options.body).p_action, 'ADD');
      if (fail) return Response.json({ message: 'No autorizado' }, { status: 403 });
      saved = true;
      return Response.json({ observation, audit });
    }
    if (path.endsWith('/applications')) return Response.json([{ id: 'app', application_type_id: 'type' }]);
    if (path.endsWith('/observations')) return Response.json(saved ? [observation] : []);
    if (path.endsWith('/audit_history')) return Response.json(saved ? [audit] : []);
    return Response.json([]);
  };
  useRequestStore.setState({ observations: [], auditHistory: [] });
  assert.equal((await initial.addTechnicalObservation('app', 'reviewer', 'Reviewer', 'AJUSTE_OBLIGATORIO', 'Corregir método')).success, false);
  assert.deepEqual(useRequestStore.getState().observations, []);
  fail = false;
  assert.equal((await initial.addTechnicalObservation('app', 'reviewer', 'Reviewer', 'AJUSTE_OBLIGATORIO', 'Corregir método')).success, true);
  useRequestStore.setState({ observations: [], auditHistory: [], requests: [] });
  assert.equal((await initial.loadFromSupabase()).success, true);
  assert.equal(useRequestStore.getState().observations[0].content, 'Corregir método');
  assert.equal(useRequestStore.getState().auditHistory[0].id, 'audit');
});

test('background synchronization updates only observations and audit without loading flags or form state', async () => {
  useSessionStore.setState({ user: { id: 'owner' } });
  useRequestStore.setState({ observations: [], auditHistory: [], isLoading: false });
  const requests = useRequestStore.getState().requests;
  globalThis.fetch = async input => Response.json(String(input).includes('/observations') ? [observation] : [audit]);
  await refreshObservationState('owner', new AbortController().signal);
  assert.equal(useRequestStore.getState().observations[0].id, 'obs');
  assert.equal(useRequestStore.getState().auditHistory[0].id, 'audit');
  assert.equal(useRequestStore.getState().isLoading, false);
  assert.equal(useRequestStore.getState().requests, requests);
  await refreshObservationState('owner', new AbortController().signal);
  assert.equal(useRequestStore.getState().auditHistory.length, 1);
});

test('a stale background read cannot overwrite a confirmed write or another user session', async () => {
  useSessionStore.setState({ user: { id: 'owner' } });
  useRequestStore.setState({ observations: [], auditHistory: [] });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  globalThis.fetch = async () => { await gate; return Response.json([]); };
  const pending = refreshObservationState('owner', new AbortController().signal);
  useRequestStore.setState({ observations: [observation] });
  release();
  await pending;
  assert.deepEqual(useRequestStore.getState().observations, [observation]);
  useSessionStore.setState({ user: { id: 'another-user' } });
  await refreshObservationState('owner', new AbortController().signal);
  assert.deepEqual(useRequestStore.getState().observations, [observation]);
});
