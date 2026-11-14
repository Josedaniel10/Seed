import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'session-revalidation-public-test-key';
const originalFetch = globalThis.fetch;
let response;
globalThis.fetch = (...args) => response(...args);
const { act, createElement, useEffect, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { AuthRetryableFetchError } = await import('@supabase/supabase-js');
const { getSupabaseClient } = await import('../../../lib/supabase.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { RutaProtegida } = await import('../../../routes/RutaProtegida.tsx');
const { SessionSyncNotice } = await import('../SessionSyncNotice.tsx');
const { RequestSubmissionWizard } = await import('../../requests/RequestSubmissionWizard.tsx');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { useGroupsStore } = await import('../../groups/groupsStore.ts');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const client = getSupabaseClient();
const methods = { getSession: client.auth.getSession, onAuthStateChange: client.auth.onAuthStateChange, signOut: client.auth.signOut };
const initial = useSessionStore.getState();
const otherStores = [useCatalogStore, useGroupsStore, useRequestStore];
const otherInitial = otherStores.map((store) => store.getState());
const userId = '1622d665-8f0a-4fef-ac40-f228999fd001';
const anotherId = '1622d665-8f0a-4fef-ac40-f228999fd002';
const user = { id: userId, email: 'session@example.invalid', fullName: 'Usuario de prueba',
  roles: ['researcher', 'committee_member'], activeRole: 'committee_member' };
let authSession;
let callback;
let unsubscribe;
let root;
let mounts;
let profileRows;
let roles;
let profileReads;
let roleReads;
let beforeProfile;

function profile(id = userId) {
  return { id, email: user.email, full_name: user.fullName, role: 'researcher', is_active: true,
    academic_program: null, academic_link: null, research_group_id: null, created_at: '2026-11-13T12:00:00Z' };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function Probe() {
  const [value, setValue] = useState('');
  useEffect(() => { mounts++; }, []);
  return createElement('input', { 'aria-label': 'Formulario sin borrador', value, onChange: (event) => setValue(event.target.value) });
}
async function mount(Component = Probe, allowed = ['committee_member']) {
  const container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ['/private'] },
    createElement(SessionSyncNotice), createElement(Routes, null,
      createElement(Route, { path: '/private', element: createElement(RutaProtegida, { rolesPermitidos: allowed }, createElement(Component)) }),
      createElement(Route, { path: '/login', element: createElement('p', null, 'Inicio de sesión') }),
      createElement(Route, { path: '/sin-acceso', element: createElement('p', null, 'Acceso restringido') })))));
}
async function change(element, value) {
  assert.ok(element, 'Missing field');
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
async function emit(event, session = authSession) {
  let pending;
  await act(async () => {
    callback(event, session);
    await Promise.resolve();
    if (session?.user && event !== 'SIGNED_OUT') pending = useSessionStore.getState().initializeSession();
  });
  return { pending };
}

beforeEach(() => {
  mounts = 0; profileReads = 0; roleReads = 0;
  profileRows = [profile()]; roles = [{ role: 'researcher' }, { role: 'committee_member' }]; beforeProfile = async () => {};
  authSession = { access_token: 'test-token', refresh_token: 'test-refresh-token', user: { id: userId, email: user.email } };
  response = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/profiles')) { profileReads++; await beforeProfile(); return Response.json(profileRows); }
    if (url.pathname.endsWith('/user_roles')) { roleReads++; return Response.json(roles); }
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  client.auth.getSession = async () => ({ data: { session: authSession }, error: null });
  client.auth.onAuthStateChange = (listener) => { callback = listener; return { data: { subscription: { unsubscribe() {} } } }; };
  client.auth.signOut = async () => ({ error: null });
  useSessionStore.setState({ ...initial, user, isAuthenticated: true, isLoading: false, isRefreshingSession: false, sessionSyncError: null }, true);
  unsubscribe = useSessionStore.getState().setupAuthListener();
});
afterEach(async () => {
  unsubscribe();
  if (root) await act(async () => root.unmount());
  root = null; document.body.replaceChildren(); window.localStorage.clear();
  useSessionStore.setState(initial, true);
  otherStores.forEach((store, index) => store.setState(otherInitial[index], true));
});
after(async () => {
  Object.assign(client.auth, methods);
  await client.auth.dispose();
  globalThis.fetch = originalFetch;
  dom.window.close();
});

test('refocusing the same identity keeps the actual form mounted, including its caret, without draft recovery', async () => {
  const gate = deferred(); beforeProfile = () => gate.promise;
  const identity = useSessionStore.getState().user;
  await mount();
  const input = document.querySelector('input');
  await change(input, 'Trabajo que solo está en memoria');
  input.focus(); input.setSelectionRange(7, 7);
  const { pending } = await emit('SIGNED_IN');
  assert.equal(useSessionStore.getState().isLoading, false);
  assert.equal(useSessionStore.getState().isRefreshingSession, true);
  assert.ok(document.querySelector('input') === input);
  assert.equal(input.value, 'Trabajo que solo está en memoria');
  assert.equal(mounts, 1);
  await act(async () => { gate.resolve(); await pending; });
  assert.ok(document.querySelector('input') === input);
  assert.equal(input.selectionStart, 7);
  assert.equal(mounts, 1);
  assert.ok(useSessionStore.getState().user === identity);
  assert.equal(useSessionStore.getState().user.activeRole, 'committee_member');
});

test('initial access remains blocked until profile and roles have been verified', async () => {
  const gate = deferred(); beforeProfile = () => gate.promise;
  useSessionStore.setState({ user: null, isAuthenticated: false, isLoading: true });
  let pending;
  await act(async () => { pending = useSessionStore.getState().initializeSession(); });
  await mount();
  assert.match(document.body.textContent, /Cargando sesión institucional/);
  assert.equal(Boolean(document.querySelector('input')), false);
  await act(async () => { gate.resolve(); await pending; });
  // A newly authenticated session starts with its server-provided primary role.
  assert.match(document.body.textContent, /Acceso restringido/);
});

test('repeated sign-in confirmations and token refreshes coalesce profile reads', async () => {
  const gate = deferred(); beforeProfile = () => gate.promise;
  const { pending } = await emit('SIGNED_IN');
  await emit('SIGNED_IN'); await emit('TOKEN_REFRESHED'); await emit('USER_UPDATED');
  assert.equal(profileReads, 1); assert.equal(roleReads, 1);
  assert.equal(useSessionStore.getState().isLoading, false);
  await act(async () => { gate.resolve(); await pending; });
});

test('temporary profile fetch errors preserve the form and expose a working retry', async () => {
  await mount();
  const input = document.querySelector('input'); await change(input, 'No perder por conexión');
  response = async () => Response.json({ code: 'XX000', message: 'Temporarily unavailable' }, { status: 503 });
  const { pending } = await emit('SIGNED_IN'); await act(async () => { await pending; });
  assert.ok(document.querySelector('input') === input);
  assert.equal(useSessionStore.getState().isAuthenticated, true);
  assert.match(document.body.textContent, /No se pudo actualizar la sesión/);
  response = async (input) => Response.json(String(input).includes('/profiles') ? [profile()] : roles);
  await act(async () => {
    document.querySelector('button').click();
    await useSessionStore.getState().initializeSession();
  });
  assert.equal(useSessionStore.getState().sessionSyncError, null);
  assert.ok(document.querySelector('input') === input);
});

test('a retryable authentication network error does not erase an already verified form', async () => {
  await mount(); const input = document.querySelector('input');
  client.auth.getSession = async () => ({ data: { session: null }, error: new AuthRetryableFetchError('Offline', 0) });
  await act(async () => { await useSessionStore.getState().initializeSession(); });
  assert.equal(useSessionStore.getState().isAuthenticated, true);
  assert.ok(document.querySelector('input') === input);
});

test('a missing or inactive profile revokes access instead of keeping cached permissions', async () => {
  await mount(); profileRows = [];
  const { pending } = await emit('SIGNED_IN'); await act(async () => { await pending; });
  assert.equal(useSessionStore.getState().user, null);
  assert.match(document.body.textContent, /Inicio de sesión/);
  assert.equal(Boolean(document.querySelector('input')), false);
});

test('expired authentication or an explicit backend permission denial clears the cached session', async () => {
  await mount();
  authSession = null;
  await act(async () => { await useSessionStore.getState().initializeSession(); });
  assert.equal(useSessionStore.getState().isAuthenticated, false);
  assert.match(document.body.textContent, /Inicio de sesión/);
  await act(async () => { useSessionStore.setState({ user, isAuthenticated: true, isLoading: false }); });
  authSession = { access_token: 'test-token', user: { id: userId } };
  response = async () => Response.json({ code: '42501', message: 'Permission denied' }, { status: 403 });
  await act(async () => { await useSessionStore.getState().initializeSession(); });
  assert.equal(useSessionStore.getState().user, null);
  assert.equal(useSessionStore.getState().sessionSyncError, null);
});

test('a removed active role updates navigation and blocks the formerly allowed page', async () => {
  await mount(); roles = [{ role: 'researcher' }];
  const { pending } = await emit('USER_UPDATED'); await act(async () => { await pending; });
  assert.equal(useSessionStore.getState().user.activeRole, 'researcher');
  assert.match(document.body.textContent, /Acceso restringido/);
});

test('sign-out invalidates pending profile responses and queued refresh events', async () => {
  const gate = deferred(); beforeProfile = () => gate.promise;
  await mount(); const { pending } = await emit('SIGNED_IN');
  await emit('SIGNED_OUT', null);
  await act(async () => { gate.resolve(); await pending; });
  assert.equal(useSessionStore.getState().user, null);
  assert.equal(useSessionStore.getState().isAuthenticated, false);
  assert.match(document.body.textContent, /Inicio de sesión/);
  await act(async () => { callback('SIGNED_IN', authSession); callback('SIGNED_OUT', null); await Promise.resolve(); });
  assert.equal(useSessionStore.getState().user, null);
});

test('switching identity hides the previous user immediately and ignores their late response', async () => {
  const gate = deferred(); let oldRequest = true;
  response = async (input) => {
    if (String(input).includes('/profiles')) {
      if (oldRequest) { oldRequest = false; await gate.promise; return Response.json([profile()]); }
      return Response.json([profile(anotherId)]);
    }
    return Response.json(roles);
  };
  await mount(); const { pending: oldPending } = await emit('SIGNED_IN');
  authSession = { ...authSession, user: { ...authSession.user, id: anotherId } };
  let next;
  await act(async () => { callback('SIGNED_IN', authSession); assert.equal(useSessionStore.getState().user, null); await Promise.resolve(); next = useSessionStore.getState().initializeSession(); });
  await act(async () => { await next; gate.resolve(); await oldPending; });
  assert.equal(useSessionStore.getState().user.id, anotherId);
});

test('explicit logout clears access before the network response and prevents background resurrection', async () => {
  const gate = deferred(); beforeProfile = () => gate.promise;
  const signOut = deferred(); client.auth.signOut = () => signOut.promise;
  await mount(); const { pending } = await emit('SIGNED_IN');
  let logout;
  await act(async () => { logout = useSessionStore.getState().logout(); });
  assert.equal(useSessionStore.getState().user, null);
  callback('SIGNED_IN', authSession);
  await act(async () => { gate.resolve(); await pending; signOut.resolve({ error: null }); await logout; });
  assert.equal(useSessionStore.getState().isAuthenticated, false);
});

test('the real request wizard keeps its unsaved step while a same-user session is reconfirmed; its draft remains available', async () => {
  useSessionStore.setState({ user: { ...user, activeRole: 'researcher' } });
  useCatalogStore.setState({ types: [{ id: 'type', name: 'Trámite', code: 'TEST', is_active: true }], requirements: [] });
  useGroupsStore.setState({ groups: [] });
  useRequestStore.setState({ isSubmitting: false });
  await mount(RequestSubmissionWizard, ['researcher']);
  const next = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Continuar al Paso 2'));
  await act(async () => next.click());
  const input = document.querySelector('input[placeholder^="Ej: Evaluación"]');
  await change(input, 'Mi solicitud en preparación');
  const { pending } = await emit('SIGNED_IN'); await act(async () => { await pending; });
  assert.ok(document.querySelector('input[placeholder^="Ej: Evaluación"]') === input);
  assert.equal(input.value, 'Mi solicitud en preparación');
  await act(async () => window.dispatchEvent(new dom.window.Event('pagehide')));
  assert.ok(Object.keys(window.localStorage).some((key) => key.startsWith('seed:draft:v1:')));
});
