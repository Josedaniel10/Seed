import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'committee-workflow-test-key';

const session = {
  id: '60fbc100-0000-4000-8000-000000000100',
  session_number: 'Sesión Ordinaria Nº 01 - 2028', session_type: 'ORDINARIA',
  scheduled_at: '2028-01-01T14:00:00Z', location_or_url: 'Sala de prueba',
  quorum_required: 2, is_agenda_closed: false, is_completed: false,
  created_at: '2028-01-01T12:00:00Z',
};
const minute = {
  id: '60fbc100-0000-4000-8000-000000000101', minute_number: 'Acta 001 de 2028',
  year: 2028, session_id: session.id, draft_content: 'Acta con fundamento técnico áéíóú',
  is_approved: false, approved_at: null, pdf_path: null, created_at: session.created_at,
};
let responseError = null;
let rpcResult = {};
let sessions = [];
let minutes = [];
let nonDeliberations = [];
let lastPayload;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'http://127.0.0.1:54321');
  const isRpc = url.pathname.includes('/rpc/');
  if (isRpc) lastPayload = JSON.parse(options.body);
  if (isRpc && responseError) {
    return new Response(JSON.stringify({ message: responseError, code: 'P0001' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  let data = [];
  if (isRpc) data = rpcResult;
  if (url.pathname.endsWith('/committee_sessions')) data = sessions;
  if (url.pathname.endsWith('/committee_minutes')) data = minutes;
  if (url.pathname.endsWith('/session_non_deliberations')) data = nonDeliberations;
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};
const { useCommitteeSessionsStore } = await import('../committeeSessionsStore.ts');
const { useMinutesStore } = await import('../../minutes/minutesStore.ts');
const store = useCommitteeSessionsStore.getState();
const minutesStore = useMinutesStore.getState();

test('persists committee operations through RPC and preserves state on rejected writes', async () => {
  try {
    assert.deepEqual(store.sessions, []);
    sessions = [session];
    assert.equal((await store.loadFromSupabase()).success, true);
    assert.equal(useCommitteeSessionsStore.getState().sessions.length, 1);

    sessions = [];
    await store.loadFromSupabase();
    assert.deepEqual(useCommitteeSessionsStore.getState().sessions, []);

    responseError = 'La cuenta no tiene permiso para gestionar sesiones.';
    const rejected = await store.createSession(session, 'untrusted-actor', 'Untrusted');
    assert.equal(rejected.success, false);
    assert.match(rejected.error, /permiso/);
    assert.deepEqual(useCommitteeSessionsStore.getState().sessions, []);
    assert.equal(useCommitteeSessionsStore.getState().isSaving, false);

    responseError = null;
    rpcResult = { session };
    sessions = [session];
    const created = await store.createSession(session, 'untrusted-actor', 'Untrusted');
    assert.equal(created.session.id, session.id);
    assert.equal(lastPayload.p_action, 'create');
    assert.equal(lastPayload.p_payload.actor_id, undefined);
    assert.equal(useCommitteeSessionsStore.getState().sessions[0].id, session.id);

    const record = {
      id: 'non-deliberation', session_id: session.id, application_id: 'request',
      reason: 'Faltan participantes habilitados.', eligible_count: 1, required_count: 2,
      attendance_snapshot: [{ user_id: 'member', name: 'Integrante', attended: true, exclusion_reason: 'Mismo grupo.' }],
      registered_by: 'secretary', created_at: session.created_at,
    };
    rpcResult = { nonDeliberation: record };
    nonDeliberations = [record];
    const constancy = await store.recordNonDeliberation(session.id, 'request', record.reason, 'untrusted-actor', 'Untrusted');
    assert.equal(constancy.success, true);
    assert.equal(lastPayload.p_action, 'not_deliberated');
    assert.equal(lastPayload.p_payload.reason, record.reason);
    assert.equal(lastPayload.p_payload.actor_id, undefined);
    assert.deepEqual(useCommitteeSessionsStore.getState().nonDeliberations, [record]);
    nonDeliberations = [];
    await store.loadFromSupabase();
    assert.deepEqual(useCommitteeSessionsStore.getState().nonDeliberations, []);

    responseError = 'No hay quórum reglamentario.';
    const decision = await store.registerSessionDecision(session.id, 'request', 'APROBADA', 'Fundamento', 'actor', 'Actor');
    assert.equal(decision.success, false);
    assert.deepEqual(useCommitteeSessionsStore.getState().decisions, []);

    const attendance = await store.toggleAttendance(session.id, 'member', true);
    assert.equal(attendance.success, false);
    assert.deepEqual(useCommitteeSessionsStore.getState().attendances, []);

    responseError = null;
    rpcResult = minute;
    const generated = await minutesStore.generateDraftFromSession(session.id, 'actor', 'Actor');
    assert.equal(generated.minute.id, minute.id);
    assert.equal(lastPayload.p_action, 'generate');

    responseError = 'El acta ya está aprobada y es inmutable.';
    const edited = await minutesStore.updateDraftContent(minute.id, 'Cambio', 'actor', 'Actor');
    assert.equal(edited.success, false);
    assert.equal(useMinutesStore.getState().minutes[0].draft_content, minute.draft_content);

    responseError = null;
    minutes = [];
    await minutesStore.loadFromSupabase();
    assert.deepEqual(useMinutesStore.getState().minutes, []);

    rpcResult = { unexpected: true };
    const invalid = await minutesStore.generateDraftFromSession(session.id, 'actor', 'Actor');
    assert.equal(invalid.success, false);
    assert.deepEqual(useMinutesStore.getState().minutes, []);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});
