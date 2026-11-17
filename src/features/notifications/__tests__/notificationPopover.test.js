import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'notification-popover-public-test-key';
// JSDOM has no cross-tab browser messaging; Node's BroadcastChannel would retain a MessagePort.
globalThis.BroadcastChannel = undefined;
const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { NotificationPopover } = await import('../NotificationPopover.tsx');
const { getSupabaseClient } = await import('../../../lib/supabase.ts');
const { notificationKeys } = await import('../useNotifications.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const initial = useSessionStore.getState();
const originalFetch = globalThis.fetch;
const owner = '80000000-0000-4000-8000-000000000001';
const user = { id: owner, fullName: 'Investigadora', email: 'test@example.invalid', roles: ['researcher'], activeRole: 'researcher' };
const notice = { id: '80000000-0000-4000-8000-000000000010', user_id: owner, type: 'CAMBIO_ESTADO', title: 'Solicitud actualizada', message: 'Consulte las novedades del expediente.', is_read: false, application_id: '80000000-0000-4000-8000-000000000020', session_id: null, target_tab: 'historial', created_at: '2026-11-17T12:00:00Z' };
let root, cache, writes, rows, failWrites;
function Probe() { const location = useLocation(); return createElement('output', { 'aria-label': 'Ruta actual' }, location.pathname + location.search); }
async function mount(items = [notice], mobile = false) {
  writes = 0; rows = items; failWrites = false;
  globalThis.fetch = async (_input, options = {}) => {
    if (options.method === 'PATCH') {
      writes++;
      if (failWrites) return Response.json({ message: 'database constraint details' }, { status: 503 });
      rows = rows.map((row) => ({ ...row, is_read: true }));
      return new Response(null, { status: 204 });
    }
    return Response.json(rows);
  };
  useSessionStore.setState({ user });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  cache.setQueryData(notificationKeys.user(owner), rows);
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(QueryClientProvider, { client: cache }, createElement(MemoryRouter, { initialEntries: ['/mis-solicitudes'] }, createElement(NotificationPopover, { mobile }), createElement(Probe), createElement('button', { 'aria-label': 'Fuera del panel' }, 'Fuera')))));
}
async function click(element) { assert.ok(element); await act(async () => { element.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true })); element.click(); }); }
function panel() { return document.querySelector('.notification-popover'); }
function trigger() { return document.querySelector('button[aria-label="Abrir notificaciones"]'); }
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; cache?.clear(); document.body.replaceChildren(); useSessionStore.setState(initial, true); globalThis.fetch = originalFetch; });
after(async () => { await getSupabaseClient()?.auth.stopAutoRefresh(); dom.window.close(); });

test('preview shows only five recent notices, leaves them unread and links to the full inbox', async () => {
  await mount(Array.from({ length: 7 }, (_, index) => ({ ...notice, id: `80000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`, title: `Aviso ${index}`, created_at: `2026-11-${String(index + 1).padStart(2, '0')}T12:00:00Z` })));
  assert.equal(panel().hidden, true);
  await click(trigger());
  assert.equal(panel().hidden, false);
  assert.equal(document.querySelectorAll('.notification-preview-list li').length, 5);
  assert.match(document.querySelector('.notification-preview-list li').textContent, /Aviso 6/);
  assert.equal(writes, 0);
  assert.match(panel().textContent, /7 sin leer/);
  await click(panel().querySelector('a'));
  assert.equal(document.querySelector('output').textContent, '/notificaciones');
  assert.equal(panel().hidden, true);
});

test('fallback dismisses outside and on Escape, restores trigger focus and works from mobile', async () => {
  await mount([], true);
  await click(trigger());
  assert.match(panel().textContent, /Aún no tienes notificaciones/);
  await act(async () => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(panel().hidden, true);
  assert.equal(document.activeElement, trigger());
  await click(trigger()); await click(document.querySelector('[aria-label="Fuera del panel"]'));
  assert.equal(panel().hidden, true);
});

test('opening a notice persists read state before navigating and failures keep the preview open', async () => {
  await mount(); await click(trigger()); failWrites = true;
  await click(panel().querySelector('.notification-preview-footer button'));
  assert.equal(document.querySelector('output').textContent, '/mis-solicitudes');
  assert.equal(panel().hidden, false);
  assert.match(panel().querySelector('[role="alert"]').textContent, /No se pudo guardar la lectura/);
  assert.equal(cache.getQueryData(notificationKeys.user(owner))[0].is_read, false);
  failWrites = false;
  await click(panel().querySelector('.notification-preview-footer button'));
  assert.equal(document.querySelector('output').textContent, `/solicitudes/${notice.application_id}?tab=historial`);
  assert.equal(panel().hidden, true);
  assert.equal(cache.getQueryData(notificationKeys.user(owner))[0].is_read, true);
});

test('changing account closes the preview and never displays the previous inbox', async () => {
  await mount(); await click(trigger());
  const other = '80000000-0000-4000-8000-000000000099';
  cache.setQueryData(notificationKeys.user(other), []);
  await act(async () => useSessionStore.setState({ user: { ...user, id: other } }));
  assert.equal(panel().hidden, true);
  assert.doesNotMatch(panel().textContent, /Solicitud actualizada/);
});
