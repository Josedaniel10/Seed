import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDecisionConfirmation } from '../../../components/ui/decisionConfirmation.ts';
import { DecisionConfirmContent } from '../../../components/ui/DecisionConfirmContent.tsx';

const prompt = {
  title: 'Confirmar decisión del comité', target: 'Radicado 2026-001', confirmLabel: 'Registrar decisión',
  consequence: 'La solicitud quedará rechazada.', intent: 'danger',
  details: [{ label: 'Justificación', value: 'No cumple el requisito técnico.' }],
};

test('opening and cancelling a decision never executes the write', async () => {
  const confirmation = createDecisionConfirmation();
  let writes = 0;
  confirmation.request(prompt, () => { writes++; });
  assert.equal(writes, 0);
  assert.equal(confirmation.getSnapshot().prompt.target, prompt.target);
  confirmation.cancel();
  await confirmation.confirm();
  assert.equal(writes, 0);
  assert.equal(confirmation.getSnapshot(), null);
});

test('confirmation executes exactly once and cannot close or change its decision while saving', async () => {
  const confirmation = createDecisionConfirmation();
  let resolveWrite;
  let writes = 0;
  confirmation.request(prompt, () => { writes++; return new Promise((resolve) => { resolveWrite = resolve; }); });
  const pending = confirmation.confirm();
  await confirmation.confirm();
  confirmation.cancel();
  confirmation.request({ ...prompt, target: 'Another request' }, () => { writes++; });
  assert.equal(writes, 1);
  assert.equal(confirmation.getSnapshot().isPending, true);
  assert.equal(confirmation.getSnapshot().prompt.target, prompt.target);
  resolveWrite();
  await pending;
  assert.equal(confirmation.getSnapshot(), null);
});

test('failed writes preserve the reviewed summary and allow an explicit retry', async () => {
  const confirmation = createDecisionConfirmation();
  let attempts = 0;
  const summary = { ...prompt, details: [{ label: 'Justificación', value: 'Texto revisado' }] };
  confirmation.request(summary, () => { if (++attempts === 1) throw new Error('No se pudo guardar'); });
  summary.details[0].value = 'Modified after opening';
  await confirmation.confirm();
  assert.equal(confirmation.getSnapshot().error, 'No se pudo guardar');
  assert.equal(confirmation.getSnapshot().isPending, false);
  assert.equal(confirmation.getSnapshot().prompt.details[0].value, 'Texto revisado');
  await confirmation.confirm();
  assert.equal(attempts, 2);
  assert.equal(confirmation.getSnapshot(), null);
});

test('an obsolete in-flight write cannot dismiss a new session confirmation', async () => {
  const confirmation = createDecisionConfirmation();
  let finish;
  confirmation.request(prompt, () => new Promise((resolve) => { finish = resolve; }));
  const pending = confirmation.confirm();
  confirmation.reset();
  confirmation.request({ ...prompt, target: 'New session' }, () => {});
  finish();
  await pending;
  assert.equal(confirmation.getSnapshot().prompt.target, 'New session');
});

test('confirmation renders consequences, errors and disabled controls with accessible status', () => {
  const markup = renderToStaticMarkup(createElement(DecisionConfirmContent, {
    decision: { prompt, isPending: true, error: 'Connection failed' }, onCancel() {}, onConfirm() {},
  }));
  assert.match(markup, /Radicado 2026-001/);
  assert.match(markup, /No cumple el requisito técnico/);
  assert.match(markup, /La solicitud quedará rechazada/);
  assert.match(markup, /role="alert"/);
  assert.match(markup, /role="status"/);
  assert.equal((markup.match(/<button[^>]*disabled=""/g) ?? []).length, 2);
  assert.match(markup, /Volver a revisar/);
});
