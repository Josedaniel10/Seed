import assert from 'node:assert/strict';
import { test, beforeEach, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'group-assignment-public-test-key';
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { UserManagementTable } = await import('../UserManagementTable.tsx');
const { useUserStore } = await import('../userStore.ts');
const { useGroupsStore } = await import('../../groups/groupsStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { getSupabaseClient } = await import('../../../lib/supabase.ts');
const { invalidateAccountData } = await import('../../../lib/accountDataScope.ts');
const client = getSupabaseClient();
const originalGetSession = client.auth.getSession;
const originalFetch = globalThis.fetch;
const stores = [useUserStore, useGroupsStore, useSessionStore];
const snapshots = stores.map(store => store.getState());
const group = { id: 'c0000000-0000-0000-0000-000000000002', code: 'G-ING-02', name: 'Sistemas', faculty: 'Ingeniería de Sistemas', is_active: true };
const user = { id: '1622d665-8f0a-4fef-ac40-f228999fd001', full_name: 'Investigador de prueba', email: 'groups@example.invalid',
  role: 'researcher', academic_program: 'Ingeniería', academic_link: 'Estudiante', research_group_id: null, is_active: true };
let root;
let writes;
let response;
let requestedUrls;
let activeGroup;
const noLoad = async () => ({ success: true });
beforeEach(() => {
  stores.forEach((store, index) => store.setState(snapshots[index], true));
  useUserStore.setState({ users: [user], isLoading: false, isInitialized: true, loadFromSupabase: noLoad });
  useGroupsStore.setState({ groups: [group, { ...group, id: 'inactive', name: 'Inactivo', is_active: false }], isLoading: false, error: null, loadFromSupabase: noLoad });
  useSessionStore.setState({ user: { id: 'admin-user', roles: ['admin'], activeRole: 'admin' }, isLoading: false });
  writes = []; requestedUrls = []; activeGroup = true;
  response = async body => Response.json({ id: user.id, research_group_id: body.research_group_id });
  client.auth.getSession = async () => ({ data: { session: null }, error: null });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input)); requestedUrls.push(url);
    if (url.pathname.endsWith('/research_groups')) return Response.json(activeGroup ? { id: group.id } : null);
    assert.equal(init.method, 'PATCH');
    const body = JSON.parse(init.body); writes.push(body);
    return response(body);
  };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  stores.forEach((store, index) => store.setState(snapshots[index], true)); document.body.replaceChildren(); window.localStorage.clear();
});
after(async () => { client.auth.getSession = originalGetSession; await client.auth.dispose(); globalThis.fetch = originalFetch; dom.window.close(); });
async function mount() {
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(UserManagementTable)));
  await act(async () => document.querySelector('[aria-label="Asignar grupo a Investigador de prueba"]').click());
}
async function select(value) {
  await act(async () => { const field = document.querySelector('[name=research_group_id]'); field.value = value;
    field.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
}
async function until(predicate) {
  const deadline = Date.now() + 5000;
  do {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    if (predicate()) return;
  } while (Date.now() < deadline);
  assert.fail('Group assignment did not settle within 5 seconds');
}
async function submit(waitForSave = true) {
  await act(async () => {
    document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  if (waitForSave) await until(() => !document.querySelector('button[type=submit]')?.disabled);
}

test('administrator assigns an active group from Users and success follows database confirmation', async () => {
  await mount();
  assert.equal(document.querySelector('[name=research_group_id] option[value=inactive]'), null);
  await select(group.id); await submit();
  assert.equal(useUserStore.getState().users[0].research_group_id, group.id);
  assert.deepEqual(writes, [{ research_group_id: group.id }]);
  assert.equal(requestedUrls.at(-1).searchParams.get('research_group_id'), 'is.null');
  assert.match(document.body.textContent, /Grupo: Sistemas/);
});

test('failed saves preserve the old membership and selection for retry', async () => {
  response = async () => Response.json({ code: '42501', message: 'permission denied' }, { status: 403 });
  await mount(); await select(group.id); await submit();
  assert.equal(useUserStore.getState().users[0].research_group_id, null);
  assert.equal(document.querySelector('[name=research_group_id]').value, group.id);
  assert.ok(document.querySelector('form [role=alert]'));
  response = async body => Response.json({ id: user.id, research_group_id: body.research_group_id });
  await submit(); assert.equal(useUserStore.getState().users[0].research_group_id, group.id);
});

test('pending saves do not update the local profile and prevent duplicate writes', async () => {
  let release;
  response = body => new Promise(resolve => { release = () => resolve(Response.json({ id: user.id, research_group_id: body.research_group_id })); });
  await mount(); await select(group.id); await submit(false); await until(() => writes.length === 1);
  assert.equal(useUserStore.getState().users[0].research_group_id, null);
  assert.equal(document.querySelector('button[type=submit]').disabled, true);
  assert.equal(document.querySelector('[name=research_group_id]').disabled, true);
  await submit(false); assert.equal(writes.length, 1);
  await act(async () => { release(); });
  await until(() => useUserStore.getState().users[0].research_group_id === group.id);
  assert.equal(useUserStore.getState().users[0].research_group_id, group.id);
});

test('removing a group is persisted and concurrent administrator changes are not overwritten locally', async () => {
  useUserStore.setState({ users: [{ ...user, research_group_id: group.id }] });
  const result = await useUserStore.getState().assignResearchGroup(user.id, null);
  assert.equal(result.success, true); assert.equal(useUserStore.getState().users[0].research_group_id, null);
  assert.equal(requestedUrls.at(-1).searchParams.get('research_group_id'), `eq.${group.id}`);
  response = async () => Response.json(null);
  const conflict = await useUserStore.getState().assignResearchGroup(user.id, group.id);
  assert.equal(conflict.success, false); assert.match(conflict.error, /vinculación pudo cambiar/);
  assert.equal(useUserStore.getState().users[0].research_group_id, null);
});

test('a group deactivated after opening the form is rejected before updating the profile', async () => {
  activeGroup = false;
  const result = await useUserStore.getState().assignResearchGroup(user.id, group.id);
  assert.equal(result.success, false); assert.match(result.error, /ya no está activo/);
  assert.equal(writes.length, 0);
});

test('late assignment confirmation never populates another account data scope', async () => {
  response = async body => { invalidateAccountData(); return Response.json({ id: user.id, research_group_id: body.research_group_id }); };
  const result = await useUserStore.getState().assignResearchGroup(user.id, group.id);
  assert.equal(result.success, false); assert.equal(useUserStore.getState().users[0].research_group_id, null);
});
