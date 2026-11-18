import assert from 'node:assert/strict';
import { test, after, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { FundingFields } = await import('../FundingFields.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useGroupsStore } = await import('../../groups/groupsStore.ts');
const initialSession = useSessionStore.getState();
const initialGroups = useGroupsStore.getState();
const group = { id: 'assigned', faculty: 'Ingeniería', is_active: true };
afterEach(() => { useSessionStore.setState(initialSession, true); useGroupsStore.setState(initialGroups, true); });
after(() => dom.window.close());

test('switching to academic endorsement clears the amount and selected call explicitly', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } } });
  useSessionStore.setState({ user: { id: 'ui-owner', researchGroupId: group.id, academicLink: 'Estudiante de pregrado', roles: ['researcher'], activeRole: 'researcher' } });
  useGroupsStore.setState({ groups: [group] });
  cache.setQueryData(['funding-calls', 'ui-owner'], [{ id: 'open', faculty: 'Ingeniería', audience: 'students', type_ids: ['type'],
    title: 'Apoyo semilla', status: 'published', opens_at: new Date(Date.now()-10000).toISOString(), closes_at: new Date(Date.now()+60000).toISOString() }]);
  let current;
  function Form() {
    const [value, update] = useState({ title: '', abstract: '', related_project: '', research_group_id: group.id,
      budget_requested: 100, funding_call_id: 'open', funding_mode: 'funded', is_tutor_endorsed: false });
    current = value;
    return createElement(FundingFields, { value, onChange: update, typeId: 'type' });
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client: cache }, createElement(Form))));
    assert.match(container.textContent, /Apoyo semilla/);
    assert.equal(container.querySelector('select').value, 'open');
    await act(async () => container.querySelector('input[type="radio"]').click());
    assert.equal(current.budget_requested, 0);
    assert.equal(current.funding_call_id, '');
    assert.equal(container.querySelector('select'), null);
    assert.match(container.textContent, /sin convocatoria/);
    await act(async () => container.querySelectorAll('input[type="radio"]')[1].click());
    assert.equal(container.querySelector('select').value, '');
    assert.equal(current.budget_requested, 0);
  } finally { await act(async () => root.unmount()); cache.clear(); container.remove(); }
});

test('only a matching active profile group unlocks funding; stale selections and changed memberships cannot unlock it', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } } });
  const user = { id: 'scope-owner', academicLink: 'Estudiante de pregrado', roles: ['researcher'], activeRole: 'researcher' };
  useSessionStore.setState({ user });
  useGroupsStore.setState({ groups: [group, { ...group, id: 'other-same-faculty' }] });
  const base = { id: 'open', faculty: 'Ingeniería', audience: 'students', type_ids: ['type'], title: 'Eligible opportunity',
    status: 'published', opens_at: new Date(Date.now() - 10000).toISOString(), closes_at: new Date(Date.now() + 60000).toISOString() };
  cache.setQueryData(['funding-calls', user.id], [base, { ...base, id: 'wrong-area', faculty: 'Otra área' }, { ...base, id: 'wrong-audience', audience: 'teachers' }, { ...base, id: 'wrong-type', type_ids: ['other'] }]);
  const value = { title: '', abstract: '', related_project: '', research_group_id: group.id,
    budget_requested: 100, funding_call_id: 'open', funding_mode: 'funded', is_tutor_endorsed: false };
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client: cache }, createElement(FundingFields, { value, onChange() {}, typeId: 'type' }))));
    const select = container.querySelector('select');
    assert.equal(select.disabled, true); assert.match(container.textContent, /asignado en tu perfil/);
    assert.equal(select.querySelector('option[value=open]').disabled, true, 'stale draft remains visible but cannot be selected');
    await act(async () => useSessionStore.setState({ user: { ...user, researchGroupId: group.id } }));
    assert.equal(select.disabled, false);
    assert.deepEqual([...select.options].filter(option => option.value && !option.disabled).map(option => option.value), ['open']);
    await act(async () => useSessionStore.setState({ user: { ...user, researchGroupId: 'other-same-faculty' } }));
    assert.equal(select.disabled, true); assert.match(container.textContent, /Selecciona el grupo registrado/);
    await act(async () => useSessionStore.setState({ user: { ...user, researchGroupId: group.id } }));
    await act(async () => useGroupsStore.setState({ groups: [{ ...group, is_active: false }] }));
    assert.equal(select.disabled, true); assert.match(container.textContent, /grupo de investigación activo/);
    assert.equal(value.budget_requested, 100, 'membership validation must not silently erase the saved draft');
  } finally { await act(async () => root.unmount()); cache.clear(); container.remove(); }
});
