import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new dom.window.Event('close')); };
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'presentation-public-test-key';
const originalFetch = globalThis.fetch;
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { PresentationSwitcher } = await import('../PresentationSwitcher.tsx');
const accounts = await import('../presentationAccounts.ts');
const { clearPresentationData } = await import('../presentationData.ts');
const { getSupabaseClient } = await import('../../../lib/supabase.ts');
const { accountScopedFetch, hasPendingAccountWrites } = await import('../../../lib/accountDataScope.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const { useGroupsStore } = await import('../../groups/groupsStore.ts');
const { useUserStore } = await import('../../users/userStore.ts');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useCommitteeSessionsStore } = await import('../../sessions/committeeSessionsStore.ts');
const { useMinutesStore } = await import('../../minutes/minutesStore.ts');
const stores = [useSessionStore, useCatalogStore, useGroupsStore, useUserStore, useRequestStore, useCommitteeSessionsStore, useMinutesStore];
const snapshots = stores.map(store => store.getState());
const client = getSupabaseClient();
const authMethods = { getSession: client.auth.getSession, setSession: client.auth.setSession, onAuthStateChange: client.auth.onAuthStateChange };
let activeSession;
let requests;
let denyLogin;
let denyProfile;
let root;
let cache;
let switching;

function session(email) {
  const index = accounts.PRESENTATION_EMAILS.indexOf(email);
  const id = `1622d665-8f0a-4fef-ac40-f228999fd00${index + 1}`;
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url')}.${Buffer.from('signature').toString('base64url')}`;
  return { access_token: token, refresh_token: `refresh-${index}`, token_type: 'bearer', expires_in: 3600, expires_at: exp,
    user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-17T00:00:00Z' } };
}
function userForToken(token) {
  return accounts.PRESENTATION_EMAILS.map(session).find(item => `Bearer ${item.access_token}` === token)?.user ?? activeSession.user;
}
function profile(user) {
  return { id: user.id, email: user.email, full_name: user.email, role: 'researcher', is_active: true };
}
async function mount() {
  const container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(createElement(QueryClientProvider, { client: cache },
    createElement(MemoryRouter, null, createElement(PresentationSwitcher, { onSwitchingChange: value => { switching = value; } })))));
}
async function open() {
  await act(async () => window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { code: 'Period', ctrlKey: true, shiftKey: true, bubbles: true })));
}
async function change(input, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    for (let i = 0; i < 30; i++) await new Promise(resolve => setTimeout(resolve, 5));
  });
}
beforeEach(() => {
  stores.forEach((store, i) => store.setState(snapshots[i], true));
  accounts.clearPresentationSessions();
  activeSession = session(accounts.PRESENTATION_EMAILS[0]); requests = []; denyLogin = false; denyProfile = false; switching = false;
  useSessionStore.setState({ user: { id: activeSession.user.id, email: activeSession.user.email, fullName: 'Investigador', roles: ['researcher'], activeRole: 'researcher' }, isLoading: false, isAuthenticated: true });
  client.auth.getSession = async () => ({ data: { session: activeSession }, error: null });
  client.auth.setSession = async (next) => { activeSession = next; return { data: { user: next.user, session: next }, error: null }; };
  client.auth.onAuthStateChange = listener => {
    queueMicrotask(() => listener('INITIAL_SESSION', activeSession));
    return { data: { subscription: { unsubscribe() {} } } };
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, body: init?.body });
    if (url.pathname === '/auth/v1/token') {
      if (denyLogin) return Response.json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 });
      return Response.json(session(JSON.parse(init.body).email));
    }
    const authUser = userForToken(new Headers(init?.headers).get('authorization'));
    if (url.pathname === '/auth/v1/user') return Response.json(authUser);
    if (url.pathname.endsWith('/profiles')) return Response.json(denyProfile ? [] : [profile(authUser)]);
    if (url.pathname.endsWith('/user_roles')) return Response.json([{ role: 'researcher', user_id: authUser.id }]);
    return Response.json([]);
  };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; cache?.clear(); cache = null;
  accounts.clearPresentationSessions(); document.body.replaceChildren(); window.localStorage.clear();
});
after(async () => {
  Object.assign(client.auth, authMethods); await client.auth.dispose();
  globalThis.fetch = originalFetch; dom.window.close();
});

test('shortcut is exact, ignores repeats/IME/AltGr, and toggles a hidden native modal', async () => {
  await mount(); assert.equal(document.querySelector('dialog').open, false);
  for (const args of [{ code: 'Period', ctrlKey: true }, { code: 'Period', ctrlKey: true, shiftKey: true, altKey: true },
    { code: 'Period', ctrlKey: true, shiftKey: true, repeat: true }, { code: 'Period', ctrlKey: true, shiftKey: true, isComposing: true }]) {
    assert.equal(accounts.isPresentationShortcut(new dom.window.KeyboardEvent('keydown', args)), false);
  }
  await open(); assert.equal(document.querySelector('dialog').open, true);
  assert.equal(document.querySelectorAll('input[type=radio]').length, 6);
  await open(); assert.equal(document.querySelector('dialog').open, false);
});

test('preparing a real session does not change the active account; cached activation needs no password', async () => {
  const email = accounts.PRESENTATION_EMAILS[1];
  const storageBefore = { ...window.localStorage };
  const prepared = await accounts.preparePresentationSession(email, 'only-entered-in-test');
  assert.equal(prepared.user.email, email); assert.equal(activeSession.user.email, accounts.PRESENTATION_EMAILS[0]);
  assert.equal(accounts.hasPresentationSession(email), true);
  const cached = await accounts.preparePresentationSession(email);
  assert.equal(cached.user.email, email);
  assert.equal(requests.filter(request => request.url.pathname === '/auth/v1/token').length, 1);
  assert.deepEqual({ ...window.localStorage }, storageBefore);
  accounts.clearPresentationSessions(); assert.equal(accounts.hasPresentationSession(email), false);
  await assert.rejects(accounts.preparePresentationSession('other@example.com', 'unused'));
});

test('switching uses the target identity and clears previous account data and query cache', async () => {
  await mount(); await open();
  await act(async () => document.querySelectorAll('input[type=radio]')[1].click());
  await change(document.querySelector('input[type=password]'), 'only-entered-in-test');
  useRequestStore.setState({ requests: [{ id: 'old-account-data' }] });
  cache.setQueryData(['private'], 'old-account-data');
  await submit();
  assert.equal(useSessionStore.getState().user.email, accounts.PRESENTATION_EMAILS[1]);
  assert.deepEqual(useRequestStore.getState().requests, []);
  assert.equal(cache.getQueryData(['private']), undefined);
  assert.equal(document.querySelector('dialog').open, false); assert.equal(switching, false);
  assert.ok(requests.some(request => request.url.pathname.endsWith('/applications')));
});

test('invalid credentials and inactive profiles leave the previous identity and data intact', async () => {
  await mount(); await open();
  await act(async () => document.querySelectorAll('input[type=radio]')[1].click());
  useRequestStore.setState({ requests: [{ id: 'keep-current-data' }] });
  denyLogin = true;
  await change(document.querySelector('input[type=password]'), 'wrong-password'); await submit();
  assert.equal(useSessionStore.getState().user.email, accounts.PRESENTATION_EMAILS[0]);
  assert.match(document.querySelector('[role=alert]').textContent, /correo y contraseña/);
  denyLogin = false; denyProfile = true;
  await change(document.querySelector('input[type=password]'), 'only-entered-in-test'); await submit();
  assert.equal(useSessionStore.getState().user.email, accounts.PRESENTATION_EMAILS[0]);
  assert.equal(useRequestStore.getState().requests[0].id, 'keep-current-data');
});

test('pending writes block switching before authentication starts', async () => {
  await mount(); await open();
  const fallbackFetch = globalThis.fetch;
  let release;
  globalThis.fetch = () => new Promise(resolve => { release = () => resolve(Response.json({})); });
  const pending = accountScopedFetch('http://127.0.0.1:54321/rest/v1/applications', { method: 'POST' });
  assert.equal(hasPendingAccountWrites(), true);
  await submit(); assert.match(document.querySelector('[role=alert]').textContent, /guardado en curso/);
  release(); await pending; globalThis.fetch = fallbackFetch;
  assert.equal(hasPendingAccountWrites(), false);
  assert.equal(requests.length, 0);
});

test('an activation failure restores the previous authenticated account', async () => {
  await mount(); await open();
  await act(async () => document.querySelectorAll('input[type=radio]')[1].click());
  await change(document.querySelector('input[type=password]'), 'only-entered-in-test');
  const activate = client.auth.setSession;
  let first = true;
  client.auth.setSession = async next => {
    if (first) { first = false; return { data: { user: null, session: null }, error: new Error('No se pudo completar el cambio de cuenta.') }; }
    return activate(next);
  };
  await submit();
  assert.equal(useSessionStore.getState().user.email, accounts.PRESENTATION_EMAILS[0]);
  assert.equal(document.querySelector('dialog').open, true);
  assert.ok(document.querySelector('[role=alert]'));
  assert.equal(switching, false);
});

for (const store of stores.slice(1)) {
  test(`late reads cannot overwrite cleared data: ${stores.indexOf(store)}`, async () => {
    const release = [];
    globalThis.fetch = () => new Promise(resolve => release.push(() => resolve(Response.json([]))));
    const pending = store.getState().loadFromSupabase();
    // PostgREST waits for the current access token before starting fetch.
    for (let i = 0; i < 10; i++) await new Promise(resolve => setTimeout(resolve, 1));
    clearPresentationData();
    store.setState({ isLoading: true });
    release.forEach(resolve => resolve());
    const result = await pending;
    assert.equal(result.success, false);
    assert.equal(store.getState().isLoading, true, 'stale completion must not mutate the new identity');
  });
}
