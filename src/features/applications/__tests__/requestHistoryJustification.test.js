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

test('assignment history shows the evaluator, assigning secretary and original deadline', () => {
  const markup = renderHistory([{ action: 'ASIGNACION_EVALUADOR', details: {
    reviewer_name: 'Dra. Primera Evaluadora', assigner_name: 'Secretaría de Investigación', deadline_date: '2026-11-20',
  } }]);
  assert.match(markup, /Evaluador asignado:/);
  assert.match(markup, /Dra\. Primera Evaluadora/);
  assert.match(markup, /Asignado por:/);
  assert.match(markup, /Secretaría de Investigación/);
  assert.match(markup, /Fecha límite de revisión:/);
  assert.match(markup, /datetime="2026-11-20">2026-11-20/i);
});

test('reassignment preserves each historical evaluator and deadline without depending on current profiles', () => {
  const markup = renderHistory([
    { action: 'ASIGNACION_EVALUADOR', details: { reviewer_name: 'Evaluador anterior', deadline_date: '2026-11-19' } },
    { action: 'REASIGNACION_EVALUADOR', details: { reviewer_name: 'Nuevo evaluador', assigner_name: 'Secretaria', deadline_date: '2026-11-25' } },
  ]);
  assert.match(markup, /Evaluador anterior/);
  assert.match(markup, /Nuevo evaluador/);
  assert.match(markup, /2026-11-19/);
  assert.match(markup, /2026-11-25/);
  assert.match(markup, /reemplaza la asignación anterior/);
  const legacy = renderHistory([{ action: 'ASIGNACION_EVALUADOR', details: { reviewer_id: 'internal-id' } }]);
  assert.doesNotMatch(legacy, /Evaluador asignado:|Asignado por:|Fecha límite de revisión:|internal-id/);
});
