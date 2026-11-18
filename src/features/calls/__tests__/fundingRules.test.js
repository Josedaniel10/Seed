import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCallOpen, financingError, matchesAudience, matchesFundingApplicant } from '../callsApi.ts';
import { useRequestStore } from '../../requests/requestStore.ts';

const call = { id: 'call', title: 'Convocatoria', description: 'Requisitos', faculty: 'Ingeniería', audience: 'students',
  type_ids: ['type'], opens_at: new Date(Date.now() - 10000).toISOString(), closes_at: new Date(Date.now() + 60000).toISOString(),
  max_amount: 1000, status: 'published', created_by: 'manager' };
const applicant = { groupId: 'assigned-group', faculty: 'Ingeniería', academicLink: 'Estudiante de pregrado' };

test('opening is inclusive and closing exclusive, and publishing is required', () => {
  assert.equal(isCallOpen(call, Date.parse(call.opens_at)), true);
  assert.equal(isCallOpen(call, Date.parse(call.closes_at)), false);
  assert.equal(isCallOpen({ ...call, status: 'draft' }), false);
  assert.equal(isCallOpen({ ...call, status: 'cancelled' }), false);
});
test('academic endorsement needs no call and financing checks type, scope and cap', () => {
  assert.equal(financingError(0, '', [], 'type'), null);
  assert.ok(financingError(100, '', [], 'type'));
  assert.ok(financingError(0, call.id, [call], 'type', applicant, applicant.groupId));
  assert.match(financingError(100, call.id, [call], 'other', applicant, applicant.groupId), /tipo de solicitud/);
  assert.match(financingError(100, call.id, [call], 'type', { ...applicant, faculty: 'Otra área' }, applicant.groupId), /área del grupo/);
  assert.match(financingError(1001, call.id, [call], 'type', applicant, applicant.groupId), /tope/);
  assert.ok(financingError(NaN, call.id, [call], 'type', applicant, applicant.groupId));
  assert.equal(financingError(1000, call.id, [call], 'type', applicant, applicant.groupId), null);
});

test('financing rejects missing profile groups, foreign draft groups even in the same faculty, and wrong audiences', () => {
  assert.equal(matchesFundingApplicant(call, applicant), true);
  assert.equal(matchesFundingApplicant(call, {}), false);
  assert.equal(matchesFundingApplicant(call, { ...applicant, faculty: 'Otra área' }), false);
  assert.equal(matchesFundingApplicant(call, { ...applicant, academicLink: 'Docente' }), false);
  assert.match(financingError(100, call.id, [call], 'type', {}, 'arbitrary-selected-group'), /asignado en tu perfil/);
  assert.match(financingError(100, call.id, [call], 'type', applicant, 'other-group-same-faculty'), /Selecciona el grupo registrado/);
  assert.match(financingError(100, call.id, [call], 'type', { ...applicant, academicLink: 'Docente' }, applicant.groupId), /destinatarios/);
  assert.equal(financingError(0, '', [], 'type', {}, 'arbitrary-selected-group'), null);
});
test('student announcements distinguish academic affiliations', () => {
  assert.equal(matchesAudience(call, 'Estudiante de pregrado'), true);
  assert.equal(matchesAudience(call, 'Monitor de investigación'), true);
  assert.equal(matchesAudience(call, 'Docente planta'), false);
  assert.equal(matchesAudience({ ...call, audience: 'teachers' }, 'Docente ocasional'), true);
});
test('offline filing cannot claim successful financing without checking the server', async () => {
  const result = await useRequestStore.getState().createRequest({ request_type_id: 'type', applicant_id: 'owner',
    title: 'Proyecto', abstract: 'Justificación', budget_requested: 100, documents: [] });
  assert.equal(result.success, false);
  assert.match(result.error, /No pudimos validar la convocatoria/);
  assert.doesNotMatch(result.error, /Supabase/);
});
