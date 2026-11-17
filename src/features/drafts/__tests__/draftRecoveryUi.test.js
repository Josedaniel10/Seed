import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const callTestClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
import assert from 'node:assert/strict';
import { test, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { RequestSubmissionWizard } = await import('../../requests/RequestSubmissionWizard.tsx');
const { RevisionesPage } = await import('../../../pages/gestion/RevisionesPage.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { useGroupsStore } = await import('../../groups/groupsStore.ts');
const { createLocalDraft } = await import('../localDraft.ts');
const { requestDraftSchema } = await import('../draftSchemas.ts');
const stores = [useSessionStore, useRequestStore, useCatalogStore, useGroupsStore];
const snapshots = stores.map((store) => store.getState());
const user = { id: 'draft-user', fullName: 'Usuario de prueba', email: 'draft@example.invalid', activeRole: 'researcher', roles: ['researcher'] };
const app = { id: 'app-a', filing_number: 'Radicado 2026-001', title: 'Solicitud A', abstract: 'Resumen',
  applicant_id: 'owner', current_status: 'EN_REVISION', application_type_id: 'type', request_type_id: 'type' };
const noLoad = async () => ({ success: true });
let root;
async function mount(Component) {
  const container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(QueryClientProvider, { client: callTestClient }, createElement(MemoryRouter, null, createElement(Component)))));
}
async function unmount() {
  if (root) await act(async () => root.unmount());
  root = null; document.body.replaceChildren();
}
function button(label, scope = document) {
  const found = [...scope.querySelectorAll('button')].find((entry) => entry.textContent.trim() === label);
  assert.ok(found, `Missing button: ${label}`); return found;
}
async function click(element) { assert.ok(element); await act(async () => element.click()); }
async function change(element, value) {
  assert.ok(element, 'Missing form field');
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function pagehide() { await act(async () => window.dispatchEvent(new dom.window.Event('pagehide'))); }
function draftKeys() { return Object.keys(window.localStorage).filter((key) => key.startsWith('seed:draft:v1:')); }
function setup(role = 'researcher') {
  useSessionStore.setState({ user: { ...user, activeRole: role, roles: [role] } });
  useCatalogStore.setState({ types: [{ id: 'type', name: 'Trámite de prueba', code: 'TEST', is_active: true }], requirements: [] });
  useGroupsStore.setState({ groups: [] });
  useRequestStore.setState({ requests: [app], assignments: [{ id: 'asg-a', application_id: app.id, reviewer_id: user.id, is_active: true }],
    documents: [], observations: [], auditHistory: [], loadFromSupabase: noLoad, isSubmitting: false });
}
afterEach(async () => { await unmount(); window.localStorage.clear(); stores.forEach((store, index) => store.setState(snapshots[index], true)); });
after(() => dom.window.close());

test('new request restores its step and general data after leaving and reopening the form', async () => {
  setup();
  await mount(RequestSubmissionWizard);
  await click(button('Continuar'));
  await change(document.querySelector('input[placeholder^="Ej: Evaluación"]'), 'Proyecto recuperable');
  await change(document.querySelector('textarea'), 'Resumen técnico que debe recuperarse después de cerrar.');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)); });
  assert.match(document.body.textContent, /Borrador guardado en este navegador/);
  await unmount();
  await mount(RequestSubmissionWizard);
  assert.equal(document.querySelector('input[placeholder^="Ej: Evaluación"]').value, 'Proyecto recuperable');
  assert.match(document.querySelector('textarea').value, /debe recuperarse/);
  assert.match(document.body.textContent, /Borrador recuperado/);
  assert.equal(draftKeys().length, 1);
});

test('switching account never displays or saves another user draft', async () => {
  setup(); await mount(RequestSubmissionWizard);
  await click(button('Continuar'));
  await change(document.querySelector('input[placeholder^="Ej: Evaluación"]'), 'Contenido privado de A');
  await act(async () => useSessionStore.setState({ user: { ...user, id: 'user-b' } }));
  assert.doesNotMatch(document.body.textContent, /Contenido privado de A/);
  await click(button('Continuar'));
  assert.equal(document.querySelector('input[placeholder^="Ej: Evaluación"]').value, '');
  await act(async () => useSessionStore.setState({ user }));
  assert.equal(document.querySelector('input[placeholder^="Ej: Evaluación"]').value, 'Contenido privado de A');
});

test('request retry retains its submission id and removes the draft only after confirmed filing', async () => {
  setup();
  const pending = { currentStep: 4, selectedTypeId: 'type', submissionId: '4900be32-4798-4726-b631-f45853e975d7',
    formData: { title: 'Solicitud recuperada', related_project: '', abstract: 'Justificación académica suficientemente detallada.',
      research_group_id: '', budget_requested: 0, is_tutor_endorsed: false }, uploadedFiles: {} };
  const local = createLocalDraft({ ownerId: user.id, scope: 'request:new', context: 'request:v1', storage: window.localStorage,
    schema: requestDraftSchema, createInitial: () => pending, hasContent: () => true });
  local.update((value) => ({ ...value })); local.flush();
  let calls = 0;
  useRequestStore.setState({ createRequest: async (payload) => {
    assert.equal(payload.submission_id, pending.submissionId);
    return ++calls === 1 ? { success: false, error: 'No se pudo confirmar el envío' } : { success: true, request: { id: 'filed', filing_number: 'Radicado 2026-099' } };
  } });
  await mount(RequestSubmissionWizard);
  await click(button('Radicar solicitud'));
  assert.ok(window.localStorage.getItem(local.key));
  await unmount(); await mount(RequestSubmissionWizard);
  await click(button('Radicar solicitud'));
  assert.equal(calls, 2);
  assert.equal(window.localStorage.getItem(local.key), null);
  assert.match(document.body.textContent, /Radicado 2026-099/);
});

test('review drafts remain separate between requests and survive unmount with both observation and concept', async () => {
  setup('committee_member');
  useRequestStore.setState({ requests: [app, { ...app, id: 'app-b', filing_number: 'Radicado 2026-002' }],
    assignments: [{ id: 'asg-a', application_id: 'app-a', reviewer_id: user.id, is_active: true }, { id: 'asg-b', application_id: 'app-b', reviewer_id: user.id, is_active: true }] });
  await mount(RevisionesPage);
  const reviewA = () => document.querySelector('[aria-label="Revisión técnica de Radicado 2026-001"]');
  await change(reviewA().querySelector('textarea[rows="2"]'), 'Observación de A');
  await change(reviewA().querySelector('textarea[rows="3"]'), 'Concepto de A');
  await click(document.querySelector('[aria-label="Abrir o cerrar revisión de Radicado 2026-002"]'));
  const reviewB = document.querySelector('[aria-label="Revisión técnica de Radicado 2026-002"]');
  assert.equal(reviewB.querySelector('textarea[rows="3"]').value, '');
  await change(reviewB.querySelector('textarea[rows="3"]'), 'Concepto de B');
  await unmount(); await mount(RevisionesPage);
  assert.equal(reviewA().querySelector('textarea[rows="2"]').value, 'Observación de A');
  assert.equal(reviewA().querySelector('textarea[rows="3"]').value, 'Concepto de A');
  await click(document.querySelector('[aria-label="Abrir o cerrar revisión de Radicado 2026-002"]'));
  assert.equal(document.querySelector('[aria-label="Revisión técnica de Radicado 2026-002"] textarea[rows="3"]').value, 'Concepto de B');
});

test('document changes never silently reuse an old concept; recovery warns that it needs review', async () => {
  setup('committee_member'); await mount(RevisionesPage);
  await change(document.querySelector('textarea[rows="3"]'), 'Concepto sobre documentos anteriores');
  await pagehide();
  await act(async () => useRequestStore.setState({ documents: [{ id: 'new-doc', application_id: app.id, requirement_id: 'req',
    file_name: 'nuevo.pdf', file_size_bytes: 10, file_hash_sha256: 'new-hash', uploaded_at: '2026-11-13T12:00:00Z', validation_status: 'VALIDO' }] }));
  assert.equal(document.querySelector('textarea[rows="3"]').value, '');
  await click(button('Recuperar versión guardada'));
  await click(button('Recuperar borrador', document.querySelector('dialog[data-open="true"]')));
  assert.equal(document.querySelector('textarea[rows="3"]').value, 'Concepto sobre documentos anteriores');
  assert.match(document.body.textContent, /Revise los documentos actuales/);
});

test('saving an observation clears only its submitted text and preserves the concept draft', async () => {
  setup('committee_member');
  useRequestStore.setState({ addTechnicalObservation: async () => ({ success: true }) });
  await mount(RevisionesPage);
  await change(document.querySelector('textarea[rows="2"]'), 'Observación enviada');
  await change(document.querySelector('textarea[rows="3"]'), 'Concepto aún en preparación');
  await click(button('Registrar Observación'));
  await unmount(); await mount(RevisionesPage);
  assert.equal(document.querySelector('textarea[rows="2"]').value, '');
  assert.equal(document.querySelector('textarea[rows="3"]').value, 'Concepto aún en preparación');
});

test('editing an observation while its previous text is being saved never clears the newer draft', async () => {
  setup('committee_member');
  let finish;
  useRequestStore.setState({ addTechnicalObservation: () => new Promise((resolve) => { finish = resolve; }) });
  await mount(RevisionesPage);
  await change(document.querySelector('textarea[rows="2"]'), 'Observación que se está enviando');
  await click(button('Registrar Observación'));
  await change(document.querySelector('textarea[rows="2"]'), 'Otra observación todavía en preparación');
  await change(document.querySelector('select[id^="observation-category"]'), 'ACLARACION');
  await act(async () => finish({ success: true }));
  await unmount(); await mount(RevisionesPage);
  assert.equal(document.querySelector('textarea[rows="2"]').value, 'Otra observación todavía en preparación');
  assert.equal(document.querySelector('select[id^="observation-category"]').value, 'ACLARACION');
});

test('discarding a draft requires confirmation and cancellation preserves the form', async () => {
  setup(); await mount(RequestSubmissionWizard); await click(button('Continuar'));
  await change(document.querySelector('input[placeholder^="Ej: Evaluación"]'), 'Conservar hasta confirmar');
  await click(button('Descartar borrador'));
  await click(button('Volver a revisar', document.querySelector('dialog[data-open="true"]')));
  assert.equal(document.querySelector('input[placeholder^="Ej: Evaluación"]').value, 'Conservar hasta confirmar');
  await click(button('Descartar borrador'));
  await click(button('Descartar borrador', document.querySelector('dialog[data-open="true"]')));
  await pagehide();
  assert.equal(draftKeys().length, 0);
  assert.ok(button('Continuar'));
});

test('failed concepts remain recoverable and confirmed concepts remove their saved draft', async () => {
  setup('committee_member');
  let attempts = 0;
  useRequestStore.setState({ submitReviewerConcept: async () => ++attempts === 1
    ? { success: false, error: 'Error al confirmar concepto' } : { success: true } });
  await mount(RevisionesPage);
  await change(document.querySelector('textarea[rows="3"]'), 'Fundamentación que no debe perderse');
  await click(button('Emitir y Firmar Concepto Técnico'));
  await click(button('Emitir concepto técnico', document.querySelector('dialog[data-open="true"]')));
  await unmount(); await mount(RevisionesPage);
  assert.equal(document.querySelector('textarea[rows="3"]').value, 'Fundamentación que no debe perderse');
  await click(button('Emitir y Firmar Concepto Técnico'));
  await click(button('Emitir concepto técnico', document.querySelector('dialog[data-open="true"]')));
  assert.equal(attempts, 2);
  assert.equal(draftKeys().length, 0);
});

test('blocked browser storage reports the error and warns before closing unsaved work', async () => {
  setup(); await mount(RequestSubmissionWizard); await click(button('Continuar'));
  const prototype = Object.getPrototypeOf(window.localStorage);
  const original = prototype.setItem;
  prototype.setItem = function (key, value) { if (key.startsWith('seed:draft:v1:')) throw new Error('Quota exceeded'); return original.call(this, key, value); };
  try {
    await change(document.querySelector('input[placeholder^="Ej: Evaluación"]'), 'Texto sin perder');
    await pagehide();
    assert.match(document.body.textContent, /No se pudo guardar el borrador/);
    const unload = new dom.window.Event('beforeunload', { cancelable: true });
    await act(async () => window.dispatchEvent(unload));
    assert.equal(unload.defaultPrevented, true);
    assert.equal(document.querySelector('input[placeholder^="Ej: Evaluación"]').value, 'Texto sin perder');
  } finally { prototype.setItem = original; }
});


test('request step navigation focuses the heading and validation focuses the first invalid field', async () => {
  setup();
  await mount(RequestSubmissionWizard);
  const type = document.querySelector('input[name="request-type"]');
  assert.equal(type.type, 'radio');
  assert.equal(type.getAttribute('aria-label'), 'Trámite de prueba');
  await click(button('Continuar'));
  assert.equal(document.activeElement, document.querySelector('.request-wizard-content h2'));
  await click(button('Continuar'));
  const title = document.getElementById('request-title');
  const abstract = document.getElementById('request-abstract');
  assert.equal(document.activeElement, title);
  assert.equal(title.getAttribute('aria-invalid'), 'true');
  assert.equal(abstract.getAttribute('aria-invalid'), 'true');
  assert.ok(document.getElementById(title.getAttribute('aria-describedby')));
  assert.ok(document.querySelector('label[for="request-title"]'));
  await change(title, 'Solicitud de investigación válida');
  await change(abstract, 'Justificación válida de la solicitud para la revisión institucional.');
  await click(button('Continuar'));
  assert.equal(document.activeElement, document.querySelector('.request-wizard-content h2'));
  assert.match(document.activeElement.textContent, /Carga de Archivos/);
  assert.equal(document.querySelector('progress').value, 3);
});
