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
const { CallEditor } = await import('../CallEditor.tsx');
const types = [{ id: 'type', name: 'Aval de investigación', code: 'AVAL', is_active: true }];
const call = { id: 'draft', title: 'Proyecto semilla', description: 'Requisitos completos para esta convocatoria.',
  faculty: 'Ingeniería', audience: 'students', type_ids: ['type'], status: 'draft', max_amount: 5000000,
  opens_at: '2027-01-10T13:00:00Z', closes_at: '2027-02-10T22:00:00Z' };
let root;
let saves;
let cancellations;
async function mount(existing = null, save) {
  saves = []; cancellations = 0;
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(CallEditor, { call: existing, faculties: ['Ingeniería'], types,
    onCancel() { cancellations++; }, onSave: save ?? (async (value) => { saves.push(value); }) })));
}
async function submit() {
  await act(async () => document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
}
async function fill(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
async function clickText(text) {
  const button = [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === text);
  assert.ok(button, text); await act(async () => button.click());
}
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; document.body.replaceChildren();
});
after(() => dom.window.close());

test('creation guides required information, participants and dates before reviewing and saving', async () => {
  await mount();
  await submit(); assert.match(document.querySelector('[role="alert"]').textContent, /descripción/);
  await fill('title', 'Nueva oportunidad'); await fill('description', 'Requisitos y criterios completos para participar.');
  await submit(); assert.match(document.querySelector('h2').textContent, /quiénes/);
  await submit(); assert.match(document.querySelector('[role="alert"]').textContent, /al menos un tipo/);
  await act(async () => document.querySelector('input[type="checkbox"]').click());
  await submit();
  await fill('opens_at', '2027-01-10T08:00'); await fill('closes_at', '2027-01-09T08:00');
  await submit(); assert.match(document.querySelector('[role="alert"]').textContent, /posteriores/);
  await fill('closes_at', '2027-02-10T17:00'); await submit();
  assert.equal(saves.length, 0);
  assert.match(document.body.textContent, /Guardar no publica/);
  assert.match(document.body.textContent, /Sin tope individual definido/);
  await clickText('Anterior'); assert.equal(document.querySelector('[name="opens_at"]').value, '2027-01-10T08:00');
  await submit(); await submit();
  assert.equal(saves.length, 1);
  assert.deepEqual(saves[0], { id: undefined, icon_key: 'megaphone', accent_color: 'forest', cover_image_path: null, cover_file: null, title: 'Nueva oportunidad', description: 'Requisitos y criterios completos para participar.',
    faculty: 'Ingeniería', audience: 'all', type_ids: ['type'], opens_at: '2027-01-10T13:00:00.000Z',
    closes_at: '2027-02-10T22:00:00.000Z', max_amount: null });
});

test('editing retains existing values and a failed save can be retried without losing the review', async () => {
  let attempts = 0;
  await mount(call, async (input) => { attempts++; if (attempts === 1) throw new Error('No se pudo conectar'); saves.push(input); });
  assert.equal(document.querySelector('[name="title"]').value, call.title);
  await submit(); assert.equal(document.querySelector('input[type="checkbox"]').checked, true);
  await submit(); assert.equal(document.querySelector('[name="opens_at"]').value, '2027-01-10T08:00');
  await submit(); await submit();
  assert.match(document.querySelector('[role="alert"]').textContent, /No se pudo conectar/);
  assert.match(document.body.textContent, /Proyecto semilla/);
  await submit(); assert.equal(saves.length, 1); assert.equal(saves[0].id, call.id); assert.equal(saves[0].max_amount, 5000000);
});

test('leaving a modified form requires discarding the changes explicitly', async () => {
  await mount(); await fill('title', 'Cambios sin guardar');
  await clickText('Cancelar'); assert.equal(cancellations, 0);
  assert.ok(document.querySelector('dialog[open]'));
  await clickText('Salir sin guardar'); assert.equal(cancellations, 1); assert.equal(saves.length, 0);
});

test('saving disables editing and cancellation and prevents duplicate writes', async () => {
  let finish;
  let writes = 0;
  await mount(call, async () => { writes++; await new Promise((resolve) => { finish = resolve; }); });
  await submit(); await submit(); await submit();
  await act(async () => {
    const form = document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  assert.equal(writes, 1);
  assert.ok(document.querySelector('fieldset').disabled);
  assert.ok(document.querySelector('button[type="submit"]').disabled);
  assert.match(document.querySelector('[role="status"]').textContent, /Guardando/);
  await clickText('Volver a convocatorias'); assert.equal(cancellations, 0);
  await act(async () => finish());
  assert.equal(document.querySelector('button[type="submit"]').disabled, false);
});


test('call appearance is previewed and included in the saved draft', async () => {
  await mount(call);
  await act(async () => document.querySelector('input[value="leaf"]').click());
  await act(async () => document.querySelector('input[value="teal"]').click());
  assert.ok(document.querySelector('input[value="leaf"]').checked);
  await submit(); await submit(); await submit(); await submit();
  assert.equal(saves[0].icon_key, 'leaf');
  assert.equal(saves[0].accent_color, 'teal');
  assert.equal(saves[0].cover_image_path, null);
});
