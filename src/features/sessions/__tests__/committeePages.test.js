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
