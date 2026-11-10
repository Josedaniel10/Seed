import { createClient } from 'npm:@supabase/supabase-js@2';

const roles = new Set(['investigador', 'administrativo', 'integrante_comite', 'secretario', 'lider_grupo', 'admin']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: { id: string } | { error: string }, status: number): Response {
  return Response.json(body, { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);

  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply({ error: 'Inicie sesión como administrador.' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return reply({ error: 'Configuración de Supabase incompleta.' }, 500);

  const authOptions = { persistSession: false, autoRefreshToken: false };
  const caller = createClient(url, anonKey, {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser(token);
  if (authError || !user) return reply({ error: 'La sesión no es válida.' }, 401);

  const { data: canCreate, error: roleError } = await caller.rpc('auth_user_has_role', { p_role: 'admin' });
  if (roleError || canCreate !== true) return reply({ error: 'Solo un administrador activo puede crear cuentas.' }, 403);

  const form: unknown = await request.json().catch(() => null);
  if (!form || typeof form !== 'object' || !('email' in form) || !('password' in form)
    || !('fullName' in form) || !('program' in form) || !('role' in form)
    || typeof form.email !== 'string' || typeof form.password !== 'string'
    || typeof form.fullName !== 'string' || typeof form.program !== 'string' || typeof form.role !== 'string'
    || !form.email.trim() || form.password.length < 8 || !form.fullName.trim() || !form.program.trim()
    || !roles.has(form.role)) {
    return reply({ error: 'Complete los datos, el rol y una contraseña de al menos ocho caracteres.' }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: authOptions });
  const { data, error } = await admin.auth.admin.createUser({
    email: form.email.trim().toLowerCase(),
    password: form.password,
    email_confirm: true,
    app_metadata: { seed_initial_role: form.role },
    user_metadata: { full_name: form.fullName.trim(), academic_program: form.program.trim() },
  });
  if (error || !data.user) {
    return reply({ error: error?.message ?? 'Supabase no confirmó la creación de la cuenta.' }, 400);
  }
  return reply({ id: data.user.id }, 201);
});
