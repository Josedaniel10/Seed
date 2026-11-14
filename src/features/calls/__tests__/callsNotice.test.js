import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { CallsNotice } = await import('../CallsNotice.tsx');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const session = useSessionStore.getState();
const key = ['funding-calls', undefined];
const open = { id: 'open-call', title: 'Apoyo semilla', faculty: 'Ingeniería', status: 'published',
  opens_at: new Date(Date.now() - 60000).toISOString(), closes_at: new Date(Date.now() + 86400000).toISOString() };
let root;
let cache;

async function mount(calls) {
  useSessionStore.setState({ user: null });
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (calls) cache.setQueryData(key, calls);
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(QueryClientProvider, { client: cache },
    createElement(MemoryRouter, null, createElement(CallsNotice)))));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; cache?.clear(); document.body.replaceChildren(); useSessionStore.setState(session, true);
});
after(() => dom.window.close());

test('the notice stays hidden while loading and when no calls are open', async () => {
  await mount();
  assert.equal(document.querySelector('section'), null);
  for (const calls of [[], [{ ...open, status: 'closed' }], [{ ...open, opens_at: new Date(Date.now() + 60000).toISOString() }]]) {
    await act(async () => { cache.setQueryData(key, calls); await new Promise((resolve) => setTimeout(resolve, 10)); });
    assert.equal(document.querySelector('section'), null);
    assert.equal(document.body.textContent, '');
  }
});

test('only open calls are announced and the notice disappears when the last one closes', async () => {
  await mount([open, { ...open, id: 'closed-call', title: 'Convocatoria cerrada', status: 'closed' }]);
  assert.match(document.body.textContent, /Apoyo semilla/);
  assert.doesNotMatch(document.body.textContent, /Convocatoria cerrada/);
  assert.equal(document.querySelector('a[href*="convocatoria="]').getAttribute('href'), '/convocatorias?convocatoria=open-call');
  await act(async () => { cache.setQueryData(key, []); await new Promise((resolve) => setTimeout(resolve, 10)); });
  assert.equal(document.querySelector('section'), null);
});
