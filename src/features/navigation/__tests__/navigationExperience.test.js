import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node, history: dom.window.history, MutationObserver: dom.window.MutationObserver,
  ResizeObserver: class { observe() {} disconnect() {} }, IS_REACT_ACT_ENVIRONMENT: true });
window.scrollTo = () => {};
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { AppLayout } = await import('../../../layouts/AppLayout.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { notificationKeys } = await import('../../notifications/useNotifications.ts');
const initialSession = useSessionStore.getState();
const user = { id: 'navigation-user', fullName: 'Investigadora de prueba', email: 'qa@example.invalid',
  activeRole: 'researcher', roles: ['researcher', 'secretary'] };
let root;
let cache;

async function mount() {
  useSessionStore.setState({ user });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  cache.setQueryData(notificationKeys.user(user.id), []);
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(createElement(QueryClientProvider, { client: cache },
    createElement(MemoryRouter, { initialEntries: ['/mis-solicitudes'] }, createElement(Routes, null,
      createElement(Route, { element: createElement(AppLayout) },
        createElement(Route, { path: '*', element: createElement('input', { 'aria-label': 'Contenido de prueba' }) })))))); });
}
function trigger(label) { return document.querySelector(`button[aria-label="${label}"]`); }
async function click(element) {
  assert.ok(element);
  await act(async () => { element.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true })); element.click(); });
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; cache?.clear(); document.body.replaceChildren(); window.localStorage.clear();
  useSessionStore.setState(initialSession, true);
});
after(() => dom.window.close());

test('profile and role popovers close on outside pointer interaction and stay open inside', async () => {
  await mount();
  for (const [label, region] of [['Cambiar rol activo', 'Roles disponibles'], ['Abrir menú de perfil', 'Opciones de perfil']]) {
    await click(trigger(label));
    const menu = document.querySelector(`[aria-label="${region}"]`);
    assert.ok(menu);
    await click(menu);
    assert.equal(trigger(label).getAttribute('aria-expanded'), 'true');
    await click(document.querySelector('input[aria-label="Contenido de prueba"]'));
    assert.equal(trigger(label).getAttribute('aria-expanded'), 'false');
    assert.equal(document.querySelector(`[aria-label="${region}"]`), null);
  }
});

test('only one header popover opens at a time and Escape returns focus to its trigger', async () => {
  await mount();
  await click(trigger('Cambiar rol activo'));
  await click(trigger('Abrir menú de perfil'));
  assert.equal(trigger('Cambiar rol activo').getAttribute('aria-expanded'), 'false');
  const profile = trigger('Abrir menú de perfil');
  await act(async () => { document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(profile.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, profile);
});

test('tabbing out and changing routes close the header popovers', async () => {
  await mount();
  await click(trigger('Cambiar rol activo'));
  await act(async () => { document.querySelector('input').focus(); });
  assert.equal(trigger('Cambiar rol activo').getAttribute('aria-expanded'), 'false');
  await click(trigger('Abrir menú de perfil'));
  await click(document.querySelector('[aria-label="Opciones de perfil"] a[href="/perfil"]'));
  assert.equal(document.querySelector('[aria-label="Opciones de perfil"]'), null);
});

test('collapsing the sidebar keeps every navigation destination accessible and persists on remount', async () => {
  await mount();
  const nav = document.querySelector('nav[aria-label="Navegación del rol"]');
  const destinations = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));
  await click(trigger('Reducir menú lateral'));
  assert.ok(trigger('Ampliar menú lateral'));
  assert.deepEqual([...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')), destinations);
  for (const link of nav.querySelectorAll('a')) assert.equal(link.title, link.textContent);
  await act(async () => root.unmount()); root = null; cache.clear(); document.body.replaceChildren();
  await mount();
  assert.ok(trigger('Ampliar menú lateral'));
  await click(trigger('Ampliar menú lateral'));
  assert.ok(trigger('Reducir menú lateral'));
});

test('sidebar controls remain usable when browser storage is blocked', async () => {
  await mount();
  const original = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  try {
    await click(trigger('Reducir menú lateral'));
    assert.ok(trigger('Ampliar menú lateral'));
  } finally { dom.window.Storage.prototype.setItem = original; }
});
