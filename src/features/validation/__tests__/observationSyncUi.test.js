import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true });
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'observation-sync-ui-test-key';
const { act, createElement, useEffect, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { AlertProvider } = await import('../../../components/ui/AlertProvider.tsx');
const { ObservationSync } = await import('../ObservationSync.tsx');
const { useRequestStore } = await import('../../requests/requestStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { getSupabaseClient } = await import('../../../lib/supabase.ts');

test('live changes and fallback polling update observations without remounting the form; subscriptions are cleaned up', async () => {
  const broadcastChannel = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = undefined;
  const client = getSupabaseClient();
  const original = { fetch: globalThis.fetch, channel: client.channel, removeChannel: client.removeChannel,
    interval: window.setInterval, clearInterval: window.clearInterval };
  const state = useRequestStore.getState();
  const session = useSessionStore.getState();
  let remote = [];
  let onChange;
  let onStatus;
  let poll;
  let removed = false;
  let cleared = false;
  let mounts = 0;
  let reads = 0;
  const channel = {
    on(event, options, callback) { assert.equal(options.table, 'observations'); onChange = callback; return channel; },
    subscribe(callback) { onStatus = callback; return channel; },
  };
  client.channel = () => channel;
  client.removeChannel = async () => { removed = true; };
  window.setInterval = callback => { poll = callback; return 1; };
  window.clearInterval = () => { cleared = true; };
  globalThis.fetch = async input => {
    if (String(input).includes('/observations')) { reads++; return Response.json(remote); }
    return Response.json([]);
  };
  useSessionStore.setState({ user: { id: 'owner' } });
  useRequestStore.setState({ observations: [], isLoading: false });
  function Form() {
    const [value, setValue] = useState('Borrador de mi respuesta');
    useEffect(() => { mounts++; }, []);
    return createElement('textarea', { value, onChange: e => setValue(e.target.value) });
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const flush = async callback => act(async () => { callback(); await new Promise(resolve => setTimeout(resolve, 20)); });
  try {
    await flush(() => root.render(createElement(AlertProvider, null, createElement(ObservationSync), createElement(Form))));
    const textarea = document.querySelector('textarea');
    remote = [{ id: 'obs', application_id: 'app', assignment_id: 'assignment', author_id: 'reviewer', category: 'ACLARACION',
      content: 'Observación desde otra sesión', is_resolved: false, applicant_response: null, verification_notes: null,
      verified_at: null, verified_by: null, created_at: '2026-11-14' }];
    await flush(() => onChange());
    assert.equal(useRequestStore.getState().observations[0].content, 'Observación desde otra sesión');
    assert.equal(document.querySelector('textarea'), textarea);
    assert.equal(textarea.value, 'Borrador de mi respuesta');
    assert.equal(mounts, 1);
    const previousReads = reads;
    await flush(() => poll());
    await flush(() => onStatus('SUBSCRIBED'));
    assert.ok(reads >= previousReads + 2);
    assert.equal(useRequestStore.getState().isLoading, false);
  } finally {
    await act(async () => root.unmount());
    await client.auth.stopAutoRefresh();
    client.channel = original.channel; client.removeChannel = original.removeChannel;
    window.setInterval = original.interval; window.clearInterval = original.clearInterval;
    globalThis.fetch = original.fetch;
    useRequestStore.setState(state); useSessionStore.setState(session);
    dom.window.close();
    globalThis.BroadcastChannel = broadcastChannel;
  }
  assert.ok(removed);
  assert.ok(cleared);
});
