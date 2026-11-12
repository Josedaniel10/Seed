import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificacionesPage } from '../../../pages/compartidas/NotificacionesPage.tsx';
import { DetalleSolicitudPage } from '../../../pages/compartidas/DetalleSolicitudPage.tsx';
import { DetalleSesionPage } from '../../../pages/comite/DetalleSesionPage.tsx';
import { notificationKeys } from '../useNotifications.ts';
import { useSessionStore } from '../../../stores/session.store.ts';
import { useRequestStore } from '../../requests/requestStore.ts';
import { useCommitteeSessionsStore } from '../../sessions/committeeSessionsStore.ts';

const owner = '80000000-0000-4000-8000-000000000001';
const user = { id: owner, fullName: 'Investigadora', email: 'owner@example.invalid', roles: ['researcher'], activeRole: 'researcher' };
function setUser(value) {
  useSessionStore.setState({ user: value });
  useSessionStore.getInitialState().user = value;
}

test('inbox renders only the active user cache and does not advertise simulated email', () => {
  const cache = new QueryClient();
  cache.setQueryData(notificationKeys.user(owner), [{
    id: '80000000-0000-4000-8000-000000000010', user_id: owner, type: 'CAMBIO_ESTADO',
    title: 'Aviso privado de la investigadora', message: 'Mensaje de prueba', is_read: false,
    application_id: '80000000-0000-4000-8000-000000000020', session_id: null,
    target_tab: 'historial', created_at: '2026-11-11T12:00:00Z',
  }]);
  const other = '80000000-0000-4000-8000-000000000002';
  cache.setQueryData(notificationKeys.user(other), []);
  const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client: cache },
    createElement(MemoryRouter, null, createElement(NotificacionesPage))));
  try {
    setUser(user);
    const html = render();
    assert.match(html, /Aviso privado de la investigadora/);
    assert.match(html, /Sin leer \(1\)/);
    assert.match(html, /Ver solicitud/);
    assert.doesNotMatch(html, /institucional|correo enviado|copia institucional/i);
    setUser({ ...user, id: other });
    const empty = render();
    assert.doesNotMatch(empty, /Aviso privado/);
    assert.match(empty, /Aún no tiene notificaciones/);
    assert.match(empty, /Sin leer \(0\)/);
  } finally {
    setUser(null);
    cache.clear();
  }
});

test('notification detail links open saved observations and session minute tabs', () => {
  const requestState = useRequestStore.getInitialState();
  const request = requestState.requests[0];
  const previousObservations = requestState.observations;
  requestState.observations = [{
    id: 'observation-test', application_id: request.id, assignment_id: null,
    author_id: 'reviewer', category: 'AJUSTE_OBLIGATORIO', content: 'Observación real guardada en el expediente',
    is_resolved: false, applicant_response: null, created_at: '2026-11-11T12:00:00Z',
  }];
  try {
    setUser(user);
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/solicitudes/${request.id}?tab=observaciones`] },
      createElement(Routes, null, createElement(Route, { path: '/solicitudes/:id', element: createElement(DetalleSolicitudPage) }))));
    assert.match(html, /Observación real guardada en el expediente/);
    assert.doesNotMatch(html, /protocolo de bioseguridad/);
    setUser({ ...user, roles: ['committee_member'], activeRole: 'committee_member' });
    const session = useCommitteeSessionsStore.getInitialState().sessions[0];
    const minute = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/sesiones/${session.id}?tab=acta`] },
      createElement(Routes, null, createElement(Route, { path: '/sesiones/:id', element: createElement(DetalleSesionPage) }))));
    assert.match(minute, /Acta|acta/);
    assert.doesNotMatch(minute, /Agregar Expediente/);
  } finally {
    requestState.observations = previousObservations;
    setUser(null);
  }
});
