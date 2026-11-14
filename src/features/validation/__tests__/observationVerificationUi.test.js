import assert from 'node:assert/strict';
import { test, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { ObservationThread } = await import('../ObservationThread.tsx');
const { NextActionCard } = await import('../../requests/NextActionCard.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const stores = [useSessionStore, useRequestStore];
const snapshots = stores.map(s => s.getState());
const app = { id: 'app', applicant_id: 'owner', current_status: 'EN_REVISION', application_type_id: 'type' };
const observation = { id: 'obs', application_id: 'app', category: 'AJUSTE_OBLIGATORIO', content: 'Corregir método', is_resolved: false, applicant_response: null };
let root;

function setup(id, role, obs = observation) {
  useSessionStore.setState({ user: { id, fullName: id, activeRole: role, roles: [role] } });
  useRequestStore.setState({ requests: [app], observations: [obs], documents: [], auditHistory: [],
    assignments: [{ id: 'assignment', application_id: 'app', reviewer_id: 'reviewer', is_active: true, deadline_date: '2026-11-20' }] });
}
async function mount(element) {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(MemoryRouter, null, element)));
}
function button(label, scope = document) {
  return [...scope.querySelectorAll('button')].find(b => b.textContent.trim() === label);
}
async function click(element) { assert.ok(element); await act(async () => element.click()); }
async function write(value) {
  const textarea = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.replaceChildren();
  stores.forEach((s, i) => s.setState(snapshots[i], true));
});
after(() => dom.window.close());

test('researcher confirms a response without access to evaluator acceptance', async () => {
  setup('owner', 'researcher');
  let saves = 0;
  useRequestStore.setState({ respondToObservation: async () => { saves++; return { success: true }; } });
  await mount(createElement(ObservationThread, { observation, applicantId: 'owner' }));
  assert.equal(button('Aceptar ajuste'), undefined);
  await write('Método corregido, sección 4');
  await click(button('Enviar respuesta'));
  assert.equal(saves, 0);
  assert.match(document.querySelector('dialog').textContent, /pendiente de verificación/);
  await click(button('Enviar respuesta', document.querySelector('dialog')));
  assert.equal(saves, 1);
});

test('evaluator must justify verification; errors keep the response and confirmation available', async () => {
  const answered = { ...observation, applicant_response: 'Corregido' };
  setup('reviewer', 'committee_member', answered);
  let saved;
  useRequestStore.setState({ verifyObservation: async (...args) => { saved = args; return { success: false, error: 'La respuesta cambió' }; } });
  await mount(createElement(ObservationThread, { observation: answered, applicantId: 'owner' }));
  assert.ok(button('Aceptar ajuste').disabled);
  assert.equal(button('Enviar respuesta'), undefined);
  await write('Evidencia comprobada');
  await click(button('Aceptar ajuste'));
  assert.equal(saved, undefined);
  await click(button('Aceptar ajuste', document.querySelector('dialog')));
  assert.deepEqual(saved, ['obs', true, 'Evidencia comprobada', 'Corregido']);
  assert.equal(document.querySelector('textarea').value, 'Evidencia comprobada');
  assert.match(document.querySelector('dialog').textContent, /La respuesta cambió/);
});

test('next action links are contextual and viewers cannot open reviewer operations', async () => {
  setup('owner', 'researcher', { ...observation, applicant_response: 'Corregido' });
  await mount(createElement(NextActionCard, { request: app }));
  assert.match(document.body.textContent, /Verificar respuestas/);
  assert.match(document.body.textContent, /2026-11-20/);
  assert.equal(document.querySelector('a').getAttribute('href'), '/solicitudes/app?tab=historial');
  await act(async () => useSessionStore.setState({ user: { id: 'reviewer', activeRole: 'committee_member' } }));
  assert.equal(document.querySelector('a').getAttribute('href'), '/revisiones');
});

test('unassigned reviewers see the observation without verification controls', async () => {
  setup('other', 'committee_member');
  await mount(createElement(ObservationThread, { observation: { ...observation, applicant_response: 'Respuesta' }, applicantId: 'owner' }));
  assert.equal(document.querySelector('textarea'), null);
  assert.equal(button('Aceptar ajuste'), undefined);
});
