import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { DetalleSolicitudPage } = await import('../../../pages/compartidas/DetalleSolicitudPage.tsx');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { getDocumentCorrection } = await import('../documentCorrection.ts');
const stores = [useRequestStore, useSessionStore, useCatalogStore];
const snapshots = stores.map((store) => store.getState());
let root;
const app = { ...snapshots[0].requests[0], id: 'correction-app', applicant_id: 'owner',
  application_type_id: 'type', request_type_id: 'type', current_status: 'PENDIENTE_DOCUMENTOS' };
const previous = { id: 'document', application_id: app.id, requirement_id: 'requirement', file_name: 'Anterior.pdf',
  file_path: 'owner/old/Anterior.pdf', file_hash_sha256: 'old-hash', file_size_bytes: 100, mime_type: 'application/pdf',
  uploaded_at: '2026-11-13T12:00:00Z', validation_status: 'RECHAZADO', validation_observations: 'Falta información en el cronograma.' };
const file = { requirement_id: previous.requirement_id, file_name: 'Cronograma corregido.pdf',
  file_path: 'owner/new/Cronograma.pdf', file_hash_sha256: 'new-hash', file_size_bytes: 150, mime_type: 'application/pdf' };

async function mount() {
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(createElement(MemoryRouter, { initialEntries: [`/solicitudes/${app.id}?tab=documentos`] },
    createElement(Routes, null, createElement(Route, { path: '/solicitudes/:id', element: createElement(DetalleSolicitudPage) })))); });
}
function setup() {
  useSessionStore.setState({ user: { id: 'owner', fullName: 'Investigadora', roles: ['researcher'], activeRole: 'researcher' } });
  useRequestStore.setState({ requests: [app], documents: [previous], auditHistory: [], observations: [], assignments: [],
    isLoading: false, isInitialized: true, loadFromSupabase: async () => ({ success: true }) });
  useCatalogStore.setState({ types: [{ id: 'type', name: 'Trámite' }],
    requirements: [{ id: previous.requirement_id, application_type_id: 'type', name: 'Cronograma', is_subsanable: true, is_mandatory: true }] });
}
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  document.body.replaceChildren(); stores.forEach((store, index) => store.setState(snapshots[index], true));
});
after(() => dom.window.close());

test('a saved correction changes the file, rejection notice and action, and its receipt survives reopening', async () => {
  setup(); await mount();
  assert.match(document.body.textContent, /Falta información en el cronograma/);
  assert.match(document.body.textContent, /Requiere subsanación/);
  assert.doesNotMatch(document.body.textContent, /Archivo corregido cargado/);
  await act(async () => {
    const result = await useRequestStore.getState().cureDocument(app.id, previous.requirement_id, file, 'owner', 'Investigadora');
    assert.equal(result.success, true);
  });
  assert.match(document.body.textContent, /Archivo corregido cargado/);
  assert.match(document.body.textContent, /nueva versión está guardada y pendiente de validación administrativa/);
  assert.match(document.body.textContent, /Cronograma corregido.pdf/);
  assert.match(document.body.textContent, /Reemplazar archivo enviado/);
  assert.doesNotMatch(document.body.textContent, /Requiere subsanación|Motivo del Rechazo|Falta información en el cronograma/);
  await act(async () => root.unmount()); root = null; document.body.replaceChildren();
  await mount();
  assert.match(document.body.textContent, /Archivo corregido cargado/);
  assert.match(document.body.textContent, /Pendiente de validación/);
});

test('old corrections or corrections for another document never mark the current version as newly saved', () => {
  const saved = { ...previous, ...file, validation_status: 'PENDING' };
  const event = { id: 'correction', application_id: app.id, action: 'SUBSANACION_DOCUMENTO', created_at: '2026-11-14T12:00:00Z',
    details: { requirement_id: previous.requirement_id, file_hash_sha256: file.file_hash_sha256, file_path: file.file_path } };
  assert.equal(getDocumentCorrection(saved, [event]), event);
  assert.equal(getDocumentCorrection(saved, [{ ...event, application_id: 'other-app' }]), undefined);
  assert.equal(getDocumentCorrection(saved, [{ ...event, details: { ...event.details, requirement_id: 'other-requirement' } }]), undefined);
  assert.equal(getDocumentCorrection(saved, [{ ...event, details: { ...event.details, file_hash_sha256: 'old-hash' } }]), undefined);
  assert.equal(getDocumentCorrection(saved, [{ ...event, details: { ...event.details, file_path: 'owner/old/Anterior.pdf' } }]), undefined);
});

test('validated English status labels do not appear as pending or still requiring a correction', async () => {
  setup();
  useRequestStore.setState({ documents: [{ ...previous, validation_status: 'VALID', validation_observations: null }] });
  await mount();
  assert.match(document.body.textContent, /Válido/);
  assert.doesNotMatch(document.body.textContent, /Requiere subsanación|Subsanar este documento|Pendiente de validación/);
});
