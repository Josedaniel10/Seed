import { requirementsForRequest } from '../catalog/catalogSnapshot.ts';
import type { Request, RequestDocument, Requirement, Observation, ReviewerAssignment } from '../../types/database.ts';
import { getDocumentaryQueue } from '../validation/documentaryQueue.ts';
import type { AuditHistory } from '../../types/database.ts';

export interface NextAction {
  title: string;
  pending: string[];
  responsible: string;
  responsibleId?: string;
  roles: string[];
  href: string;
  button: string;
  deadline: string | null;
}

export function getNextAction(request: Request, data: {
  documents: RequestDocument[]; requirements: Requirement[]; observations: Observation[];
  assignments: ReviewerAssignment[]; auditHistory: AuditHistory[];
}): NextAction {
  const detail = `/solicitudes/${request.id}`;
  const base: NextAction = { title: 'Consultar resultado del expediente', pending: [], responsible: 'Sin acción pendiente',
    roles: [], href: `${detail}?tab=historial`, button: 'Consultar historial', deadline: null };
  const docs = data.documents.filter(d => (d.application_id ?? d.request_id) === request.id);
  const requirements = requirementsForRequest(request, data.requirements);
  const pendingDocs = requirements.filter(r => (r.is_mandatory && !docs.some(d => d.requirement_id === r.id))
    || docs.some(d => d.requirement_id === r.id && ['RECHAZADO', 'REJECTED'].includes(d.validation_status))).map(r => r.name);
  switch (request.current_status) {
    case 'PENDING_DOCUMENTS': case 'PENDIENTE_DOCUMENTOS':
      if (!getDocumentaryQueue([request], docs, data.auditHistory).length) return { ...base,
        title: 'Subsanar documentos', pending: pendingDocs, responsible: 'Investigador solicitante', responsibleId: request.applicant_id,
        roles: ['researcher'], href: `${detail}?tab=documentos`, button: 'Subsanar documentos' };
      return { ...base, title: 'Revisar documentos subsanados', pending: pendingDocs, responsible: 'Validación documental',
        roles: ['administrative', 'secretary'], href: '/validacion', button: 'Validar documentos' };
    case 'SUBMITTED': case 'RADICADA':
      return { ...base, title: 'Completar validación documental', pending: pendingDocs, responsible: 'Validación documental',
        roles: ['administrative', 'secretary'], href: '/validacion', button: 'Validar documentos' };
    case 'UNDER_REVIEW': case 'EN_REVISION': {
      const assignment = data.assignments.find(a => (a.application_id ?? a.request_id) === request.id && a.is_active);
      if (!assignment) return { ...base, title: 'Asignar evaluador técnico', responsible: 'Secretaría del comité', roles: ['secretary'], href: '/asignaciones', button: 'Asignar evaluador' };
      const pending = data.observations.filter(o => (o.application_id ?? o.request_id) === request.id && !o.is_resolved
        && ['AJUSTE_OBLIGATORIO', 'MANDATORY_ADJUSTMENT'].includes(o.category));
      const unanswered = pending.filter(o => !o.applicant_response || o.verified_at);
      if (unanswered.length) return { ...base, title: 'Responder ajustes obligatorios', pending: unanswered.map(o => o.content),
        responsible: 'Investigador solicitante', responsibleId: request.applicant_id, roles: ['researcher'],
        href: `${detail}?tab=observaciones`, button: 'Responder ajustes' };
      return { ...base, title: pending.length ? 'Verificar respuestas a los ajustes' : 'Emitir concepto técnico', pending: pending.map(o => o.content),
        responsible: 'Evaluador asignado', responsibleId: assignment.reviewer_id, roles: ['committee_member'],
        href: '/revisiones', button: pending.length ? 'Verificar ajustes' : 'Revisar expediente', deadline: assignment.deadline_date };
    }
    case 'COMMITTEE_READY': case 'LISTA_COMITE':
      return { ...base, title: 'Programar o deliberar en comité', responsible: 'Secretaría y comité', roles: ['secretary', 'committee_member'], href: '/sesiones', button: 'Consultar sesiones' };
    case 'APPROVED_WITH_ADJUSTMENTS': case 'APROBADA_CON_AJUSTES':
      return { ...base, title: 'Consultar los ajustes acordados en comité', responsible: 'Investigador y secretaría',
        pending: ['Consulte la decisión y coordine la entrega de los ajustes con secretaría.'], href: `${detail}?tab=historial` };
    case 'APPROVED': case 'APROBADA': return { ...base, title: 'Solicitud aprobada · consultar decisión' };
    case 'REJECTED': case 'RECHAZADA': return { ...base, title: 'Solicitud rechazada · consultar motivos' };
    case 'CLOSED': case 'CERRADA': return { ...base, title: 'Expediente cerrado · consultar historial' };
    default: return base;
  }
}
