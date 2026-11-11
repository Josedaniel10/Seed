import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SesionesPage } from '../../../pages/comite/SesionesPage.tsx';
import { DetalleSesionPage } from '../../../pages/comite/DetalleSesionPage.tsx';
import { SessionMinutesPanel } from '../../minutes/SessionMinutesPanel.tsx';
import { useSessionStore } from '../../../stores/session.store.ts';
import { useCommitteeSessionsStore } from '../committeeSessionsStore.ts';
import { useMinutesStore } from '../../minutes/minutesStore.ts';
import { NonDeliberationPanel } from '../NonDeliberationPanel.tsx';

// Server rendering reads Zustand's initial snapshot. Set both snapshots for these fixtures.
function setUser(user) {
  useSessionStore.setState({ user });
  useSessionStore.getInitialState().user = user;
}

function renderPage(component) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component)));
}

test('secretary actions support normalized roles and committee members have read-only access', () => {
  const user = { id: 'secretary', fullName: 'Secretaría', email: 'secretary@example.invalid', roles: ['secretary'], activeRole: 'secretary' };
  setUser(user);
  assert.match(renderPage(SesionesPage), /Programar Nueva Sesión/);
  setUser({ ...user, activeRole: 'committee_member' });
  assert.doesNotMatch(renderPage(SesionesPage), /Programar Nueva Sesión/);
  setUser({ ...user, activeRole: 'secretario' });
  assert.match(renderPage(SesionesPage), /Programar Nueva Sesión/);
});

test('session detail renders the persisted agenda and minutes generation requires completion', () => {
  const session = useCommitteeSessionsStore.getState().sessions[0];
  const detail = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/sesiones/${session.id}`] },
    createElement(Routes, null, createElement(Route, { path: '/sesiones/:id', element: createElement(DetalleSesionPage) }))));
  assert.match(detail, /Finalizar Sesión/);
  assert.match(detail, /Cambiar|Ponente/);
  useMinutesStore.setState({ minutes: [] });
  useMinutesStore.getInitialState().minutes = [];
  const incomplete = renderToStaticMarkup(createElement(SessionMinutesPanel, { sessionId: session.id, isCompleted: false, canManage: true }));
  assert.match(incomplete, /<button disabled=""[^>]*>Generar borrador/);
  const completed = renderToStaticMarkup(createElement(SessionMinutesPanel, { sessionId: session.id, isCompleted: true, canManage: true }));
  assert.doesNotMatch(completed, /<button disabled=""/);
  const readonly = renderToStaticMarkup(createElement(SessionMinutesPanel, { sessionId: session.id, isCompleted: true, canManage: false }));
  assert.doesNotMatch(readonly, /<button/);
});

test('a constancy resolves its agenda item and retains the recorded conflict for readers', () => {
  const store = useCommitteeSessionsStore;
  const session = store.getState().sessions[0];
  const item = store.getState().getAgendaBySession(session.id)[0];
  const record = {
    id: 'constancy', session_id: session.id, application_id: item.application_id,
    reason: 'Faltan asistentes habilitados.', eligible_count: 1, required_count: 2,
    attendance_snapshot: [{ user_id: 'reviewer', name: 'Integrante excluido', attended: true,
      exclusion_reason: 'Pertenece al mismo grupo de investigación de la solicitud.' }],
    registered_by: 'secretary', created_at: '2028-01-01T12:00:00Z',
  };
  const sessions = store.getState().sessions.map((entry) => entry.id === session.id
    ? { ...entry, is_agenda_closed: true } : entry);
  store.setState({ sessions, nonDeliberations: [record] });
  Object.assign(store.getInitialState(), { sessions, nonDeliberations: [record] });
  const detail = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/sesiones/${session.id}`] },
    createElement(Routes, null, createElement(Route, { path: '/sesiones/:id', element: createElement(DetalleSesionPage) }))));
  assert.match(detail, /Todos los puntos tienen una decisión o una constancia/);
  assert.match(detail, /No deliberada por falta de quórum/);
  assert.doesNotMatch(detail, /<button disabled=""[^>]*>Finalizar Sesión/);
  const panel = renderToStaticMarkup(createElement(NonDeliberationPanel, {
    sessionId: session.id, applicationId: item.application_id, record, canRecord: false, onRecorded() {},
  }));
  assert.match(panel, /Integrante excluido/);
  assert.match(panel, /mismo grupo/);
  assert.match(panel, /permanece lista para comité/);
  assert.doesNotMatch(panel, /<button/);
});
