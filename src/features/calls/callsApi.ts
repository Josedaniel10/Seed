import { getUserError } from '../../lib/userMessages.ts';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { useSessionStore } from '../../stores/session.store.ts';

export const callSchema = z.object({
  icon_key: z.string().nullable().optional(), accent_color: z.string().nullable().optional(), cover_image_path: z.string().nullable().optional(),
  id: z.string().uuid(), title: z.string(), description: z.string(), faculty: z.string(),
  audience: z.enum(['all', 'students', 'teachers']), type_ids: z.array(z.string()),
  opens_at: z.string(), closes_at: z.string(), max_amount: z.coerce.number().positive().nullable(),
  status: z.enum(['draft', 'published', 'closed', 'cancelled']), created_by: z.string(),
});
export type FundingCall = z.infer<typeof callSchema>;
export const managerSchema = z.object({ user_id: z.string(), faculty: z.string(), designation: z.string() });

export function callsClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('No pudimos consultar las convocatorias. Inténtalo nuevamente más tarde.');
  return client;
}

export async function loadCalls(): Promise<FundingCall[]> {
  const { data, error } = await callsClient().from('funding_calls').select('*').order('opens_at', { ascending: false });
  if (error) throw new Error(getUserError(error));
  return z.array(callSchema).parse(data);
}

export function useCalls() {
  const userId = useSessionStore((s) => s.user?.id);
  // Refresh time-dependent badges and eligibility even when rows have not changed.
  return useQuery({ queryKey: ['funding-calls', userId], queryFn: loadCalls, enabled: Boolean(userId), refetchInterval: 15000, structuralSharing: false });
}

export function isCallOpen(call: FundingCall, now = Date.now()): boolean {
  return call.status === 'published' && Date.parse(call.opens_at) <= now && now < Date.parse(call.closes_at);
}

export function matchesAudience(call: FundingCall, academicLink?: string): boolean {
  if (call.audience === 'all') return true;
  return (call.audience === 'students' ? /estudiante|monitor/i : /docente|profesor/i).test(academicLink ?? '');
}

export interface FundingApplicant {
  groupId?: string;
  faculty?: string;
  academicLink?: string;
}

export function matchesFundingApplicant(call: FundingCall, applicant: FundingApplicant): boolean {
  return Boolean(applicant.groupId && applicant.faculty && call.faculty === applicant.faculty
    && matchesAudience(call, applicant.academicLink));
}

export function fundingGroupError(groupId: string | undefined, applicant: FundingApplicant): string | null {
  if (!applicant.groupId || !applicant.faculty) return 'Para solicitar financiamiento necesitas un grupo de investigación activo asignado en tu perfil. Contacta al administrador para actualizarlo.';
  if (groupId !== applicant.groupId) return 'Selecciona el grupo registrado en tu perfil para solicitar financiamiento. Si tu vinculación cambió, solicita al administrador que la actualice.';
  return null;
}

export function financingError(budget: number, callId: string | undefined, calls: FundingCall[], typeId: string,
  applicant: FundingApplicant = {}, groupId?: string): string | null {
  if (!Number.isFinite(budget) || budget < 0) return 'El monto solicitado es inválido.';
  if (budget === 0) return callId ? 'El aval académico no debe vincular una convocatoria de financiamiento.' : null;
  const groupIssue = fundingGroupError(groupId, applicant);
  if (groupIssue) return groupIssue;
  const call = calls.find((item) => item.id === callId);
  if (!call || !isCallOpen(call)) return 'Seleccione una convocatoria abierta para solicitar financiamiento. Su borrador se conservará.';
  if (call.faculty !== applicant.faculty) return 'La convocatoria no corresponde al área del grupo registrado en tu perfil.';
  if (!call.type_ids.includes(typeId)) return 'La convocatoria no admite este tipo de solicitud.';
  if (!matchesAudience(call, applicant.academicLink)) return 'Tu vínculo académico no corresponde a los destinatarios de la convocatoria.';
  if (call.max_amount !== null && budget > call.max_amount) return 'El monto supera el tope de la convocatoria.';
  return null;
}

export function formatCallDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value));
}
