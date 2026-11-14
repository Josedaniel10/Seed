import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { act, createElement, useState } = await import('react');
const { createRoot } = await import('react-dom/client');
const { Modal } = await import('../../../components/ui/Modal.tsx');
const { MinutePdfPreview } = await import('../../minutes/MinutePdfPreview.tsx');
let root;
let setDismissible;

function Harness() {
  const [open, setOpen] = useState(true);
  const [dismissible, updateDismissible] = useState(true);
  const [value, setValue] = useState('Borrador en curso');
  setDismissible = updateDismissible;
  return createElement('div', null,
    createElement('button', { onClick: () => setOpen(true) }, 'Reabrir'),
    createElement(Modal, { isOpen: open, onClose: () => setOpen(false), title: 'Editar', isDismissible: dismissible },
      createElement('input', { value, onChange: (event) => setValue(event.target.value) })));
}
async function mount(element = createElement(Harness)) {
  const container = document.createElement('main'); document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(element); });
}
async function press(target) {
  await act(async () => { target.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true })); });
}
async function click(target) { await act(async () => { target.click(); }); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; document.body.replaceChildren();
});
after(() => dom.window.close());

test('clicking the backdrop closes the dialog after its exit animation', async () => {
  await mount();
  const dialog = document.querySelector('dialog');
  await press(dialog); await click(dialog);
  assert.equal(dialog.dataset.open, 'false');
  assert.ok(dialog.open, 'Keep the native dialog open until its exit completes');
  await act(async () => { await delay(340); });
  assert.equal(document.querySelector('dialog'), null);
  await click(document.querySelector('button'));
  assert.equal(document.querySelector('input').value, 'Borrador en curso');
});

test('blank wrapper space dismisses the modal but interacting with its content does not', async () => {
  await mount();
  const dialog = document.querySelector('dialog');
  const input = dialog.querySelector('input');
  await press(input); await click(input);
  assert.equal(dialog.dataset.open, 'true');
  const wrapper = dialog.querySelector('.responsive-overlay-panel');
  await press(wrapper); await click(wrapper);
  assert.equal(dialog.dataset.open, 'false');
});

test('a pointer gesture starting inside and ending outside does not discard the modal', async () => {
  await mount();
  const dialog = document.querySelector('dialog');
  await press(dialog.querySelector('input')); await click(dialog);
  assert.equal(dialog.dataset.open, 'true');
});

test('pending operations retain the modal on backdrop and Escape, then allow dismissal', async () => {
  await mount();
  await act(async () => { setDismissible(false); });
  const dialog = document.querySelector('dialog');
  await press(dialog); await click(dialog);
  await act(async () => { dialog.dispatchEvent(new dom.window.Event('cancel', { cancelable: true })); });
  assert.equal(dialog.dataset.open, 'true');
  await act(async () => { setDismissible(true); });
  await press(dialog); await click(dialog);
  assert.equal(dialog.dataset.open, 'false');
});

test('floating alert controls do not close the underlying modal', async () => {
  await mount();
  const dialog = document.querySelector('dialog');
  const viewport = document.createElement('div'); viewport.className = 'alert-viewport';
  const closeAlert = document.createElement('button'); viewport.append(closeAlert); dialog.append(viewport);
  await press(closeAlert); await click(closeAlert);
  assert.equal(dialog.dataset.open, 'true');
});

test('the PDF preview uses the same outside-click dismissal as other dialogs', async () => {
  let dismissals = 0;
  await mount(createElement(MinutePdfPreview, { url: 'blob:minute-preview', title: 'Acta de prueba', onClose() { dismissals++; } }));
  const dialog = document.querySelector('dialog');
  assert.equal(dialog.getAttribute('aria-label'), 'Vista previa · Acta de prueba');
  await press(dialog.querySelector('iframe')); await click(dialog.querySelector('iframe'));
  assert.equal(dismissals, 0);
  await press(dialog); await click(dialog);
  assert.equal(dismissals, 1);
});
