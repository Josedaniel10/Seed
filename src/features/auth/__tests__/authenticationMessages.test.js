import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = 'public-auth-messages-test-key';
const { getSupabaseClient } = await import('../../../lib/supabase.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { USER_MESSAGES } = await import('../../../lib/userMessages.ts');
const client = getSupabaseClient();
const original = client.auth.signInWithPassword;
const initial = useSessionStore.getState();
afterEach(() => { client.auth.signInWithPassword = original; useSessionStore.setState(initial, true); });

test('known demo addresses and unknown addresses receive the same safe response to invalid credentials', async () => {
  client.auth.signInWithPassword = async () => ({ data: { user: null, session: null }, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials at Supabase Auth' } });
  for (const email of ['admin@seed.com', 'investigador@universidad.edu.co', 'unknown@example.invalid']) {
    const result = await useSessionStore.getState().loginWithCredentials(email, 'wrong-password');
    assert.equal(result.success, false);
    assert.equal(result.error, USER_MESSAGES.credentials);
    assert.equal(useSessionStore.getState().isAuthenticated, false);
  }
});

test('an incomplete remote response never falls back to signing in a demo account', async () => {
  client.auth.signInWithPassword = async () => ({ data: { user: null, session: null }, error: null });
  const result = await useSessionStore.getState().loginWithCredentials('admin@seed.com', 'wrong-password');
  assert.equal(result.success, false);
  assert.equal(useSessionStore.getState().isAuthenticated, false);
  assert.doesNotMatch(result.error, /Supabase|demostración|perfil|SQL/i);
});
