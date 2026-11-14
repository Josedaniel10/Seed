import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, SVGElement: dom.window.SVGElement, MutationObserver: dom.window.MutationObserver,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true });
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
const { act, createElement, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { AlertProvider } = await import('../../../components/ui/AlertProvider.tsx');
const { FloatingAlert } = await import('../../../components/ui/FloatingAlert.tsx');
let root;

async function mount(children) {
  const container = document.createElement('main');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(AlertProvider, null, children)); });
  return container;
}
async function settle(ms = 320) { await act(async () => { await delay(ms); }); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  document.body.replaceChildren();
});
after(() => dom.window.close());

test('multiple notices share one viewport outside the page flow and keep the current focus', async () => {
  const main = await mount(createElement('div', null,
    createElement('input', { 'aria-label': 'Trabajo en curso' }),
    createElement(FloatingAlert, { message: 'Documento guardado', tone: 'success' }),
    createElement(FloatingAlert, { message: 'Falta un dato requerido' })));
  const input = main.querySelector('input');
  input.focus();
  const viewports = document.querySelectorAll('.alert-viewport');
  assert.equal(viewports.length, 1);
  assert.equal(viewports[0].querySelectorAll('.alert-card').length, 2);
  assert.equal(main.querySelector('.alert-card'), null);
  assert.equal(document.activeElement, input);
  assert.match(document.querySelector('[role="status"]').textContent, /Documento guardado/);
  assert.match(document.querySelector('[role="alert"]').textContent, /Falta un dato/);
});

test('dismissal retains the notice through the exit animation and then removes it', async () => {
  let dismissals = 0;
  function Notice() {
    const [message, setMessage] = useState('Cambios guardados');
    return createElement(FloatingAlert, { message, tone: 'success', onDismiss() { dismissals++; setMessage(null); } });
  }
  await mount(createElement(Notice));
  await settle();
  await act(async () => { document.querySelector('button[aria-label="Cerrar aviso"]').click(); });
  assert.equal(dismissals, 1);
  assert.ok(document.querySelector('.alert-card'), 'The card must remain while it animates out');
  await settle();
  assert.equal(document.querySelector('.alert-card'), null);
});

test('success expiry pauses while the keyboard focus is inside the notice', async () => {
  let dismissals = 0;
  await mount(createElement(FloatingAlert, { message: 'Guardado', tone: 'success', duration: 180,
    onDismiss() { dismissals++; } }));
  const close = document.querySelector('.alert-close');
  await act(async () => { close.focus(); });
  await settle(300);
  assert.equal(dismissals, 0);
  await act(async () => { close.blur(); });
  await settle(260);
  assert.equal(dismissals, 1);
  await settle();
  assert.equal(document.querySelector('.alert-card'), null);
});

test('errors stay visible until dismissed and can be shown again after a retry', async () => {
  let update;
  function Notice() {
    const [message, setMessage] = useState('No se pudo guardar');
    update = setMessage;
    return createElement(FloatingAlert, { message });
  }
  await mount(createElement(Notice));
  await settle();
  assert.ok(document.querySelector('[role="alert"]'));
  await act(async () => { document.querySelector('.alert-close').click(); });
  await settle();
  assert.equal(document.querySelector('.alert-card'), null);
  await act(async () => { update(null); });
  await act(async () => { update('No se pudo guardar'); });
  assert.match(document.querySelector('[role="alert"]').textContent, /No se pudo guardar/);
});

test('the shared viewport follows the active native dialog and returns to the page on close', async () => {
  await mount(createElement(FloatingAlert, { message: 'No se pudo completar la acción' }));
  const dialog = document.createElement('dialog');
  await act(async () => { document.body.append(dialog); dialog.setAttribute('open', ''); });
  assert.equal(dialog.querySelectorAll('.alert-viewport').length, 1);
  assert.match(dialog.textContent, /No se pudo completar/);
  await act(async () => { dialog.removeAttribute('open'); });
  assert.equal(dialog.querySelector('.alert-viewport'), null);
  assert.equal(document.body.querySelector(':scope > .alert-viewport').querySelectorAll('.alert-card').length, 1);
});

test('unmounting a page cancels its pending notification timeout', async () => {
  let dismissals = 0;
  await mount(createElement(FloatingAlert, { message: 'Guardado', tone: 'success', duration: 120,
    onDismiss() { dismissals++; } }));
  await act(async () => { root.unmount(); });
  root = null;
  await settle(200);
  assert.equal(dismissals, 0);
  assert.equal(document.querySelector('.alert-viewport'), null);
});
