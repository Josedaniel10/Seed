import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNextAction } from '../nextAction.ts';

const app = { id: 'app', applicant_id: 'owner', application_type_id: 'type', current_status: 'EN_REVISION' };
const assignment = { application_id: 'app', reviewer_id: 'reviewer', is_active: true, deadline_date: '2026-11-20' };
const observation = { id: 'obs', application_id: 'app', category: 'AJUSTE_OBLIGATORIO', content: 'Corregir método', is_resolved: false, applicant_response: null };
const data = { documents: [], requirements: [], observations: [], assignments: [assignment], auditHistory: [] };

test('next action distinguishes missing assignment, response, verification and concept', () => {
  assert.equal(getNextAction(app, { ...data, assignments: [] }).href, '/asignaciones');
  const waiting = getNextAction(app, { ...data, observations: [observation] });
  assert.equal(waiting.responsibleId, 'owner');
  assert.deepEqual(waiting.pending, ['Corregir método']);
  assert.equal(waiting.deadline, null); // A reviewer deadline is not an applicant deadline.
  const verification = getNextAction(app, { ...data, observations: [{ ...observation, applicant_response: 'Corregido' }] });
  assert.equal(verification.title, 'Verificar respuestas a los ajustes');
  assert.equal(verification.responsibleId, 'reviewer');
  assert.equal(verification.deadline, '2026-11-20');
  assert.equal(getNextAction(app, { ...data, observations: [{ ...observation, applicant_response: 'Corregido', verified_at: '2026-11-14' }] }).responsibleId, 'owner');
  assert.equal(getNextAction(app, { ...data, observations: [{ ...observation, is_resolved: true }] }).title, 'Emitir concepto técnico');
});

test('document corrections move back to validation only after real document versions change', () => {
  const request = { ...app, current_status: 'PENDIENTE_DOCUMENTOS' };
  const requirements = [{ id: 'r', application_type_id: 'type', name: 'Certificado', is_mandatory: true }];
  const auditHistory = [{ application_id: 'app', id: 'h', action: 'VALIDACION_DOCUMENTAL_FINALIZADA', created_at: '2026-11-14', details: { document_versions: {} } }];
  const original = { ...data, requirements, auditHistory };
  assert.equal(getNextAction(request, original).responsibleId, 'owner');
  assert.deepEqual(getNextAction(request, original).pending, ['Certificado']);
  const documents = [{ id: 'd', application_id: 'app', requirement_id: 'r', file_hash_sha256: 'new', uploaded_at: '2026-11-15', validation_status: 'PENDIENTE' }];
  assert.equal(getNextAction(request, { ...original, documents }).href, '/validacion');
});

test('committee and terminal states do not invent a session or deadline', () => {
  assert.equal(getNextAction({ ...app, current_status: 'LISTA_COMITE' }, data).href, '/sesiones');
  const closed = getNextAction({ ...app, current_status: 'CERRADA' }, data);
  assert.equal(closed.deadline, null);
  assert.deepEqual(closed.roles, []);
});
