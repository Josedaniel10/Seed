import { getUserError } from './userMessages.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Claves de almacenamiento local para configuración dinámica en navegador
export const STORAGE_KEY_URL = 'seed_supabase_url';
export const STORAGE_KEY_ANON_KEY = 'seed_supabase_anon_key';

/**
 * Obtiene las credenciales de Supabase desde variables de entorno o almacenamiento local
 */
export function getSupabaseCredentials(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'storage' | 'none';
} {
  // 1. Verificar variables de entorno primero
  const env = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : (typeof process !== 'undefined' ? process.env : {});

  const envUrl = (env.VITE_SUPABASE_URL as string) || '';
  const envKey = (env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey && !envUrl.includes('mock-seed-project')) {
    return { url: envUrl, anonKey: envKey, isConfigured: true, source: 'env' };
  }

  // 2. Verificar almacenamiento local (configuración interactiva del usuario en UI)
  if (typeof window !== 'undefined' && window.localStorage) {
    const localUrl = window.localStorage.getItem(STORAGE_KEY_URL);
    const localKey = window.localStorage.getItem(STORAGE_KEY_ANON_KEY);
    if (localUrl && localKey) {
      return { url: localUrl, anonKey: localKey, isConfigured: true, source: 'storage' };
    }
  }

  return { url: envUrl || '', anonKey: envKey || '', isConfigured: false, source: 'none' };
}

let cachedClient: SupabaseClient | null = null;
let lastClientUrl = '';
let lastClientKey = '';

/**
 * Obtiene la instancia activa del cliente de Supabase
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  // Reutilizar cliente si no han cambiado las credenciales
  if (cachedClient && lastClientUrl === url && lastClientKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastClientUrl = url;
    lastClientKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Error al inicializar cliente de Supabase:', err);
    return null;
  }
}

/**
 * Guarda credenciales de Supabase ingresadas por el usuario en el navegador
 */
export function saveSupabaseCredentials(url: string, anonKey: string): { success: boolean; error?: string } {
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { success: false, error: 'La URL debe comenzar con https:// (ej. https://tu-proyecto.supabase.co)' };
  }

  if (trimmedKey.length < 20) {
    return { success: false, error: 'La clave de conexión parece incompleta. Revisa el valor e inténtalo nuevamente.' };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_URL, trimmedUrl);
    window.localStorage.setItem(STORAGE_KEY_ANON_KEY, trimmedKey);
  }

  // Resetear cliente cacheado para forzar reconexión con las nuevas credenciales
  cachedClient = null;
  lastClientUrl = '';
  lastClientKey = '';

  return { success: true };
}

/**
 * Elimina las credenciales guardadas en el navegador
 */
export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY_URL);
    window.localStorage.removeItem(STORAGE_KEY_ANON_KEY);
  }
  cachedClient = null;
  lastClientUrl = '';
  lastClientKey = '';
}

/**
 * Exportación directa del cliente por compatibilidad
 */
export const supabase = {
  get auth() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('No se pudo conectar con el servicio. Intente nuevamente.');
    }
    return client.auth;
  },
  from(table: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('No se pudo conectar con el servicio. Intente nuevamente.');
    }
    return client.from(table);
  },
};

export const isSupabaseConfigured = () => getSupabaseCredentials().isConfigured;

/**
 * Comprueba la conectividad en vivo con el proyecto de Supabase
 */
export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  url: string;
  message: string;
}> {
  const start = performance.now();
  const creds = getSupabaseCredentials();

  if (!creds.isConfigured || !creds.url || !creds.anonKey) {
    return {
      configured: false,
      connected: false,
      latencyMs: 0,
      url: 'Sin configurar',
      message: 'El servicio todavía no está disponible. Contacta al administrador.',
    };
  }

  try {
    const client = getSupabaseClient();
    if (!client) {
      return {
        configured: true,
        connected: false,
        latencyMs: 0,
        url: creds.url,
        message: 'No se pudo instanciar el cliente con las credenciales proporcionadas.',
      };
    }

    // Ping real a Supabase Auth
    const { error } = await client.auth.getSession();
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        configured: true,
        connected: false,
        latencyMs: latency,
        url: creds.url,
        message: getUserError(error, 'No pudimos comprobar la conexión. Inténtalo nuevamente.'),
      };
    }

    return {
      configured: true,
      connected: true,
      latencyMs: latency,
      url: creds.url,
      message: `La conexión está disponible. Tiempo de respuesta: ${latency} ms.`,
    };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - start);
    const msg = getUserError(err, 'Error desconocido al conectar con Supabase');
    return {
      configured: true,
      connected: false,
      latencyMs: latency,
      url: creds.url,
      message: `Error de red: ${msg}`,
    };
  }
}
