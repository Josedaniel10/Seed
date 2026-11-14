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
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { useDecisionConfirmation } = await import('../../../hooks/useDecisionConfirmation.tsx');
const { RevisionesPage } = await import('../../../pages/gestion/RevisionesPage.tsx');
const { AsignacionesPage } = await import('../../../pages/gestion/AsignacionesPage.tsx');
const { ValidacionPage } = await import('../../../pages/gestion/ValidacionPage.tsx');
const { DetalleSesionPage } = await import('../../../pages/comite/DetalleSesionPage.tsx');
const { ActasPage } = await import('../../../pages/comite/ActasPage.tsx');
const { PanelSeguimientoPage } = await import('../../../pages/gestion/PanelSeguimientoPage.tsx');
const { MinuteWorkspace } = await import('../../minutes/MinuteWorkspace.tsx');
const { createMinuteContent, serializeMinuteContent } = await import('../../minutes/minuteContent.ts');
const { executiveMinute } = await import('../../minutes/__tests__/minutePdfFixtures.js');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { useMinutesStore } = await import('../../minutes/minutesStore.ts');
const { useCommitteeSessionsStore } = await import('../../sessions/committeeSessionsStore.ts');

const stores = [useSessionStore, useRequestStore, useUserStore, useCatalogStore, useMinutesStore, useCommitteeSessionsStore];
const snapshots = stores.map((store) => store.getState());
const noLoad = async () => ({ success: true });
const user = { id: 'reviewer', fullName: 'Revisor de prueba', email: 'test@example.invalid', activeRole: 'committee_member', roles: ['committee_member'] };
const application = { id: 'app', filing_number: 'Radicado 2026-123', application_type_id: 'type', request_type_id: 'type',
  title: 'Expediente de prueba', abstract: 'Resumen', applicant_id: 'owner', research_group_id: null,
  current_status: 'EN_REVISION', created_at: '2026-11-13T12:00:00Z' };
let root;
async function mount(element, path = '/') {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(MemoryRouter, { initialEntries: [path] }, element)); });
}
function button(label, scope = document) {
  const found = [...scope.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
  assert.ok(found, `Missing button: ${label}`);
  return found;
}
async function click(element) { await act(async () => { element.click(); }); }
async function change(element, value) {
  assert.ok(element, 'Missing form control');
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function setup(role = 'committee_member') {
  useSessionStore.setState({ user: { ...user, activeRole: role, roles: [role] } });
  useRequestStore.setState({ requests: [application], documents: [], observations: [], auditHistory: [],
    assignments: [{ id: 'assignment', application_id: 'app', reviewer_id: user.id, is_active: true }], loadFromSupabase: noLoad });
  useUserStore.setState({ loadFromSupabase: noLoad });
  useMinutesStore.setState({ loadFromSupabase: noLoad });
  useCommitteeSessionsStore.setState({ loadFromSupabase: noLoad, error: null, isLoading: false, isSaving: false });
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.replaceChildren();
  stores.forEach((store, index) => store.setState(snapshots[index], true));
});
after(() => dom.window.close());

test('dialog retains failed decisions, prevents duplicate clicks and ignores close while saving', async () => {
  let writes = 0;
  let finish;
  function Harness() {
    const { requestDecision, decisionDialog } = useDecisionConfirmation('user:request');
    return createElement('div', null, createElement('button', { onClick: () => requestDecision({
      title: 'Confirmar prueba', target: 'Radicado 2026-123', consequence: 'Se registrará la decisión.', confirmLabel: 'Confirmar prueba',
    }, () => { writes++; return new Promise((resolve, reject) => { finish = writes === 1 ? reject : resolve; }); }) }, 'Abrir'), decisionDialog);
  }
  await mount(createElement(Harness));
  await click(button('Abrir'));
  assert.equal(writes, 0);
  await click(button('Confirmar prueba'));
  await click(button('Guardando…'));
  const dialog = document.querySelector('dialog[open]');
  await act(async () => { dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })); });
  assert.equal(writes, 1);
  assert.ok(document.querySelector('dialog[open]'));
  await act(async () => { finish(new Error('Error temporal de red')); });
  assert.match(document.querySelector('[role="alert"]').textContent, /Error temporal/);
  await click(button('Confirmar prueba'));
  await act(async () => { finish(); });
  assert.equal(writes, 2);
  assert.equal(document.querySelector('dialog')?.getAttribute('data-open'), 'false');
});

test('technical concept is submitted only after reviewing the justification and confirming', async () => {
  setup();
  let calls = 0;
  useRequestStore.setState({ submitReviewerConcept: async (...args) => {
    calls++; assert.equal(args[0], 'app'); assert.equal(args[4], 'Justificación revisada'); return { success: true };
  } });
  await mount(createElement(RevisionesPage));
  await change(document.querySelector('textarea[rows="3"]'), 'Justificación revisada');
  await click(button('Emitir y Firmar Concepto Técnico'));
  assert.equal(calls, 0);
  assert.match(document.querySelector('dialog').textContent, /Justificación revisada/);
  await click(button('Volver a revisar'));
  assert.equal(calls, 0);
  assert.equal(document.querySelector('textarea[rows="3"]').value, 'Justificación revisada');
  await click(button('Emitir y Firmar Concepto Técnico'));
  await click(button('Emitir concepto técnico', document.querySelector('dialog[data-open="true"]')));
  assert.equal(calls, 1);
});

test('reviewer assignment shows its target and does not write when cancelled', async () => {
  setup('secretary');
  let calls = 0;
  useRequestStore.setState({ assignments: [], assignReviewer: async () => { calls++; return { success: true }; } });
  useUserStore.setState({ users: [{ id: 'reviewer', role: 'committee_member', full_name: 'Evaluador elegido', is_active: true, research_group_id: null }] });
  await mount(createElement(AsignacionesPage));
  const select = [...document.querySelectorAll('select')].find((item) => item.textContent.includes('Seleccione evaluador'));
  await change(select, 'reviewer');
  await click(button('Asignar'));
  assert.equal(calls, 0);
  assert.match(document.querySelector('dialog').textContent, /Evaluador elegido/);
  await click(button('Asignar evaluador'));
  assert.equal(calls, 1);
});

test('documentary completion waits for confirmation and preserves a rejected save for retry', async () => {
  setup('administrative');
  let calls = 0;
  useRequestStore.setState({ requests: [{ ...application, current_status: 'RADICADA' }],
    finalizeAdministrativeValidation: async () => { calls++; return { success: false, error: 'No se pudo cerrar la validación' }; } });
  useCatalogStore.setState({ requirements: [] });
  await mount(createElement(ValidacionPage));
  await click(button('Finalizar Validación Documental'));
  assert.equal(calls, 0);
  await click(button('Finalizar validación'));
  assert.equal(calls, 1);
  assert.match(document.querySelector('dialog[data-open="true"]').textContent, /No se pudo cerrar/);
});

test('session agenda close is deferred until the secretary confirms', async () => {
  setup('secretary');
  let calls = 0;
  const session = { id: 'session', session_number: 'Sesión de prueba', session_type: 'ORDINARIA', scheduled_at: '2026-11-13T12:00:00Z',
    location_or_url: 'Sala', quorum_required: 1, is_agenda_closed: false, is_completed: false };
  useCommitteeSessionsStore.setState({ sessions: [session], agendaItems: [{ id: 'item', session_id: 'session', application_id: 'app', agenda_order: 1 }],
    decisions: [], nonDeliberations: [], attendances: [], closeAgendaAndSummon: async () => { calls++; return { success: true }; } });
  await mount(createElement(Routes, null, createElement(Route, { path: '/sesiones/:id', element: createElement(DetalleSesionPage) })), '/sesiones/session');
  await click(button('Cerrar agenda'));
  assert.equal(calls, 0);
  assert.match(document.querySelector('dialog[data-open="true"]').textContent, /Sesión de prueba/);
  await click(button('Cerrar agenda', document.querySelector('dialog[data-open="true"]')));
  assert.equal(calls, 1);
});

test('minute approval requires explicit confirmation and describes the editing lock', async () => {
  setup('secretary');
  let calls = 0;
  const minute = { ...executiveMinute(), is_approved: false, approved_at: null };
  const content = createMinuteContent(minute);
  const editorial = { ...content.editorial, signatories: [{ name: 'Ana', role: 'Presidencia' }, { name: 'Luis', role: 'Secretaría' }], commitments: [] };
  minute.draft_content = serializeMinuteContent(content, editorial);
  useMinutesStore.setState({ minutes: [minute], approveMinutes: async () => { calls++; return { success: true }; }, isSaving: false });
  await mount(createElement(MinuteWorkspace, { minuteId: minute.id, canManage: true }));
  await click(button('Aprobar acta'));
  assert.equal(calls, 0);
  assert.match(document.querySelector('dialog[data-open="true"]').textContent, /bloqueado para edición/);
  await click(button('Aprobar y bloquear acta'));
  assert.equal(calls, 1);
});

test('rejecting a document retains its reason until the rejection is confirmed', async () => {
  setup('administrative');
  let calls = 0;
  useCatalogStore.setState({ requirements: [{ id: 'req', application_type_id: 'type', name: 'Propuesta', is_mandatory: true, is_subsanable: true }] });
  useRequestStore.setState({ requests: [{ ...application, current_status: 'RADICADA' }],
    documents: [{ id: 'doc', application_id: 'app', requirement_id: 'req', file_name: 'propuesta.pdf',
      file_size_bytes: 100, file_hash_sha256: 'hash', uploaded_at: '2026-11-13T12:00:00Z', validation_status: 'PENDIENTE' }],
    validateRequirementDocument: async (...args) => { calls++; assert.equal(args[3], 'Falta firma'); return { success: true }; } });
  await mount(createElement(ValidacionPage));
  await click(button('Rechazar'));
  await change(document.querySelector('textarea[rows="4"]'), 'Falta firma');
  await click(button('Confirmar Rechazo Documental'));
  assert.equal(calls, 0);
  const dialogs = document.querySelectorAll('dialog[data-open="true"]');
  assert.equal(dialogs.length, 2);
  const confirmation = [...dialogs].find((dialog) => dialog.textContent.includes('Volver a revisar'));
  assert.match(confirmation.textContent, /Falta firma/);
  await click(button('Rechazar documento', confirmation));
  assert.equal(calls, 1);
});

test('discarding minute edits requires confirmation; cancellation preserves the edited form', async () => {
  setup('secretary');
  const minute = { ...executiveMinute(), is_approved: false, approved_at: null };
  const content = createMinuteContent(minute);
  minute.draft_content = serializeMinuteContent(content, content.editorial);
  useMinutesStore.setState({ minutes: [minute], isSaving: false, error: null });
  await mount(createElement(ActasPage));
  await click(button('Ver acta'));
  await change(document.querySelector('textarea[name="observations"]'), 'Cambios pendientes');
  await click(document.querySelector('[aria-label="Cerrar acta"]'));
  const confirmation = [...document.querySelectorAll('dialog[data-open="true"]')].find((dialog) => dialog.textContent.includes('Descartar cambios y cerrar'));
  assert.ok(confirmation);
  await click(button('Volver a revisar', confirmation));
  assert.equal(document.querySelector('textarea[name="observations"]').value, 'Cambios pendientes');
  await click(document.querySelector('[aria-label="Cerrar acta"]'));
  await click(button('Descartar cambios y cerrar'));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)); });
  assert.equal(Boolean(document.querySelector('textarea[name="observations"]')), false);
});

test('Kanban transition uses the shared dialog and retains justification after a server error', async () => {
  setup('administrative');
  let calls = 0;
  useRequestStore.setState({ requests: [{ ...application, current_status: 'RADICADA' }],
    transitionApplicationStatus: async () => { calls++; return { success: false, error: 'Transición rechazada por el servidor' }; } });
  await mount(createElement(PanelSeguimientoPage));
  const card = document.querySelector('[draggable="true"]');
  assert.ok(card);
  const event = new dom.window.Event('dragstart', { bubbles: true });
  Object.defineProperty(event, 'dataTransfer', { value: { setData() {} } });
  await act(async () => card.dispatchEvent(event));
  const target = [...document.querySelectorAll('div')].find((element) => element.classList.contains('min-h-[500px]') && element.textContent.includes('Pendiente por documentos'));
  await act(async () => target.dispatchEvent(new dom.window.Event('drop', { bubbles: true })));
  await change(document.querySelector('dialog[data-open="true"] textarea'), 'Adjuntar soporte corregido');
  assert.equal(calls, 0);
  await click(button('Confirmar transición'));
  assert.equal(calls, 1);
  assert.match(document.querySelector('dialog[data-open="true"]').textContent, /Transición rechazada/);
  assert.equal(document.querySelector('dialog[data-open="true"] textarea').value, 'Adjuntar soporte corregido');
});
