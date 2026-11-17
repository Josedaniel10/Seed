import assert from 'node:assert/strict';
import { test } from 'node:test';
delete process.env.VITE_SUPABASE_URL;
delete process.env.VITE_SUPABASE_ANON_KEY;
const { useRequestStore } = await import('../../requests/requestStore.ts');

test('unavailable Supabase never produces locally registered observations, responses or acceptances', async () => {
  const initial = useRequestStore.getState();
  const observation = { id: 'obs', application_id: 'app', applicant_response: 'Respuesta', is_resolved: false };
  try {
    useRequestStore.setState({ observations: [observation], auditHistory: [] });
    const added = await initial.addTechnicalObservation('app', 'reviewer', 'Reviewer', 'AJUSTE_OBLIGATORIO', 'Observación');
    assert.equal(added.success, false);
    assert.match(added.error, /No pudimos guardar los cambios/);
    assert.equal((await initial.respondToObservation('obs', 'Nueva respuesta', 'owner', 'Owner')).success, false);
    assert.equal((await initial.verifyObservation('obs', true, 'Revisado', 'Respuesta')).success, false);
    assert.deepEqual(useRequestStore.getState().observations, [observation]);
    assert.deepEqual(useRequestStore.getState().auditHistory, []);
  } finally {
    useRequestStore.setState(initial);
  }
});
