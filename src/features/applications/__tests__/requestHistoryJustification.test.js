import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DetalleSolicitudPage } from '../../../pages/compartidas/DetalleSolicitudPage.tsx';
import { useRequestStore } from '../../requests/requestStore.ts';

function renderHistory(events) {
  const state = useRequestStore.getInitialState();
  const snapshot = { ...state };
  try {
    Object.assign(state, {
      isLoading: false, isInitialized: true,
      requests: [{ id: 'app', filing_number: 'Radicado 2026-123', title: 'Proyecto de prueba', applicant_id: 'owner',
        current_status: 'RECHAZADA', budget_requested: 0, created_at: '2026-11-14T12:00:00Z' }],
      // The historic justification must come from the audit, even after a document is replaced.
      documents: [], observations: [], assignments: [],
      auditHistory: events.map((event, i) => ({ id: `event-${i}`, application_id: 'app', created_at: '2026-11-14T12:00:00Z', ...event })),
    });
    return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/solicitudes/app?tab=historial'] },
      createElement(Routes, null, createElement(Route, { path: '/solicitudes/:id', element: createElement(DetalleSolicitudPage) }))));
  } finally {
    Object.assign(state, snapshot);
  }
}

test('history shows the documentary rejection justification saved in the audit', () => {
  const reason = 'Falta la firma del investigador.\nAdjunte el aval según RN-05: requisito institucional.';
  const markup = renderHistory([{ action: 'DOCUMENTO_RECHAZADO', details: { file_name: 'Aval.pdf', status: 'RECHAZADO', observations: reason } }]);
  assert.match(markup, /Justificación del rechazo:/);
  assert.match(markup, /Aval\.pdf/);
  assert.ok(markup.includes(reason));
  assert.match(markup, /whitespace-pre-wrap/);
});

test('technical and committee rejection reasons remain visible verbatim', () => {
  const markup = renderHistory([
    { action: 'TRANSICION_ESTADO_RECHAZADA', new_status: 'RECHAZADA', details: { reason: 'No cumple RN-05: metodología insuficiente.\nFalta evidencia.' } },
    { action: 'DECISION_COMITE', details: { justification: 'El comité rechaza por falta de viabilidad.' } },
  ]);
  assert.ok(markup.includes('No cumple RN-05: metodología insuficiente.\nFalta evidencia.'));
  assert.match(markup, /El comité rechaza por falta de viabilidad\./);
});

test('observations remain escaped and absent observations do not produce an empty rejection label', () => {
  const markup = renderHistory([{ action: 'DOCUMENTO_RECHAZADO', details: { observations: '<script>alert("test")</script>' } }]);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  assert.doesNotMatch(renderHistory([{ action: 'DOCUMENTO_RECHAZADO', details: { observations: null } }]), /Justificación del rechazo:/);
});
