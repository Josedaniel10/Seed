import type { AuditHistory, RequestDocument } from '../../types/database.ts';

/** Match the saved version, not just a past correction for the same requirement. */
export function getDocumentCorrection(document: RequestDocument, history: readonly AuditHistory[]): AuditHistory | undefined {
  return history.filter((event) => event.action === 'SUBSANACION_DOCUMENTO'
    && (event.application_id ?? event.request_id) === (document.application_id ?? document.request_id)
    && event.details.requirement_id === document.requirement_id
    && event.details.file_hash_sha256 === document.file_hash_sha256
    && (typeof event.details.file_path !== 'string' || event.details.file_path === document.file_path))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}
