import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ExpedienteDocuments } from '../ExpedienteDocuments.tsx';
import { RevisionesPage } from '../../../pages/gestion/RevisionesPage.tsx';
import { useSessionStore } from '../../../stores/session.store.ts';
import { useRequestStore } from '../../requests/requestStore.ts';

const document = {
  id: 'document', application_id: 'app', requirement_id: 'req', file_name: 'Propuesta.pdf',
  file_size_bytes: 100, uploaded_at: '2026-11-13T12:00:00Z', validation_status: 'VALIDO',
  file_hash_sha256: 'a'.repeat(64), file_path: 'owner/random/Propuesta.pdf', mime_type: 'application/pdf',
};
test('document list exposes PDF viewing and original downloads; Word has an explicit download fallback', () => {
  const markup = renderToStaticMarkup(createElement(ExpedienteDocuments, {
    documents: [document, { ...document, id: 'word', file_name: 'Cronograma.docx' }],
    requirements: [{ id: 'req', name: 'Propuesta técnica' }],
  }));
  assert.match(markup, /Propuesta técnica/);
  assert.match(markup, /Ver PDF: Propuesta.pdf/);
  assert.match(markup, /Descargar original: Propuesta.pdf/);
  assert.match(markup, /Descargar original: Cronograma.docx/);
  assert.doesNotMatch(markup, /Ver PDF: Cronograma.docx/);
  assert.match(markup, /Documento Word: descargue el original/);
  assert.match(renderToStaticMarkup(createElement(ExpedienteDocuments, { documents: [], requirements: [] })), /No hay documentos adjuntos/);
});

test('reviewer sees document actions only in an active assigned review, including normalized database status', () => {
  const session = useSessionStore.getInitialState();
  const requests = useRequestStore.getInitialState();
  const beforeSession = { ...session };
  const beforeRequests = { ...requests };
  const render = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RevisionesPage)));
  try {
    Object.assign(session, { user: { id: 'reviewer', fullName: 'Revisor', activeRole: 'committee_member' } });
    Object.assign(requests, {
      requests: [{ id: 'app', filing_number: 'Radicado de prueba', title: 'Proyecto', current_status: 'UNDER_REVIEW', abstract: 'Resumen' }],
      assignments: [{ application_id: 'app', reviewer_id: 'reviewer', is_active: true }], documents: [document], observations: [],
    });
    assert.match(render(), /Ver PDF: Propuesta.pdf/);
    Object.assign(requests, { assignments: [{ application_id: 'app', reviewer_id: 'other-reviewer', is_active: true }] });
    assert.doesNotMatch(render(), /Ver PDF: Propuesta.pdf/);
    Object.assign(requests, { assignments: [{ application_id: 'app', reviewer_id: 'reviewer', is_active: false }] });
    assert.doesNotMatch(render(), /Ver PDF: Propuesta.pdf/);
  } finally {
    Object.assign(session, beforeSession);
    Object.assign(requests, beforeRequests);
  }
});
