import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { FundingFields } = await import('../FundingFields.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
after(() => dom.window.close());

test('switching to academic endorsement clears the amount and selected call explicitly', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 } } });
  useSessionStore.setState({ user: { id: 'ui-owner', academicLink: 'Estudiante de pregrado', roles: ['researcher'], activeRole: 'researcher' } });
  cache.setQueryData(['funding-calls', 'ui-owner'], [{ id: 'open', faculty: 'Ingeniería', audience: 'students', type_ids: ['type'],
    title: 'Apoyo semilla', status: 'published', opens_at: new Date(Date.now()-10000).toISOString(), closes_at: new Date(Date.now()+60000).toISOString() }]);
  let current;
  function Form() {
    const [value, update] = useState({ title: '', abstract: '', related_project: '', research_group_id: '',
      budget_requested: 100, funding_call_id: 'open', funding_mode: 'funded', is_tutor_endorsed: false });
    current = value;
    return createElement(FundingFields, { value, onChange: update, typeId: 'type', faculty: 'Ingeniería' });
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
