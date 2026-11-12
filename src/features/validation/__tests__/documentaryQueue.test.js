import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { getDocumentaryQueue, getDocumentVersions } from '../documentaryQueue.ts';
import { useRequestStore } from '../../requests/requestStore.ts';
import { useCatalogStore } from '../../catalog/catalogStore.ts';
import { useSessionStore } from '../../../stores/session.store.ts';
import { ValidacionPage } from '../../../pages/gestion/ValidacionPage.tsx';

const base = useRequestStore.getInitialState().requests[0];
const oldest = { ...base, id: 'oldest', filing_number: 'FIFO-001', current_status: 'SUBMITTED', created_at: '2026-01-01T12:00:00Z' };
const newer = { ...base, id: 'newer', filing_number: 'FIFO-002', current_status: 'RADICADA', created_at: '2026-01-02T12:00:00Z' };
const waiting = { ...base, id: 'waiting', filing_number: 'FIFO-WAIT', current_status: 'PENDING_DOCUMENTS', updated_at: '2026-01-03T12:00:00Z' };
const document = { ...useRequestStore.getInitialState().documents[0], id: 'document', application_id: waiting.id,
  request_id: waiting.id, file_hash_sha256: 'hash', uploaded_at: '2026-01-03T11:00:00Z', validation_status: 'REJECTED' };

test('queue is FIFO, handles status aliases and never falls back to completed requests', () => {
  const requests = [newer, { ...base, id: 'finished', current_status: 'UNDER_REVIEW' }, oldest, waiting];
  assert.deepEqual(getDocumentaryQueue(requests, [document], []).map((item) => item.id), ['oldest', 'newer']);
  assert.deepEqual(requests.map((item) => item.id), ['newer', 'finished', 'oldest', 'waiting']);
  assert.deepEqual(getDocumentaryQueue([{ ...oldest, current_status: 'EN_REVISION' }], [], []), []);
  const tied = { ...oldest, id: 'a-tie' };
  assert.equal(getDocumentaryQueue([oldest, tied], [], [])[0].id, tied.id);
});

test('pending corrections leave the queue after closure and return only for a new document version', () => {
  const closure = { id: 'closure', application_id: waiting.id, action: 'VALIDACION_DOCUMENTAL_FINALIZADA',
    created_at: '2026-01-04T12:00:00Z', details: { document_versions: getDocumentVersions([document]) } };
  assert.deepEqual(getDocumentaryQueue([waiting], [document], [closure]), []);
  const corrected = { ...document, uploaded_at: '2026-01-05T12:00:00+00:00', validation_status: 'PENDING' };
  assert.equal(getDocumentaryQueue([waiting], [corrected], [closure]).length, 1);
  // Reviewing the new upload must not prematurely remove it before finalization.
  assert.equal(getDocumentaryQueue([waiting], [{ ...corrected, validation_status: 'VALID' }], [closure]).length, 1);
  const nextClosure = { ...closure, id: 'new-closure', created_at: '2026-01-06T12:00:00Z',
    details: { document_versions: getDocumentVersions([corrected]) } };
  assert.deepEqual(getDocumentaryQueue([waiting], [corrected], [closure, nextClosure]), []);
  assert.deepEqual(getDocumentaryQueue([waiting], [{ ...corrected, uploaded_at: '2026-01-05T12:00:00.000Z' }], [nextClosure]), []);
});

test('finalizing the oldest request advances the queue and finalizing the last leaves an empty view', async () => {
  const store = useRequestStore.getState();
  const oldState = { requests: store.requests, documents: store.documents, auditHistory: store.auditHistory };
  const catalog = useCatalogStore.getState();
  const previousRequirements = catalog.requirements;
  try {
    useRequestStore.setState({ requests: [newer, oldest], documents: [], auditHistory: [] });
    useCatalogStore.setState({ requirements: [] });
    assert.equal(getDocumentaryQueue([newer, oldest], [], [])[0].id, oldest.id);
    const result = await store.finalizeAdministrativeValidation(oldest.id, 'staff', 'Personal administrativo');
    assert.equal(result.success, true);
    const state = useRequestStore.getState();
    assert.equal(getDocumentaryQueue(state.requests, state.documents, state.auditHistory)[0].id, newer.id);
    assert.equal(state.auditHistory.filter((event) => event.action === 'VALIDACION_DOCUMENTAL_FINALIZADA').length, 1);
    await store.finalizeAdministrativeValidation(newer.id, 'staff', 'Personal administrativo');
    const done = useRequestStore.getState();
    assert.deepEqual(getDocumentaryQueue(done.requests, done.documents, done.auditHistory), []);
  } finally {
    useRequestStore.setState(oldState);
    useCatalogStore.setState({ requirements: previousRequirements });
  }
});

test('the rendered checklist shows the oldest request and validated document states', () => {
  const state = useRequestStore.getInitialState();
  const previous = { requests: state.requests, documents: state.documents, auditHistory: state.auditHistory };
  const originalUser = useSessionStore.getInitialState().user;
  const requirement = useCatalogStore.getInitialState().requirements.find((item) => item.application_type_id === base.application_type_id);
  try {
    Object.assign(state, { requests: [newer, oldest], auditHistory: [], documents: [{ ...document,
      application_id: oldest.id, request_id: oldest.id, requirement_id: requirement.id, validation_status: 'VALID' }] });
    useSessionStore.getInitialState().user = { id: 'staff', fullName: 'Administración', roles: ['administrative'], activeRole: 'administrative' };
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ValidacionPage)));
    assert.ok(html.indexOf('FIFO-001') < html.indexOf('FIFO-002'));
    assert.match(html, /En atención/);
    assert.match(html, /Turno 2/);
    assert.match(html, /Validado/);
    assert.match(html, /disabled=""[^>]*>[\s\S]*?Validado/);
    state.requests = [{ ...oldest, current_status: 'EN_REVISION' }];
    const empty = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ValidacionPage)));
    assert.match(empty, /No hay solicitudes listas para validar/);
    assert.doesNotMatch(empty, /Finalizar Validación Documental/);
  } finally {
    Object.assign(state, previous);
    useSessionStore.getInitialState().user = originalUser;
  }
});
