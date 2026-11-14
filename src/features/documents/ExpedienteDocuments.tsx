import type { ReactElement } from 'react';
import type { AuditHistory, RequestDocument, Requirement } from '../../types/database.ts';
import { DocumentFileActions } from './DocumentFileActions.tsx';
import { DocumentValidationBadge } from './DocumentValidationBadge.tsx';
import { DocumentCorrectionNotice } from './DocumentCorrectionNotice.tsx';
import { getDocumentCorrection } from './documentCorrection.ts';

export function ExpedienteDocuments({ documents, requirements, auditHistory = [] }: {
  documents: RequestDocument[]; requirements: Requirement[]; auditHistory?: readonly AuditHistory[];
}): ReactElement {
  return <section aria-label="Documentos del expediente" className="space-y-3">
    <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">Documentos del expediente ({documents.length})</h3>
    {documents.length === 0 && <p className="text-stone-500">No hay documentos adjuntos a este expediente.</p>}
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {documents.map((document) => <article key={`${document.id}-${document.file_hash_sha256}-${document.uploaded_at}`}
        className="min-w-0 space-y-3 rounded-xl border border-[#E5E3DC] bg-white p-4">
        <p className="font-semibold text-[#14281D]">{requirements.find((item) => item.id === document.requirement_id)?.name || 'Soporte documental'}</p>
        <p className="break-words font-medium text-stone-800">{document.file_name}</p>
        <p className="text-stone-500">{(document.file_size_bytes / (1024 * 1024)).toFixed(2)} MB · {new Date(document.uploaded_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
        <DocumentValidationBadge status={document.validation_status} />
        {getDocumentCorrection(document, auditHistory) && <DocumentCorrectionNotice document={document} />}
        <DocumentFileActions document={document} />
      </article>)}
    </div>
  </section>;
}
