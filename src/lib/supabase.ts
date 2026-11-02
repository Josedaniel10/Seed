import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase in Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-seed-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2stc2VlZC1wcm9qZWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.mock-signature';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Cliente de Supabase para Seed
 * Maneja autenticación de usuarios, consultas con políticas RLS y suscripciones en tiempo real.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Función de verificación de conectividad con Supabase
 * Ejecuta una consulta ligera o ping de autenticación para comprobar el estado de conexión
 */
export async function testSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  url: string;
  message: string;
}> {
  const start = performance.now();
  const url = supabaseUrl;

  if (!isSupabaseConfigured) {
    return {
      configured: false,
      connected: true, // Modo demo / desarrollo inicial
      latencyMs: Math.round(performance.now() - start),
      url: `${url} (Modo de desarrollo/demo activo)`,
      message: 'Cliente de Supabase inicializado correctamente con configuración de desarrollo. Se conectará a tu proyecto en la nube al ingresar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno.',
    };
  }

  try {
    // Intento de consulta de sesión para probar conectividad
    const { error } = await supabase.auth.getSession();
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        configured: true,
        connected: false,
        latencyMs: latency,
        url,
        message: `Error de respuesta en Supabase: ${error.message}`,
      };
    }

    return {
      configured: true,
      connected: true,
      latencyMs: latency,
      url,
      message: 'Conexión a Supabase establecida y verificada con éxito.',
    };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - start);
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return {
      configured: true,
      connected: false,
      latencyMs: latency,
      url,
      message: `Fallo al conectar con Supabase: ${errorMsg}`,
    };
  }
}
