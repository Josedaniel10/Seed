import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'notifications-public-test-key';
const { fetchNotifications, markNotificationsRead, getNotificationTarget } = await import('../notificationsApi.ts');
const { notificationKeys } = await import('../useNotifications.ts');
const owner = '80000000-0000-4000-8000-000000000001';
const other = '80000000-0000-4000-8000-000000000002';
const notification = {
  id: '80000000-0000-4000-8000-000000000010', user_id: owner,
  type: 'CAMBIO_ESTADO', title: 'Solicitud actualizada', message: 'Consulte el expediente.',
  is_read: false, application_id: '80000000-0000-4000-8000-000000000020',
  session_id: null, target_tab: 'historial', created_at: '2026-11-11T12:00:00Z',
};

test('reads from Supabase, persists read state, isolates caches and reports failures', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let fail = false;
  let invalid = false;
  let read = false;
  let paginate = false;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/rest/v1/notifications');
    const userId = url.searchParams.get('user_id')?.replace('eq.', '');
    assert.ok([owner, other].includes(userId));
    calls.push({ url, options });
    if (fail) return Response.json({ message: 'Unavailable' }, { status: 503 });
    if (options.method === 'PATCH') {
      assert.deepEqual(JSON.parse(options.body), { is_read: true });
      assert.equal(url.searchParams.get('is_read'), 'eq.false');
      read = true;
      return new Response(null, { status: 204 });
    }
    if (invalid) return Response.json([{ ...notification, user_id: null }]);
    if (paginate && url.searchParams.get('offset') === '0') return Response.json(Array.from({ length: 500 }, () => notification));
    return Response.json(userId === owner ? [{ ...notification, is_read: read }] : []);
  };
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    assert.equal((await fetchNotifications(owner))[0].is_read, false);
    await markNotificationsRead(owner, notification.id);
    assert.equal(calls.at(-1).url.searchParams.get('id'), `eq.${notification.id}`);
    // A fresh query after a simulated reload reads the saved server value.
    assert.equal((await fetchNotifications(owner))[0].is_read, true);
    await markNotificationsRead(owner);
    assert.equal(calls.at(-1).url.searchParams.has('id'), false);
    const first = await cache.fetchQuery({ queryKey: notificationKeys.user(owner), queryFn: () => fetchNotifications(owner) });
    const second = await cache.fetchQuery({ queryKey: notificationKeys.user(other), queryFn: () => fetchNotifications(other) });
    assert.equal(first.length, 1);
    assert.deepEqual(second, []);
    assert.equal(cache.getQueryData(notificationKeys.user(owner))[0].user_id, owner);
    paginate = true;
    assert.equal((await fetchNotifications(owner)).length, 501);
    paginate = false;
    invalid = true;
    await assert.rejects(fetchNotifications(owner));
    invalid = false;
    fail = true;
    await assert.rejects(fetchNotifications(owner), /cargar/);
    await assert.rejects(markNotificationsRead(owner, notification.id), /guardar/);
  } finally {
    cache.clear();
    globalThis.fetch = originalFetch;
  }
});

test('links point to the related detail and section; removed resources have no link', () => {
  assert.equal(getNotificationTarget(notification), `/solicitudes/${notification.application_id}?tab=historial`);
  const sessionId = '80000000-0000-4000-8000-000000000030';
  assert.equal(getNotificationTarget({ ...notification, application_id: null, session_id: sessionId, target_tab: 'acta' }),
    `/sesiones/${sessionId}?tab=acta`);
  assert.equal(getNotificationTarget({ ...notification, application_id: null, session_id: sessionId, target_tab: 'agenda' }),
    `/sesiones/${sessionId}?tab=agenda`);
  assert.equal(getNotificationTarget({ ...notification, application_id: null }), null);
});
