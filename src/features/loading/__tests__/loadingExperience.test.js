import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const callTestClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { MisSolicitudesPage } = await import('../../../pages/investigador/MisSolicitudesPage.tsx');
const { SesionesPage } = await import('../../../pages/comite/SesionesPage.tsx');
const { RequestSubmissionWizard } = await import('../../requests/RequestSubmissionWizard.tsx');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useCommitteeSessionsStore } = await import('../../sessions/committeeSessionsStore.ts');
const { useMinutesStore } = await import('../../minutes/minutesStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');

const stores = [useRequestStore, useSessionStore, useCommitteeSessionsStore, useMinutesStore, useUserStore, useCatalogStore];
const snapshots = stores.map((store) => store.getState());
const noLoad = async () => ({ success: true });
let root;
const owner = { id: 'loading-owner', fullName: 'Investigadora', email: 'test@example.invalid', roles: ['researcher'], activeRole: 'researcher' };
const application = { ...useRequestStore.getState().requests[0], id: 'loading-request', applicant_id: owner.id,
  title: 'Investigación cargada desde el servicio', filing_number: 'RAD-2026-123', current_status: 'RADICADA' };

async function mount(Component) {
  for (const store of stores) {
    if ('loadFromSupabase' in store.getState()) store.setState({ loadFromSupabase: noLoad });
  }
  useSessionStore.setState({ user: owner });
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(QueryClientProvider, { client: callTestClient }, createElement(MemoryRouter, null, createElement(Component)))); });
}

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.replaceChildren();
  window.localStorage.clear();
  stores.forEach((store, index) => store.setState(snapshots[index], true));
});
after(() => dom.window.close());

test('first load masks seed data and replaces rows without remounting headers or filters', async () => {
  useRequestStore.setState({ requests: [application], isLoading: true, isInitialized: false });
  await mount(MisSolicitudesPage);
  const table = document.querySelector('table');
  const header = table.querySelector('thead');
  const columns = table.querySelector('colgroup');
  const input = document.querySelector('input[aria-label="Buscar solicitudes"]');
  input.focus();
  assert.ok(table.querySelector('.skeleton'));
  assert.doesNotMatch(document.body.textContent, /Investigación cargada|No se encontraron solicitudes/);
  assert.match(document.body.textContent, /Cargando sus solicitudes/);

  await act(async () => { useRequestStore.setState({ isLoading: false, isInitialized: true }); });
  assert.equal(document.querySelector('table'), table);
  assert.equal(table.querySelector('thead'), header);
  assert.equal(table.querySelector('colgroup'), columns);
  assert.equal(document.activeElement, input);
  assert.equal(document.querySelector('.skeleton'), null);
  assert.match(document.body.textContent, /Investigación cargada desde el servicio/);
});

test('background refresh retains visible data and interactive rows', async () => {
  useRequestStore.setState({ requests: [application], isLoading: false, isInitialized: true });
  await mount(MisSolicitudesPage);
  const row = document.querySelector('tbody tr');
  await act(async () => { useRequestStore.setState({ isLoading: true }); });
  assert.equal(document.querySelector('tbody tr'), row);
  assert.equal(document.querySelector('.skeleton'), null);
  assert.match(document.body.textContent, /Investigación cargada desde el servicio/);
});

test('a completed empty response shows the empty state after the skeleton', async () => {
  useRequestStore.setState({ requests: [], isLoading: true, isInitialized: false });
  await mount(MisSolicitudesPage);
  assert.doesNotMatch(document.body.textContent, /No se encontraron solicitudes/);
  await act(async () => { useRequestStore.setState({ isLoading: false, isInitialized: true }); });
  assert.equal(document.querySelector('.skeleton'), null);
  assert.match(document.body.textContent, /No se encontraron solicitudes/);
});

test('sessions reserve summary cards and keep loaded cards during refresh', async () => {
  useCommitteeSessionsStore.setState({ sessions: [], isLoading: true, error: null });
  await mount(SesionesPage);
  assert.match(document.body.textContent, /Cargando sesiones/);
  assert.equal(document.querySelectorAll('.session-summary').length, 3);
  assert.doesNotMatch(document.body.textContent, /No hay sesiones programadas/);
  const session = { id: 'session', session_number: 'Sesión de prueba', session_type: 'ORDINARIA',
    scheduled_at: '2026-11-13T14:00:00Z', location_or_url: 'Sala', quorum_required: 2 };
  await act(async () => { useCommitteeSessionsStore.setState({ sessions: [session], isLoading: false }); });
  const card = document.querySelector('.session-summary');
  await act(async () => { useCommitteeSessionsStore.setState({ isLoading: true }); });
  assert.equal(document.querySelector('.session-summary'), card);
  assert.equal(document.querySelector('.skeleton'), null);
});

test('filing keeps its stepper and prevents advancing while the initial catalog is pending', async () => {
  useCatalogStore.setState({ isLoading: true, isInitialized: false });
  await mount(RequestSubmissionWizard);
  assert.match(document.body.textContent, /Cargando tipos de trámite y requisitos/);
  assert.match(document.body.textContent, /Datos Generales/);
  const next = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Continuar al Paso'));
  assert.ok(next.disabled);
  await act(async () => { useCatalogStore.setState({ isLoading: false, isInitialized: true }); });
  assert.equal(document.querySelector('.skeleton'), null);
  assert.equal([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Continuar al Paso')), next);
  assert.equal(next.disabled, false);
});
