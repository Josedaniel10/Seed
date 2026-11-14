import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'observation-public-test-key';
const { useRequestStore } = await import('../../requests/requestStore.ts');
const observation = { id: 'obs', application_id: 'app', assignment_id: 'assignment', author_id: 'reviewer', category: 'AJUSTE_OBLIGATORIO',
  content: 'Corregir método', is_resolved: false, applicant_response: null, verification_notes: null, verified_at: null, verified_by: null, created_at: '2026-11-14' };

test('failed responses preserve state; saved responses await verification and verify the reviewed version', async () => {
  const originalFetch = globalThis.fetch;
  const snapshot = useRequestStore.getState();
  let fail = true;
  const actions = [];
  globalThis.fetch = async (input, options) => {
    assert.ok(String(input).endsWith('/rpc/act_on_observation'));
    const payload = JSON.parse(options.body);
    assert.ok(!('actor_id' in payload));
    actions.push(payload.p_action);
    if (fail) return Response.json({ message: 'Guardado fallido', code: '40001' }, { status: 409 });
    const verifying = payload.p_action === 'VERIFY';
    if (verifying) assert.equal(payload.p_expected_response, 'Corregido');
    return Response.json({ observation: { ...observation, applicant_response: 'Corregido', is_resolved: verifying,
      verification_notes: verifying ? 'Revisado' : null, verified_by: verifying ? 'reviewer' : null, verified_at: verifying ? '2026-11-14' : null },
      audit: { id: `audit-${actions.length}`, application_id: 'app', actor_id: 'actor', action: `AJUSTE_${payload.p_action}`, details: {}, created_at: '2026-11-14' } });
  };
  try {
    useRequestStore.setState({ observations: [observation], auditHistory: [] });
    assert.equal((await snapshot.respondToObservation('obs', 'Corregido', 'untrusted', 'Untrusted')).success, false);
    assert.deepEqual(useRequestStore.getState().observations, [observation]);
    assert.deepEqual(useRequestStore.getState().auditHistory, []);
    fail = false;
    assert.equal((await snapshot.respondToObservation('obs', 'Corregido', 'owner', 'Owner')).success, true);
    assert.equal(useRequestStore.getState().observations[0].is_resolved, false);
    assert.equal((await snapshot.verifyObservation('obs', true, 'Revisado', 'Versión antigua')).success, false);
    assert.equal(actions.length, 2);
    assert.equal((await snapshot.verifyObservation('obs', true, 'Revisado', 'Corregido')).success, true);
    assert.equal(useRequestStore.getState().observations[0].verified_by, 'reviewer');
    assert.equal(useRequestStore.getState().auditHistory.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    useRequestStore.setState(snapshot);
  }
});
