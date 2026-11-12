import { z } from 'zod';
import type { CommitteeMinutes, CommitteeSession, SessionAttendance } from '../../types/database.ts';
import { ROLE_LABELS } from '../../lib/permissions.ts';
import { parseMinuteDocument, type MinuteDocument } from './pdf/minuteDocument.ts';

const text = z.string().max(50000);
const topicSchema = z.object({ order: text, title: text, speaker: text, result: text, paragraphs: z.array(text) });
const snapshotSchema = z.object({
  date: text, time: text, location: text, session: text, openingNotes: z.array(text),
  attendees: z.array(z.object({ name: text, role: text, status: text, notes: text })),
  attendanceNotes: z.array(text), agenda: z.array(topicSchema), development: z.array(topicSchema),
  commitments: z.array(z.object({ action: text, responsible: text, deadline: text })),
  additionalSections: z.array(z.object({ title: text, paragraphs: z.array(text) })), signatureNotes: z.array(text),
});

export const minuteEditorialSchema = z.object({
  closingTime: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Indique una hora válida.'),
  topicNotes: z.array(z.object({ text })),
  commitments: z.array(z.object({
    action: z.string().max(4000), responsible: z.string().max(300),
    responsibleUserId: z.string().max(100),
    deadlineType: z.enum(['date', 'next_session', 'pending', 'legacy']),
    deadline: z.string().max(300),
  })).max(100),
  observations: text,
  signatories: z.array(z.object({ name: z.string().max(150), role: z.string().max(150) })).max(12),
});

const contentSchema = z.object({
  format: z.literal('seed.committee-minute'), version: z.literal(1),
  sourceText: z.string().max(2000000), snapshot: snapshotSchema, editorial: minuteEditorialSchema,
});
export type MinuteEditorial = z.infer<typeof minuteEditorialSchema>;
export type MinuteContent = z.infer<typeof contentSchema>;

/** Versioned document stored through the existing minutes RPC and immutable approval flow. */
export function readMinuteContent(value: string): MinuteContent | null {
  if (!value.trimStart().startsWith('{')) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return null; }
  const result = contentSchema.safeParse(parsed);
  if (result.success) return result.data;
  if (typeof parsed === 'object' && parsed !== null && 'format' in parsed && parsed.format === 'seed.committee-minute') {
    throw new Error('No se puede abrir esta versión del acta. Actualice la aplicación o contacte al administrador.');
  }
  return null;
}

export function createMinuteContent(minute: CommitteeMinutes, context?: { session?: CommitteeSession; attendance: SessionAttendance[] }): MinuteContent {
  const existing = readMinuteContent(minute.draft_content);
  if (existing) return existing;
  const snapshot = parseMinuteDocument(minute);
  if (!minute.is_approved && context?.session?.id === minute.session_id) {
    if (!snapshot.session) snapshot.session = context.session.session_number;
    if (!snapshot.attendanceNotes.some((note) => /mínimo|quórum/i.test(note))) {
      snapshot.attendanceNotes.push(`Mínimo de asistencia de la sesión: ${context.session.quorum_required} integrantes. La participación habilitada para cada solicitud se registra en su resultado o constancia.`);
    }
    snapshot.attendees = snapshot.attendees.map((person) => {
      const role = context.attendance.find((entry) => entry.session_id === minute.session_id && entry.user_name === person.name)?.user_role;
      return { ...person, role: person.role || (role && ROLE_LABELS[role]) || '' };
    });
  }
  return {
    format: 'seed.committee-minute', version: 1, sourceText: minute.draft_content, snapshot,
    editorial: {
      closingTime: '', topicNotes: snapshot.development.map(() => ({ text: '' })),
      commitments: snapshot.commitments.map((row) => ({ ...row, responsibleUserId: '', deadlineType: 'legacy' })),
      observations: '', signatories: [{ name: '', role: 'Presidencia del comité' }, { name: '', role: 'Secretaría técnica' }],
    },
  };
}

export function serializeMinuteContent(content: MinuteContent, editorial: MinuteEditorial): string {
  const validated = minuteEditorialSchema.parse(editorial);
  if (validated.topicNotes.length !== content.snapshot.development.length) throw new Error('Revise los puntos tratados del acta.');
  return JSON.stringify(contentSchema.parse({ ...content, editorial: validated }));
}

export function minuteApprovalErrors(editorial: MinuteEditorial): string[] {
  const errors: string[] = [];
  if (editorial.signatories.length < 2 || editorial.signatories.some((person) => !person.name.trim() || !person.role.trim())) {
    errors.push('Complete el nombre y cargo de al menos dos firmantes.');
  }
  for (const [index, row] of editorial.commitments.entries()) {
    if (!row.action.trim() || !row.responsible.trim()) errors.push(`Complete la acción y el responsable del compromiso ${index + 1}.`);
    if (row.deadlineType === 'date' && !isValidDate(row.deadline)) errors.push(`Indique una fecha válida para el compromiso ${index + 1}.`);
    if (row.deadlineType === 'legacy' && !row.deadline.trim()) errors.push(`Seleccione el plazo del compromiso ${index + 1}.`);
  }
  return errors;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function minuteDocument(minute: CommitteeMinutes): MinuteDocument {
  const content = readMinuteContent(minute.draft_content);
  if (!content) return parseMinuteDocument(minute);
  const { snapshot, editorial } = content;
  return {
    ...snapshot,
    time: snapshot.time + (editorial.closingTime ? ` · Cierre ${editorial.closingTime}` : ''),
    development: snapshot.development.map((topic, index) => ({ ...topic,
      paragraphs: [...topic.paragraphs, ...(editorial.topicNotes[index]?.text.trim() ? [editorial.topicNotes[index].text] : [])],
    })),
    commitments: editorial.commitments.map((row) => ({ action: row.action, responsible: row.responsible,
      deadline: row.deadlineType === 'next_session' ? 'Próxima sesión' : row.deadlineType === 'pending' ? 'Por definir'
        : row.deadlineType === 'date' && isValidDate(row.deadline) ? row.deadline.split('-').reverse().join('/') : row.deadline,
    })),
    additionalSections: [...snapshot.additionalSections,
      ...(editorial.observations.trim() ? [{ title: 'Observaciones generales', paragraphs: [editorial.observations] }] : [])],
    signatories: editorial.signatories,
  };
}
