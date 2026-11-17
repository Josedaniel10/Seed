import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseCredentials } from '../../lib/supabase.ts';
import { loadAuthenticatedSession } from '../../stores/session.store.ts';

export const PRESENTATION_EMAILS = [
  'investigador@universidad.edu.co',
  'secretario@universidad.edu.co',
  'administrativo@universidad.edu.co',
  'admin@seed.com',
  'jose.blanchar@campusucc.edu.co',
  'comite@universidad.edu.co',
] as const;

const sessions = new Map<string, Session>();
let preparationCount = 0;

export function isPresentationEnabled(): boolean {
  const env = import.meta.env;
  return env?.VITE_PRESENTATION_MODE === 'true'
    || (env?.DEV === true && env.VITE_PRESENTATION_MODE !== 'false');
}

export function isPresentationShortcut(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey
    && !event.repeat && !event.isComposing && event.code === 'Period';
}

export function rememberPresentationSession(session: Session | null): void {
  const email = session?.user.email?.toLowerCase();
  if (session && email && PRESENTATION_EMAILS.some(candidate => candidate === email)) sessions.set(email, session);
}

export function clearPresentationSessions(): void { sessions.clear(); }
export function hasPresentationSession(email: string): boolean { return sessions.has(email); }

export async function preparePresentationSession(email: string, password?: string): Promise<Session> {
  if (!PRESENTATION_EMAILS.some(candidate => candidate === email)) throw new Error('Cuenta no disponible para la presentación.');
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) throw new Error('No se pudo conectar con el servicio.');
  // Independent, memory-only authentication never changes the current user's session.
  const client = createClient(url, anonKey, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    storageKey: `seed-presentation-preparation-${++preparationCount}`,
  } });
  try {
    const saved = sessions.get(email);
    const result = password
      ? await client.auth.signInWithPassword({ email, password })
      : saved ? await client.auth.setSession(saved) : null;
    if (!result) throw new Error('Ingresa la contraseña de esta cuenta una vez para prepararla.');
    if (result.error || !result.data.session) {
      sessions.delete(email);
      throw result.error ?? new Error('Vuelve a ingresar la contraseña de esta cuenta.');
    }
    const session = result.data.session;
    if (session.user.email?.toLowerCase() !== email) throw new Error('La sesión no corresponde a la cuenta seleccionada.');
    await loadAuthenticatedSession(client, session.user);
    rememberPresentationSession(session);
    return session;
  } finally {
    await client.auth.dispose();
  }
}
