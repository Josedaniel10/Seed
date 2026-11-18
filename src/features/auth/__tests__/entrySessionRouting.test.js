import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const { RutaPublica } = await import('../../../routes/RutaPublica.tsx');
const { AppRoutes } = await import('../../../routes/AppRoutes.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { ROLE_HOME_PATHS } = await import('../../../lib/permisos.ts');
const initial = useSessionStore.getState();
let root;

function LocationProbe() {
  return createElement('output', { 'data-path': true }, useLocation().pathname);
}
async function mount(path = '/login', actualRoutes = false) {
  const container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  const entry = createElement(RutaPublica, null, createElement('p', { 'data-auth-form': true }, 'Formulario de autenticación'));
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] },
    createElement(LocationProbe), actualRoutes ? createElement(AppRoutes) : createElement(Routes, null,
      createElement(Route, { path: '/login', element: entry }),
      createElement(Route, { path: '/registro', element: entry }),
      ...Object.entries(ROLE_HOME_PATHS).filter(([role]) => ['researcher', 'secretary', 'administrative', 'admin', 'committee_member', 'leader'].includes(role))
        .map(([role, home]) => createElement(Route, { key: role, path: home, element: createElement('p', null, 'Inicio del usuario') }))))));
}
beforeEach(() => useSessionStore.setState({ ...initial, user: null, isAuthenticated: false, isLoading: true }, true));
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; document.body.replaceChildren(); window.localStorage.clear(); useSessionStore.setState(initial, true);
});
after(() => dom.window.close());

test('root stays on its URL while the saved session is being verified', async () => {
  await mount('/', true);
  assert.equal(document.querySelector('[data-path]').textContent, '/');
  assert.ok(document.querySelector('[aria-busy=true]'));
  assert.equal(document.querySelector('input[type=password]'), null);
});

for (const role of ['researcher', 'secretary', 'administrative', 'admin', 'committee_member', 'leader']) {
  test(`a restored ${role} session leaves login automatically`, async () => {
    await mount();
    assert.equal(document.querySelector('[data-auth-form]'), null);
    assert.equal(document.querySelector('[data-path]').textContent, '/login');
    await act(async () => useSessionStore.setState({ user: { id: 'verified-id', email: 'test@example.invalid',
      fullName: 'Usuario verificado', roles: [role], activeRole: role }, isAuthenticated: true, isLoading: false }));
    assert.equal(document.querySelector('[data-path]').textContent, ROLE_HOME_PATHS[role]);
    assert.equal(document.querySelector('[data-auth-form]'), null);
  });
}

test('stored user information never bypasses session validation', async () => {
  useSessionStore.setState({ user: { id: 'unverified-id', roles: ['admin'], activeRole: 'admin' }, isAuthenticated: true });
  await mount();
  assert.equal(document.querySelector('[data-path]').textContent, '/login');
  assert.equal(document.querySelector('[data-auth-form]'), null);
  await act(async () => useSessionStore.setState({ user: null, isAuthenticated: false, isLoading: false }));
  assert.ok(document.querySelector('[data-auth-form]'));
});

test('registration also redirects an already verified session to its home', async () => {
  useSessionStore.setState({ user: { id: 'verified-id', roles: ['admin'], activeRole: 'admin' }, isAuthenticated: true, isLoading: false });
  await mount('/registro');
  assert.equal(document.querySelector('[data-path]').textContent, '/admin/usuarios');
});

test('without a valid session the login form remains available', async () => {
  useSessionStore.setState({ isLoading: false });
  await mount();
  assert.equal(document.querySelector('[data-path]').textContent, '/login');
  assert.ok(document.querySelector('[data-auth-form]'));
});

test('manual sign-in loading never unmounts the form or loses its error state', async () => {
  useSessionStore.setState({ isLoading: false });
  await mount();
  const form = document.querySelector('[data-auth-form]');
  await act(async () => useSessionStore.setState({ isLoading: true }));
  assert.equal(document.querySelector('[data-auth-form]'), form);
  await act(async () => useSessionStore.setState({ isLoading: false }));
  assert.equal(document.querySelector('[data-auth-form]'), form);
  assert.equal(document.querySelector('[data-path]').textContent, '/login');
});
