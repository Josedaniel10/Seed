import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { CallsPage } = await import('../CallsPage.tsx');
const { CallManagersPanel } = await import('../CallManagersPanel.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useUserStore } = await import('../../users/userStore.ts');
const originalSession = useSessionStore.getState();
const users = useUserStore.getState().users;
const manager = { user_id: users[0].id, faculty: 'Ingeniería', designation: 'lider' };
const base = { id: 'draft', title: 'Borrador de prueba', description: 'Descripción completa de los requisitos.', faculty: 'Ingeniería',
  status: 'draft', type_ids: [], audience: 'all', max_amount: null,
  opens_at: new Date(Date.now() - 60000).toISOString(), closes_at: new Date(Date.now() + 86400000).toISOString() };
const calls = [base, { ...base, id: 'open', title: 'Convocatoria abierta', status: 'published' },
  { ...base, id: 'closed', title: 'Convocatoria cerrada', status: 'closed' },
  { ...base, id: 'expired', title: 'Convocatoria finalizada', status: 'published', closes_at: new Date(Date.now() - 1000).toISOString() }];
let root;
let cache;
async function mount(role = 'admin', route = '/convocatorias') {
  useSessionStore.setState({ user: { id: 'organization-user', roles: [role], activeRole: role } });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } } });
  cache.setQueryData(['funding-calls', 'organization-user'], calls);
  cache.setQueryData(['call-managers', 'organization-user'], [manager]);
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(QueryClientProvider, { client: cache },
    createElement(MemoryRouter, { initialEntries: [route] }, createElement(CallsPage)))));
}
async function click(element) { assert.ok(element); await act(async () => element.click()); }
function button(text, within = document) { return [...within.querySelectorAll('button')].find((element) => element.textContent.trim() === text); }
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  cache?.clear(); document.body.replaceChildren(); useSessionStore.setState(originalSession, true);
});
after(() => dom.window.close());

test('administrators navigate between separate calls and managers views', async () => {
  await mount();
  assert.equal(document.querySelector('table'), null);
  assert.equal(button('Asignar responsable'), undefined);
  await click(document.querySelector('a[href="/convocatorias?vista=responsables"]'));
  assert.ok(document.querySelector('table'));
  assert.equal(document.querySelectorAll('article').length, 0);
  assert.equal(button('Nueva convocatoria'), undefined);
  assert.equal(document.querySelector('form'), null);
  await click(button('Asignar responsable'));
  const modal = document.querySelector('dialog[data-open="true"]');
  assert.ok(modal.querySelector('form'));
  await click(modal.querySelector('[aria-label="Cerrar modal"]'));
  await click(document.querySelector('a[href="/convocatorias"]'));
  assert.equal(document.querySelector('table'), null);
  assert.equal(document.querySelectorAll('article').length, 4);
});

test('calls are grouped by lifecycle and each card opens its own details and status reason', async () => {
  await mount();
  assert.match(document.querySelector('[aria-label="En preparación"]').textContent, /Borrador de prueba/);
  const active = document.querySelector('[aria-label="Convocatorias vigentes"]');
  assert.match(active.textContent, /Convocatoria abierta/);
  assert.doesNotMatch(active.textContent, /finalizada/);
  assert.equal(document.querySelector('[aria-label="Historial"]').querySelectorAll('article').length, 2);
  assert.equal(document.querySelector('[name="reason"]'), null);
  await click(button('Ver requisitos y detalle', active));
  let modal = document.querySelector('dialog[data-open="true"]');
  assert.match(modal.textContent, /Convocatoria abierta/);
  await click(modal.querySelector('[aria-label="Cerrar modal"]'));
  await click(button('Cerrar recepción', active));
  modal = document.querySelector('dialog[data-open="true"]');
  assert.match(modal.textContent, /Convocatoria abierta/);
  assert.ok(modal.querySelector('[name="reason"]'));
  assert.equal(button('Revisar cambio', modal).disabled, true);
  await click(button('Volver', modal));
  await click(button('Cancelar convocatoria', document.querySelector('[aria-label="En preparación"]')));
  modal = document.querySelector('dialog[data-open="true"]');
  assert.match(modal.textContent, /Borrador de prueba/);
  assert.equal(modal.querySelector('[name="reason"]').value, '');
});

test('a direct managers URL never exposes manager administration to researchers', async () => {
  await mount('researcher', '/convocatorias?vista=responsables');
  assert.equal(document.querySelector('[aria-label="Secciones de convocatorias"]'), null);
  assert.equal(document.querySelector('table'), null);
  assert.equal(button('Asignar responsable'), undefined);
  assert.equal(document.querySelectorAll('article').length, 4);
});

test('manager assignment preserves failed selections for retry and removal requires confirmation', async () => {
  let attempts = 0;
  let saved;
  let removed;
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(CallManagersPanel, { managers: [manager], users, faculties: ['Ingeniería'],
    onAssign: async (input) => { attempts++; if (attempts === 1) throw new Error('Sin conexión'); saved = input; },
    onRemove: async (input) => { removed = input; } })));
  await click(button('Asignar responsable'));
  for (const [name, value] of [['user_id', users[0].id], ['faculty', 'Ingeniería']]) {
    await act(async () => { const select = document.querySelector(`[name="${name}"]`); select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  }
  await click(button('Guardar responsable'));
  assert.match(document.querySelector('[role="alert"]').textContent, /Sin conexión/);
  assert.equal(document.querySelector('[name="faculty"]').value, 'Ingeniería');
  await click(button('Guardar responsable'));
  assert.deepEqual(saved, { ...manager, designation: 'decano' });
  assert.equal(document.querySelector('dialog[data-open="true"]'), null);
  await click(document.querySelector('button[aria-label^="Retirar a"]'));
  assert.equal(removed, undefined);
  await click(button('Retirar responsable'));
  assert.deepEqual(removed, manager);
});
