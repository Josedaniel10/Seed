import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getUserError, getAuthError, formatUserMessage, USER_MESSAGES } from '../../../lib/userMessages.ts';

test('technical details are replaced while useful business validation remains unchanged', () => {
  for (const message of [
    'column cover_image_path does not exist', 'relation "profiles" does not exist',
    'Supabase Auth: account does not exist', 'PGRST202: schema cache failure',
    'TypeError: Cannot read properties of undefined', '{"code":"23503","details":"foreign key"}',
    'Error en https://example.invalid/rest/v1/profiles', 'Error del usuario 80000000-0000-4000-8000-000000000001',
    'violates foreign key constraint "applications_owner_fkey"',
  ]) assert.equal(getUserError(message, 'No pudimos guardar los cambios.'), 'No pudimos guardar los cambios.');
  for (const message of ['El archivo supera el tamaño máximo permitido de 10 MB.', 'Ya existe un trámite con ese código.', 'Código ya utilizado', 'Debe adjuntar todos los requisitos obligatorios.']) {
    assert.equal(getUserError(message), message);
  }
  assert.equal(getUserError(undefined, 'Error interno de Supabase'), USER_MESSAGES.unexpected);
  assert.equal(formatUserMessage('Estudiar SQL y RPC (RF-01)'), 'Estudiar SQL y RPC');
});

test('network, expired sessions, permissions and rate limits get actionable messages', () => {
  assert.equal(getUserError({ message: 'Failed to fetch' }), USER_MESSAGES.connection);
  assert.equal(getUserError({ code: '42501', message: 'permission denied for table profiles' }), USER_MESSAGES.permission);
  assert.equal(getUserError({ code: 'bad_jwt', message: 'JWT expired' }), USER_MESSAGES.session);
  assert.equal(getUserError({ status: 429, message: 'provider details' }), USER_MESSAGES.rateLimit);
});

test('authentication hides account existence and provider messages but distinguishes connection and service failures', () => {
  for (const code of ['invalid_credentials', 'user_not_found', 'user_banned', 'invalid_grant']) {
    assert.equal(getAuthError({ code, status: 400, message: 'private provider details' }, 'login'), USER_MESSAGES.credentials);
  }
  assert.equal(getAuthError({ code: 'over_email_send_rate_limit', status: 429 }, 'resend'), USER_MESSAGES.rateLimit);
  assert.equal(getAuthError(new TypeError('Failed to fetch'), 'login'), USER_MESSAGES.connection);
  assert.match(getAuthError({ status: 503, message: 'database unavailable' }, 'login'), /en este momento/);
  assert.equal(getAuthError({ code: 'user_already_exists' }, 'register'), getAuthError(new Error('unexpected'), 'register'));
  assert.match(getAuthError({ code: 'weak_password' }, 'register'), /requisitos indicados/);
});
