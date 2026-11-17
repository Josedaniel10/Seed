export function formatUserMessage(
  message: string | undefined,
  fallback = 'No se pudo completar la operación. Intente nuevamente.',
): string {
  return (message ?? fallback)
    .replace(/\s*\((?:RNF?|RF)-\d+(?:\s*,\s*(?:RNF?|RF)-\d+)*\)/g, '')
    .replace(/\b(?:RNF?|RF)-\d+:\s*/g, '')
    .trim();
}

export const USER_MESSAGES = {
  credentials: 'No pudimos iniciar sesión. Revisa tu correo y contraseña.',
  connection: 'No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.',
  rateLimit: 'Has realizado varios intentos. Espera unos minutos antes de volver a intentarlo.',
  session: 'Tu sesión terminó. Inicia sesión nuevamente para continuar.',
  permission: 'No tienes permiso para realizar esta acción. Si necesitas acceso, contacta al administrador.',
  unexpected: 'No pudimos completar esta acción. Inténtalo nuevamente. Si el problema continúa, contacta al administrador.',
};

function errorDetails(error: unknown): { message: string; code: string; status?: number } {
  if (typeof error === 'string') return { message: error, code: '' };
  if (!error || typeof error !== 'object') return { message: '', code: '' };
  return {
    message: 'message' in error && typeof error.message === 'string' ? error.message : '',
    code: 'code' in error && typeof error.code === 'string' ? error.code : '',
    status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
  };
}

// Raw provider responses never become UI copy. Business validation in Spanish is retained.
const internalDetail = /supabase|postg(?:res|rest)|\b(?:sqlstate|sql|rls|rpc|jwt|anon[_ ]?key|service[_ ]?role|api[_ ]?key|stack trace)\b|\b(?:PGRST\d+|[A-Z_]+Error)\b|\b(?:relation|column|constraint|schema|function|table)\s+["']|\b(?:relation|column|schema|constraint)\s+\S+\s+does not exist|violates .*constraint|permission denied|duplicate key|syntax error|invalid input syntax|schema cache|\bat\s+\S+\.(?:tsx?|jsx?):\d+|https?:\/\/|[a-z]:\\|\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

export function getUserError(error: unknown, fallback = USER_MESSAGES.unexpected): string {
  const { message, code, status } = errorDetails(error);
  if (internalDetail.test(fallback)) fallback = USER_MESSAGES.unexpected;
  const clean = formatUserMessage(message, fallback);
  if (status === 429 || /rate_limit|too many requests/i.test(`${code} ${message}`)) return USER_MESSAGES.rateLimit;
  if (/failed to fetch|fetch failed|network(?:error| request failed)|load failed|ECONN|ENOTFOUND|ETIMEDOUT|ERR_NETWORK/i.test(`${code} ${message}`)) return USER_MESSAGES.connection;
  if (/session_expired|refresh_token_not_found|refresh_token_already_used|bad_jwt|jwt expired/i.test(`${code} ${message}`)) return USER_MESSAGES.session;
  if (code === '42501' || status === 403 || /row.level security|permission denied/i.test(message)) return USER_MESSAGES.permission;
  if (code === '23505' || /duplicate key/i.test(message)) return 'Ya existe un registro con estos datos. Revisa la información antes de guardar.';
  if (status && status >= 500) return fallback;
  if (!clean || internalDetail.test(clean)) return fallback;
  // SDK exceptions in English and serialized validation/debug objects have no client-facing meaning.
  if (/^[\[{]|\b(?:unexpected|invalid|could not|cannot|unable to|not found|error sending|database error|internal server|unauthorized|forbidden|bad request|timeout|undefined|null is not|not a function)\b/i.test(clean)) return fallback;
  return clean;
}

export function getAuthError(error: unknown, action: 'login' | 'register' | 'verify' | 'resend'): string {
  const { message, code, status } = errorDetails(error);
  const common = getUserError(error, '');
  if ([USER_MESSAGES.connection, USER_MESSAGES.rateLimit].includes(common)) return common;
  if (action === 'login') {
    if (['invalid_credentials', 'user_not_found', 'user_banned', 'email_exists', 'invalid_grant'].includes(code)
      || status === 400 || status === 401 || status === 422 || /invalid login|invalid credentials|user not found/i.test(message)) return USER_MESSAGES.credentials;
    return 'No pudimos iniciar sesión en este momento. Inténtalo más tarde.';
  }
  if (action === 'verify') return 'El código es incorrecto o ya venció. Revisa el correo más reciente o solicita un nuevo código.';
  if (action === 'resend') return 'No pudimos enviar el correo de verificación. Inténtalo más tarde.';
  if (code === 'weak_password' || /weak password|password should/i.test(message)) return 'Elige una contraseña que cumpla los requisitos indicados en el formulario.';
  if (code === 'email_address_invalid' || /invalid email/i.test(message)) return 'Revisa que tu correo esté escrito correctamente.';
  return 'No pudimos completar el registro. Si ya tienes una cuenta, intenta iniciar sesión o recuperar el acceso.';
}
