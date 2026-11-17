import assert from 'node:assert/strict';
import { test, afterEach, after } from 'node:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CatalogManagement } = await import('../CatalogManagement.tsx');
const { useCatalogStore } = await import('../catalogStore.ts');
const initial = useCatalogStore.getState();
const type = { id: 'type', code: 'CODE', name: 'Trámite de prueba', is_active: true, requires_committee: true, display_order: 1 };
const req = { id: 'req', application_type_id: 'type', name: 'Documento de prueba', is_active: true, is_mandatory: true,
  is_subsanable: true, allowed_formats: ['application/pdf'], cure_deadline_days: 5, max_size_mb: 10, template_url: null };
let root;
async function mount() {
  useCatalogStore.setState({ types: [type], requirements: [req], selectedTypeId: 'type', searchQuery: '', filterStatus: 'ALL',
    isInitialized: true, isLoading: false, loadFromSupabase: async () => ({ success: true }) });
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(CatalogManagement)));
}
async function click(selector) {
  const element = document.querySelector(selector); assert.ok(element, selector);
  await act(async () => element.click());
}
afterEach(async () => { if (root) await act(async () => root.unmount()); root=null; document.body.replaceChildren(); useCatalogStore.setState(initial); });
after(() => dom.window.close());

test('catalog requires confirmation before removing a type', async () => {
  let deletes = 0;
  await mount();
  await act(async () => useCatalogStore.setState({ deleteType: async () => { deletes++; return { success: true }; } }));
  await click('button[title="Eliminar trámite"]');
  assert.equal(deletes, 0);
  assert.match(document.querySelector('dialog').textContent, /se archivan/);
  const confirm = [...document.querySelectorAll('dialog button')].find(button => button.textContent === 'Eliminar o archivar trámite');
  assert.ok(confirm); await act(async () => confirm.click());
  assert.equal(deletes, 1);
});

test('failed edits keep the form open and show the server error', async () => {
  await mount();
  await act(async () => useCatalogStore.setState({ updateType: async () => ({ success: false, error: 'Código ya utilizado' }) }));
  await click('button[title="Editar tipo"]');
  const form = document.querySelector('form'); assert.ok(form);
  await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
  assert.match(document.body.textContent, /Código ya utilizado/);
  assert.ok(document.querySelector('form'));
  assert.equal(document.querySelector('fieldset').disabled, false);
});

test('requirement editor exposes a labeled real file input with format and size instructions', async () => {
  await mount();
  await click('button[title="Editar requisito"]');
  const input = document.querySelector('#catalog-template'); assert.ok(input);
  assert.equal(input.type, 'file');
  assert.equal(input.accept, '.pdf,.docx,.xlsx');
  assert.ok(document.querySelector('label[for="catalog-template"]'));
  assert.equal(input.getAttribute('aria-describedby'), 'catalog-template-help');
  assert.match(document.querySelector('#catalog-template-help').textContent, /10 MB/);
});
