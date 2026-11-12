// Optional live integration test: DATABASE_URL and VITE_SUPABASE_* in the local .env.
// Creates two temporary identities, verifies Auth/PostgREST/Realtime, then removes them.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const connectionString = process.env.DATABASE_URL;
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!connectionString || !url || !key) throw new Error('Configure DATABASE_URL y VITE_SUPABASE_* localmente.');
function parseUrl(value) {
  try { return new URL(value); }
  catch { throw new Error('La configuración de conexión contiene una URL inválida.'); }
}
const dbTarget = parseUrl(connectionString);
const ref = parseUrl(url).hostname.split('.')[0];
assert.ok(dbTarget.hostname === `db.${ref}.supabase.co` || decodeURIComponent(dbTarget.username) === `postgres.${ref}`,
  'La conexión debe corresponder al proyecto de la aplicación.');
const database = new pg.Client({ connectionString, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
const ids = [randomUUID(), randomUUID()];
const password = randomBytes(32).toString('hex');
const clients = ids.map(() => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
let foreignEvents = 0;
let cleanupNeeded = false;

async function subscribe(client, userId, onChange) {
  const channel = client.channel(`notification-integration:${randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onChange);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Realtime subscription timeout')), 20000);
    channel.subscribe((status) => {
      console.log('Realtime subscription:', status);
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error('Realtime subscription failed')); }
    });
  });
}

try {
  await database.connect();
  // A fixed schema for pgcrypto is expected in hosted Supabase.
  cleanupNeeded = true;
  for (const [index, id] of ids.entries()) {
    const email = `seed-notification-${id}@example.invalid`;
    await database.query(`INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      VALUES ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,
        extensions.crypt($3,extensions.gen_salt('bf')),now(),'','','','',
        '{"provider":"email","providers":["email"]}','{"full_name":"Prueba temporal de notificaciones"}',now(),now())`, [id, email, password]);
    await database.query(`INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
      VALUES ($1::text,($1::text)::uuid,jsonb_build_object('sub',$1::text,'email',$2::text,'email_verified',true),'email',now(),now())`, [id, email]);
    const login = await clients[index].auth.signInWithPassword({ email, password });
    assert.equal(login.error, null, 'Temporary user login failed');
    assert.equal(login.data.user?.id, id);
  }
  console.log('Passed: two temporary users authenticated through Supabase Auth');
  let received;
  const delivery = new Promise((resolve) => { received = resolve; });
  await subscribe(clients[0], ids[0], (payload) => received(payload.new));
  // Deliberately subscribe the second account to the first account's UUID.
  await subscribe(clients[1], ids[0], () => { foreignEvents += 1; });
  await database.query(`SELECT public.emit_notification($1,$2,'AVISO_SISTEMA','Prueba temporal','Entrega real de prueba')`, [ids[0], `live:${randomUUID()}`]);
  let deliveryTimeout;
  const event = await Promise.race([delivery, new Promise((_, reject) => {
    deliveryTimeout = setTimeout(() => reject(new Error('Notification delivery timeout')), 20000);
  })]).finally(() => clearTimeout(deliveryTimeout));
  assert.equal(event.user_id, ids[0]);
  console.log('Passed: committed notification delivered through Realtime');
  const own = await clients[0].from('notifications').select('*');
  assert.equal(own.error, null);
  assert.equal(own.data.length, 1);
  const foreign = await clients[1].from('notifications').select('*').eq('user_id', ids[0]);
  assert.equal(foreign.error, null);
  assert.deepEqual(foreign.data, []);
  const blockedRead = await clients[1].from('notifications').update({ is_read: true }).eq('id', event.id).select('id');
  assert.equal(blockedRead.error, null);
  assert.deepEqual(blockedRead.data, []);
  assert.equal((await clients[0].from('notifications').select('is_read').eq('id', event.id).single()).data.is_read, false);
  assert.equal((await clients[0].from('notifications').update({ is_read: true }).eq('id', event.id)).error, null);
  const session = (await clients[0].auth.getSession()).data.session;
  const freshClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  clients.push(freshClient);
  assert.equal((await freshClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })).error, null);
  assert.equal((await freshClient.from('notifications').select('is_read').eq('id', event.id).single()).data.is_read, true);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(foreignEvents, 0, 'Another account received a private Realtime event');
  console.log('Passed: API and Realtime isolate users; persisted read state survives a fresh client');
} catch (error) {
  // Never print raw connection errors, tokens, passwords, or connection strings.
  const diagnostic = error instanceof assert.AssertionError || /^Realtime |^Notification delivery/.test(error.message)
    ? error.message : (error.code ?? 'INTEGRATION_ERROR');
  console.error('Live notification verification failed:', diagnostic);
  process.exitCode = 1;
} finally {
  for (const client of clients) {
    await client.removeAllChannels();
    await client.auth.signOut().catch(() => {});
  }
  if (cleanupNeeded) {
    await database.query('DELETE FROM public.profiles WHERE id = ANY($1::uuid[])', [ids]);
    await database.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [ids]);
    console.log('Removed temporary identities and notifications');
  }
  await database.end();
}
