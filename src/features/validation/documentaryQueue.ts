import type { AuditHistory, Request, RequestDocument } from '../../types/database.ts';

export function getDocumentVersions(documents: RequestDocument[]): Record<string, string> {
  return Object.fromEntries(documents.map((document) => [document.id,
    `${document.file_hash_sha256}:${new Date(document.uploaded_at).toISOString()}`]));
}

export function getDocumentaryQueue(
  requests: Request[], documents: RequestDocument[], history: AuditHistory[],
): Request[] {
  return requests.filter((request) => {
    if (request.current_status === 'RADICADA' || request.current_status === 'SUBMITTED') return true;
    if (request.current_status !== 'PENDIENTE_DOCUMENTOS' && request.current_status !== 'PENDING_DOCUMENTS') return false;
    const appDocuments = documents.filter((document) => (document.application_id ?? document.request_id) === request.id);
    const lastClosure = history.filter((event) => (event.application_id ?? event.request_id) === request.id
      && event.action === 'VALIDACION_DOCUMENTAL_FINALIZADA')
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))[0];
    if (!lastClosure) {
      // Older pending requests return only when a new correction has been uploaded.
      return appDocuments.some((document) => Date.parse(document.uploaded_at) > Date.parse(request.updated_at));
    }
    const versions = lastClosure.details.document_versions;
    if (!versions || typeof versions !== 'object' || Array.isArray(versions)) return false;
    const saved = new Map(Object.entries(versions));
    const current = getDocumentVersions(appDocuments);
    return Object.keys(versions).length !== appDocuments.length
      || Object.entries(current).some(([id, version]) => saved.get(id) !== version);
  }).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}
