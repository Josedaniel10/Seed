import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { act, createElement } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { NextActionCell } = await import('../NextActionCell.tsx');
const { useRequestStore } = await import('../requestStore.ts');
const { useSessionStore } = await import('../../../stores/session.store.ts');
const { useCatalogStore } = await import('../../catalog/catalogStore.ts');
const stores = [useRequestStore, useSessionStore, useCatalogStore];
const snapshots = stores.map((store) => store.getState());
const request = { ...snapshots[0].requests[0], id: 'compact-action', filing_number: 'Radicado 2026-021',
  applicant_id: 'owner', current_status: 'LISTA_COMITE' };
let root;
let rowClicks;

function Table() {
  const location = useLocation();
  return createElement('div', null, createElement('output', { 'aria-label': 'Ruta actual' }, location.pathname + location.search),
    createElement('table', null, createElement('tbody', null,
      createElement('tr', { onClick() { rowClicks++; } }, createElement('td', null, createElement(NextActionCell, { request }))))));
}
async function mount(role = 'researcher') {
  rowClicks = 0;
  useSessionStore.setState({ user: { id: 'owner', fullName: 'Solicitante', activeRole: role, roles: [role] } });
  useRequestStore.setState({ documents: [], observations: [], assignments: [], auditHistory: [] });
  useCatalogStore.setState({ requirements: [] });
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(createElement(MemoryRouter, { initialEntries: ['/mis-solicitudes'] }, createElement(Table))); });
}
async function click(element) { assert.ok(element); await act(async () => { element.click(); }); }
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  document.body.replaceChildren(); stores.forEach((store, index) => store.setState(snapshots[index], true));
});
after(() => dom.window.close());

test('the table shows a short summary and opens full guidance without activating the row', async () => {
  await mount();
  const cell = document.querySelector('td');
  assert.match(cell.textContent, /Programar o deliberar en comité/);
  assert.doesNotMatch(cell.textContent, /Responsable:|Sin plazo registrado/);
  await click(cell.querySelector('button'));
  assert.equal(rowClicks, 0);
  assert.equal(document.querySelector('output').textContent, '/mis-solicitudes');
  const dialog = document.querySelector('dialog[data-open="true"]');
  assert.match(dialog.textContent, /Radicado 2026-021/);
  assert.match(dialog.textContent, /Responsable: Secretaría y comité/);
  assert.match(dialog.textContent, /Sin plazo registrado/);
  assert.equal(dialog.querySelector('a').getAttribute('href'), '/solicitudes/compact-action?tab=historial');
  await click(dialog.querySelector('button[aria-label="Cerrar modal"]'));
  assert.equal(document.querySelector('dialog[data-open="true"]'), null);
  assert.equal(rowClicks, 0);
});

test('the details preserve role-aware destinations and the link does not trigger row navigation', async () => {
  await mount('secretary');
  await click(document.querySelector('td button'));
  const link = document.querySelector('dialog a');
  assert.equal(link.getAttribute('href'), '/sesiones');
  await click(link);
  assert.equal(rowClicks, 0);
  assert.equal(document.querySelector('output').textContent, '/sesiones');
});
